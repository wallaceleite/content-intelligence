import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateDerivedMetrics } from "@/lib/metrics";

// Receives scraped data from n8n after Apify + filtering
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, posts, profile, minViews, minEngagement, topN, observacaoEstrategica } = body;

    if (!batchId || !posts || !profile) {
      return NextResponse.json(
        { error: "Missing batchId, posts, or profile" },
        { status: 400 }
      );
    }

    // 1. Extract profile data from multiple possible Apify field locations
    const firstPost = posts[0] || {};
    const profileUsername = profile.username || firstPost.ownerUsername || "";
    const profileFullName = profile.fullName || firstPost.ownerFullName || "";

    // Apify stores profile data in various field names depending on the actor
    const followersCount =
      parseInt(profile.followersCount || profile.followers || firstPost.ownerFollowerCount || firstPost.followersCount || 0);
    const followingCount =
      parseInt(profile.followingCount || profile.following || firstPost.ownerFollowingCount || 0);
    const postsCount =
      parseInt(profile.postsCount || profile.posts || firstPost.ownerPostCount || 0);
    const bio = profile.bio || firstPost.ownerBio || firstPost.biography || "";
    const bioLink = profile.bioLink || firstPost.ownerExternalUrl || firstPost.externalUrl || "";
    const profilePicUrl = profile.profilePicUrl || firstPost.ownerProfilePicUrl || firstPost.profilePicUrl || "";

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          username: profileUsername,
          full_name: profileFullName,
          bio,
          bio_link: bioLink,
          followers_count: followersCount || null,
          following_count: followingCount || null,
          posts_count: postsCount || null,
          profile_pic_url: profilePicUrl,
          instagram_url: `https://www.instagram.com/${profileUsername}/`,
        },
        { onConflict: "username" }
      )
      .select()
      .single();

    if (profileError) throw profileError;

    // 2. Create batch
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from("batches")
      .insert({
        batch_id: batchId,
        profile_id: profileData.id,
        status: "transcribing",
        total_posts: posts.length,
        filtered_posts: posts.length,
        min_views: minViews || 0,
        min_engagement: minEngagement || 0,
        top_n: topN,
        strategic_note: observacaoEstrategica || null,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Safe number parser — handles strings, nulls, undefined, NaN
    const safeInt = (v: any): number => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.floor(n) : 0;
    };
    const safeFloat = (v: any): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // 3. Calculate average engagement for outlier scoring
    const avgEngagement =
      posts.reduce((sum: number, p: any) => {
        const views = safeInt(p.videoViewCount || p.videoPlayCount);
        const likes = safeInt(p.likesCount);
        const comments = safeInt(p.commentsCount);
        return sum + (views > 0 ? ((likes + comments) / views) * 100 : 0);
      }, 0) / Math.max(posts.length, 1);

    // 4. Insert posts with derived metrics
    const postRows = posts.map((p: any) => {
      const views = safeInt(p.videoViewCount || p.videoPlayCount);
      const likes = safeInt(p.likesCount);
      const comments = safeInt(p.commentsCount);

      const derived = calculateDerivedMetrics(
        {
          views,
          likes,
          comments,
          shares: safeInt(p.sharesCount),
          saves: safeInt(p.savesCount),
          plays: safeInt(p.videoPlayCount),
          duration: safeFloat(p.videoDuration),
          postedAt: p.timestamp,
        },
        avgEngagement,
        safeInt(followersCount)
      );

      return {
        batch_id: batchData.id,
        profile_id: profileData.id,
        post_id: p.id || p.shortCode,
        shortcode: p.shortCode,
        post_type: p.videoUrl ? "video" : p.images?.length > 1 ? "carousel" : "image",
        url: p.url,
        video_url: p.videoUrl,
        thumbnail_url: p.displayUrl,
        caption: p.caption,
        hashtags: p.hashtags || [],
        views_count: views,
        likes_count: likes,
        comments_count: comments,
        shares_count: safeInt(p.sharesCount),
        saves_count: safeInt(p.savesCount),
        play_count: safeInt(p.videoPlayCount),
        video_duration: safeFloat(p.videoDuration),
        engagement_rate: derived.engagementRate,
        comment_to_like_ratio: derived.commentToLikeRatio,
        engagement_velocity: derived.engagementVelocity,
        outlier_score: derived.outlierScore,
        sales_potential_score: derived.salesPotentialScore,
        posted_at: p.timestamp,
        transcription_status: p.videoUrl ? "pending" : "completed",
      };
    });

    const { error: postsError } = await supabaseAdmin
      .from("posts")
      .insert(postRows);

    if (postsError) throw postsError;

    // 5. Insert comments if available
    const { data: insertedPosts } = await supabaseAdmin
      .from("posts")
      .select("id, post_id")
      .eq("batch_id", batchData.id);

    const postIdMap = new Map(
      insertedPosts?.map((p) => [p.post_id, p.id]) || []
    );

    for (const p of posts) {
      if (p.latestComments?.length) {
        const commentRows = p.latestComments.map((c: any) => ({
          post_id: postIdMap.get(p.id || p.shortCode),
          author_username: c.ownerUsername || c.owner?.username || "unknown",
          text: c.text,
          likes_count: c.likesCount || 0,
          posted_at: c.timestamp,
        }));

        await supabaseAdmin.from("comments").insert(commentRows);
      }
    }

    return NextResponse.json({
      success: true,
      batchId: batchData.id,
      batchRef: batchId,
      profileId: profileData.id,
      postsInserted: postRows.length,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
