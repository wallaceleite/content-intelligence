import { supabaseAdmin } from "@/lib/supabase-admin";
import { Play } from "lucide-react";
import { SocialCards, SocialCardItem } from "@/components/social-cards";
import { SocialSyncButton } from "@/components/social-sync-button";

export const revalidate = 60;

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(n);

export default async function YouTubePage() {
  const { data: posts } = await supabaseAdmin
    .from("social_posts")
    .select("*")
    .eq("network", "youtube")
    .order("posted_at", { ascending: false })
    .limit(300);

  const items: SocialCardItem[] = (posts || []).map((p) => {
    const views = p.views_count || 0;
    const engajamento = views > 0 ? (((p.likes_count || 0) + (p.comments_count || 0)) / views) * 100 : 0;
    const likeRate = views > 0 ? ((p.likes_count || 0) / views) * 100 : 0;
    const commentRate = views > 0 ? ((p.comments_count || 0) / views) * 100 : 0;
    const days = p.posted_at ? Math.max((Date.now() - new Date(p.posted_at).getTime()) / 86400_000, 1) : 1;
    const viewsPerDay = views / days;
    const isShort = (p.duration_seconds || 0) > 0 && (p.duration_seconds || 0) <= 183;

    return {
      id: p.id,
      thumb: p.thumbnail_url,
      label: p.title || "Sem título",
      typeLabel: isShort ? "Short" : "Vídeo",
      permalink: p.permalink,
      postedAt: p.posted_at,
      stats: [
        { label: "Views", value: fmt(views) },
        { label: "Comentários", value: fmt(p.comments_count || 0) },
      ],
      accent: [
        { label: "Engajamento", value: `${engajamento.toFixed(1).replace(".", ",")}%` },
        { label: "Likes", value: fmt(p.likes_count || 0) },
      ],
      bars: [
        { label: "Like rate", value: likeRate, display: `${likeRate.toFixed(2).replace(".", ",")}%` },
        { label: "Comment rate", value: commentRate, display: `${commentRate.toFixed(2).replace(".", ",")}%` },
        { label: "Views/dia", value: viewsPerDay, display: fmt(Math.round(viewsPerDay)) },
      ],
      metrics: {
        posted: p.posted_at ? new Date(p.posted_at).getTime() : 0,
        views,
        engajamento,
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        velocidade: viewsPerDay,
      },
      searchText: [p.title, p.description].filter(Boolean).join(" "),
      group: isShort ? "shorts" : "videos",
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
            <Play className="w-5 h-5" style={{ color: "#FF0033" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
              Análise de Posts — YouTube
            </h1>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Canal Wallace Leite · {items.length} vídeos
              {posts?.[0]?.synced_at ? ` · sync ${new Date(posts[0].synced_at).toLocaleString("pt-BR")}` : ""}
            </p>
          </div>
        </div>
        <SocialSyncButton endpoint="/api/social/youtube/sync" />
      </div>

      <SocialCards
        items={items}
        defaultSort="posted"
        sortOptions={[
          { key: "posted", label: "Mais recentes" },
          { key: "views", label: "Views" },
          { key: "engajamento", label: "Engajamento" },
          { key: "likes", label: "Likes" },
          { key: "comments", label: "Comentários" },
          { key: "velocidade", label: "Views/dia" },
        ]}
        tabs={[
          { key: "shorts", label: "Shorts" },
          { key: "videos", label: "Vídeos" },
        ]}
      />
    </div>
  );
}
