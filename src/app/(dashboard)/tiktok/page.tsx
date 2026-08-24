import { supabaseAdmin } from "@/lib/supabase-admin";
import { Music2, AlertCircle, ExternalLink } from "lucide-react";
import { SocialCards, SocialCardItem } from "@/components/social-cards";
import { SocialSyncButton } from "@/components/social-sync-button";

export const revalidate = 60;

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(n);

export default async function TikTokPage() {
  const { data: posts } = await supabaseAdmin
    .from("social_posts")
    .select("*")
    .eq("network", "tiktok")
    .order("posted_at", { ascending: false })
    .limit(300);

  const items: SocialCardItem[] = (posts || []).map((p) => {
    const views = p.views_count || 0;
    const interactions = (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0);
    const engajamento = views > 0 ? (interactions / views) * 100 : 0;
    const likeRate = views > 0 ? ((p.likes_count || 0) / views) * 100 : 0;
    const shareRate = views > 0 ? ((p.shares_count || 0) / views) * 100 : 0;

    return {
      id: p.id,
      thumb: p.thumbnail_url,
      label: p.title || "Sem título",
      typeLabel: "Vídeo",
      permalink: p.permalink,
      postedAt: p.posted_at,
      stats: [
        { label: "Views", value: fmt(views) },
        { label: "Comentários", value: fmt(p.comments_count || 0) },
      ],
      accent: [
        { label: "Engajamento", value: `${engajamento.toFixed(1).replace(".", ",")}%` },
        { label: "Shares", value: fmt(p.shares_count || 0) },
      ],
      bars: [
        { label: "Like rate", value: likeRate, display: `${likeRate.toFixed(2).replace(".", ",")}%` },
        { label: "Share rate", value: shareRate, display: `${shareRate.toFixed(2).replace(".", ",")}%` },
      ],
      metrics: {
        posted: p.posted_at ? new Date(p.posted_at).getTime() : 0,
        views,
        engajamento,
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        shares: p.shares_count || 0,
      },
      searchText: [p.title, p.description].filter(Boolean).join(" "),
      group: "videos",
    };
  });

  // Sem o scope video.list ainda: mostra o que o app publicou como fallback
  const { data: published } = items.length === 0
    ? await supabaseAdmin
        .from("publications")
        .select("id, title, external_url, published_at")
        .eq("network", "tiktok")
        .eq("status", "publicado")
        .order("published_at", { ascending: false })
    : { data: null };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
            <Music2 className="w-5 h-5" style={{ color: "#00A8AD" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
              Análise de Posts — TikTok
            </h1>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              @owallaceleite · {items.length} vídeos
            </p>
          </div>
        </div>
        <SocialSyncButton endpoint="/api/social/tiktok/sync" />
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border p-5 mb-6 flex gap-3"
          style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EAB308" }} />
          <div className="text-sm space-y-1">
            <p className="font-medium">Métricas do TikTok ainda não liberadas</p>
            <p style={{ color: "var(--text-secondary)" }}>
              A conta foi conectada só com permissão de publicar. Para puxar views, likes e shares é
              preciso adicionar o scope <code>video.list</code> no app TikTok e reconectar a conta.
              Enquanto isso, os vídeos publicados pelo app aparecem abaixo.
            </p>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <SocialCards
          items={items}
          defaultSort="posted"
          sortOptions={[
            { key: "posted", label: "Mais recentes" },
            { key: "views", label: "Views" },
            { key: "engajamento", label: "Engajamento" },
            { key: "likes", label: "Likes" },
            { key: "shares", label: "Shares" },
            { key: "comments", label: "Comentários" },
          ]}
        />
      ) : (
        <div className="space-y-2">
          {(published || []).map((p) => (
            <div key={p.id} className="rounded-xl border p-3 flex items-center gap-3"
              style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
              <Music2 className="w-4 h-4" style={{ color: "#00A8AD" }} />
              <div className="flex-1">
                <div className="text-sm font-medium">{p.title || "—"}</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {p.published_at ? new Date(p.published_at).toLocaleString("pt-BR") : ""}
                </div>
              </div>
              {p.external_url && (
                <a href={p.external_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" style={{ color: "var(--accent)" }} />
                </a>
              )}
            </div>
          ))}
          {(published || []).length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nenhum vídeo publicado pelo app ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}
