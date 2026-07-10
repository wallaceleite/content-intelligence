import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateJSON } from "@/lib/anthropic";

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["plan"],
  properties: {
    plan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "planned_date", "funnel_stage", "content_type", "topic",
          "hook_angle", "cta_type", "reference_profile", "notes",
        ],
        properties: {
          planned_date: { type: "string", format: "date" },
          funnel_stage: { type: "string", enum: ["tofu", "mofu", "bofu"] },
          content_type: { type: "string" },
          topic: { type: "string" },
          hook_angle: { type: "string" },
          cta_type: { type: "string", enum: ["soft", "medium", "hard"] },
          reference_profile: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
  },
} as const;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { days = 7 } = await req.json();

    // 1. Get business config
    const { data: configs } = await supabaseAdmin
      .from("business_config")
      .select("section, data");

    const biz: Record<string, any> = {};
    for (const c of configs || []) biz[c.section] = c.data;

    // 2. Get benchmarks
    const { data: benchmarks } = await supabaseAdmin
      .from("strategy_benchmarks")
      .select("key, label, value, unit");

    // 3. Get top hooks from competitors
    const { data: hooks } = await supabaseAdmin
      .from("hooks")
      .select("hook_text, hook_type, engagement_rate, profiles(username)")
      .order("engagement_rate", { ascending: false })
      .limit(20);

    // 4. Get latest analyses summaries
    const { data: analyses } = await supabaseAdmin
      .from("analyses")
      .select("full_analysis, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(3);

    // Build context
    const bizContext = Object.entries(biz)
      .map(([section, data]) => {
        const fields = Object.entries(data as Record<string, any>)
          .filter(([, v]) => v)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n");
        return `${section.toUpperCase()}:\n${fields}`;
      })
      .join("\n\n");

    const benchContext = (benchmarks || [])
      .map((b) => `- ${b.label}: ${b.value}${b.unit}`)
      .join("\n");

    const hooksContext = (hooks || [])
      .slice(0, 10)
      .map((h, i) => `${i + 1}. "${h.hook_text}" (${h.hook_type}) — @${(h as any).profiles?.username}`)
      .join("\n");

    // Extract key insights from analyses (truncated)
    const insightsContext = (analyses || [])
      .map((a) => {
        const text = a.full_analysis || "";
        // Get PARTE 4 (applied intelligence) if exists
        const p4 = text.indexOf("PARTE 4");
        const relevant = p4 > 0 ? text.slice(p4, p4 + 2000) : text.slice(0, 1500);
        return `@${(a as any).profiles?.username}:\n${relevant}`;
      })
      .join("\n\n---\n\n");

    const today = new Date();
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const prompt = `Gere um plano de conteúdo de ${days} dias para @owallaceleite.

## DADOS DO NEGÓCIO
${bizContext || "Não preenchido ainda — gere um plano genérico para estrategista digital"}

## BENCHMARKS DE MERCADO
${benchContext}

## MELHORES HOOKS DOS CONCORRENTES
${hooksContext}

## INTELIGÊNCIA DOS CONCORRENTES
${insightsContext}

## DATAS
${dates.map((d, i) => `Dia ${i + 1}: ${d} (${new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })})`).join("\n")}

## REGRAS
- Mix de funil: ~50% TOFU, ~35% MOFU, ~15% BOFU
- Pelo menos 1 post BOFU na semana
- Pelo menos 2 vídeos tipo "como fazer" (formato de maior engajamento comprovado nos benchmarks)
- Hooks baseados nos melhores dos concorrentes adaptados
- CTAs variados (soft, medium, hard)
- Temas alinhados aos pilares de conteúdo do negócio
- Um item por data listada, content_type entre: reel, carrossel, imagem, story`;

    const { data: output, usage } = await generateJSON<{ plan: any[] }>({
      system:
        "Você é um social media estrategista sênior. Gere planos de conteúdo acionáveis e específicos — cada item pronto para ser executado sem pesquisa adicional.",
      prompt,
      schema: PLAN_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 6000,
    });
    const plan = output.plan;

    // Save to strategy_plan
    const rows = plan.map((item: any) => ({
      planned_date: item.planned_date,
      funnel_stage: item.funnel_stage,
      content_type: item.content_type,
      topic: item.topic,
      hook_angle: item.hook_angle,
      cta_type: item.cta_type,
      reference_profile: item.reference_profile,
      notes: item.notes,
      status: "planned",
    }));

    // Clear existing future plans
    await supabaseAdmin
      .from("strategy_plan")
      .delete()
      .gte("planned_date", today.toISOString().split("T")[0])
      .eq("status", "planned");

    const { error } = await supabaseAdmin.from("strategy_plan").insert(rows);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      days: plan.length,
      cost: `$${usage.cost.toFixed(4)}`,
    });
  } catch (error: any) {
    console.error("Plan generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
