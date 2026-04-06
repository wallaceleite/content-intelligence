"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const ACCENT = "#00E5CC";
const MUTED = "#8A9E9B";
const BORDER = "rgba(255,255,255,0.08)";

const formatK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString());

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
        <p key={item.name} style={{ color: item.color, fontWeight: 600 }}>
          {item.name}: {formatK(item.value)}
        </p>
      ))}
    </div>
  );
}

interface SnapshotPoint {
  date: string;
  followers: number;
}

export function FollowerGrowthChart({ data }: { data: SnapshotPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-xs" style={{ color: MUTED }}>
        Sem dados de evolução. Execute o sync diário para rastrear.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gFollowers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
        <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatK} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="followers"
          name="Seguidores"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#gFollowers)"
          dot={false}
          activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
