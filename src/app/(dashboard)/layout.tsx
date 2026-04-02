import { BarChart3 } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { NavLink } from "./nav-link";
import Link from "next/link";

const navItems = [
  { href: "/meu-perfil", label: "Meu Perfil", iconName: "Flame", highlight: true },
  { href: "/negocio", label: "Meu Negócio", iconName: "Brain", highlight: true },
  { href: "/estrategia", label: "Estratégia", iconName: "Target", highlight: true },
  { href: "/profiles", label: "Concorrentes", iconName: "Users" },
  { href: "/hooks", label: "Banco de Hooks", iconName: "Zap" },
  { href: "/calendar", label: "Calendário", iconName: "Calendar" },
  { href: "/analysis", label: "Análises", iconName: "FileText" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen" style={{ background: "var(--background)" }}>
      <aside className="w-64 flex flex-col border-r" style={{
        background: "var(--background-elevated)",
        borderColor: "var(--border-glass)",
      }}>
        <div className="p-6 border-b" style={{ borderColor: "var(--border-glass)" }}>
          <Link href="/meu-perfil" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: "var(--accent-muted)",
            }}>
              <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
            <span className="text-base font-semibold tracking-tight" style={{
              fontFamily: "'Space Grotesk', system-ui",
            }}>
              Content Intel
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="p-4 border-t flex items-center justify-between" style={{
          borderColor: "var(--border-glass)",
        }}>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Content Intel v1.0
          </span>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
