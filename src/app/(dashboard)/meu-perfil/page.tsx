import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  BarChart3, TrendingUp, TrendingDown, Eye, Heart, MessageSquare,
  Target, Zap, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  Users, Clock, Hash, FileText, Flame, Shield, Lightbulb, Calendar
} from "lucide-react";
import { GrowthChart, FunnelDonut, PerformanceBar, BenchmarkRadar } from "@/components/dashboard/Charts";
import { AnimatedStatCard } from "@/components/dashboard/AnimatedStatCard";
import { AnimatedSection } from "@/components/dashboard/AnimatedSection";
import { AnimatedBar } from "@/components/dashboard/Animate";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { FollowerGrowthChart } from "@/components/dashboard/FollowerGrowthChart";
import { GenderDonut, AgeBarChart, CityBarChart } from "@/components/dashboard/DemographicsCharts";
import { subDays, format, parseISO } from "date-fns";

export const revalidate = 60;

const MY_USERNAME = "owallaceleite";

function getDateRange(period: string, from?: string, to?: string) {
  const end = new Date();
  if (period === "custom" && from && to) {
    return { start: parseISO(from), end: parseISO(to) };
  }
  if (period === "all") {
    return { start: new Date("2020-01-01"), end };
  }
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  return { start: subDays(end, days), end };
}

function postLabel(post: any): string {
  if (post.hook_text && post.hook_text.length > 5) return post.hook_text.slice(0, 55) + (post.hook_text.length > 55 ? "..." : "");
  if (post.caption) {
    const firstLine = post.caption.split(/[\n]/)[0]?.trim() || "";
    return firstLine.slice(0, 55) + (firstLine.length > 55 ? "..." : "");
  }
  return post.shortcode || "—";
}

function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <h2 className="font-semibold flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      {title}
    </h2>
  );
}

