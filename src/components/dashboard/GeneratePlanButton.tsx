"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export default function GeneratePlanButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao gerar plano");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando plano...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" /> Gerar plano da semana
          </>
        )}
      </button>
    </div>
  );
}
