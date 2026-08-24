"use client";

import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ExternalLink, ImageOff } from "lucide-react";

export interface SocialCardItem {
  id: string;
  thumb: string | null;
  label: string;
  typeLabel: string;
  permalink: string | null;
  postedAt: string | null;
  stats: { label: string; value: string }[];
  accent: { label: string; value: string }[];
  bars: { label: string; value: number; display: string }[];
  metrics: Record<string, number>;
  searchText: string;
  group: string;
}

interface SortOption { key: string; label: string; }
interface Tab { key: string; label: string; }

const PERIODS = [
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "all", label: "Tudo", days: 0 },
];

// Cor da barra por posição no dataset visível: verde = quartil de cima,
// vermelho = fundo. Benchmarks vêm dos próprios posts, não de número mágico.
function barColor(value: number, all: number[]): string {
  const sorted = [...all].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= value) / Math.max(sorted.length - 1, 1);
  if (rank >= 0.7) return "#22C55E";
  if (rank >= 0.35) return "#EAB308";
  return "#EF4444";
}

export function SocialCards({
  items, sortOptions, defaultSort, tabs = [],
}: {
  items: SocialCardItem[];
  sortOptions: SortOption[];
  defaultSort: string;
  tabs?: Tab[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(defaultSort);
  const [sortDesc, setSortDesc] = useState(true);
  const [period, setPeriod] = useState("all");
  const [tab, setTab] = useState("all");

  const visible = useMemo(() => {
    const days = PERIODS.find((p) => p.key === period)?.days || 0;
    const cutoff = days ? Date.now() - days * 86400_000 : 0;
    return items
      .filter((i) => !cutoff || (i.postedAt && new Date(i.postedAt).getTime() >= cutoff))
      .filter((i) => tab === "all" || i.group === tab)
      .filter((i) => !search || i.searchText.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const d = (a.metrics[sortKey] || 0) - (b.metrics[sortKey] || 0);
        return sortDesc ? -d : d;
      });
  }, [items, search, sortKey, sortDesc, period, tab, tabs]);

  // Distribuição por métrica de barra calculada sobre o RECORTE visível
  const barPools = useMemo(() => {
    const pools: Record<string, number[]> = {};
    for (const item of visible)
      for (const bar of item.bars) (pools[bar.label] ||= []).push(bar.value);
    return pools;
  }, [visible]);

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {[{ key: "all", label: "Todos" }, ...tabs].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={tab === t.key
              ? { background: "var(--accent-muted)", color: "var(--accent)" }
              : { color: "var(--text-tertiary)" }}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className="text-xs px-2.5 py-1 rounded-full transition-colors"
              style={period === p.key
                ? { background: "var(--accent-muted)", color: "var(--accent)" }
                : { color: "var(--text-tertiary)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
          <Search className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar posts…"
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: "var(--text-primary)" }} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-tertiary)" }}>Ordenar:</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm outline-none"
            style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)", color: "var(--text-primary)" }}>
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button onClick={() => setSortDesc(!sortDesc)} title={sortDesc ? "Maior primeiro" : "Menor primeiro"}>
            <ArrowUpDown className="w-4 h-4" style={{ color: sortDesc ? "var(--text-tertiary)" : "var(--accent)" }} />
          </button>
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{visible.length} posts</span>
      </div>

      {visible.length === 0 && (
        <p className="text-sm py-10 text-center" style={{ color: "var(--text-tertiary)" }}>
          Nenhum post no recorte selecionado.
        </p>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))" }}>
        {visible.map((item) => (
          <div key={item.id} className="rounded-2xl border overflow-hidden flex flex-col"
            style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
            <div className="relative" style={{ aspectRatio: "4/3", background: "var(--background)" }}>
              {item.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumb} alt="" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="w-6 h-6" style={{ color: "var(--text-tertiary)" }} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 pt-8"
                style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                <div className="text-sm font-medium text-white leading-snug"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.label}
                </div>
              </div>
              <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                {item.typeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3">
              <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--background)" }}>
                {item.stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{s.label}</div>
                    <div className="text-sm font-semibold">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--accent-muted)" }}>
                {item.accent.map((s) => (
                  <div key={s.label}>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--accent)" }}>{s.label}</div>
                    <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pb-3 space-y-1.5">
              {item.bars.map((bar) => {
                const pool = barPools[bar.label] || [bar.value];
                const max = Math.max(...pool, 0.0001);
                const color = barColor(bar.value, pool);
                return (
                  <div key={bar.label} className="flex items-center gap-2 text-xs">
                    <span className="w-20 flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>{bar.label}</span>
                    <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border-glass)" }}>
                      <div className="h-1 rounded-full" style={{ width: `${Math.min((bar.value / max) * 100, 100)}%`, background: color }} />
                    </div>
                    <span className="w-16 text-right font-medium" style={{ color }}>{bar.display}</span>
                  </div>
                );
              })}
            </div>

            <div className="px-4 pb-3 mt-auto flex items-center justify-between text-xs"
              style={{ color: "var(--text-tertiary)" }}>
              <span>{item.postedAt ? new Date(item.postedAt).toLocaleDateString("pt-BR") : ""}</span>
              {item.permalink && (
                <a href={item.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1"
                  style={{ color: "var(--accent)" }}>
                  abrir <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
