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

// Process items in parallel batches
async function parallelBatch<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Get profile info
    const profileData = await igFetch(
      `${IG_API}/me?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website`
    );

    if (profileData.error) {
      return NextResponse.json({ error: profileData.error.message }, { status: 400 });
    }

    // Update profile
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
          profile_pic_url: profileData.profile_picture_url || "",
          instagram_url: `https://www.instagram.com/${MY_USERNAME}/`,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "username" }
      );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", MY_USERNAME)
      .single();

    if (!profile) throw new Error("Profile not found");

    // 2. Get existing post shortcodes (only update posts we already track)
    const { data: existingPosts } = await supabaseAdmin
      .from("posts")
      .select("id, shortcode")
      .eq("profile_id", profile.id);

    const postMap = new Map((existingPosts || []).map((p) => [p.shortcode, p.id]));

    // 3. Get media from Instagram (only first page — recent posts)
    let allMedia: any[] = [];
    let url = `${IG_API}/me/media?fields=id,media_type,timestamp,like_count,comments_count,shortcode&limit=50`;

    while (url && allMedia.length < 200) {
      const data = await igFetch(url);
      if (data.data) allMedia = allMedia.concat(data.data);
      url = data.paging?.next || "";
    }

    // Filter to only media we have in DB
    const mediaToUpdate = allMedia.filter((m) => postMap.has(m.shortcode || m.id));

    // 4. Fetch insights in parallel batches of 5
    let updated = 0;
    let errors = 0;

    await parallelBatch(mediaToUpdate, 5, async (media) => {
      try {
        let reach = 0, saves = 0, shares = 0;

        const insightsData = await igFetch(
          `${IG_API}/${media.id}/insights?metric=reach,saved,shares`
        );

        if (insightsData.data) {
          for (const metric of insightsData.data) {
            const val = metric.values?.[0]?.value || 0;
            if (metric.name === "reach") reach = val;
            if (metric.name === "saved") saves = val;
            if (metric.name === "shares") shares = val;
          }
        }

        const postId = postMap.get(media.shortcode || media.id);
        if (postId) {
          await supabaseAdmin
            .from("posts")
            .update({
              saves_count: saves,
              shares_count: shares,
              reach_count: reach,
              ig_media_id: media.id,
              likes_count: media.like_count || 0,
              comments_count: media.comments_count || 0,
            })
            .eq("id", postId);
          updated++;
        }
      } catch {
        errors++;
      }
    });

    // 5. Pull audience demographics in parallel
    let demoSynced = 0;
    const igUserId = profileData.id;
    try {
      const demoResults = await Promise.allSettled(
        ["age", "gender", "city", "country"].map(async (metricType) => {
          const demoData = await igFetch(
            `${IG_API}/${igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${metricType}`
          );

          if (demoData.data?.[0]?.total_value?.breakdowns?.[0]?.results) {
            const results = demoData.data[0].total_value.breakdowns[0].results;
            const rows = results.map((r: any) => ({
              profile_id: profile.id,
              metric_type: metricType,
              dimension: r.dimension_values[0],
              value: r.value,
              synced_at: new Date().toISOString(),
            }));

            if (rows.length > 0) {
              await supabaseAdmin
                .from("audience_demographics")
                .delete()
                .eq("profile_id", profile.id)
                .eq("metric_type", metricType);

              await supabaseAdmin
                .from("audience_demographics")
                .insert(rows);
              return rows.length;
            }
          }
          return 0;
        })
      );

      for (const r of demoResults) {
        if (r.status === "fulfilled") demoSynced += r.value;
      }
    } catch { /* non-fatal */ }

    // 6. Save daily snapshot
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabaseAdmin
        .from("daily_snapshots")
        .upsert(
          {
            profile_id: profile.id,
            snapshot_date: today,
            followers_count: profileData.followers_count || 0,
            following_count: profileData.follows_count || 0,
            posts_count: profileData.media_count || 0,
          },
          { onConflict: "profile_id,snapshot_date" }
        );
    } catch { /* table may not exist yet */ }

    return NextResponse.json({
      success: true,
      profile: {
        username: profileData.username,
        followers: profileData.followers_count,
        posts: profileData.media_count,
      },
      media: {
        total: allMedia.length,
        matched: mediaToUpdate.length,
        updated,
        errors,
      },
      demographics: demoSynced,
    });
  } catch (error: any) {
    console.error("Instagram sync error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
