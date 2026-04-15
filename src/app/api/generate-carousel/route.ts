import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { analyzeWithSonnet } from "@/lib/anthropic";
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

## FORMATO DE SAÍDA
Retorne APENAS um JSON válido, sem markdown:
{
  "title": "título do carrossel (headline do card 1)",
  "caption": "legenda completa para o post (2-3 parágrafos + hashtags)",
  "cards": [
    {
      "number": 1,
      "label": "CAPA",
      "text": "texto completo do card"
    }
  ],
  "cta_word": "palavra do CTA para comentários",
  "suggested_hook": "hook sugerido baseado nos melhores dos concorrentes"
}`;

    const result = await analyzeWithSonnet(
      `Você é um copywriter estratégico especialista em carrosséis para Instagram. Você domina a metodologia "Carrosséis que Vendem" e adapta cada modelo ao posicionamento único do cliente. Gere carrosséis prontos para publicar, com texto final — sem placeholders, sem [BRACKETS]. Responda APENAS com JSON válido.`,
      prompt
    );

    // Parse JSON
    let carousel: any;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      carousel = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return NextResponse.json(
        { error: "Falha ao parsear resposta", raw: result.text.slice(0, 500) },
        { status: 500 }
      );
    }

    if (!carousel) {
      return NextResponse.json({ error: "Resposta vazia" }, { status: 500 });
    }

    const cost = ((result.inputTokens / 1_000_000) * 3 + (result.outputTokens / 1_000_000) * 15).toFixed(4);

    return NextResponse.json({
      success: true,
      carousel,
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
