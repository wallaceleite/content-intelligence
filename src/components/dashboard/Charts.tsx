"use client";

import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = {
  accent: "#7c3aed",
  green: "#22c55e",
  yellow: "#f59e0b",
  blue: "#3b82f6",
  pink: "#ec4899",
  orange: "#f97316",
  cyan: "#06b6d4",
  card: "#18181b",
  border: "#27272a",
  muted: "#a1a1aa",
  fg: "#fafafa",
};

const formatK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString());

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-[#a1a1aa] font-medium mb-1">{label}</p>}
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color || item.fill }} className="font-semibold">
          {item.name}: {typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}
        </p>
      ))}
    </div>
  );
}

// === GROWTH CHART (Area) ===
export function GrowthChart({ data }: { data: { label: string; followers: number; engagement: number }[] }) {
  if (!data.length) return <EmptyChart text="Sem dados de evolução ainda" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatK} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="followers" name="Seguidores" stroke={COLORS.accent} strokeWidth={2} fill="url(#gF)" dot={false} />
        <Area type="monotone" dataKey="engagement" name="Interações" stroke={COLORS.green} strokeWidth={2} fill="url(#gE)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// === FUNNEL DONUT ===
export function FunnelDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  if (!data.length || total === 0) return <EmptyChart text="Sem dados de funil" />;
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-xs">
              <span className="font-bold" style={{ color: d.color }}>{d.name}</span>
              <span className="text-[#a1a1aa] ml-1">{d.value} ({Math.round((d.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === PERFORMANCE BAR CHART ===
export function PerformanceBar({ data }: { data: { name: string; value: number; fill: string }[] }) {
  if (!data.length) return <EmptyChart text="Sem dados de performance" />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
      <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
        <XAxis type="number" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: COLORS.fg, fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Engajamento" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// === RADAR BENCHMARK ===
export function BenchmarkRadar({ data }: { data: { metric: string; atual: number; ideal: number }[] }) {
  if (!data.length) return <EmptyChart text="Sem dados de benchmark" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={COLORS.border} />
        <PolarAngleAxis dataKey="metric" tick={{ fill: COLORS.muted, fontSize: 10 }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <Radar name="Atual" dataKey="atual" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.3} strokeWidth={2} />
        <Radar name="Ideal" dataKey="ideal" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: COLORS.muted }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-xs text-[#a1a1aa]">{text}</div>
  );
}
