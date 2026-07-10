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

    const [voice, { data: analyses }, { data: hooks }, { data: comments }] =
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
          .lte("engagement_rate", 1)
          .order("engagement_rate", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("comments")
          .select("text, intent_type")
          .in("intent_type", ["purchase_intent", "audience_voice", "objection", "question"])
          .limit(30),
      ]);

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

## CASES DE SUCESSO ENGENHEIRADOS (a base de tudo — replique os MECANISMOS, nunca o texto)
${caseInsights || "Sem análises ainda"}

## HOOKS CAMPEÕES DOS CASES (adapte à voz do Wallace, não copie)
${hooksBlock}

## VOZ REAL DA AUDIÊNCIA DO NICHO (comentários classificados — use como matéria-prima de temas)
${vozAudiencia}

## DATAS
${dates.map((d, i) => `Dia ${i + 1}: ${d} (${new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })})`).join("\n")}

## REGRAS DA DIREÇÃO
1. Mix de funil para perfil pequeno em crescimento: ~50% TOFU, ~30% MOFU, ~20% BOFU (o rafa.grandi roda BOFU 0 com 677k views — o Wallace NÃO pode; precisa converter enquanto cresce)
2. Todo reel: hook_verbal nos primeiros 3s que abre lacuna + hook_visual (ação/quebra de padrão — nunca "sentado falando")
3. Roteiro em beats: cada item do script = um momento do vídeo (ex: "0-3s HOOK", "3-15s CONTEXTO", "15-35s VIRADA", "35-50s ENTREGA", "50-60s CTA") com a fala COMPLETA, palavra por palavra, na voz do Wallace
4. CTA mecânico comprovado nos cases: "comenta [PALAVRA] que te mando no Direct" — variar a palavra por post
5. based_on: cite o case e o mecanismo específico que inspirou (ex: "rafa.grandi — tutorial de ferramenta com CTA de Direct, 22% eng")
6. why: por que ESTE post AGORA (gap de funil, dor da audiência, padrão comprovado)
7. kpi: a métrica que diz se funcionou (ex: "comentários com a palavra-chave > 30")
8. Teste da criança de 10 anos: se ela não entende o hook, reescreva
9. Temas 100% no território do Wallace: estratégia digital, IA aplicada a marketing, funis, infoprodutos, bastidor do próprio crescimento, TDAH/rotina real como tempero pessoal`;

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
