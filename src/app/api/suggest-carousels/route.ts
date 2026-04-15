import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { analyzeWithSonnet } from "@/lib/anthropic";
import { CAROUSEL_TEMPLATES, CAROUSEL_CATEGORIES } from "@/lib/carousel-templates";

export const maxDuration = 120;

export async function GET() {
  try {
    // 1. Funnel health - what's weak?
    const { data: ownPosts } = await supabaseAdmin
      .from("posts")
      .select("funnel_stage, engagement_rate, hook_type, content_theme, cta_type, posted_at")
      .not("funnel_stage", "is", null)
      .order("posted_at", { ascending: false })
      .limit(100);

    const ownFunnel = { tofu: 0, mofu: 0, bofu: 0 };
    for (const p of ownPosts || []) {
      if (p.funnel_stage in ownFunnel) ownFunnel[p.funnel_stage as keyof typeof ownFunnel]++;
    }
    const total = ownFunnel.tofu + ownFunnel.mofu + ownFunnel.bofu || 1;
    const funnelPcts = {
      tofu: Math.round((ownFunnel.tofu / total) * 100),
      mofu: Math.round((ownFunnel.mofu / total) * 100),
      bofu: Math.round((ownFunnel.bofu / total) * 100),
    };
    const ideal = { tofu: 50, mofu: 35, bofu: 15 };
    const funnelGaps = {
      tofu: ideal.tofu - funnelPcts.tofu,
      mofu: ideal.mofu - funnelPcts.mofu,
      bofu: ideal.bofu - funnelPcts.bofu,
    };

    // 2. Top performing hooks by funnel stage from competitors
    const { data: topHooksTOFU } = await supabaseAdmin
      .from("hooks")
      .select("hook_text, hook_type, engagement_rate, funnel_stage, profiles(username)")
      .eq("funnel_stage", "tofu")
      .order("engagement_rate", { ascending: false })
      .limit(5);

    const { data: topHooksMOFU } = await supabaseAdmin
      .from("hooks")
      .select("hook_text, hook_type, engagement_rate, funnel_stage, profiles(username)")
      .eq("funnel_stage", "mofu")
      .order("engagement_rate", { ascending: false })
      .limit(5);

    const { data: topHooksBOFU } = await supabaseAdmin
      .from("hooks")
      .select("hook_text, hook_type, engagement_rate, funnel_stage, profiles(username)")
      .eq("funnel_stage", "bofu")
      .order("engagement_rate", { ascending: false })
      .limit(5);

    // 3. Top posts with highest engagement per funnel stage (competitor data)
    const { data: topPostsTOFU } = await supabaseAdmin
      .from("posts")
      .select("hook_text, hook_type, content_theme, engagement_rate, views_count, funnel_stage, caption, profiles(username)")
      .eq("funnel_stage", "tofu")
      .not("hook_text", "is", null)
      .order("engagement_rate", { ascending: false })
      .limit(8);

    const { data: topPostsMOFU } = await supabaseAdmin
      .from("posts")
      .select("hook_text, hook_type, content_theme, engagement_rate, views_count, funnel_stage, caption, profiles(username)")
      .eq("funnel_stage", "mofu")
      .not("hook_text", "is", null)
      .order("engagement_rate", { ascending: false })
      .limit(8);

    const { data: topPostsBOFU } = await supabaseAdmin
      .from("posts")
      .select("hook_text, hook_type, content_theme, engagement_rate, views_count, funnel_stage, caption, profiles(username)")
      .eq("funnel_stage", "bofu")
      .not("hook_text", "is", null)
      .order("engagement_rate", { ascending: false })
      .limit(8);

    // 4. Comment intent analysis - what does the audience want?
    const { data: purchaseComments } = await supabaseAdmin
      .from("comments")
      .select("text, intent_type")
      .eq("intent_type", "purchase_intent")
      .limit(10);

    const { data: questionComments } = await supabaseAdmin
      .from("comments")
      .select("text, intent_type")
      .eq("intent_type", "question")
      .limit(10);

    const { data: objectionComments } = await supabaseAdmin
      .from("comments")
      .select("text, intent_type")
      .eq("intent_type", "objection")
      .limit(10);

    const { data: voiceComments } = await supabaseAdmin
      .from("comments")
      .select("text, intent_type")
      .eq("intent_type", "audience_voice")
      .limit(10);

    // 5. Business config
    const { data: configs } = await supabaseAdmin
      .from("business_config")
      .select("section, data");

    const biz: Record<string, any> = {};
    for (const c of configs || []) biz[c.section] = c.data;

    // 6. Latest analyses - extract key insights
    const { data: analyses } = await supabaseAdmin
      .from("analyses")
      .select("full_analysis, top_hooks, funnel_distribution, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(3);

    // 7. Already generated carousels (avoid repetition)
    const { data: existingCarousels } = await supabaseAdmin
      .from("carousels")
      .select("template_id, topic, funnel_stage")
      .order("created_at", { ascending: false })
      .limit(20);

    // Build context for Claude
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

    const formatPosts = (posts: any[]) =>
      posts.map((p, i) => `${i + 1}. Hook: "${p.hook_text}" | Tema: ${p.content_theme} | Eng: ${((p.engagement_rate || 0) * 100).toFixed(1)}% | Views: ${p.views_count || 0} | @${(p as any).profiles?.username}`).join("\n");

    const formatHooks = (hooks: any[]) =>
      hooks.map((h, i) => `${i + 1}. "${h.hook_text}" (${h.hook_type}) — Eng: ${((h.engagement_rate || 0) * 100).toFixed(1)}% — @${(h as any).profiles?.username}`).join("\n");

    const formatComments = (comments: any[]) =>
      comments.map((c) => `- "${c.text?.slice(0, 120)}"`).join("\n");

    const existingTopics = (existingCarousels || []).map((c) => `- ${c.topic} (${c.funnel_stage})`).join("\n");

    const templatesRef = CAROUSEL_CATEGORIES.map((cat) => {
      const templates = CAROUSEL_TEMPLATES.filter((t) => t.category === cat.id);
      return `${cat.icon} ${cat.name} (${cat.funnelStage.toUpperCase()}):\n${templates.map((t) => `  - id: "${t.id}" | nome: "${t.name}" | ${t.cardCount} cards`).join("\n")}`;
    }).join("\n\n");

    const analysisInsights = (analyses || []).map((a) => {
      const text = a.full_analysis || "";
      const p4 = text.indexOf("PARTE 4");
      const relevant = p4 > 0 ? text.slice(p4, p4 + 1500) : text.slice(0, 1000);
      return `@${(a as any).profiles?.username}:\n${relevant}`;
    }).join("\n---\n");

    const prompt = `Analise TODA a inteligência abaixo e sugira os 5 melhores carrosséis que o @owallaceleite deveria produzir AGORA.

## SAÚDE DO FUNIL DO @owallaceleite
Distribuição atual: TOFU ${funnelPcts.tofu}% | MOFU ${funnelPcts.mofu}% | BOFU ${funnelPcts.bofu}%
Ideal: TOFU 50% | MOFU 35% | BOFU 15%
Gaps: TOFU ${funnelGaps.tofu > 0 ? "+" : ""}${funnelGaps.tofu}pp | MOFU ${funnelGaps.mofu > 0 ? "+" : ""}${funnelGaps.mofu}pp | BOFU ${funnelGaps.bofu > 0 ? "+" : ""}${funnelGaps.bofu}pp

## TOP POSTS CONCORRENTES — TOFU (Atração)
${formatPosts(topPostsTOFU || [])}

## TOP POSTS CONCORRENTES — MOFU (Conexão)
${formatPosts(topPostsMOFU || [])}

## TOP POSTS CONCORRENTES — BOFU (Autoridade)
${formatPosts(topPostsBOFU || [])}

## MELHORES HOOKS — TOFU
${formatHooks(topHooksTOFU || [])}

## MELHORES HOOKS — MOFU
${formatHooks(topHooksMOFU || [])}

## MELHORES HOOKS — BOFU
${formatHooks(topHooksBOFU || [])}

## O QUE A AUDIÊNCIA ESTÁ DIZENDO (Comentários Classificados)
Intenção de compra:
${formatComments(purchaseComments || []) || "Nenhum dado"}

Perguntas frequentes:
${formatComments(questionComments || []) || "Nenhum dado"}

Objeções:
${formatComments(objectionComments || []) || "Nenhum dado"}

Voz da audiência (dores/desejos):
${formatComments(voiceComments || []) || "Nenhum dado"}

## NEGÓCIO DO @owallaceleite
${bizContext || "Estrategista digital, marketing digital e infoprodutos para empreendedores digitais"}

## INTELIGÊNCIA REVERSA DOS CONCORRENTES
${analysisInsights || "Não disponível"}

## CARROSSÉIS JÁ GERADOS (evite repetir temas similares)
${existingTopics || "Nenhum ainda"}

## TEMPLATES DISPONÍVEIS (use os IDs exatos)
${templatesRef}

## REGRAS
1. Sugira EXATAMENTE 5 carrosséis — distribua entre TOFU, MOFU e BOFU priorizando os gaps do funil
2. Cada sugestão DEVE ser baseada em dados reais dos concorrentes (cite qual post/hook inspirou)
3. O tema deve ser adaptado ao posicionamento do @owallaceleite (marketing digital, infoprodutos, crescimento orgânico)
4. Escolha o template mais adequado ao tipo de conteúdo (use o ID exato da lista)
5. A justificativa deve explicar POR QUE esse carrossel agora, baseado nos dados
6. NÃO repita temas de carrosséis já gerados
7. Ordene por prioridade (o mais urgente/impactante primeiro)

## FORMATO DE SAÍDA
Retorne APENAS um JSON array válido:
[
  {
    "templateId": "id-exato-do-template",
    "templateName": "Nome do Template",
    "funnelStage": "tofu|mofu|bofu",
    "topic": "tema específico e direto do carrossel",
    "angle": "ângulo/abordagem específica",
    "priority": "alta|media",
    "reasoning": "justificativa baseada nos dados (cite métricas, hooks, comentários)",
    "inspiredBy": "qual post/hook/comentário inspirou esta sugestão",
    "expectedImpact": "que resultado esperar deste carrossel"
  }
]`;

    const result = await analyzeWithSonnet(
      `Você é um estrategista de conteúdo sênior que analisa dados de performance de Instagram para gerar recomendações acionáveis. Você cruza dados de engajamento, classificação de funil, análise de comentários e inteligência competitiva para sugerir os carrosséis com maior probabilidade de resultado. Responda APENAS com JSON válido.`,
      prompt
    );

    let suggestions: any[];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return NextResponse.json({ error: "Parse error", raw: result.text.slice(0, 500) }, { status: 500 });
    }

    const cost = ((result.inputTokens / 1_000_000) * 3 + (result.outputTokens / 1_000_000) * 15).toFixed(4);

    return NextResponse.json({
      suggestions,
      context: {
        funnel: funnelPcts,
        gaps: funnelGaps,
        totalPosts: total,
        competitorHooks: (topHooksTOFU?.length || 0) + (topHooksMOFU?.length || 0) + (topHooksBOFU?.length || 0),
        commentSignals: {
          purchaseIntent: purchaseComments?.length || 0,
          questions: questionComments?.length || 0,
          objections: objectionComments?.length || 0,
          audienceVoice: voiceComments?.length || 0,
        },
      },
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: `$${cost}`,
      },
    });
  } catch (error: any) {
    console.error("Suggestion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
