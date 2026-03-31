"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Jan", followers: 12400, engagement: 3200 },
  { month: "Feb", followers: 14800, engagement: 4100 },
  { month: "Mar", followers: 16200, engagement: 3800 },
  { month: "Apr", followers: 19500, engagement: 5200 },
  { month: "May", followers: 22100, engagement: 6400 },
  { month: "Jun", followers: 25800, engagement: 7100 },
  { month: "Jul", followers: 28300, engagement: 6800 },
  { month: "Aug", followers: 31900, engagement: 8900 },
  { month: "Sep", followers: 35200, engagement: 9400 },
  { month: "Oct", followers: 38700, engagement: 10200 },
  { month: "Nov", followers: 42100, engagement: 11500 },
  { month: "Dec", followers: 47300, engagement: 13200 },
];

const formatK = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
      }}
    >
      <p style={{ color: "#a1a1aa", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </p>
      {payload.map((item) => (
        <p
          key={item.name}
          style={{ color: item.color, margin: "2px 0", fontWeight: 600 }}
        >
          {item.name === "followers" ? "Followers" : "Engagement"}:{" "}
          {formatK(item.value)}
        </p>
      ))}
    </div>
  );
};

export function FollowerGrowthChart() {
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 12,
        padding: "20px 24px 16px",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{ color: "#fafafa", fontSize: 15, fontWeight: 600, margin: 0 }}
        >
          Follower & Engagement Growth
        </h3>
        <p style={{ color: "#a1a1aa", fontSize: 13, margin: "4px 0 0" }}>
          12-month overview
        </p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradEngagement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#a1a1aa", paddingTop: 12 }}
            formatter={(value) =>
              value === "followers" ? "Followers" : "Engagement"
            }
          />
          <Area
            type="monotone"
            dataKey="followers"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#gradFollowers)"
            dot={false}
            activeDot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradEngagement)"
            dot={false}
            activeDot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
