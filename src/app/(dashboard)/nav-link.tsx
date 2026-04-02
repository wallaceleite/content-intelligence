"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Zap, Calendar, FileText, Flame, Target, Brain } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame, Brain, Target, Users, Zap, Calendar, FileText,
};

export function NavLink({ href, label, iconName, highlight }: {
  href: string;
  label: string;
  iconName: string;
  highlight?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const Icon = iconMap[iconName];

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-[rgba(255,255,255,0.03)]"
      style={{
        color: isActive ? "var(--accent)" : highlight ? "var(--accent)" : "var(--muted-foreground)",
        fontWeight: isActive || highlight ? 500 : 400,
        background: isActive ? "var(--accent-subtle)" : undefined,
      }}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </Link>
  );
}
