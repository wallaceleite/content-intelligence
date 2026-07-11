import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateJSON } from "@/lib/anthropic";
import { getBrandVoice } from "@/lib/brand-voice";

export const maxDuration = 300;

const DIRECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["posts"],
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "planned_date", "format", "funnel_stage", "title", "hook_verbal",
          "hook_visual", "script", "legenda", "cta", "cta_word", "based_on", "why", "kpi",
        ],
        properties: {
          planned_date: { type: "string", format: "date" },
          format: { type: "string", enum: ["reel", "carrossel", "story", "imagem"] },
          funnel_stage: { type: "string", enum: ["tofu", "mofu", "bofu"] },
          title: { type: "string" },
          hook_verbal: { type: "string" },
          hook_visual: { type: "string" },
          script: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["momento", "fala"],
              properties: {
                momento: { type: "string" },
                fala: { type: "string" },
              },
            },
          },
          legenda: { type: "string" },
          cta: { type: "string" },
          cta_word: { type: "string" },
          based_on: { type: "string" },
          why: { type: "string" },
          kpi: { type: "string" },
        },
      },
    },
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const { days = 7 } = await req.json().catch(() => ({}));

    const [voice, { data: analyses }, { data: hooks }, { data: comments }, { data: artefatos }, { data: fewshot }, { data: previous }] =
      await Promise.all([
        getBrandVoice(),
        supabaseAdmin
          .from("analyses")
          .select("full_analysis, profiles(username)")
          .order("created_at", { ascending: false })
          .limit(4),
        supabaseAdmin
          .from("hooks")
          .select("hook_text, hook_type, engagement_rate, funnel_stage, profiles(username)")
          .lte("engagement_rate", 100)
          .order("engagement_rate", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("comments")
          .select("text, intent_type")
          .in("intent_type", ["purchase_intent", "audience_voice", "objection", "question"])
          .limit(30),
        supabaseAdmin
          .from("business_config")
          .select("section, data")
          .in("section", ["estruturas_vencedoras", "formatos_assinatura"]),
        supabaseAdmin
          .from("posts")
          .select("transcript, engagement_rate, video_duration, profiles(username)")
          .not("transcript", "is", null)
          .lte("engagement_rate", 100)
          .order("engagement_rate", { ascending: false })
          .limit(2),
        supabaseAdmin
          .from("direction_posts")
          .select("planned_date, title, funnel_stage, status, based_on")
          .order("planned_date", { ascending: false })
          .limit(14),
      ]);

    const art: Record<string, any> = {};
    for (const row of artefatos || []) art[row.section] = row.data;

    const fewshotBlock = (fewshot || [])
      .map((p) => `### EXEMPLO REAL @${(p as any).profiles?.username} (${p.engagement_rate?.toFixed(1)}% eng, ${Math.round(p.video_duration || 0)}s) — estude o RITMO e a estrutura:\n${String(p.transcript).slice(0, 2000)}`)
      .join("\n\n");

    const historico = (previous || [])
      .map((p) => `- ${p.planned_date} [${p.funnel_stage}] "${p.title}" — status: ${p.status}`)
      .join("\n");

    // 1 análise por perfil (a mais recente), fatia estratégica (Partes 2 e 4)
    const seen = new Set<string>();
    const caseInsights = (analyses || [])
      .filter((a) => {
        const u = (a as any).profiles?.username;
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .map((a) => {
        const text = a.full_analysis || "";
        const p2 = text.indexOf("PARTE 2");
        const p4 = text.indexOf("PARTE 4");
        const framework = p2 > 0 ? text.slice(p2, p2 + 2200) : "";
        const aplicada = p4 > 0 ? text.slice(p4, p4 + 2200) : "";
        return `### CASE @${(a as any).profiles?.username}\n${framework}\n${aplicada}`;
      })
      .join("\n\n");

    const hooksBlock = (hooks || [])
      .map((h) => `- [${h.funnel_stage}] "${h.hook_text}" (${h.hook_type}) — @${(h as any).profiles?.username}`)
      .join("\n");

    const vozAudiencia = (comments || [])
      .map((c) => `- (${c.intent_type}) "${String(c.text).slice(0, 110)}"`)
      .join("\n");

    const today = new Date();
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const prompt = `Gere a DIREÇÃO DE CONTEÚDO de ${days} dias para o @owallaceleite: um post por dia, cada um com roteiro COMPLETO pronto pra gravar/produzir.

## AS 3 FRANQUIAS ASSINATURA (monoflow — TODO post pertence a uma delas, respeite estrutura e frequência)
${JSON.stringify(art.formatos_assinatura?.formatos || [], null, 1)}

## ENGENHARIA DOS VENCEDORES (extraída das transcrições reais — siga os timings e a semeadura de CTA)
${JSON.stringify(art.estruturas_vencedoras || {}, null, 1)}

## TRANSCRIÇÕES-MODELO (few-shot de ritmo — NUNCA copie o texto, copie a arquitetura)
${fewshotBlock}

## HISTÓRICO RECENTE (continuidade: não repita temas; se houver "Diário do Invisível", continue a numeração dos episódios)
${historico || "Primeira semana"}

## CASES DE SUCESSO ENGENHEIRADOS (a base de tudo — replique os MECANISMOS, nunca o texto)
${caseInsights || "Sem análises ainda"}

## HOOKS CAMPEÕES DOS CASES (adapte à voz do Wallace, não copie)
${hooksBlock}

## VOZ REAL DA AUDIÊNCIA DO NICHO (comentários classificados — use como matéria-prima de temas)
${vozAudiencia}

## DATAS
${dates.map((d, i) => `Dia ${i + 1}: ${d} (${new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })})`).join("\n")}

## REGRAS DA DIREÇÃO
1. Rotação das franquias na semana: ~50% "IA na Prática" (TOFU), ~30% "Virada de Chave" (MOFU + 1 BOFU com case), ~20% "Diário do Invisível" (episódios numerados em sequência)
2. Cada roteiro segue a estrutura_beats EXATA da sua franquia, com os timings da engenharia dos vencedores (hook sem saudação, negação de fricção no início, semeadura de CTA aos ~55%, repetição aos ~95%)
3. script = fala COMPLETA palavra por palavra, na voz real do Wallace (léxico e construções extraídos dos posts dele — nada de "tamo junto let's go", nada de "secretos")
4. hook_verbal usa uma das anatomias comprovadas; hook_visual = ação na tela (nunca "sentado falando")
5. Palavra-gatilho do CTA = a palavra-tema central do post
6. based_on: case + mecanismo + número de evidência; why: por que este post agora; kpi: métrica concreta de sucesso
7. Teste da criança de 10 anos no hook
8. Oscilação emocional: nunca 2+ beats positivos seguidos em storytelling`;

    const { data: output, usage } = await generateJSON<{ posts: any[] }>({
      system: `Você é o diretor de conteúdo pessoal do @owallaceleite. Sua função é DIRIGIR: entregar posts prontos pra executar, não sugestões vagas. Cada roteiro sai pronto pra gravar — fala completa, palavra por palavra.\n\n${voice}`,
      prompt,
      schema: DIRECTION_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 16000,
    });

    // limpa direções futuras não executadas e insere as novas
    await supabaseAdmin
      .from("direction_posts")
      .delete()
      .gte("planned_date", dates[0])
      .eq("status", "sugerido");

    const { error } = await supabaseAdmin.from("direction_posts").insert(
      output.posts.map((p) => ({ ...p, status: "sugerido" }))
    );
    if (error) throw error;

    return NextResponse.json({
      success: true,
      posts: output.posts.length,
      cost: `$${usage.cost.toFixed(4)}`,
    });
  } catch (error: any) {
    console.error("Direction generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
