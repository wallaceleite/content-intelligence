import { classifyWithHaiku } from "./anthropic";

// Classify post into funnel stage, hook type, CTA type
export async function classifyPost(post: {
  caption: string;
  transcript: string;
  hashtags: string[];
}): Promise<{
  funnelStage: "tofu" | "mofu" | "bofu";
  hookType: string;
  hookText: string;
  ctaType: "none" | "soft" | "medium" | "hard";
  ctaText: string;
  contentTheme: string;
}> {
  const system = `Você é um classificador de conteúdo do Instagram especializado em funil de vendas. Responda APENAS em JSON válido, sem markdown, sem explicações.`;

  const prompt = `Classifique este post do Instagram:

LEGENDA: ${post.caption || "Sem legenda"}
TRANSCRIÇÃO: ${post.transcript || "Sem transcrição"}
HASHTAGS: ${post.hashtags?.join(", ") || "Nenhuma"}

Retorne APENAS este JSON:
{
  "funnelStage": "tofu" | "mofu" | "bofu",
  "hookType": "pergunta" | "afirmacao_chocante" | "curiosidade" | "controversia" | "promessa" | "historia" | "pattern_interrupt" | "dado_estatistico" | "outro",
  "hookText": "texto exato dos primeiros 2-3 segundos/linhas",
  "ctaType": "none" | "soft" | "medium" | "hard",
  "ctaText": "texto do CTA se houver",
  "contentTheme": "tema principal em 2-3 palavras"
}

Critérios:
- TOFU: conteúdo amplo, dores genéricas, trending, atrai novos seguidores
- MOFU: how-to, frameworks, prova/credibilidade, educa a audiência
- BOFU: CTA direto, oferta, urgência, depoimentos, vende
- Soft CTA: seguir, salvar, compartilhar, comentar
- Medium CTA: link na bio, manda DM, se inscreve
- Hard CTA: compre, vagas limitadas, oferta direta, preço`;

  const result = await classifyWithHaiku(system, prompt);

  try {
    return JSON.parse(result.trim());
  } catch {
    return {
      funnelStage: "tofu",
      hookType: "outro",
      hookText: "",
      ctaType: "none",
      ctaText: "",
      contentTheme: "não classificado",
    };
  }
}

// Classify comments by intent
export async function classifyComments(
  comments: { text: string; author: string }[]
): Promise<
  {
    text: string;
    author: string;
    intentType: string;
    sentiment: string;
  }[]
> {
  if (!comments.length) return [];

  // Process in batches of 20
  const batchSize = 20;
  const results: { text: string; author: string; intentType: string; sentiment: string }[] = [];

  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);

    const system = `Classificador de comentários do Instagram para análise de intenção de compra. Responda APENAS em JSON array válido.`;

    const commentsText = batch
      .map((c, idx) => `[${idx}] @${c.author}: ${c.text}`)
      .join("\n");

    const prompt = `Classifique cada comentário:

${commentsText}

Retorne APENAS um JSON array:
[
  {
    "index": 0,
    "intentType": "purchase_intent" | "objection" | "audience_voice" | "social_proof" | "praise" | "question" | "neutral",
    "sentiment": "positive" | "negative" | "neutral"
  }
]

Critérios de intentType:
- purchase_intent: "onde compro?", "preço?", "tem curso?", "link?", "como contratar?"
- objection: "caro", "não funciona", "já tentei", dúvida sobre eficácia
- audience_voice: descreve seus problemas, desafios, situação
- social_proof: "alguém já testou?", "funciona mesmo?", pede validação
- praise: elogio direto ao conteúdo ou criador
- question: pergunta sobre o tema (não sobre compra)
- neutral: emoji, tag de amigo, comentário genérico`;

    try {
      const result = await classifyWithHaiku(system, prompt);
      const parsed = JSON.parse(result.trim());

      for (const item of parsed) {
        const comment = batch[item.index];
        if (comment) {
          results.push({
            text: comment.text,
            author: comment.author,
            intentType: item.intentType || "neutral",
            sentiment: item.sentiment || "neutral",
          });
        }
      }
    } catch {
      // Fallback: mark as neutral
      for (const comment of batch) {
        results.push({
          text: comment.text,
          author: comment.author,
          intentType: "neutral",
          sentiment: "neutral",
        });
      }
    }
  }

  return results;
}
