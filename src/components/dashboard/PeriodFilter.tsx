"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";

const PERIODS = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Período" },
];

export function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("period") || "30d";
  const [showCustom, setShowCustom] = useState(current === "custom");

  function setPeriod(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", key);
    if (key !== "custom") {
      params.delete("from");
      params.delete("to");
      setShowCustom(false);
    } else {
      setShowCustom(true);
    }
    router.push(`?${params.toString()}`);
  }

  function setCustomDates(from: string, to: string) {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", from);
    params.set("to", to);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => setPeriod(p.key)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: current === p.key ? "var(--accent)" : "var(--muted)",
            color: current === p.key ? "var(--accent-foreground)" : "var(--text-secondary)",
          }}
        >
          {p.key === "custom" && <Calendar className="w-3 h-3 inline mr-1" />}
          {p.label}
        </button>
      ))}
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            defaultValue={searchParams.get("from") || ""}
            onChange={(e) => setCustomDates(e.target.value, searchParams.get("to") || new Date().toISOString().split("T")[0])}
            className="text-xs px-2 py-1.5 rounded-lg outline-none"
            style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
          />
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>a</span>
          <input
            type="date"
            defaultValue={searchParams.get("to") || ""}
            onChange={(e) => setCustomDates(searchParams.get("from") || "2024-01-01", e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg outline-none"
            style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
          />
        </div>
      )}
    </div>
  );
}