export default async function MeuPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const period = params.period || "30d";
  const { start: dateStart, end: dateEnd } = getDateRange(period, params.from, params.to);
  const startStr = dateStart.toISOString().split("T")[0];
  const endStr = dateEnd.toISOString().split("T")[0];

  // Get my profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("username", MY_USERNAME)
    .single();

  if (!profile) {
    return (
      <div className="glass-card p-12 text-center">
        <Users className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Perfil @{MY_USERNAME} não encontrado</h3>
        <p className="text-[var(--muted-foreground)] text-sm">Execute o workflow no n8n para o seu perfil primeiro.</p>
      </div>
    );
  }

  // Get latest batch
  const { data: batches } = await supabaseAdmin
    .from("batches")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const batch = batches?.[0];

  // Get all my posts (latest batch)
  const { data: posts } = batch
    ? await supabaseAdmin
        .from("posts")
        .select("*")
        .eq("batch_id", batch.id)
        .order("engagement_rate", { ascending: false })
    : { data: [] };

  // Get latest analysis
  const { data: analysisRows } = batch
    ? await supabaseAdmin
        .from("analyses")
        .select("*")
        .eq("batch_id", batch.id)
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] };

  const analysis = analysisRows?.[0];

  // Get my hooks
  const { data: hooks } = await supabaseAdmin
    .from("hooks")
    .select("*")
    .eq("profile_id", profile.id)
    .order("engagement_rate", { ascending: false })
    .limit(10);

  // Get all comments for my posts
  const postIds = posts?.map((p) => p.id) || [];
  const { data: allComments } = postIds.length
    ? await supabaseAdmin
        .from("comments")
        .select("*")
        .in("post_id", postIds)
    : { data: [] };

  // Get competitor profiles for benchmarking
  const { data: competitors } = await supabaseAdmin
    .from("profiles")
    .select("username, followers_count")
    .neq("username", MY_USERNAME);

  // Get competitor avg engagement
  const { data: competitorPosts } = await supabaseAdmin
    .from("posts")
    .select("engagement_rate, profile_id, profiles(username)")
    .neq("profile_id", profile.id)
    .not("engagement_rate", "is", null);

  // Get daily snapshots for followers chart
  let snapshots: any[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("daily_snapshots")
      .select("snapshot_date, followers_count")
      .eq("profile_id", profile.id)
      .gte("snapshot_date", startStr)
      .lte("snapshot_date", endStr)
      .order("snapshot_date", { ascending: true });
    snapshots = data || [];
  } catch { /* table may not exist yet */ }

  const followerChartData = snapshots.map((s: any) => ({
    date: format(parseISO(s.snapshot_date), "dd/MM"),
    followers: s.followers_count,
  }));

  // Get demographics
  let demographics: any[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("audience_demographics")
      .select("metric_type, dimension, value")
      .eq("profile_id", profile.id);
    demographics = data || [];
  } catch { /* table may not exist yet */ }

  const genderData = demographics
    .filter((d: any) => d.metric_type === "gender")
    .map((d: any) => ({
      name: d.dimension === "M" ? "Masculino" : d.dimension === "F" ? "Feminino" : "Outro",
      value: Number(d.value),
      color: d.dimension === "M" ? "#3B82F6" : d.dimension === "F" ? "#ec4899" : "#8B5CF6",
    }));

  const ageData = demographics
    .filter((d: any) => d.metric_type === "age")
    .sort((a: any, b: any) => a.dimension.localeCompare(b.dimension))
    .map((d: any) => ({ name: d.dimension, value: Number(d.value) }));

  const cityData = demographics
    .filter((d: any) => d.metric_type === "city")
    .sort((a: any, b: any) => Number(b.value) - Number(a.value))
    .slice(0, 10)
    .map((d: any) => ({ name: d.dimension, value: Number(d.value) }));

  // === CALCULATE METRICS ===
  const allPosts = posts || [];
  const videos = allPosts.filter((p) => p.post_type === "video");
  const carousels = allPosts.filter((p) => p.post_type === "carousel");
  const images = allPosts.filter((p) => p.post_type === "image");

  const totalViews = allPosts.reduce((s, p) => s + (p.views_count || 0), 0);
  const totalLikes = allPosts.reduce((s, p) => s + (p.likes_count || 0), 0);
  const totalComments = allPosts.reduce((s, p) => s + (p.comments_count || 0), 0);
  const totalSaves = allPosts.reduce((s, p) => s + (p.saves_count || 0), 0);
  const totalShares = allPosts.reduce((s, p) => s + (p.shares_count || 0), 0);
  const totalReach = allPosts.reduce((s, p) => s + (p.reach_count || 0), 0);
  const avgEng = allPosts.length
    ? Math.round((allPosts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / allPosts.length) * 100) / 100
    : 0;

  // Competitor benchmark
  const compAvgEng = competitorPosts?.length
    ? Math.round((competitorPosts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / competitorPosts.length) * 100) / 100
    : 0;

  // Engagement by post type
  const engByType = (type: string) => {
    const filtered = allPosts.filter((p) => p.post_type === type);
    if (!filtered.length) return 0;
    return Math.round((filtered.reduce((s, p) => s + (p.engagement_rate || 0), 0) / filtered.length) * 100) / 100;
  };

  // Funnel distribution
  const funnel = {
    tofu: allPosts.filter((p) => p.funnel_stage === "tofu").length,
    mofu: allPosts.filter((p) => p.funnel_stage === "mofu").length,
    bofu: allPosts.filter((p) => p.funnel_stage === "bofu").length,
    unclassified: allPosts.filter((p) => !p.funnel_stage).length,
  };
  const funnelTotal = funnel.tofu + funnel.mofu + funnel.bofu + funnel.unclassified || 1;

  // Comment intent distribution
  const comments = allComments || [];
  const commentIntents = {
    purchase: comments.filter((c) => c.intent_type === "purchase_intent").length,
    praise: comments.filter((c) => c.intent_type === "praise").length,
    question: comments.filter((c) => c.intent_type === "question").length,
    objection: comments.filter((c) => c.intent_type === "objection").length,
    audience_voice: comments.filter((c) => c.intent_type === "audience_voice").length,
    neutral: comments.filter((c) => !c.intent_type || c.intent_type === "neutral").length,
  };

  // Top and bottom performers
  const top5 = allPosts.slice(0, 5);
  const bottom5 = [...allPosts].sort((a, b) => (a.engagement_rate || 0) - (b.engagement_rate || 0)).slice(0, 5);

  // CTA distribution
  const ctaDist = {
    none: allPosts.filter((p) => !p.cta_type || p.cta_type === "none").length,
    soft: allPosts.filter((p) => p.cta_type === "soft").length,
    medium: allPosts.filter((p) => p.cta_type === "medium").length,
    hard: allPosts.filter((p) => p.cta_type === "hard").length,
  };

  // Avg duration for videos
  const avgDuration = videos.length
    ? Math.round(videos.reduce((s, p) => s + (p.video_duration || 0), 0) / videos.length)
    : 0;

  // Content themes
  const themes: Record<string, number> = {};
  allPosts.forEach((p) => {
    if (p.content_theme && p.content_theme !== "não classificado") {
      themes[p.content_theme] = (themes[p.content_theme] || 0) + 1;
    }
  });
  const topThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{
          background: "linear-gradient(135deg, var(--accent), var(--primary-700))",
          color: "var(--accent-foreground)",
        }}>
          W
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">@{MY_USERNAME}</h1>
          <p className="text-[var(--muted-foreground)]">
            {profile.full_name} — Dashboard Estratégico
          </p>
        </div>
        {batch && (
          <div className="text-right text-xs text-[var(--muted-foreground)]">
            <p>Última análise: {new Date(batch.created_at).toLocaleDateString("pt-BR")}</p>
            <p>{allPosts.length} posts analisados</p>
          </div>
        )}
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <PeriodFilter />
      </div>

      {/* Sync button */}
      <SyncButton lastSync={profile.last_synced_at} />

      {/* KPIs Row 1 — Visão Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
        <AnimatedStatCard label="Seguidores" value={profile.followers_count?.toLocaleString("pt-BR") || "—"} iconName="Users" color="text-blue-400" delay={0} />
        <AnimatedStatCard label="Posts" value={allPosts.length.toString()} sub={`${videos.length} vídeos | ${carousels.length} carrosséis | ${images.length} imgs`} iconName="FileText" color="text-[var(--accent)]" delay={60} />
        <AnimatedStatCard label="Views Total" value={totalViews.toLocaleString("pt-BR")} iconName="Eye" color="text-cyan-400" delay={120} />
        <AnimatedStatCard label="Likes Total" value={totalLikes.toLocaleString("pt-BR")} iconName="Heart" color="text-pink-400" delay={180} />
        <AnimatedStatCard label="Comentários" value={totalComments.toLocaleString("pt-BR")} iconName="MessageSquare" color="text-green-400" delay={240} />
        <AnimatedStatCard
          label="Eng. Médio"
          value={`${avgEng}%`}
          sub={compAvgEng ? `Concorrentes: ${compAvgEng}%` : undefined}
          iconName="TrendingUp"
          color="text-yellow-400"
          trend={avgEng > compAvgEng ? "up" : avgEng < compAvgEng ? "down" : "neutral"}
          delay={300}
        />
      </div>

      {/* KPIs Row 2 — Métricas Premium (Instagram API) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <AnimatedStatCard label="Saves Total" value={totalSaves.toLocaleString("pt-BR")} sub="Intenção de compra" iconName="CheckCircle" color="text-emerald-400" delay={360} />
        <AnimatedStatCard label="Shares Total" value={totalShares.toLocaleString("pt-BR")} sub="Referência social" iconName="ArrowUpRight" color="text-blue-400" delay={420} />
        <AnimatedStatCard label="Alcance Total" value={totalReach.toLocaleString("pt-BR")} sub="Contas únicas" iconName="Eye" color="text-orange-400" delay={480} />
        <AnimatedStatCard label="Eng. Vídeos" value={`${engByType("video")}%`} iconName="Flame" color="text-orange-400" delay={540} />
        <AnimatedStatCard label="Eng. Carrosséis" value={`${engByType("carousel")}%`} iconName="Flame" color="text-blue-400" delay={600} />
        <AnimatedStatCard label="Duração Média" value={`${avgDuration}s`} sub="Vídeos" iconName="Clock" color="text-[var(--accent)]" delay={660} />
      </div>

      {/* Save Rate indicator */}
      {totalViews > 0 && totalSaves > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <div className="glass-card p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Save Rate (saves/views)</p>
            <p className="text-xl font-bold text-emerald-400">{((totalSaves / totalViews) * 100).toFixed(2)}%</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Acima de 2% = excelente</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Share Rate (shares/views)</p>
            <p className="text-xl font-bold text-blue-400">{((totalShares / totalViews) * 100).toFixed(2)}%</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Acima de 1% = viral</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Reach/Followers Rate</p>
            <p className="text-xl font-bold text-orange-400">{profile.followers_count ? ((totalReach / profile.followers_count) * 100).toFixed(0) : "—"}%</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Acima de 30% = boa distribuição</p>
          </div>
        </div>
      )}

      {/* FOLLOWERS EVOLUTION + DEMOGRAPHICS */}
      <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <SectionHeader icon={TrendingUp} title="Evolução de Seguidores" color="text-[var(--accent)]" />
          <FollowerGrowthChart data={followerChartData} />
        </div>
        <div className="glass-card p-6">
          <SectionHeader icon={Users} title="Gênero da Audiência" color="text-blue-400" />
          <GenderDonut data={genderData} />
        </div>
      </AnimatedSection>

      {(ageData.length > 0 || cityData.length > 0) && (
        <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <SectionHeader icon={BarChart3} title="Faixa Etária" color="text-[var(--accent)]" />
            <AgeBarChart data={ageData} />
          </div>
          <div className="glass-card p-6">
            <SectionHeader icon={Target} title="Top Cidades" color="text-orange-400" />
            <CityBarChart data={cityData} />
          </div>
        </AnimatedSection>
      )}

      {/* CHARTS ROW */}
      <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <SectionHeader icon={TrendingUp} title="Performance por Post" color="text-green-400" />
          <PerformanceBar
            data={top5.map((p) => ({
              name: postLabel(p).slice(0, 30),
              value: p.engagement_rate || 0,
              fill: p.funnel_stage === "bofu" ? "#10B981" : p.funnel_stage === "mofu" ? "#F59E0B" : "#00E5CC",
            }))}
          />
        </div>
        <div className="glass-card p-6">
          <SectionHeader icon={Target} title="Funil de Conteúdo" color="text-[var(--accent)]" />
          <FunnelDonut
            data={[
              { name: "TOFU", value: funnel.tofu, color: "#3b82f6" },
              { name: "MOFU", value: funnel.mofu, color: "#f59e0b" },
              { name: "BOFU", value: funnel.bofu, color: "#22c55e" },
            ]}
          />
        </div>
      </AnimatedSection>

      <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Funnel Distribution (detailed) */}
        <div className="glass-card p-6">
          <SectionHeader icon={Target} title="Distribuição de Funil (detalhe)" color="text-[var(--accent)]" />
          <div className="space-y-3">
            {[
              { stage: "TOFU", count: funnel.tofu, color: "bg-blue-500", desc: "Atração — conteúdo amplo", ideal: "50%" },
              { stage: "MOFU", count: funnel.mofu, color: "bg-yellow-500", desc: "Educação — prova e autoridade", ideal: "35%" },
              { stage: "BOFU", count: funnel.bofu, color: "bg-green-500", desc: "Conversão — venda direta", ideal: "15%" },
              { stage: "N/C", count: funnel.unclassified, color: "bg-gray-500", desc: "Não classificado", ideal: "0%" },
            ].map((f) => {
              const pct = Math.round((f.count / funnelTotal) * 100);
              return (
                <div key={f.stage}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">{f.stage}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {f.count} ({pct}%) — ideal: {f.ideal}
                    </span>
                  </div>
                  <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className={`h-full ${f.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Distribution */}
        <div className="glass-card p-6">
          <SectionHeader icon={Zap} title="Distribuição de CTAs" color="text-yellow-400" />
          <div className="space-y-3">
            {[
              { type: "Sem CTA", count: ctaDist.none, color: "bg-gray-500", alert: ctaDist.none > allPosts.length * 0.5 },
              { type: "Soft (seguir/salvar)", count: ctaDist.soft, color: "bg-blue-500", alert: false },
              { type: "Medium (link/DM)", count: ctaDist.medium, color: "bg-yellow-500", alert: false },
              { type: "Hard (compre/vagas)", count: ctaDist.hard, color: "bg-green-500", alert: ctaDist.hard === 0 },
            ].map((c) => {
              const pct = Math.round((c.count / (allPosts.length || 1)) * 100);
              return (
                <div key={c.type}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium flex items-center gap-1">
                      {c.type}
                      {c.alert && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {ctaDist.hard === 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Nenhum post com CTA hard (venda direta). Oportunidade de conversão perdida.
            </div>
          )}
        </div>
      </AnimatedSection>

      <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Comment Intent Analysis */}
        <div className="glass-card p-6">
          <SectionHeader icon={MessageSquare} title="Intenção dos Comentários" color="text-green-400" />
          {comments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum comentário classificado ainda.</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Intenção de Compra", count: commentIntents.purchase, color: "text-green-400", icon: "💰" },
                { label: "Elogios", count: commentIntents.praise, color: "text-blue-400", icon: "👏" },
                { label: "Perguntas", count: commentIntents.question, color: "text-yellow-400", icon: "❓" },
                { label: "Voz da Audiência", count: commentIntents.audience_voice, color: "text-purple-400", icon: "🗣" },
                { label: "Objeções", count: commentIntents.objection, color: "text-red-400", icon: "🚫" },
                { label: "Neutros", count: commentIntents.neutral, color: "text-gray-400", icon: "💬" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <span className="text-sm flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      ({Math.round((item.count / (comments.length || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Themes */}
        <div className="glass-card p-6">
          <SectionHeader icon={Hash} title="Temas de Conteúdo" color="text-purple-400" />
          {topThemes.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Temas ainda não classificados.</p>
          ) : (
            <div className="space-y-2">
              {topThemes.map(([theme, count], i) => (
                <div key={theme} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">
                    <span className="text-[var(--muted-foreground)] mr-2 font-mono text-xs">{i + 1}</span>
                    {theme}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* Top and Bottom Performers side by side */}
      <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 */}
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)]">
            <SectionHeader icon={TrendingUp} title="Top 5 — Replicar" color="text-green-400" />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {top5.map((post, i) => (
              <div key={post.id} className="p-3 flex items-center gap-3">
                <span className="text-xs font-mono text-green-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{postLabel(post)}</span>
                    {post.funnel_stage && (
                      <span className={`px-1 py-0.5 rounded text-[9px] uppercase ${
                        post.funnel_stage === "tofu" ? "bg-blue-500/10 text-blue-400"
                          : post.funnel_stage === "mofu" ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                      }`}>{post.funnel_stage}</span>
                    )}
                    <span className="text-[9px] text-[var(--muted-foreground)]">{post.post_type}</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">{post.hook_text || post.caption?.slice(0, 60) || "—"}</p>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="text-green-400 font-bold">{post.engagement_rate}%</div>
                  <div className="text-[var(--muted-foreground)]">{(post.views_count || 0).toLocaleString("pt-BR")} views</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 */}
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)]">
            <SectionHeader icon={TrendingDown} title="Bottom 5 — Evitar" color="text-red-400" />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {bottom5.map((post, i) => (
              <div key={post.id} className="p-3 flex items-center gap-3">
                <span className="text-xs font-mono text-red-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{postLabel(post)}</span>
                    {post.funnel_stage && (
                      <span className={`px-1 py-0.5 rounded text-[9px] uppercase ${
                        post.funnel_stage === "tofu" ? "bg-blue-500/10 text-blue-400"
                          : post.funnel_stage === "mofu" ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                      }`}>{post.funnel_stage}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">{post.hook_text || post.caption?.slice(0, 60) || "—"}</p>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="text-red-400 font-bold">{post.engagement_rate}%</div>
                  <div className="text-[var(--muted-foreground)]">{(post.views_count || 0).toLocaleString("pt-BR")} views</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* My Best Hooks */}
      {hooks && hooks.length > 0 && (
        <AnimatedSection className="glass-card mb-8">
          <div className="p-6 border-b border-[var(--border)]">
            <SectionHeader icon={Zap} title="Meus Melhores Hooks" color="text-yellow-400" />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {hooks.map((hook, i) => (
              <div key={hook.id} className="p-4 flex items-start gap-3">
                <span className="text-xs font-mono text-[var(--muted-foreground)] w-5 pt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">&ldquo;{hook.hook_text}&rdquo;</p>
                  <div className="flex gap-2 mt-1.5">
                    {hook.hook_type && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-yellow-500/10 text-yellow-400">{hook.hook_type}</span>
                    )}
                    {hook.funnel_stage && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--muted)] text-[var(--muted-foreground)]">{hook.funnel_stage}</span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="font-bold">{hook.engagement_rate}%</div>
                  <div className="text-[var(--muted-foreground)]">{(hook.views_count || 0).toLocaleString("pt-BR")} views</div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      )}

      {/* Competitor Benchmark */}
      {competitors && competitors.length > 0 && (
        <AnimatedSection className="glass-card p-6 mb-8">
          <SectionHeader icon={Shield} title="Benchmark vs Concorrentes" color="text-cyan-400" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                  <th className="pb-2 font-medium">Perfil</th>
                  <th className="pb-2 font-medium text-right">Seguidores</th>
                  <th className="pb-2 font-medium text-right">Eng. Médio</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border)] bg-[var(--accent)]/5">
                  <td className="py-2.5 font-bold">@{MY_USERNAME} (você)</td>
                  <td className="py-2.5 text-right">{profile.followers_count?.toLocaleString("pt-BR") || "—"}</td>
                  <td className="py-2.5 text-right font-bold">{avgEng}%</td>
                  <td className="py-2.5 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--accent-muted)] text-[var(--accent)]">meu perfil</span>
                  </td>
                </tr>
                {competitors.map((comp) => {
                  const compPosts = competitorPosts?.filter((p: any) => p.profiles?.username === comp.username) || [];
                  const compEng = compPosts.length
                    ? Math.round((compPosts.reduce((s: number, p: any) => s + (p.engagement_rate || 0), 0) / compPosts.length) * 100) / 100
                    : 0;
                  return (
                    <tr key={comp.username} className="border-b border-[var(--border)]">
                      <td className="py-2.5">@{comp.username}</td>
                      <td className="py-2.5 text-right">{comp.followers_count?.toLocaleString("pt-BR") || "—"}</td>
                      <td className="py-2.5 text-right">{compEng}%</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)]">concorrente</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AnimatedSection>
      )}

      {/* Strategic Insights from Analysis */}
      {analysis?.full_analysis && (
        <AnimatedSection className="glass-card">
          <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
            <SectionHeader icon={Lightbulb} title="Diagnóstico Estratégico Completo" color="text-yellow-400" />
            <span className="text-xs text-[var(--muted-foreground)]">
              {analysis.model_used} — ${analysis.cost_estimate}
            </span>
          </div>
          <div
            className="p-6 prose prose-invert prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:p-2 [&_th]:border-b [&_th]:border-[var(--border)] [&_td]:p-2 [&_td]:border-b [&_td]:border-[var(--border)] [&_code]:bg-[var(--muted)] [&_code]:px-1 [&_code]:rounded [&_li]:my-0.5 [&_strong]:text-[var(--foreground)]"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(analysis.full_analysis) }}
          />
        </AnimatedSection>
      )}
    </div>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^####\s(.*$)/gm, "<h4>$1</h4>")
    .replace(/^###\s(.*$)/gm, "<h3>$1</h3>")
    .replace(/^##\s(.*$)/gm, "<h2>$1</h2>")
    .replace(/^#\s(.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^-\s(.*$)/gm, "<li>$1</li>")
    .replace(/^\d+\.\s(.*$)/gm, "<li>$1</li>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return "";
      const tag = match.includes("---") ? "th" : "td";
      return "<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, "<table>$&</table>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}
