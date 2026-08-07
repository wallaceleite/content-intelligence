import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { publishTo, Network } from "@/lib/publishers";

export const maxDuration = 300;

const MAX_ATTEMPTS = 3;

// Coração da confiabilidade (O2 do BRD): executa a fila, tenta de novo em falha,
// e nunca falha em silêncio — status por publicação sempre visível na UI.
async function processQueue(ids?: string[]) {
  let query = supabaseAdmin
    .from("publications")
    .select("*, videos(public_url, title)")
    .lt("attempts", MAX_ATTEMPTS);

  if (ids?.length) {
    query = query.in("id", ids).in("status", ["agendado", "falhou", "rascunho"]);
  } else {
    query = query
      .eq("status", "agendado")
      .lte("scheduled_at", new Date().toISOString());
  }

  const { data: due, error } = await query.limit(10);
  if (error) throw new Error(error.message);

  const results = [];
  for (const pub of due || []) {
    await supabaseAdmin
      .from("publications")
      .update({ status: "publicando", attempts: pub.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", pub.id);

    const result = await publishTo(pub.network as Network, {
      videoUrl: pub.videos.public_url,
      title: pub.title || pub.videos.title,
      caption: pub.caption || "",
      hashtags: pub.hashtags || "",
    });

    if (result.ok) {
      await supabaseAdmin
        .from("publications")
        .update({
          status: "publicado",
          published_at: new Date().toISOString(),
          external_id: result.externalId || null,
          external_url: result.externalUrl || null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pub.id);
    } else {
      // Volta pra fila até esgotar tentativas; o cron re-processa
      const exhausted = pub.attempts + 1 >= MAX_ATTEMPTS;
      await supabaseAdmin
        .from("publications")
        .update({
          status: exhausted ? "falhou" : "agendado",
          error_message: result.error || "Falha desconhecida",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pub.id);
    }

    results.push({ id: pub.id, network: pub.network, ...result });
  }
  return results;
}

// GET - Vercel Cron (a cada 5min). Protegido por CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const results = await processQueue();
    return NextResponse.json({ processed: results.length, results });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro na fila" },
      { status: 500 }
    );
  }
}

// POST - "Publicar agora" / "Tentar de novo" da UI: { publicationIds: [...] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const results = await processQueue(body.publicationIds);
    return NextResponse.json({ processed: results.length, results });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro na fila" },
      { status: 500 }
    );
  }
}
