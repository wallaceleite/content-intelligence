import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET - Lista vídeos com suas publicações
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("*, publications(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data });
}

// POST - Ações:
// { action: "signed-upload", filename } → URL assinada p/ upload direto do browser
//   (o corpo da request na Vercel é limitado a 4.5MB — vídeo nunca passa pela function)
// { action: "create", title, filePath, durationSeconds } → registra o vídeo após upload
// { action: "cover-upload", videoId } → URL assinada p/ a capa do Reels (JPEG em capas/)
// { action: "set-cover", videoId, filePath | null } → grava (ou remove) a capa do vídeo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "cover-upload") {
      if (!body.videoId) return NextResponse.json({ error: "videoId obrigatório" }, { status: 400 });
      const safeId = String(body.videoId).replace(/[^\w-]/g, "");
      const path = `capas/${safeId}_${Date.now()}.jpg`;
      const { data, error } = await supabaseAdmin.storage
        .from("videos")
        .createSignedUploadUrl(path);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ path, signedUrl: data.signedUrl });
    }

    if (body.action === "set-cover") {
      if (!body.videoId) return NextResponse.json({ error: "videoId obrigatório" }, { status: 400 });
      const coverUrl = body.filePath
        ? supabaseAdmin.storage.from("videos").getPublicUrl(body.filePath).data.publicUrl
        : null;
      const { error } = await supabaseAdmin
        .from("videos")
        .update({ cover_url: coverUrl })
        .eq("id", body.videoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ coverUrl });
    }

    if (body.action === "signed-upload") {
      const safeName = String(body.filename || "video.mp4").replace(/[^\w.\-]/g, "_");
      const path = `${Date.now()}_${safeName}`;
      const { data, error } = await supabaseAdmin.storage
        .from("videos")
        .createSignedUploadUrl(path);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
    }

    if (body.action === "create") {
      const { data: pub } = supabaseAdmin.storage.from("videos").getPublicUrl(body.filePath);
      const { data, error } = await supabaseAdmin
        .from("videos")
        .insert({
          title: body.title || body.filePath,
          file_path: body.filePath,
          public_url: pub.publicUrl,
          duration_seconds: body.durationSeconds || null,
          direction_post_id: body.directionPostId || null,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ video: data });
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 }
    );
  }
}
