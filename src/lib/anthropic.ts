import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 3,
});

// Modelos centralizados — mudar aqui muda o sistema inteiro.
// Haiku 4.5: classificação/OCR (barato). Sonnet 5: análise e geração.
export const MODELS = {
  classify: "claude-haiku-4-5",
  generate: "claude-sonnet-5",
} as const;

// USD por 1M tokens (preço de lista)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 3, output: 15 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = PRICING[model] || PRICING["claude-sonnet-5"];
  const cost =
    (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return Math.round(cost * 10000) / 10000;
}

export interface UsageResult {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export async function classifyWithHaiku(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODELS.classify,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

// Análise longa (16k tokens) — streaming evita timeout HTTP do SDK.
export async function analyzeWithSonnet(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const stream = anthropic.messages.stream({
    model: MODELS.generate,
    max_tokens: 32000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const response = await stream.finalMessage();
  const block = response.content.find((b) => b.type === "text");
  return {
    text: block?.type === "text" ? block.text : "",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// Geração com saída estruturada garantida por JSON Schema —
// substitui o parsing por regex. O modelo é obrigado a emitir JSON válido.
export async function generateJSON<T>(params: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<{ data: T; usage: UsageResult }> {
  const response = await anthropic.messages.create({
    model: MODELS.generate,
    max_tokens: params.maxTokens ?? 8000,
    system: params.system,
    output_config: {
      format: { type: "json_schema", schema: params.schema },
    },
    messages: [{ role: "user", content: params.prompt }],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Saída truncada (max_tokens) — aumente maxTokens");
  }

  const block = response.content.find((b) => b.type === "text");
  const text = block?.type === "text" ? block.text : "";
  return {
    data: JSON.parse(text) as T,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cost: estimateCost(
        MODELS.generate,
        response.usage.input_tokens,
        response.usage.output_tokens
      ),
    },
  };
}
