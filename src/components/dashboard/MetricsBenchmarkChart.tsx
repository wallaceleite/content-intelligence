"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { metric: "Reach", yours: 82, benchmark: 65 },
  { metric: "Engagement", yours: 74, benchmark: 58 },
  { metric: "Saves", yours: 61, benchmark: 70 },
  { metric: "Shares", yours: 88, benchmark: 55 },
  { metric: "CTR", yours: 53, benchmark: 62 },
  { metric: "Retention", yours: 79, benchmark: 68 },
];

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
      <p style={{ color: "#a1a1aa", fontWeight: 600, margin: "0 0 6px" }}>
        {label}
      </p>
      {payload.map((item) => (
        <p
          key={item.name}
          style={{ color: item.color, margin: "2px 0", fontWeight: 700 }}
        >
          {item.name === "yours" ? "You" : "Benchmark"}: {item.value}
        </p>
      ))}
    </div>
  );
};

export function MetricsBenchmarkChart() {
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 12,
        padding: "20px 24px 16px",
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <h3
          style={{ color: "#fafafa", fontSize: 15, fontWeight: 600, margin: 0 }}
        >
          Metrics vs Benchmarks
        </h3>
        <p style={{ color: "#a1a1aa", fontSize: 13, margin: "4px 0 0" }}>
          Your performance vs industry average
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 24, left: 24, bottom: 0 }}>
          <PolarGrid stroke="#27272a" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "#52525b", fontSize: 10 }}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#a1a1aa", paddingTop: 8 }}
            formatter={(value) => (value === "yours" ? "You" : "Benchmark")}
          />
          <Radar
            name="benchmark"
            dataKey="benchmark"
            stroke="#27272a"
            fill="#3f3f46"
            fillOpacity={0.5}
            strokeWidth={1.5}
            dot={false}
          />
          <Radar
            name="yours"
            dataKey="yours"
            stroke="#7c3aed"
            fill="#7c3aed"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
