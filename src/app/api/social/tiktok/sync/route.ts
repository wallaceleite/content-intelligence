import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTikTokAccessToken } from "@/lib/publishers/tiktok";

export const maxDuration = 120;

const FIELDS = "id,title,video_description,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time";

// POST - Sincroniza vídeos da conta via Display API (exige scope video.list)
export async function POST() {
  try {
    const token = await getTikTokAccessToken();

    let cursor = 0;
    let hasMore = true;
    let synced = 0;

    while (hasMore && synced < 200) {
      const res = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${FIELDS}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
      });
      const json = await res.json();

      if (json.error && json.error.code !== "ok") {
        return NextResponse.json(
          { error: `TikTok API: ${json.error.message || json.error.code}`, code: json.error.code },
          { status: 400 }
        );
      }

      const videos = json.data?.videos || [];
      if (videos.length > 0) {
        const rows = videos.map((v: {
          id: string; title?: string; video_description?: string; duration?: number;
          cover_image_url?: string; share_url?: string; view_count?: number;
          like_count?: number; comment_count?: number; share_count?: number; create_time?: number;
        }) => ({
          network: "tiktok",
          external_id: v.id,
          title: v.title || v.video_description?.split("\n")[0] || null,
          description: v.video_description?.slice(0, 2000) || null,
          thumbnail_url: v.cover_image_url || null,
          permalink: v.share_url || null,
          posted_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
          duration_seconds: v.duration || 0,
          views_count: v.view_count || 0,
          likes_count: v.like_count || 0,
          comments_count: v.comment_count || 0,
          shares_count: v.share_count || 0,
          synced_at: new Date().toISOString(),
        }));

        const { error } = await supabaseAdmin
          .from("social_posts")
          .upsert(rows, { onConflict: "network,external_id" });
        if (error) throw new Error(error.message);
        synced += rows.length;
      }

      hasMore = Boolean(json.data?.has_more);
      cursor = json.data?.cursor || 0;
    }

    return NextResponse.json({ success: true, synced });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no sync do TikTok" },
      { status: 500 }
    );
  }
}
