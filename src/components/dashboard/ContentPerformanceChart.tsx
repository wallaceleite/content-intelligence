"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const data = [
  { title: "Product Launch Reel", score: 9420, type: "Reel" },
  { title: "Behind the Scenes", score: 7840, type: "Story" },
  { title: "Tutorial: Getting Started", score: 7310, type: "Video" },
  { title: "Customer Spotlight", score: 6590, type: "Post" },
  { title: "Weekly Tip Thread", score: 5870, type: "Thread" },
  { title: "Live Q&A Recap", score: 4920, type: "Video" },
  { title: "Product Update Post", score: 4100, type: "Post" },
];

const typeColors: Record<string, string> = {
  Reel: "#7c3aed",
  Story: "#a855f7",
  Video: "#6366f1",
  Post: "#8b5cf6",
  Thread: "#c4b5fd",
};

const formatK = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();

interface TooltipPayloadItem {
  value: number;
  payload: { title: string; type: string };
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        maxWidth: 200,
      }}
    >
      <p
        style={{
          color: typeColors[item.payload.type] ?? "#7c3aed",
          fontWeight: 600,
          margin: 0,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {item.payload.type}
      </p>
      <p style={{ color: "#fafafa", margin: "4px 0 2px", fontWeight: 600, fontSize: 12 }}>
        {item.payload.title}
      </p>
      <p style={{ color: "#a1a1aa", margin: 0, fontWeight: 700 }}>
        {formatK(item.value)} interactions
      </p>
    </div>
  );
};

export function ContentPerformanceChart() {
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
          Content Performance Ranking
        </h3>
        <p style={{ color: "#a1a1aa", fontSize: 13, margin: "4px 0 0" }}>
          Top posts by total interactions
        </p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={formatK}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="title"
            width={156}
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y}
                dy={4}
                textAnchor="end"
                fill="#a1a1aa"
                fontSize={12}
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {payload.value.length > 22
                  ? `${payload.value.slice(0, 22)}…`
                  : payload.value}
              </text>
            )}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272a55" }} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={14}>
            {data.map((entry) => (
              <Cell
                key={entry.title}
                fill={typeColors[entry.type] ?? "#7c3aed"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
