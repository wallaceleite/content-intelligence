import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import { BarChart3, TrendingUp, MessageSquare, Heart, Eye, Zap, Target, ArrowUpRight } from "lucide-react";

export const revalidate = 60;

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: batches } = await supabaseAdmin
    .from("batches")
    .select("*")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });

  const latestBatch = batches?.[0];

  const { data: posts } = latestBatch
    ? await supabaseAdmin
        .from("posts")
        .select("*")
        .eq("batch_id", latestBatch.id)
        .order("engagement_rate", { ascending: false })
    : { data: [] };

  const { data: analysisRows } = latestBatch
    ? await supabaseAdmin
        .from("analyses")
        .select("*")
        .eq("batch_id", latestBatch.id)
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] };
  const analysis = analysisRows?.[0] || null;

  // Stats
  const totalViews = posts?.reduce((s, p) => s + p.views_count, 0) || 0;
  const totalLikes = posts?.reduce((s, p) => s + p.likes_count, 0) || 0;
  const totalComments = posts?.reduce((s, p) => s + p.comments_count, 0) || 0;
  const avgEngagement = posts?.length
    ? Math.round(
        (posts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / posts.length) * 100
      ) / 100
    : 0;

  const funnelDist = {
    tofu: posts?.filter((p) => p.funnel_stage === "tofu").length || 0,
    mofu: posts?.filter((p) => p.funnel_stage === "mofu").length || 0,
    bofu: posts?.filter((p) => p.funnel_stage === "bofu").length || 0,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xl font-bold">
          {profile.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">@{profile.username}</h1>
          <p className="text-[var(--muted-foreground)]">
            {profile.full_name}
            {profile.followers_count &&
              ` — ${profile.followers_count.toLocaleString("pt-BR")} seguidores`}
          </p>
        </div>
        {latestBatch && (
          <span
            className={`ml-auto px-3 py-1 rounded-full text-sm ${
              latestBatch.status === "completed"
                ? "bg-green-500/10 text-green-400"
                : "bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {latestBatch.status}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Views Total", value: totalViews.toLocaleString("pt-BR"), icon: Eye, color: "text-blue-400" },
          { label: "Likes Total", value: totalLikes.toLocaleString("pt-BR"), icon: Heart, color: "text-pink-400" },
          { label: "Comentários", value: totalComments.toLocaleString("pt-BR"), icon: MessageSquare, color: "text-green-400" },
          { label: "Eng. Médio", value: `${avgEngagement}%`, icon: TrendingUp, color: "text-purple-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-[var(--muted-foreground)]">{stat.label}</span>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel Distribution */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--accent)]" />
          Distribuição de Funil
        </h2>
        <div className="flex gap-4">
          {[
            { stage: "TOFU", count: funnelDist.tofu, color: "bg-blue-500", desc: "Topo — Atração" },
            { stage: "MOFU", count: funnelDist.mofu, color: "bg-yellow-500", desc: "Meio — Educação" },
            { stage: "BOFU", count: funnelDist.bofu, color: "bg-green-500", desc: "Fundo — Conversão" },
          ].map((f) => {
            const total = (funnelDist.tofu + funnelDist.mofu + funnelDist.bofu) || 1;
            const pct = Math.round((f.count / total) * 100);
            return (
              <div key={f.stage} className="flex-1">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium">{f.stage}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{f.count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div className={`h-full ${f.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Posts */}
      <div className="glass-card mb-8">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--accent)]" />
            Top Posts por Engajamento
          </h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {posts?.slice(0, 15).map((post, i) => (
            <div key={post.id} className="p-4 flex items-center gap-4 hover:bg-[var(--muted)]/50">
              <span className="text-sm font-mono text-[var(--muted-foreground)] w-6">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {post.shortcode}
                  </span>
                  {post.funnel_stage && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${
                        post.funnel_stage === "tofu"
                          ? "bg-blue-500/10 text-blue-400"
                          : post.funnel_stage === "mofu"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {post.funnel_stage}
                    </span>
                  )}
                  {post.cta_type && post.cta_type !== "none" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400">
                      CTA: {post.cta_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                  {post.hook_text || post.caption?.slice(0, 80) || "—"}
                </p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="text-[var(--foreground)]">
                  {post.views_count.toLocaleString("pt-BR")} views
                </div>
                <div className="text-[var(--muted-foreground)]">
                  {post.engagement_rate}% eng
                </div>
              </div>
              {post.outlier_score >= 2 && (
                <ArrowUpRight className="w-4 h-4 text-green-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Analysis */}
      {analysis?.full_analysis && (
        <div className="glass-card">
          <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              Engenharia Reversa Completa
            </h2>
            <span className="text-xs text-[var(--muted-foreground)]">
              {analysis.model_used} — ${analysis.cost_estimate}
            </span>
          </div>
          <div
            className="p-6 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(analysis.full_analysis),
            }}
          />
        </div>
      )}
    </div>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^#### (.*$)/gm, "<h4>$1</h4>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}
