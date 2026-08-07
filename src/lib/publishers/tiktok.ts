import { supabaseAdmin } from "@/lib/supabase-admin";
import { PublishInput, PublishResult } from "./types";

// TikTok Content Posting API direta (app "Content Intelligence" no portal dev).
// Enquanto o app não passa pela auditoria do TikTok, roda no SANDBOX:
// o vídeo vai como RASCUNHO pra caixa de entrada do TikTok (modo inbox) e o
// Wallace publica em 2 toques no celular. Pós-auditoria: trocar pro modo direct.
// Tokens rotacionam (access 24h, refresh 365d e roda a cada refresh) — ficam
// na tabela oauth_tokens, nunca em env var.
const TT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TT_API = "https://open.tiktokapis.com/v2";

export async function getTikTokAccessToken(): Promise<string> {
  const { data: row } = await supabaseAdmin
    .from("oauth_tokens")
    .select("*")
    .eq("provider", "tiktok")
    .single();
  if (!row) throw new Error("TikTok não conectado (sem token no banco — refazer OAuth em /api/tiktok/callback)");

  const expiresSoon = !row.expires_at || new Date(row.expires_at).getTime() < Date.now() + 5 * 60 * 1000;
  if (!expiresSoon) return row.access_token;

  const res = await fetch(`${TT_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TT_KEY!,
      client_secret: TT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`TikTok refresh falhou: ${json.error_description || json.error || "erro desconhecido"}`);
  }

  await supabaseAdmin
    .from("oauth_tokens")
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token || row.refresh_token,
      expires_at: new Date(Date.now() + (json.expires_in || 86400) * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + (json.refresh_expires_in || 31536000) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "tiktok");

  return json.access_token;
}

export async function publishTikTok(input: PublishInput): Promise<PublishResult> {
  if (!TT_KEY || !TT_SECRET) {
    return { ok: false, error: "Faltam TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET" };
  }

  try {
    const accessToken = await getTikTokAccessToken();

    const videoRes = await fetch(input.videoUrl);
    if (!videoRes.ok) return { ok: false, error: "Falha ao baixar vídeo do storage" };
    const video = Buffer.from(await videoRes.arrayBuffer());

    // Modo inbox (rascunho): título/legenda são definidos pelo criador ao publicar no app
    const initRes = await fetch(`${TT_API}/post/publish/inbox/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: video.length,
          chunk_size: video.length,
          total_chunk_count: 1,
        },
      }),
    });
    const init = await initRes.json();
    if (init.error?.code && init.error.code !== "ok") {
      return { ok: false, error: `TikTok init: ${init.error.message || init.error.code}` };
    }

    const uploadRes = await fetch(init.data.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes 0-${video.length - 1}/${video.length}`,
      },
      body: video,
    });
    if (!uploadRes.ok) {
      return { ok: false, error: `TikTok upload: HTTP ${uploadRes.status}` };
    }

    return {
      ok: true,
      externalId: init.data.publish_id,
      // Rascunho não tem URL pública — o post nasce na caixa de entrada do app
      externalUrl: undefined,
    };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro no TikTok" };
  }
}

export function tiktokStatus() {
  const connected = Boolean(TT_KEY && TT_SECRET);
  return {
    network: "tiktok" as const,
    connected,
    detail: connected
      ? "API direta (sandbox) — vídeo cai como rascunho na caixa de entrada do TikTok"
      : "Faltam TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET",
  };
}
