"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export function SyncButton({ lastSync }: { lastSync?: string }) {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSync() {
    setStatus("syncing");
    setMessage("");

    try {
      const res = await fetch("/api/instagram-sync", { method: "POST" });
      const data = await res.json();

      if (data.error) {
        setStatus("error");
        setMessage(data.error);
      } else {
        setStatus("done");
        setMessage(`${data.media?.updated || 0} posts atualizados${data.demographics ? `, ${data.demographics} demographics` : ""}`);
        // Refresh page after 2s to show updated data
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Erro de conexão");
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass-card p-4 mb-6 flex items-center justify-between" style={{ borderStyle: "dashed" }}>
      <div>
        <p className="text-sm font-medium">Sincronizar dados do Instagram</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {status === "syncing"
            ? "Sincronizando... isso pode levar alguns segundos"
            : status === "done"
            ? message
            : status === "error"
            ? message
            : lastSync
            ? `Última sync: ${formatDate(lastSync)}`
            : "Atualiza saves, shares, reach, demographics via API oficial"}
        </p>
      </div>
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="px-4 py-2 text-sm rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: status === "done" ? "var(--success)" : status === "error" ? "var(--danger)" : "var(--accent)",
          color: "var(--accent-foreground)",
        }}
      >
        {status === "syncing" ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Sincronizando...
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Concluído
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="w-4 h-4" />
            Tentar de novo
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Sincronizar
          </>
        )}
      </button>
    </div>
  );
}
