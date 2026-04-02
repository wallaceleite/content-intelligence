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
    // 1. Get profile info
    const profileData = await igFetch(
      `${IG_API}/me?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website`
    );

    if (profileData.error) {
      return NextResponse.json({ error: profileData.error.message }, { status: 400 });
    }

    // Update profile in DB
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
        },
        { onConflict: "username" }
      );

    // 2. Get all media (paginated)
    let allMedia: any[] = [];
    let url = `${IG_API}/me/media?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count,shortcode,permalink,thumbnail_url&limit=50`;

    while (url && allMedia.length < 200) {
      const data = await igFetch(url);
      if (data.data) allMedia = allMedia.concat(data.data);
      url = data.paging?.next || "";
    }

    // 3. Get insights for each media and update DB
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", MY_USERNAME)
      .single();

    if (!profile) throw new Error("Profile not found");

    let updated = 0;
    let errors = 0;

    for (const media of allMedia) {
      // Fetch insights (different metrics per type)
      let reach = 0, saves = 0, shares = 0, impressions = 0;

      try {
        const insightsData = await igFetch(
          `${IG_API}/${media.id}/insights?metric=reach,saved,shares,total_interactions`
        );

        if (insightsData.data) {
          for (const metric of insightsData.data) {
            const val = metric.values?.[0]?.value || 0;
            if (metric.name === "reach") reach = val;
            if (metric.name === "saved") saves = val;
            if (metric.name === "shares") shares = val;
          }
        }
      } catch {
        errors++;
      }

      // Map media_type
      const postType =
        media.media_type === "VIDEO" ? "video"
          : media.media_type === "CAROUSEL_ALBUM" ? "carousel"
          : "image";

      // Upsert post by shortcode + profile
      const shortcode = media.shortcode || media.id;
      const caption = media.caption || "";
      const firstLine = caption.split(/[\n.!?]/)[0]?.trim().slice(0, 100) || "";

      // Check if post exists in any batch for this profile
      const { data: existing } = await supabaseAdmin
        .from("posts")
        .select("id, batch_id")
        .eq("profile_id", profile.id)
        .eq("shortcode", shortcode)
        .limit(1);

      if (existing?.length) {
        // Update with Instagram API data
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
          .eq("id", existing[0].id);
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        username: profileData.username,
        followers: profileData.followers_count,
        posts: profileData.media_count,
      },
      media: {
        total: allMedia.length,
        updated,
        errors,
      },
    });
  } catch (error: any) {
    console.error("Instagram sync error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
