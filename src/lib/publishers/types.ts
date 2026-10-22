export type Network = "youtube" | "instagram" | "tiktok";

export interface PublishInput {
  videoUrl: string; // URL pública do vídeo no Supabase Storage
  videoBytes?: Buffer; // buffer pré-baixado (compartilhado entre redes p/ não estourar memória)
  title: string;
  caption: string;
  hashtags: string;
  coverUrl?: string; // capa do Reels (JPEG público); só o Instagram usa
}

export interface PublishResult {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

export interface NetworkStatus {
  network: Network;
  connected: boolean;
  detail: string;
}
