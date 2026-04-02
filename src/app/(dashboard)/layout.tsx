import Link from "next/link";
import { BarChart3, Users, Zap, Calendar, FileText, Flame, Target, Brain, LogOut } from "lucide-react";
import { LogoutButton } from "./logout-button";

const navItems = [
  { href: "/meu-perfil", label: "Meu Perfil", icon: Flame, highlight: true },
  { href: "/negocio", label: "Meu Negócio", icon: Brain, highlight: true },
  { href: "/estrategia", label: "Estratégia", icon: Target, highlight: true },
  { href: "/profiles", label: "Concorrentes", icon: Users },
  { href: "/hooks", label: "Banco de Hooks", icon: Zap },
  { href: "/calendar", label: "Calendário", icon: Calendar },
  { href: "/analysis", label: "Análises", icon: FileText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] flex flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <Link href="/meu-perfil" className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
            <span className="text-lg font-bold">Content Intel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.highlight
                  ? "text-[var(--accent)] font-medium hover:bg-[var(--accent)]/10"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-xs text-[var(--muted-foreground)]">Content Intel v1.0</span>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
