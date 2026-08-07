import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Arquivamento no Drive (executado pelo n8n):
// GET  → lista vídeos prontos pra arquivar (nenhuma publicação pendente/agendada)
// POST → { videoId, driveUrl } grava o link do Drive e APAGA o arquivo do Supabase
// Protegido por CRON_SECRET (mesmo Bearer do /api/publish/run).
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: videos, error } = await supabaseAdmin
    .from("videos")
    .select("id, title, file_path, public_url, created_at, publications(status)")
    .eq("storage_state", "supabase")
    .lt("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Só arquiva quem já terminou o ciclo: tem publicação e nenhuma em aberto
  const ready = (videos || []).filter((v) => {
    const pubs = v.publications as { status: string }[];
    return pubs.length > 0 && pubs.every((p) => ["publicado", "cancelado", "falhou"].includes(p.status));
  });

  return NextResponse.json({
    videos: ready.map(({ id, title, file_path, public_url }) => ({ id, title, filePath: file_path, publicUrl: public_url })),
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { videoId, driveUrl } = await req.json();
    if (!videoId || !driveUrl) {
      return NextResponse.json({ error: "videoId e driveUrl são obrigatórios" }, { status: 400 });
    }

    const { data: video } = await supabaseAdmin
      .from("videos")
      .select("file_path")
      .eq("id", videoId)
      .single();
    if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });

    const { error: updErr } = await supabaseAdmin
      .from("videos")
      .update({ drive_url: driveUrl, storage_state: "drive" })
      .eq("id", videoId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Só remove do storage DEPOIS do link do Drive estar salvo
    const { error: rmErr } = await supabaseAdmin.storage.from("videos").remove([video.file_path]);

    return NextResponse.json({ success: true, storageRemoved: !rmErr });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 }
    );
  }
}
