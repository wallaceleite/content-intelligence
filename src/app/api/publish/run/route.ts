import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { publishTo, Network } from "@/lib/publishers";

export const maxDuration = 300;

const MAX_ATTEMPTS = 3;
const PER_NETWORK_TIMEOUT_MS = 240_000;
const STALE_PUBLISHING_MIN = 10;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${ms / 1000}s`)), ms)
    ),
  ]);
}

type PubRow = {
  id: string;
  network: string;
  attempts: number;
  title: string | null;
  caption: string | null;
  hashtags: string | null;
  videos: { public_url: string; title: string };
};

// Cada rede roda isolada e em paralelo: uma travar/falhar não bloqueia as outras.
async function processOne(pub: PubRow) {
  await supabaseAdmin
    .from("publications")
    .update({ status: "publicando", attempts: pub.attempts + 1, updated_at: new Date().toISOString() })
    .eq("id", pub.id);

  let result;
  try {
    result = await withTimeout(
      publishTo(pub.network as Network, {
        videoUrl: pub.videos.public_url,
        title: pub.title || pub.videos.title,
        caption: pub.caption || "",
        hashtags: pub.hashtags || "",
      }),
      PER_NETWORK_TIMEOUT_MS
    );
  } catch (e: unknown) {
    result = { ok: false as const, error: e instanceof Error ? e.message : "Erro inesperado" };
  }

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
    // Volta pra fila até esgotar tentativas; o tick de 5min re-processa
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

  return { id: pub.id, network: pub.network, ...result };
}

// Coração da confiabilidade (O2 do BRD): fila com redes em paralelo, timeout por
// rede, resgate de publicações órfãs (function morta no meio) e retry automático.
async function processQueue(ids?: string[]) {
  const now = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - STALE_PUBLISHING_MIN * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("publications")
    .select("*, videos(public_url, title)")
    .lt("attempts", MAX_ATTEMPTS);

  if (ids?.length) {
    query = query.in("id", ids).in("status", ["agendado", "falhou", "rascunho", "publicando"]);
  } else {
    // Devidas + órfãs: 'publicando' parado há 10min = execução anterior morreu
    query = query.or(
      `and(status.eq.agendado,scheduled_at.lte.${now}),and(status.eq.publicando,updated_at.lt.${staleCutoff})`
    );
  }

  const { data: due, error } = await query.limit(10);
  if (error) throw new Error(error.message);

  const settled = await Promise.allSettled((due || []).map((pub) => processOne(pub as PubRow)));
  return settled.map((s) =>
    s.status === "fulfilled" ? s.value : { ok: false, error: String(s.reason) }
  );
}

// GET - tick externo (GitHub Actions a cada 5min + cron diário da Vercel). Bearer CRON_SECRET.
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
