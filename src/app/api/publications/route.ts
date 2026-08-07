import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET - Fila completa (publicações + vídeo de origem)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("publications")
    .select("*, videos(id, title, theme, public_url, transcript_status)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ publications: data });
}

// POST - Cria as publicações de um vídeo (uma por rede selecionada)
// { videoId, scheduledAt?, items: [{ network, title, caption, hashtags }] }
// Sem scheduledAt → 'agendado' para agora (a UI dispara /api/publish/run em seguida)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.videoId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "videoId e items são obrigatórios" }, { status: 400 });
    }

    const scheduledAt = body.scheduledAt || new Date().toISOString();
    const rows = body.items.map((item: { network: string; title?: string; caption?: string; hashtags?: string }) => ({
      video_id: body.videoId,
      network: item.network,
      title: item.title || null,
      caption: item.caption || null,
      hashtags: item.hashtags || null,
      status: "agendado",
      scheduled_at: scheduledAt,
    }));

    const { data, error } = await supabaseAdmin
      .from("publications")
      .insert(rows)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ publications: data });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 }
    );
  }
}
