"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const MUTED = "#8A9E9B";
const BORDER = "rgba(255,255,255,0.08)";
const ACCENT = "#00E5CC";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(17,21,20,0.95)",
      border: `1px solid ${BORDER}`,
      borderRadius: "12px",
      backdropFilter: "blur(20px)",
      padding: "8px 12px",
      fontSize: "12px",
    }}>
      {label && <p style={{ color: MUTED, fontWeight: 500, marginBottom: "4px" }}>{label}</p>}
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color || item.fill, fontWeight: 600 }}>
          {item.name}: {typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}
        </p>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-xs" style={{ color: MUTED }}>
      {text}
    </div>
  );
}

// === GENDER DONUT ===
export function GenderDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  if (!data.length) return <EmptyState text="Sem dados demográficos. Execute o sync." />;

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
            <div>
              <span className="text-sm font-semibold" style={{ color: d.color }}>{d.name}</span>
              <span className="text-xs ml-2" style={{ color: MUTED }}>
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === AGE BAR CHART ===
export function AgeBarChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <EmptyState text="Sem dados de faixa etária. Execute o sync." />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Audiência" fill={ACCENT} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// === CITY BAR CHART (horizontal) ===
export function CityBarChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <EmptyState text="Sem dados de cidades. Execute o sync." />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 32, 160)}>
      <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
        <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: "#F0F0F0", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Seguidores" fill="#f97316" radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
