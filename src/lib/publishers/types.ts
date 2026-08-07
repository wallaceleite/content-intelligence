export type Network = "youtube" | "instagram" | "tiktok";

export interface PublishInput {
  videoUrl: string; // URL pública do vídeo no Supabase Storage
  title: string;
  caption: string;
  hashtags: string;
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
