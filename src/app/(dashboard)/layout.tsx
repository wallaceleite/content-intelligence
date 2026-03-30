import Link from "next/link";
import { BarChart3, Users, Zap, Calendar, FileText } from "lucide-react";

const navItems = [
  { href: "/profiles", label: "Perfis", icon: Users },
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
          <Link href="/profiles" className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
            <span className="text-lg font-bold">Content Intel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          Content Intelligence v1.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
