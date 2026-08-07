import { PublishInput, PublishResult } from "./types";

// Upload de Shorts via OAuth (refresh token). A YOUTUBE_API_KEY existente serve
// só para leitura — upload exige OAuth do canal.
// ATENÇÃO: projeto GCP não auditado publica vídeos como PRIVADOS (política do YouTube).
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`OAuth YouTube: ${json.error_description || json.error}`);
  return json.access_token;
}

export async function publishYouTube(input: PublishInput): Promise<PublishResult> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return { ok: false, error: "YouTube não conectado (faltam YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN)" };
  }

  try {
    const accessToken = await getAccessToken();

    const videoRes = await fetch(input.videoUrl);
    if (!videoRes.ok) return { ok: false, error: "Falha ao baixar vídeo do storage" };
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const description = [input.caption, input.hashtags].filter(Boolean).join("\n\n");
    const metadata = {
      snippet: {
        title: input.title || "Short",
        description,
        categoryId: "27", // Education
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    };

    // Upload multipart (metadata JSON + vídeo binário)
    const boundary = "ci_upload_boundary";
    const head = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([head, videoBuffer, tail]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    const uploaded = await uploadRes.json();
    if (uploaded.error) {
      return { ok: false, error: `YouTube upload: ${uploaded.error.message}` };
    }

    return {
      ok: true,
      externalId: uploaded.id,
      externalUrl: `https://www.youtube.com/shorts/${uploaded.id}`,
    };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro no upload YouTube" };
  }
}

export function youtubeStatus() {
  const connected = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
  return {
    network: "youtube" as const,
    connected,
    detail: connected
      ? "OAuth configurado (lembrete: projeto não auditado publica como privado)"
      : "Faltam YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN",
  };
}
