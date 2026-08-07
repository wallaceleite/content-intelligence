import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { classifyWithHaiku } from "@/lib/anthropic";
import { suggestCaptions } from "@/lib/suggest-captions";

export const maxDuration = 300;

const AAI_KEY = process.env.ASSEMBLYAI_API_KEY;
const AAI_API = "https://api.assemblyai.com/v2";

// POST - Transcreve o vídeo (AssemblyAI) e sugere tema (Haiku).
// Mesmo motor do pipeline de scrape, mas disparado direto pelo app.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!AAI_KEY) {
    return NextResponse.json({ error: "ASSEMBLYAI_API_KEY ausente" }, { status: 500 });
  }

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, public_url, transcript_status")
    .eq("id", id)
    .single();
  if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });

  await supabaseAdmin
    .from("videos")
    .update({ transcript_status: "processando", transcript_error: null })
    .eq("id", id);

  try {
    const submitRes = await fetch(`${AAI_API}/transcript`, {
      method: "POST",
      headers: { authorization: AAI_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ audio_url: video.public_url, language_code: "pt" }),
    });
    const submitted = await submitRes.json();
    if (submitted.error) throw new Error(submitted.error);

    // Polling até concluir (Reels de até ~3min transcrevem em bem menos que o maxDuration)
    let transcript = "";
    const deadline = Date.now() + 270 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(`${AAI_API}/transcript/${submitted.id}`, {
        headers: { authorization: AAI_KEY },
      });
      const poll = await pollRes.json();
      if (poll.status === "completed") {
        transcript = poll.text || "";
        break;
      }
      if (poll.status === "error") throw new Error(poll.error || "Erro na transcrição");
    }
    if (!transcript) throw new Error("Timeout na transcrição");

    // Tema sugerido a partir da transcrição (editável na UI)
    let theme = "";
    try {
      theme = (
        await classifyWithHaiku(
          "Você resume vídeos curtos em um tema. Responda APENAS o tema em até 8 palavras, sem pontuação final.",
          transcript.slice(0, 6000)
        )
      ).trim();
    } catch { /* tema é opcional — transcrição não pode falhar por causa dele */ }


    await supabaseAdmin
      .from("videos")
      .update({ transcript, theme: theme || null, transcript_status: "concluida" })
      .eq("id", id);

    // Legenda/título/# por rede na voz do Wallace (erro fica registrado no banco)
    const gen = await suggestCaptions(id);

    return NextResponse.json({
      success: true,
      theme,
      suggestions: Boolean(gen.suggestions),
      suggestionsError: gen.error || null,
      chars: transcript.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro na transcrição";
    await supabaseAdmin
      .from("videos")
      .update({ transcript_status: "erro", transcript_error: msg })
      .eq("id", id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
