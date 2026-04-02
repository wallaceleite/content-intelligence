import { supabaseAdmin } from "@/lib/supabase";
import {
  Target, AlertTriangle, CheckCircle, XCircle, Clock, Flame,
  TrendingUp, Calendar, BarChart3, Zap, ArrowRight, Shield,
  MessageSquare, Eye, Heart, BookOpen
} from "lucide-react";

export const revalidate = 60;

const MY_USERNAME = "owallaceleite";

function Alert({ type, message, detail }: { type: "danger" | "warning" | "success" | "info"; message: string; detail?: string }) {
  const styles = {
    danger: "bg-red-500/10 border-red-500/20 text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    success: "bg-green-500/10 border-green-500/20 text-green-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };
  const icons = { danger: XCircle, warning: AlertTriangle, success: CheckCircle, info: BarChart3 };
  const Icon = icons[type];
  return (
    <div className={`p-3 border rounded-lg text-sm ${styles[type]}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{message}</p>
          {detail && <p className="text-xs opacity-80 mt-0.5">{detail}</p>}
        </div>
      </div>
    </div>
  );
}

export default async function EstrategiaPage() {
  // Get my profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("username", MY_USERNAME)
    .single();

  // Get benchmarks
  const { data: benchmarks } = await supabaseAdmin
    .from("strategy_benchmarks")
    .select("*")
    .order("category");

  const getBenchmark = (key: string) => benchmarks?.find((b) => b.key === key);

  // Get my latest batch posts
  const { data: latestBatches } = await supabaseAdmin
    .from("batches")
    .select("id")
    .eq("profile_id", profile?.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: myPosts } = latestBatches?.[0]
    ? await supabaseAdmin
        .from("posts")
        .select("*")
        .eq("batch_id", latestBatches[0].id)
        .order("posted_at", { ascending: false })
    : { data: [] };

  // Get strategy plan
  const { data: planItems } = await supabaseAdmin
    .from("strategy_plan")
    .select("*")
    .gte("planned_date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
    .order("planned_date");

  // === CALCULATE CURRENT WEEK METRICS ===
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const thisWeekPosts = (myPosts || []).filter((p) => {
    if (!p.posted_at) return false;
    return p.posted_at >= weekStartStr;
  });

  const last7DaysPosts = (myPosts || []).filter((p) => {
    if (!p.posted_at) return false;
    const d = new Date(p.posted_at);
    return d >= new Date(Date.now() - 7 * 86400000);
  });

  const last30DaysPosts = (myPosts || []).filter((p) => {
    if (!p.posted_at) return false;
    const d = new Date(p.posted_at);
    return d >= new Date(Date.now() - 30 * 86400000);
  });

  const allPosts = myPosts || [];

  // Funnel distribution (all posts)
  const funnel = {
    tofu: allPosts.filter((p) => p.funnel_stage === "tofu").length,
    mofu: allPosts.filter((p) => p.funnel_stage === "mofu").length,
    bofu: allPosts.filter((p) => p.funnel_stage === "bofu").length,
  };
  const funnelTotal = funnel.tofu + funnel.mofu + funnel.bofu || 1;
  const funnelPct = {
    tofu: Math.round((funnel.tofu / funnelTotal) * 100),
    mofu: Math.round((funnel.mofu / funnelTotal) * 100),
    bofu: Math.round((funnel.bofu / funnelTotal) * 100),
  };

  // CTA distribution
  const ctaDist = {
    none: allPosts.filter((p) => !p.cta_type || p.cta_type === "none").length,
    soft: allPosts.filter((p) => p.cta_type === "soft").length,
    medium: allPosts.filter((p) => p.cta_type === "medium").length,
    hard: allPosts.filter((p) => p.cta_type === "hard").length,
  };

  // Format distribution
  const formats = {
    video: allPosts.filter((p) => p.post_type === "video").length,
    carousel: allPosts.filter((p) => p.post_type === "carousel").length,
    image: allPosts.filter((p) => p.post_type === "image").length,
  };

  // Posting days (which days of week)
  const daysCovered = new Set(
    last7DaysPosts.map((p) => new Date(p.posted_at).getDay())
  );

  // === BUILD ALERTS ===
  const alerts: { type: "danger" | "warning" | "success" | "info"; message: string; detail?: string }[] = [];

  // Frequency check
  const minPosts = getBenchmark("min_posts_week")?.value || 7;
  if (last7DaysPosts.length < minPosts) {
    alerts.push({
      type: "danger",
      message: `Você postou ${last7DaysPosts.length}x nos últimos 7 dias (meta: ${minPosts}+)`,
      detail: `Faltam ${minPosts - last7DaysPosts.length} posts para atingir o mínimo. Perfis que postam 10+/semana crescem mais rápido.`,
    });
  } else {
    alerts.push({
      type: "success",
      message: `Frequência OK: ${last7DaysPosts.length} posts nos últimos 7 dias`,
    });
  }

  // BOFU check
  if (funnel.bofu === 0) {
    alerts.push({
      type: "danger",
      message: "0 posts BOFU (conversão/venda)",
      detail: `O ideal é 15% do conteúdo ser BOFU. Você tem ${funnelPct.tofu}% TOFU / ${funnelPct.mofu}% MOFU / ${funnelPct.bofu}% BOFU. Sem BOFU, você atrai mas não converte.`,
    });
  }

  // MOFU check
  if (funnelPct.mofu < 30) {
    alerts.push({
      type: "warning",
      message: `MOFU baixo: ${funnelPct.mofu}% (ideal: 35%)`,
      detail: "Conteúdo educativo e de autoridade constrói confiança para a venda.",
    });
  }

  // CTA check
  const ctaNoneRate = Math.round((ctaDist.none / (allPosts.length || 1)) * 100);
  if (ctaNoneRate > 50) {
    alerts.push({
      type: "warning",
      message: `${ctaNoneRate}% dos posts sem CTA`,
      detail: "Todo post deve ter pelo menos um CTA soft (salvar, compartilhar, comentar).",
    });
  }

  if (ctaDist.hard === 0) {
    alerts.push({
      type: "warning",
      message: "Nenhum CTA hard (venda direta)",
      detail: "Inclua pelo menos 1 post/semana com CTA direto para venda.",
    });
  }

  // Format diversity
  if (formats.video === 0 && allPosts.length > 5) {
    alerts.push({
      type: "warning",
      message: "Nenhum vídeo/reel publicado",
      detail: "Vídeos tipo 'como fazer' têm 82% de engajamento e influenciam 46% das decisões de compra.",
    });
  }

  // Saves indicator
  const totalSaves = allPosts.reduce((s, p) => s + (p.saves_count || 0), 0);
  const totalViews = allPosts.reduce((s, p) => s + (p.views_count || 0), 0);
  if (totalViews > 0 && totalSaves > 0) {
    const saveRate = (totalSaves / totalViews) * 100;
    if (saveRate >= 2) {
      alerts.push({ type: "success", message: `Save rate excelente: ${saveRate.toFixed(2)}%`, detail: "Acima de 2% indica alta intenção de compra do público." });
    }
  }

  // Today's plan
  const today = now.toISOString().split("T")[0];
  const todayPlan = planItems?.filter((p) => p.planned_date === today) || [];
  const todayPending = todayPlan.filter((p) => p.status === "planned");

  if (todayPending.length > 0) {
    alerts.push({
      type: "info",
      message: `${todayPending.length} post(s) planejado(s) para hoje`,
      detail: todayPending.map((p) => `${p.funnel_stage?.toUpperCase()}: ${p.topic}`).join(" | "),
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Painel Estratégico</h1>
          <p className="text-[var(--muted-foreground)]">
            @{MY_USERNAME} — Controle e direcionamento baseado em dados de mercado
          </p>
        </div>
        <div className="text-right text-xs text-[var(--muted-foreground)]">
          <p>{allPosts.length} posts analisados</p>
          <p>{benchmarks?.length || 0} benchmarks ativos</p>
        </div>
      </div>

      {/* ALERTS */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Alertas e Cobranças
        </h2>
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Alert key={i} {...alert} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* FREQUENCY SCORECARD */}
        <div className="glass-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-400" />
            Frequência (últimos 7 dias)
          </h2>
          <div className="flex items-end gap-1 mb-4 h-20">
            {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
              const d = new Date(Date.now() - (6 - dayOffset) * 86400000);
              const dayStr = d.toISOString().split("T")[0];
              const count = (myPosts || []).filter((p) => p.posted_at?.startsWith(dayStr)).length;
              const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
              const isToday = dayOffset === 6;
              return (
                <div key={dayOffset} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${
                      count > 0
                        ? isToday ? "bg-[var(--accent)]" : "bg-green-500"
                        : "bg-[var(--muted)]"
                    }`}
                    style={{ height: `${Math.max(count * 20, 4)}px` }}
                  />
                  <span className="text-[9px] text-[var(--muted-foreground)]">
                    {dayNames[d.getDay()]}
                  </span>
                  <span className={`text-[10px] font-bold ${count > 0 ? "text-green-400" : "text-red-400"}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>Total: <strong className="text-[var(--foreground)]">{last7DaysPosts.length}</strong> / {minPosts} meta</span>
            <span>{daysCovered.size}/7 dias cobertos</span>
          </div>
        </div>

        {/* FUNNEL HEALTH */}
        <div className="glass-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[var(--accent)]" />
            Saúde do Funil
          </h2>
          <div className="space-y-3">
            {[
              { stage: "TOFU", actual: funnelPct.tofu, ideal: 50, count: funnel.tofu, color: "bg-blue-500", desc: "Atração" },
              { stage: "MOFU", actual: funnelPct.mofu, ideal: 35, count: funnel.mofu, color: "bg-yellow-500", desc: "Autoridade" },
              { stage: "BOFU", actual: funnelPct.bofu, ideal: 15, count: funnel.bofu, color: "bg-green-500", desc: "Venda" },
            ].map((f) => {
              const diff = f.actual - f.ideal;
              const status = Math.abs(diff) <= 10 ? "ok" : diff > 0 ? "excess" : "deficit";
              return (
                <div key={f.stage}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">{f.stage} <span className="text-xs text-[var(--muted-foreground)]">({f.desc})</span></span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${status === "deficit" ? "text-red-400" : status === "excess" ? "text-yellow-400" : "text-green-400"}`}>
                        {f.actual}%
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">ideal: {f.ideal}%</span>
                    </div>
                  </div>
                  <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden relative">
                    <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.actual}%` }} />
                    <div className="absolute top-0 h-full w-0.5 bg-white/50" style={{ left: `${f.ideal}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-3">
            Linha branca = meta ideal. Dados de mercado: @rafaelkiso + análise cruzada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* CTA HEALTH */}
        <div className="glass-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-yellow-400" />
            Saúde dos CTAs
          </h2>
          <div className="space-y-2">
            {[
              { type: "Sem CTA", count: ctaDist.none, color: "text-red-400", bad: true },
              { type: "Soft (salvar/seguir)", count: ctaDist.soft, color: "text-blue-400", bad: false },
              { type: "Medium (link/DM)", count: ctaDist.medium, color: "text-yellow-400", bad: false },
              { type: "Hard (compre/vagas)", count: ctaDist.hard, color: "text-green-400", bad: ctaDist.hard === 0 },
            ].map((c) => (
              <div key={c.type} className="flex items-center justify-between py-1">
                <span className={`text-sm ${c.bad ? "text-red-400" : ""}`}>
                  {c.bad && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                  {c.type}
                </span>
                <span className={`text-sm font-bold ${c.color}`}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FORMAT MIX */}
        <div className="glass-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Mix de Formatos
          </h2>
          <div className="space-y-2">
            {[
              { type: "Vídeos/Reels", count: formats.video, icon: "🎬", tip: "82% engajamento em 'como fazer'" },
              { type: "Carrosséis", count: formats.carousel, icon: "📊", tip: "Ideal para dados e frameworks" },
              { type: "Imagens", count: formats.image, icon: "🖼", tip: "Menor engajamento médio" },
            ].map((f) => (
              <div key={f.type} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-sm">{f.icon} {f.type}</span>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{f.tip}</p>
                </div>
                <span className="text-sm font-bold">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BENCHMARKS DE MERCADO */}
      <div className="glass-card mb-8">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Benchmarks de Mercado (fonte: @rafaelkiso / mLabs)
          </h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {(benchmarks || []).map((b) => (
            <div key={b.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{b.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{b.description}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="text-lg font-bold text-[var(--accent)]">{b.value}</span>
                <span className="text-xs text-[var(--muted-foreground)] ml-1">{b.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WEEKLY PLAN */}
      <div className="glass-card">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-400" />
            Plano da Semana
          </h2>
          <span className="text-xs text-[var(--muted-foreground)]">
            {planItems?.length || 0} itens planejados
          </span>
        </div>
        {!planItems?.length ? (
          <div className="p-8 text-center">
            <Calendar className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Nenhum plano definido ainda</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Use a análise dos concorrentes para montar o plano semanal.
              O sistema vai cobrar cada post planejado.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {planItems.map((item) => {
              const isToday = item.planned_date === today;
              const isPast = item.planned_date < today;
              const isMissed = isPast && item.status === "planned";
              return (
                <div
                  key={item.id}
                  className={`p-4 flex items-center gap-4 ${isToday ? "bg-[var(--accent)]/5" : ""} ${isMissed ? "bg-red-500/5" : ""}`}
                >
                  <div className="w-16 text-center shrink-0">
                    <p className={`text-xs font-bold ${isToday ? "text-[var(--accent)]" : isMissed ? "text-red-400" : "text-[var(--muted-foreground)]"}`}>
                      {new Date(item.planned_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {new Date(item.planned_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.funnel_stage && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-medium ${
                          item.funnel_stage === "tofu" ? "bg-blue-500/10 text-blue-400"
                            : item.funnel_stage === "mofu" ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-green-500/10 text-green-400"
                        }`}>{item.funnel_stage}</span>
                      )}
                      <span className="text-sm">{item.topic || "Sem tema definido"}</span>
                    </div>
                    {item.hook_angle && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Hook: {item.hook_angle}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === "posted" ? "bg-green-500/10 text-green-400"
                      : item.status === "skipped" ? "bg-red-500/10 text-red-400"
                      : isMissed ? "bg-red-500/10 text-red-400"
                      : isToday ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}>
                    {isMissed ? "ATRASADO" : item.status === "posted" ? "POSTADO" : item.status === "skipped" ? "PULOU" : isToday ? "HOJE" : "PLANEJADO"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
