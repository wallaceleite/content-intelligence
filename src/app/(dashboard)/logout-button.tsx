"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      title="Sair"
      className="p-1.5 rounded-lg transition-all"
      style={{
        color: "var(--text-tertiary)",
        transitionDuration: "var(--duration)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--danger)";
        (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
