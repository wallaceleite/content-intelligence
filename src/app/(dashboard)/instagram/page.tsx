import { supabaseAdmin } from "@/lib/supabase-admin";
import { Camera } from "lucide-react";
import { SocialCards, SocialCardItem } from "@/components/social-cards";
import { SyncButton } from "@/components/dashboard/SyncButton";

export const revalidate = 60;

const MY_USERNAME = "owallaceleite";

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(n);

export default async function InstagramPage() {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, followers_count, last_synced_at")
    .eq("username", MY_USERNAME)
    .single();

  const { data: posts } = await supabaseAdmin
    .from("posts")
    .select("id, post_type, url, thumbnail_url, caption, hook_text, content_theme, funnel_stage, posted_at, views_count, likes_count, comments_count, shares_count, saves_count, reach_count, avg_watch_time_ms, engagement_rate")
    .eq("profile_id", profile?.id || "")
    .order("posted_at", { ascending: false })
    .limit(300);

  const items: SocialCardItem[] = (posts || []).map((p) => {
    const reach = p.reach_count || 0;
    const interactions = (p.likes_count || 0) + (p.comments_count || 0) + (p.saves_count || 0) + (p.shares_count || 0);
    const engajamento = reach > 0 ? (interactions / reach) * 100 : p.engagement_rate || 0;
    const saveRate = reach > 0 ? ((p.saves_count || 0) / reach) * 100 : 0;
    const shareRate = reach > 0 ? ((p.shares_count || 0) / reach) * 100 : 0;
    const watchSec = (p.avg_watch_time_ms || 0) / 1000;
    const isReel = p.post_type === "video";

    return {
      id: p.id,
      thumb: p.thumbnail_url,
      label: p.hook_text || (p.caption || "").split("\n")[0] || "Sem legenda",
      typeLabel: isReel ? "Reel" : p.post_type === "carousel" ? "Carrossel" : "Imagem",
      permalink: p.url,
      postedAt: p.posted_at,
      stats: [
        { label: "Views", value: fmt(p.views_count || 0) },
        { label: "Alcance", value: fmt(reach) },
      ],
      accent: [
        { label: "Engajamento", value: `${engajamento.toFixed(1).replace(".", ",")}%` },
        { label: "Saves", value: fmt(p.saves_count || 0) },
      ],
      bars: [
        { label: "Save rate", value: saveRate, display: `${saveRate.toFixed(2).replace(".", ",")}%` },
        { label: "Share rate", value: shareRate, display: `${shareRate.toFixed(2).replace(".", ",")}%` },
        ...(isReel && watchSec > 0
          ? [{ label: "Retenção", value: watchSec, display: `${watchSec.toFixed(1).replace(".", ",")}s` }]
          : []),
      ],
      metrics: {
        posted: p.posted_at ? new Date(p.posted_at).getTime() : 0,
        views: p.views_count || 0,
        reach,
        engajamento,
        saves: p.saves_count || 0,
        shares: p.shares_count || 0,
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        retencao: watchSec,
      },
      searchText: [p.caption, p.hook_text, p.content_theme, p.funnel_stage].filter(Boolean).join(" "),
      group: isReel ? "reels" : "static",
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
            <Camera className="w-5 h-5" style={{ color: "#D6249F" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
              Análise de Posts — Instagram
            </h1>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              @{MY_USERNAME} · {fmt(profile?.followers_count || 0)} seguidores
              {profile?.last_synced_at ? ` · sync ${new Date(profile.last_synced_at).toLocaleString("pt-BR")}` : ""}
            </p>
          </div>
        </div>
        <SyncButton />
      </div>

      <SocialCards
        items={items}
        defaultSort="posted"
        sortOptions={[
          { key: "posted", label: "Mais recentes" },
          { key: "views", label: "Views" },
          { key: "reach", label: "Alcance" },
          { key: "engajamento", label: "Engajamento" },
          { key: "saves", label: "Saves" },
          { key: "shares", label: "Shares" },
          { key: "retencao", label: "Retenção" },
        ]}
        tabs={[
          { key: "reels", label: "Reels" },
          { key: "static", label: "Fotos & Carrosséis" },
        ]}
      />
    </div>
  );
}
