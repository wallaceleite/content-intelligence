"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "TOFU", label: "Top of Funnel", value: 58, color: "#7c3aed" },
  { name: "MOFU", label: "Middle of Funnel", value: 28, color: "#a855f7" },
  { name: "BOFU", label: "Bottom of Funnel", value: 14, color: "#d8b4fe" },
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { label: string; color: string };
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
      }}
    >
      <p style={{ color: item.payload.color, fontWeight: 600, margin: 0 }}>
        {item.name} — {item.payload.label}
      </p>
      <p style={{ color: "#fafafa", margin: "4px 0 0", fontWeight: 700 }}>
        {item.value}%
      </p>
    </div>
  );
};

export function FunnelDonutChart() {
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
          Funnel Distribution
        </h3>
        <p style={{ color: "#a1a1aa", fontSize: 13, margin: "4px 0 0" }}>
          Content by funnel stage
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ flex: "0 0 180px", height: 180, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ color: "#fafafa", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
              100%
            </span>
            <span style={{ color: "#a1a1aa", fontSize: 11, marginTop: 4 }}>
              total
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {data.map((item) => (
            <div key={item.name}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.color,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "#fafafa", fontSize: 13, fontWeight: 600 }}>
                    {item.name}
                  </span>
                </div>
                <span style={{ color: "#fafafa", fontSize: 13, fontWeight: 700 }}>
                  {item.value}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "#27272a",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${item.value}%`,
                    height: "100%",
                    background: item.color,
                    borderRadius: 4,
                  }}
                />
              </div>
              <p style={{ color: "#a1a1aa", fontSize: 11, margin: "3px 0 0" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
