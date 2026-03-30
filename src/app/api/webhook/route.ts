import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateDerivedMetrics } from "@/lib/metrics";

// Receives scraped data from n8n after Apify + filtering
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, posts, profile, minViews, minEngagement, topN } = body;

    if (!batchId || !posts || !profile) {
      return NextResponse.json(
        { error: "Missing batchId, posts, or profile" },
        { status: 400 }
      );
    }

    // 1. Upsert profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          username: profile.username,
          full_name: profile.fullName,
          bio: profile.bio,
          bio_link: profile.bioLink,
          followers_count: profile.followersCount,
          following_count: profile.followingCount,
          posts_count: profile.postsCount,
          profile_pic_url: profile.profilePicUrl,
          instagram_url: `https://www.instagram.com/${profile.username}/`,
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
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // 3. Calculate average engagement for outlier scoring
    const avgEngagement =
      posts.reduce((sum: number, p: any) => {
        const views = parseInt(p.videoViewCount || p.videoPlayCount || 0);
        const likes = parseInt(p.likesCount || 0);
        const comments = parseInt(p.commentsCount || 0);
        return sum + (views > 0 ? ((likes + comments) / views) * 100 : 0);
      }, 0) / Math.max(posts.length, 1);

    // 4. Insert posts with derived metrics
    const postRows = posts.map((p: any) => {
      const views = parseInt(p.videoViewCount || p.videoPlayCount || 0);
      const likes = parseInt(p.likesCount || 0);
      const comments = parseInt(p.commentsCount || 0);

      const derived = calculateDerivedMetrics(
        {
          views,
          likes,
          comments,
          shares: parseInt(p.sharesCount || 0),
          saves: parseInt(p.savesCount || 0),
          plays: parseInt(p.videoPlayCount || 0),
          duration: parseFloat(p.videoDuration || 0),
          postedAt: p.timestamp,
        },
        avgEngagement
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
        shares_count: parseInt(p.sharesCount || 0),
        saves_count: parseInt(p.savesCount || 0),
        play_count: parseInt(p.videoPlayCount || 0),
        video_duration: parseFloat(p.videoDuration || 0),
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
