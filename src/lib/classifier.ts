import { classifyWithHaiku } from "./anthropic";

function truncate(text: string, maxChars: number): string {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
}

function extractJson(text: string): string {
  // Try to find JSON in the response (handles markdown code blocks, extra text, etc.)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];
  return text;
}

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
  // Truncate to avoid blowing up Haiku context
  const caption = truncate(post.caption || "", 500);
  const transcript = truncate(post.transcript || "", 1500);
  const hashtags = (post.hashtags || []).slice(0, 10).join(", ");

  const system = `Você classifica posts do Instagram. Responda SOMENTE com JSON puro. Sem markdown. Sem explicação. Sem \`\`\`. Apenas o objeto JSON.`;

  const prompt = `LEGENDA: ${caption || "Sem legenda"}

TRANSCRIÇÃO (primeiros segundos): ${transcript || "Sem transcrição"}

HASHTAGS: ${hashtags || "Nenhuma"}

Responda com este JSON exato (preencha os valores):
{"funnelStage":"tofu","hookType":"curiosidade","hookText":"texto dos primeiros 3 segundos","ctaType":"none","ctaText":"","contentTheme":"tema em 3 palavras"}

Valores permitidos:
- funnelStage: "tofu" (conteúdo amplo, viral, atrai novos), "mofu" (ensina, prova, educa), "bofu" (vende, CTA direto, oferta)
- hookType: "pergunta", "afirmacao_chocante", "curiosidade", "controversia", "promessa", "historia", "pattern_interrupt", "dado_estatistico"
- ctaType: "none", "soft" (seguir/salvar/compartilhar), "medium" (link bio/DM), "hard" (compre/vagas limitadas)
- hookText: copie o texto EXATO dos primeiros 2-3 segundos da transcrição ou primeira linha da legenda
- contentTheme: o tema principal em 2-3 palavras`;

  const result = await classifyWithHaiku(system, prompt);

  try {
    const json = extractJson(result);
    const parsed = JSON.parse(json);
    // Validate required fields exist
    if (!parsed.funnelStage || !parsed.hookType) throw new Error("missing fields");
    return {
      funnelStage: parsed.funnelStage,
      hookType: parsed.hookType,
      hookText: parsed.hookText || "",
      ctaType: parsed.ctaType || "none",
      ctaText: parsed.ctaText || "",
      contentTheme: parsed.contentTheme || "",
    };
  } catch {
    // Fallback: extract hook from transcript manually
    const firstLine = (post.transcript || post.caption || "").split(/[.\n]/)[0]?.trim().slice(0, 100) || "";
    return {
      funnelStage: "tofu",
      hookType: "outro",
      hookText: firstLine,
      ctaType: "none",
      ctaText: "",
      contentTheme: "não classificado",
    };
  }
}

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

  const batchSize = 15;
  const results: { text: string; author: string; intentType: string; sentiment: string }[] = [];

  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);

    const system = `Classificador de comentários. Responda SOMENTE com JSON array puro. Sem markdown. Sem explicação. Sem \`\`\`.`;

    const commentsText = batch
      .map((c, idx) => `[${idx}] ${truncate(c.text, 150)}`)
      .join("\n");

    const prompt = `Classifique cada comentário por intenção:

${commentsText}

Responda com JSON array:
[{"index":0,"intentType":"neutral","sentiment":"neutral"}]

intentType: "purchase_intent" (quer comprar), "objection" (objeção), "audience_voice" (descreve problema), "social_proof" (pede validação), "praise" (elogio), "question" (pergunta), "neutral" (genérico)
sentiment: "positive", "negative", "neutral"`;

    try {
      const result = await classifyWithHaiku(system, prompt);
      const json = extractJson(result);
      const parsed = JSON.parse(json);

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
