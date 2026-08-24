import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 120;

const YT_API = "https://www.googleapis.com/youtube/v3";
const CHANNEL_ID = "UCwyJvu3qszLqKqY3rqM2JDA";
// Playlist de uploads do canal = channel id com prefixo UU
const UPLOADS_PLAYLIST = CHANNEL_ID.replace(/^UC/, "UU");

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

// POST - Sincroniza vídeos do canal + estatísticas públicas (Data API v3, chave simples)
export async function POST() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY ausente" }, { status: 500 });

  try {
    const videoIds: string[] = [];
    let pageToken = "";
    do {
      const res = await fetch(
        `${YT_API}/playlistItems?part=contentDetails&playlistId=${UPLOADS_PLAYLIST}&maxResults=50&pageToken=${pageToken}&key=${key}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      for (const item of data.items || []) videoIds.push(item.contentDetails.videoId);
      pageToken = data.nextPageToken || "";
    } while (pageToken && videoIds.length < 500);

    let synced = 0;
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const res = await fetch(
        `${YT_API}/videos?part=snippet,statistics,contentDetails&id=${batch.join(",")}&key=${key}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const rows = (data.items || []).map((v: {
        id: string;
        snippet: { title: string; description: string; publishedAt: string; thumbnails: Record<string, { url: string }> };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails: { duration: string };
      }) => ({
        network: "youtube",
        external_id: v.id,
        title: v.snippet.title,
        description: v.snippet.description?.slice(0, 2000) || null,
        thumbnail_url: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || null,
        permalink: `https://www.youtube.com/watch?v=${v.id}`,
        posted_at: v.snippet.publishedAt,
        duration_seconds: parseDuration(v.contentDetails?.duration || ""),
        views_count: parseInt(v.statistics?.viewCount || "0"),
        likes_count: parseInt(v.statistics?.likeCount || "0"),
        comments_count: parseInt(v.statistics?.commentCount || "0"),
        synced_at: new Date().toISOString(),
      }));

      const { error } = await supabaseAdmin
        .from("social_posts")
        .upsert(rows, { onConflict: "network,external_id" });
      if (error) throw new Error(error.message);
      synced += rows.length;
    }

    return NextResponse.json({ success: true, synced });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no sync do YouTube" },
      { status: 500 }
    );
  }
}
