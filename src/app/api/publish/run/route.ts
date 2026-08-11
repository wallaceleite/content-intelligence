import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { publishTo, Network } from "@/lib/publishers";

export const maxDuration = 300;

const MAX_ATTEMPTS = 3;
const PER_NETWORK_TIMEOUT_MS = 240_000;
const STALE_PUBLISHING_MIN = 10;

// Arquitetura dispatcher: a rota principal só ACHA o que está devido e dispara
// uma invocação-filha por publicação (?single=<id>). Cada filha é uma function
// separada com memória e tempo próprios — vídeo de 234MB numa rede não derruba
// as outras (OOM) nem estoura o tempo da execução única.

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") === `Bearer ${secret}`;
}

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

// Filha: processa exatamente UMA publicação nesta invocação
async function processSingle(pubId: string) {
  const { data: pub } = await supabaseAdmin
    .from("publications")
    .select("*, videos(public_url, title)")
    .eq("id", pubId)
    .in("status", ["agendado", "falhou", "rascunho", "publicando"])
    .lt("attempts", MAX_ATTEMPTS)
    .single();
  if (!pub) return { id: pubId, ok: false, error: "Publicação não elegível" };

  const row = pub as PubRow;
  await supabaseAdmin
    .from("publications")
    .update({ status: "publicando", attempts: row.attempts + 1, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  let result;
  try {
    result = await withTimeout(
      publishTo(row.network as Network, {
        videoUrl: row.videos.public_url,
        title: row.title || row.videos.title,
        caption: row.caption || "",
        hashtags: row.hashtags || "",
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
      .eq("id", row.id);
  } else {
    const exhausted = row.attempts + 1 >= MAX_ATTEMPTS;
    await supabaseAdmin
      .from("publications")
      .update({
        status: exhausted ? "falhou" : "agendado",
        error_message: result.error || "Falha desconhecida",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  return { id: row.id, network: row.network, ...result };
}

// Dispatcher: acha devidas (+ órfãs em 'publicando' há 10min) e chama uma filha por id
async function dispatch(origin: string, ids?: string[]) {
  let due = ids;
  if (!due) {
    const now = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - STALE_PUBLISHING_MIN * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("publications")
      .select("id")
      .lt("attempts", MAX_ATTEMPTS)
      .or(
        `and(status.eq.agendado,scheduled_at.lte.${now}),and(status.eq.publicando,updated_at.lt.${staleCutoff})`
      )
      .limit(10);
    if (error) throw new Error(error.message);
    due = (data || []).map((d) => d.id);
  }
  if (!due.length) return [];

  const secret = process.env.CRON_SECRET;
  const settled = await Promise.allSettled(
    due.map(async (id) => {
      const res = await fetch(`${origin}/api/publish/run?single=${id}`, {
        headers: secret ? { Authorization: `Bearer ${secret}` } : {},
        signal: AbortSignal.timeout(PER_NETWORK_TIMEOUT_MS + 30_000),
      });
      return res.json();
    })
  );
  return settled.map((s) =>
    s.status === "fulfilled" ? s.value : { ok: false, error: String(s.reason) }
  );
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const single = req.nextUrl.searchParams.get("single");
    if (single) return NextResponse.json(await processSingle(single));
    const results = await dispatch(req.nextUrl.origin);
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
    const results = await dispatch(req.nextUrl.origin, body.publicationIds);
    return NextResponse.json({ processed: results.length, results });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro na fila" },
      { status: 500 }
    );
  }
}
