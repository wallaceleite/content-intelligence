import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;
const IG_API = "https://graph.instagram.com/v21.0";
const MY_USERNAME = "owallaceleite";

async function igFetch(url: string) {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}access_token=${IG_TOKEN}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const results: string[] = [];

    // 1. Update profile data
    const profileData = await igFetch(
      `${IG_API}/me?fields=id,username,name,biography,followers_count,follows_count,media_count,website`
    );

    if (!profileData.error) {
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            username: MY_USERNAME,
            full_name: profileData.name || "",
            bio: profileData.biography || "",
            bio_link: profileData.website || "",
            followers_count: profileData.followers_count || 0,
            following_count: profileData.follows_count || 0,
            posts_count: profileData.media_count || 0,
          },
          { onConflict: "username" }
        );
      results.push(`Profile: ${profileData.followers_count} followers`);
    }

    // 2. Get all media and update insights
    let allMedia: any[] = [];
    let url = `${IG_API}/me/media?fields=id,media_type,timestamp,like_count,comments_count,shortcode&limit=50`;
    while (url && allMedia.length < 200) {
      const data = await igFetch(url);
      if (data.data) allMedia = allMedia.concat(data.data);
      url = data.paging?.next || "";
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", MY_USERNAME)
      .single();

    if (!profile) throw new Error("Profile not found");

    let updated = 0;
    for (const media of allMedia) {
      let saves = 0, shares = 0, reach = 0;
      try {
        const insights = await igFetch(
          `${IG_API}/${media.id}/insights?metric=reach,saved,shares`
        );
        if (insights.data) {
          for (const m of insights.data) {
            const val = m.values?.[0]?.value || 0;
            if (m.name === "reach") reach = val;
            if (m.name === "saved") saves = val;
            if (m.name === "shares") shares = val;
          }
        }
      } catch { /* skip */ }

      const { data: existing } = await supabaseAdmin
        .from("posts")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("shortcode", media.shortcode)
        .limit(1);

      if (existing?.length) {
        await supabaseAdmin
          .from("posts")
          .update({
            saves_count: saves,
            shares_count: shares,
            reach_count: reach,
            likes_count: media.like_count || 0,
            comments_count: media.comments_count || 0,
          })
          .eq("id", existing[0].id);
        updated++;
      }
    }

    results.push(`Posts updated: ${updated}/${allMedia.length}`);

    // 3. Save weekly snapshot
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Get current week stats
    const { data: weekPosts } = await supabaseAdmin
      .from("posts")
      .select("post_type, funnel_stage, engagement_rate, saves_count, shares_count, reach_count")
      .eq("profile_id", profile.id);

    const totalSaves = (weekPosts || []).reduce((s, p) => s + (p.saves_count || 0), 0);
    const totalShares = (weekPosts || []).reduce((s, p) => s + (p.shares_count || 0), 0);
    const totalReach = (weekPosts || []).reduce((s, p) => s + (p.reach_count || 0), 0);
    const avgEng = weekPosts?.length
      ? Math.round((weekPosts.reduce((s, p) => s + Math.min(p.engagement_rate || 0, 100), 0) / weekPosts.length) * 100) / 100
      : 0;

    await supabaseAdmin
      .from("strategy_weekly")
      .upsert(
        {
          week_start: weekStartStr,
          posts_count: allMedia.length,
          videos_count: allMedia.filter((m) => m.media_type === "VIDEO").length,
          tofu_count: (weekPosts || []).filter((p) => p.funnel_stage === "tofu").length,
          mofu_count: (weekPosts || []).filter((p) => p.funnel_stage === "mofu").length,
          bofu_count: (weekPosts || []).filter((p) => p.funnel_stage === "bofu").length,
          avg_engagement: avgEng,
          total_reach: totalReach,
          total_saves: totalSaves,
          total_shares: totalShares,
          followers_count: profileData.followers_count || 0,
        },
        { onConflict: "week_start" }
      );

    results.push(`Weekly snapshot saved: ${weekStartStr}`);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Daily sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
