import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateJSON } from "@/lib/anthropic";
import { getBrandVoice } from "@/lib/brand-voice";

// Gera título/legenda/# por rede a partir da transcrição salva, com SEO/GEO,
// na voz do Wallace. Usado pelo transcribe (automático) e pelo /suggest (re-gerar).
export interface Suggestions {
  search_query: string;
  youtube: { title: string; caption: string; hashtags: string };
  instagram: { caption: string; hashtags: string };
  tiktok: { caption: string; hashtags: string };
}

const SCHEMA = {
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
};

export async function suggestCaptions(
  videoId: string
): Promise<{ suggestions?: Suggestions; error?: string }> {
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, transcript")
    .eq("id", videoId)
    .single();
  if (!video?.transcript) return { error: "Vídeo sem transcrição" };

  try {
    const voice = await getBrandVoice();
    const { data } = await generateJSON<Suggestions>({
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
- Proibido clichê de IA: "descubra", "confira", "não perca", "game changer", "🚀",
  "link da bio", tricolon decorativo.
- PROIBIDO o caractere travessão (—) em qualquer campo. Onde faria pausa, use dois-pontos,
  vírgula ou ponto final. Um único travessão na saída = saída inválida.
- Se a legenda funcionaria em qualquer vídeo do nicho, ela está genérica: reescreva amarrando
  em detalhe específico da transcrição (número, exemplo, frase dita no vídeo).

Legendas na voz definida acima, português brasileiro. CTA coerente com a disciplina de
palavra-gatilho do posicionamento quando fizer sentido (não force).`,
      prompt: `TRANSCRIÇÃO DO VÍDEO:\n${video.transcript.slice(0, 8000)}`,
      schema: SCHEMA,
      maxTokens: 3000,
    });

    await supabaseAdmin.from("videos").update({ suggestions: data }).eq("id", videoId);
    return { suggestions: data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro na geração";
    // Erro fica visível no banco em vez de sumir
    await supabaseAdmin.from("videos").update({ transcript_error: `geração: ${msg}` }).eq("id", videoId);
    return { error: msg };
  }
}
