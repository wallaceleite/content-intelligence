"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { AnimatedCounter } from "./Animate";
import {
  ArrowUpRight, ArrowDownRight, Users, FileText, Eye, Heart,
  MessageSquare, TrendingUp, CheckCircle, Flame, Clock, BarChart3,
  Zap, Target, Shield,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, FileText, Eye, Heart, MessageSquare, TrendingUp,
  CheckCircle, ArrowUpRight, Flame, Clock, BarChart3, Zap, Target, Shield,
};

function parseValue(value: string): { num: number; prefix: string; suffix: string; decimals: number } | null {
  const match = value.match(/^([^\d]*)([0-9.,]+)(.*)$/);
  if (!match) return null;
  const prefix = match[1];
  const numStr = match[2].replace(/\./g, "").replace(",", ".");
  const num = parseFloat(numStr);
  const suffix = match[3];
  const decimals = match[2].includes(",") ? match[2].split(",")[1]?.length || 0 : 0;
  if (isNaN(num)) return null;
  return { num, prefix, suffix, decimals };
}

export function AnimatedStatCard({ label, value, sub, iconName, color, trend, delay = 0 }: {
  label: string;
  value: string;
  sub?: string;
  iconName: string;
  color: string;
  trend?: "up" | "down" | "neutral";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.opacity = "0";
    ref.current.style.transform = "translateY(12px)";

    animate(ref.current, {
      opacity: [0, 1],
      y: [12, 0],
      duration: 600,
      delay,
      ease: "outExpo",
    } as any);
  }, [delay]);

  const parsed = parseValue(value);
  const Icon = iconMap[iconName];

  return (
    <div ref={ref} className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${color}`} />}
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
        </div>
        {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />}
        {trend === "down" && <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
      </div>
      <p className="text-xl font-bold">
        {parsed ? (
          <AnimatedCounter
            value={parsed.num}
            prefix={parsed.prefix}
            suffix={parsed.suffix}
            decimals={parsed.decimals}
            duration={1400}
          />
        ) : (
          value
        )}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}
