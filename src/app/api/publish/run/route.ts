import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { publishTo, Network } from "@/lib/publishers";

export const maxDuration = 300;

const MAX_ATTEMPTS = 3;
const PER_NETWORK_TIMEOUT_MS = 240_000;
const STALE_PUBLISHING_MIN = 10;

// Arquitetura: cada publicação roda numa invocação PRÓPRIA (?single=<id>) com
// memória e tempo isolados. O fan-out acontece FORA da function (browser na UI,
// GitHub Actions no tick) — function chamando a si mesma dispara a proteção
// anti-recursão da Vercel e morre. GET sem params só LISTA o que está devido.

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
  videos: { public_url: string; title: string; cover_url?: string | null };
};

// Filha: processa exatamente UMA publicação nesta invocação
async function processSingle(pubId: string) {
  const { data: pub } = await supabaseAdmin
    .from("publications")
    // videos(*) e não a lista de colunas: segue funcionando se cover_url ainda não existir no banco
    .select("*, videos(*)")
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
        coverUrl: row.videos.cover_url || undefined,
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

// Lista o que está devido (+ órfãs em 'publicando' há 10min) — quem processa é a filha
async function listDue(): Promise<string[]> {
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
  return (data || []).map((d) => d.id);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const single = req.nextUrl.searchParams.get("single");
    if (single) return NextResponse.json(await processSingle(single));
    return NextResponse.json({ due: await listDue() });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro na fila" },
      { status: 500 }
    );
  }
}

// POST - UI: { publicationIds: [<UM id>] } — a página faz o fan-out (1 chamada por rede)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = body.publicationIds || [];
    if (ids.length !== 1) {
      return NextResponse.json(
        { error: "Envie exatamente 1 publicationId por chamada (fan-out no cliente)" },
        { status: 400 }
      );
    }
    return NextResponse.json(await processSingle(ids[0]));
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro na fila" },
      { status: 500 }
    );
  }
}
