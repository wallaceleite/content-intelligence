"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SocialSyncButton({ endpoint }: { endpoint: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function sync() {
    setBusy(true);
    try {
      await fetch(endpoint, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={sync} disabled={busy}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all disabled:opacity-50"
      style={{ borderColor: "var(--border-glass)", color: "var(--accent)" }}>
      <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Sincronizando…" : "Sincronizar"}
    </button>
  );
}
