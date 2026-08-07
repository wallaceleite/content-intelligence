import { PublishInput, PublishResult } from "./types";

const IG_API = "https://graph.facebook.com/v26.0";
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_USER_ID = process.env.INSTAGRAM_USER_ID || "17841448475788199";

// Publicação de Reels via container: cria container → aguarda processamento → publica.
// Exige escopo instagram_content_publish no token (o de insights não basta).
export async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  if (!IG_TOKEN) return { ok: false, error: "INSTAGRAM_ACCESS_TOKEN ausente" };

  const caption = [input.caption, input.hashtags].filter(Boolean).join("\n\n");

  const createRes = await fetch(`${IG_API}/${IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: input.videoUrl,
      caption,
      share_to_feed: true,
      access_token: IG_TOKEN,
    }),
  });
  const container = await createRes.json();
  if (container.error) {
    return { ok: false, error: `IG container: ${container.error.message}` };
  }

  // Aguarda o container ficar pronto (vídeo é baixado e processado pela Meta)
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `${IG_API}/${container.id}?fields=status_code,status&access_token=${IG_TOKEN}`
    );
    const status = await statusRes.json();
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") {
      return { ok: false, error: `IG processamento: ${status.status || "erro no container"}` };
    }
  }

  const publishRes = await fetch(`${IG_API}/${IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: IG_TOKEN }),
  });
  const published = await publishRes.json();
  if (published.error) {
    return { ok: false, error: `IG publish: ${published.error.message}` };
  }

  // Busca o permalink do post publicado
  let externalUrl: string | undefined;
  try {
    const mediaRes = await fetch(
      `${IG_API}/${published.id}?fields=permalink&access_token=${IG_TOKEN}`
    );
    externalUrl = (await mediaRes.json()).permalink;
  } catch { /* permalink é opcional */ }

  return { ok: true, externalId: published.id, externalUrl };
}

export function instagramStatus() {
  return {
    network: "instagram" as const,
    connected: Boolean(IG_TOKEN),
    detail: IG_TOKEN
      ? "Token ativo (verificar escopo instagram_content_publish na 1ª publicação)"
      : "INSTAGRAM_ACCESS_TOKEN ausente",
  };
}
