import { Network, NetworkStatus, PublishInput, PublishResult } from "./types";
import { instagramStatus, publishInstagram } from "./instagram";
import { publishYouTube, youtubeStatus } from "./youtube";
import { publishTikTok, tiktokStatus } from "./tiktok";

export type { Network, NetworkStatus, PublishInput, PublishResult };

export function publishTo(network: Network, input: PublishInput): Promise<PublishResult> {
  switch (network) {
    case "instagram": return publishInstagram(input);
    case "youtube": return publishYouTube(input);
    case "tiktok": return publishTikTok(input);
  }
}

export function networkStatuses(): NetworkStatus[] {
  return [instagramStatus(), youtubeStatus(), tiktokStatus()];
}
