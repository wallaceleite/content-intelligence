import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateJSON } from "@/lib/anthropic";

const CAROUSEL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "caption", "cards", "cta_word", "suggested_hook"],
  properties: {
    title: { type: "string" },
    caption: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "label", "text"],
        properties: {
          number: { type: "integer" },
          label: { type: "string" },
          text: { type: "string" },
        },
      },
    },
    cta_word: { type: "string" },
    suggested_hook: { type: "string" },
  },
} as const;

interface CarouselOutput {
  title: string;
  caption: string;
  cards: { number: number; label: string; text: string }[];
  cta_word: string;
  suggested_hook: string;
}
import { CAROUSEL_TEMPLATES, CAROUSEL_CATEGORIES } from "@/lib/carousel-templates";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { templateId, topic, angle, customContext } = await req.json();

    if (!templateId || !topic) {
      return NextResponse.json({ error: "templateId e topic são obrigatórios" }, { status: 400 });
    }

    const template = CAROUSEL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    }

    const category = CAROUSEL_CATEGORIES.find((c) => c.id === template.category);

    // 1. Get business config
    const { data: configs } = await supabaseAdmin
      .from("business_config")
      .select("section, data");

    const biz: Record<string, any> = {};
    for (const c of configs || []) biz[c.section] = c.data;

    // 2. Get top hooks from competitors for inspiration
    const { data: hooks } = await supabaseAdmin
      .from("hooks")
      .select("hook_text, hook_type, engagement_rate, profiles(username)")
      .order("engagement_rate", { ascending: false })
      .limit(10);

    // 3. Get relevant analyses
    const { data: analyses } = await supabaseAdmin
      .from("analyses")
      .select("full_analysis, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(2);

    // Build business context
    const bizContext = Object.entries(biz)
      .map(([section, data]) => {
        const fields = Object.entries(data as Record<string, any>)
          .filter(([, v]) => v)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n");
        return fields ? `${section.toUpperCase()}:\n${fields}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

    const hooksContext = (hooks || [])
      .map((h, i) => `${i + 1}. "${h.hook_text}" (${h.hook_type}, eng: ${((h.engagement_rate || 0) * 100).toFixed(1)}%) — @${(h as any).profiles?.username}`)
      .join("\n");

    // Extract key insights from latest analysis
    const insightSnippet = (analyses || [])
      .map((a) => {
        const text = a.full_analysis || "";
        const p4 = text.indexOf("PARTE 4");
        return p4 > 0 ? text.slice(p4, p4 + 1500) : text.slice(0, 1000);
      })
      .join("\n---\n");

    const prompt = `Gere um carrossel completo para o Instagram do @owallaceleite.

## TEMPLATE ESCOLHIDO
Categoria: ${category?.name} (${category?.icon})
Modelo: ${template.name}
Função no funil: ${template.funnelFunction} (${template.funnelStage.toUpperCase()})
Quantidade de cards: ${template.cardCount}

## ESTRUTURA DO TEMPLATE (siga exatamente)
${template.structure}

## TEMA DO CARROSSEL
${topic}

${angle ? `## ÂNGULO / ABORDAGEM\n${angle}` : ""}

${customContext ? `## CONTEXTO ADICIONAL\n${customContext}` : ""}

## DADOS DO NEGÓCIO DO @owallaceleite
${bizContext || "Estrategista digital, especialista em marketing digital e infoprodutos. Público: empreendedores digitais que querem crescer com audiência qualificada no Instagram."}

## MELHORES HOOKS DOS CONCORRENTES (use como inspiração)
${hooksContext || "Não disponível"}

## INTELIGÊNCIA EXTRAÍDA DOS CONCORRENTES
${insightSnippet || "Não disponível"}

## REGRAS OBRIGATÓRIAS
1. Escreva TODOS os ${template.cardCount} cards completos, sem placeholders — texto final pronto pra publicar
2. Adapte 100% ao posicionamento do @owallaceleite (estrategista digital, marketing, infoprodutos)
3. Tom: direto, inteligente, sem ser arrogante. Fala de igual pra igual com empreendedores
4. NÃO use linguagem genérica de coach. Seja específico e prático
5. O CTA do último card deve ser acionável e gerar comentário/save/share
6. Use dados, exemplos reais ou referências quando possível
7. Cada card deve ter no máximo 3-4 linhas (carrossel é visual, texto curto)

Campos esperados: title (headline do card 1), caption (legenda completa, 2-3 parágrafos + hashtags), cards (todos os ${template.cardCount}), cta_word (palavra do CTA para comentários), suggested_hook (baseado nos melhores dos concorrentes).`;

    const { data: carousel, usage } = await generateJSON<CarouselOutput>({
      system: `Você é um copywriter estratégico especialista em carrosséis para Instagram. Metodologia "Carrosséis que Vendem": 1 única ideia central por carrossel; cada tela segue AIDA e empurra para a próxima; pílulas de conhecimento (nunca o "curso inteiro" numa tela); penúltima tela aterrissa o produto/perfil; última tela tem CTA claro e específico. Teste da eliminação: se remover uma tela e a ideia continuar clara, a tela era desnecessária. Gere texto final pronto pra publicar — sem placeholders, sem [BRACKETS].`,
      prompt,
      schema: CAROUSEL_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 6000,
    });

    const cost = usage.cost.toFixed(4);
    const result = { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };

    // Save to database
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("carousels")
      .insert({
        template_id: template.id,
        template_name: template.name,
        category: category?.name || template.category,
        category_icon: category?.icon || "",
        funnel_stage: template.funnelStage,
        topic: topic.trim(),
        angle: angle?.trim() || null,
        custom_context: customContext?.trim() || null,
        cards: carousel.cards,
        caption: carousel.caption || null,
        cta_word: carousel.cta_word || null,
        suggested_hook: carousel.suggested_hook || null,
        status: "revisao",
        cost: `$${cost}`,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      carousel,
      carouselId: saved?.id || null,
      template: {
        id: template.id,
        name: template.name,
        category: category?.name,
        funnelStage: template.funnelStage,
      },
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: `$${cost}`,
      },
    });
  } catch (error: any) {
    console.error("Carousel generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
