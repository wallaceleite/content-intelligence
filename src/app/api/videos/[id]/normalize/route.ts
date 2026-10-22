import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { readFile, unlink } from "fs/promises";
import ffmpegPath from "ffmpeg-static";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 300;

// POST - Normaliza o vídeo pro Instagram. Roda em TODO upload; body { resize }:
// - resize true (largura >1920, IG rejeita com erro 2207053): reescala pra 1080
//   (vertical) ou 1920 (horizontal), recodificando o vídeo.
// - resize false: só reempacota sem recodificar (-c copy), descartando os
//   metadados. MP4 exportado com metadados duplicados (major_brand "isom;isom")
//   falha no IG com erro 2207082; YouTube e TikTok aceitam o mesmo arquivo.
// Sobrescreve o MESMO objeto no bucket — nenhuma URL muda.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const resize = body.resize !== false;

  if (!ffmpegPath) {
    return NextResponse.json({ error: "Binário do ffmpeg indisponível" }, { status: 500 });
  }

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, public_url, file_path")
    .eq("id", id)
    .single();
  if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });

  const outPath = `/tmp/normalize-${id}.mp4`;
  const entrada = ["-y", "-i", video.public_url, "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1"];
  const args = resize
    ? [
        ...entrada,
        // Largura vira 1080 (retrato/quadrado) ou 1920 (paisagem); altura acompanha
        "-vf", "scale=w='if(gt(iw,ih),1920,1080)':h=-2",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        outPath,
      ]
    : [...entrada, "-c", "copy", "-movflags", "+faststart", outPath];

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath as string, args);
      let stderrTail = "";
      proc.stderr.on("data", (d) => {
        stderrTail = (stderrTail + d.toString()).slice(-2000);
      });
      proc.on("error", reject);
      proc.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com ${code}: ${stderrTail}`))
      );
    });

    const buffer = await readFile(outPath);
    const { error: upErr } = await supabaseAdmin.storage
      .from("videos")
      .upload(video.file_path, buffer, { upsert: true, contentType: "video/mp4" });
    if (upErr) throw new Error(`Upload da versão normalizada falhou: ${upErr.message}`);

    // O CDN segura a versão antiga por até 1h — cache-buster garante que
    // Instagram/AssemblyAI baixem o arquivo novo
    const bustedUrl = `${video.public_url.split("?")[0]}?v=${Date.now()}`;
    await supabaseAdmin.from("videos").update({ public_url: bustedUrl }).eq("id", id);

    return NextResponse.json({ ok: true, bytes: buffer.length });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha na normalização" },
      { status: 500 }
    );
  } finally {
    await unlink(outPath).catch(() => {});
  }
}
