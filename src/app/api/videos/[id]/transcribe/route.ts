import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { classifyWithHaiku, generateJSON } from "@/lib/anthropic";
import { getBrandVoice } from "@/lib/brand-voice";

interface Suggestions {
  youtube: { title: string; caption: string; hashtags: string };
  instagram: { caption: string; hashtags: string };
  tiktok: { caption: string; hashtags: string };
}

const SUGGESTIONS_SCHEMA = {
  type: "object",
  properties: {
    search_query: {
      type: "string",
      description: "A pergunta/busca exata que este vídeo responde, nas palavras que o público usaria no buscador",
    },
    youtube: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título do Short até 90 chars: keyword principal nas primeiras palavras + gancho de curiosidade. Nunca clickbait vazio" },
        caption: { type: "string", description: "Descrição: 1ª linha responde a busca com a keyword (YouTube indexa o início), 2-3 linhas expandindo com termos da transcrição, depois CTA" },
        hashtags: { type: "string", description: "3-5 hashtags de NICHO extraídas do tema real, separadas por espaço, com #" },
      },
      required: ["title", "caption", "hashtags"],
      additionalProperties: false,
    },
    instagram: {
      type: "object",
      properties: {
        caption: { type: "string", description: "Legenda do Reel: 1ª linha = hook com a keyword de busca (SEO do IG indexa legenda), corpo 2-4 linhas na voz definida, CTA no final" },
        hashtags: { type: "string", description: "5-8 hashtags: misturar keyword exata + variações de nicho + 1-2 de alcance médio. Zero genéricas" },
      },
      required: ["caption", "hashtags"],
      additionalProperties: false,
    },
    tiktok: {
      type: "object",
      properties: {
        caption: { type: "string", description: "TikTok é motor de busca: legenda curta contendo a keyword exata que o público digitaria, direta, sem enrolação" },
        hashtags: { type: "string", description: "3-5 hashtags: keyword exata como hashtag + nicho específico. Proibido #fyp #viral #foryou" },
      },
      required: ["caption", "hashtags"],
      additionalProperties: false,
    },
  },
  required: ["search_query", "youtube", "instagram", "tiktok"],
  additionalProperties: false,
} as const;

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

    // Legenda/título/hashtags por rede, na voz do Wallace — pré-preenche o /publicar
    let suggestions: Suggestions | null = null;
    try {
      const voice = await getBrandVoice();
      const result = await generateJSON<Suggestions>({
        system: `${voice}

Você escreve o pacote de publicação de um vídeo curto (Short/Reel/TikTok) a partir da transcrição,
otimizado para SEO e GEO de cada plataforma.

PROCESSO OBRIGATÓRIO:
1. Identifique a PERGUNTA DE BUSCA que o vídeo responde (search_query) — nas palavras que o
   público-alvo digitaria no YouTube/TikTok/Google, não em jargão de marketeiro.
2. Extraia as keywords REAIS da transcrição (termos que o Wallace fala no vídeo). Use ESSAS
   palavras nos títulos e legendas — plataformas cruzam legenda × áudio transcrito.
3. GEO (aparecer em respostas de IA): a 1ª linha da descrição/legenda deve responder a pergunta
   de forma completa e citável — entidades nomeadas, afirmação direta, sem mistério vazio.

TRAVAS ANTI-GENÉRICO (violou = falhou):
- Proibido: #fyp #viral #foryou #marketing #digital #empreendedorismo e qualquer hashtag que
  sirva pra qualquer vídeo do mundo. Hashtag boa é a que só serve pra ESTE tema.
- Proibido clichê de IA: "descubra", "confira", "não perca", "game changer", "🚀", em-dash,
  "link da bio", tricolon decorativo.
- Se a legenda funcionaria em qualquer vídeo do nicho, ela está genérica: reescreva amarrando
  em detalhe específico da transcrição (número, exemplo, frase dita no vídeo).

Legendas na voz definida acima, português brasileiro. CTA coerente com a disciplina de
palavra-gatilho do posicionamento quando fizer sentido (não force).`,
        prompt: `TRANSCRIÇÃO DO VÍDEO:\n${transcript.slice(0, 8000)}`,
        schema: SUGGESTIONS_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 1500,
      });
      suggestions = result.data;
    } catch { /* sugestões são opcionais — transcrição não pode falhar por causa delas */ }

    await supabaseAdmin
      .from("videos")
      .update({ transcript, theme: theme || null, suggestions, transcript_status: "concluida" })
      .eq("id", id);

    return NextResponse.json({ success: true, theme, suggestions: Boolean(suggestions), chars: transcript.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro na transcrição";
    await supabaseAdmin
      .from("videos")
      .update({ transcript_status: "erro", transcript_error: msg })
      .eq("id", id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
