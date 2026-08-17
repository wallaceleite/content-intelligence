"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send, Upload, Loader2, CheckCircle2, XCircle, Clock, CalendarClock,
  RefreshCw, Trash2, Copy, ExternalLink, Play, Camera, Music2,
} from "lucide-react";

type Network = "youtube" | "instagram" | "tiktok";

interface NetworkStatus { network: Network; connected: boolean; detail: string; }
interface NetworkForm { enabled: boolean; title: string; caption: string; hashtags: string; }
interface Publication {
  id: string;
  network: Network;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_url: string | null;
  error_message: string | null;
  caption: string | null;
  videos: { id: string; title: string; theme: string | null; transcript_status: string } | null;
}

const NETWORKS: { key: Network; label: string; color: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { key: "instagram", label: "Instagram Reels", color: "#D6249F", Icon: Camera },
  { key: "youtube", label: "YouTube Shorts", color: "#FF0033", Icon: Play },
  { key: "tiktok", label: "TikTok", color: "#00A8AD", Icon: Music2 },
];

const STATUS_CHIP: Record<string, { label: string; color: string }> = {
  agendado: { label: "Agendado", color: "#EAB308" },
  publicando: { label: "Publicando…", color: "#38BDF8" },
  publicado: { label: "Publicado", color: "#22C55E" },
  falhou: { label: "Falhou", color: "#EF4444" },
  cancelado: { label: "Cancelado", color: "#6B7280" },
  rascunho: { label: "Rascunho", color: "#6B7280" },
};

const emptyForm = (): NetworkForm => ({ enabled: false, title: "", caption: "", hashtags: "" });

export default function PublicarPage() {
  const [statuses, setStatuses] = useState<NetworkStatus[]>([]);
  const [queue, setQueue] = useState<Publication[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [video, setVideo] = useState<{ id: string; title: string } | null>(null);
  const [forms, setForms] = useState<Record<Network, NetworkForm>>({
    instagram: emptyForm(), youtube: emptyForm(), tiktok: emptyForm(),
  });
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<"transcrevendo" | "gerando" | "concluida" | "erro" | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [pipePct, setPipePct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Barra de progresso do pipeline: % avança dentro da faixa de cada estágio
  // (transcrição não expõe % real, então a faixa anda com o tempo e trava no teto)
  const STAGE_RANGE: Record<string, [number, number]> = {
    transcrevendo: [25, 65],
    gerando: [70, 95],
    concluida: [100, 100],
  };

  // Depois do upload, acompanha o pipeline (transcrição → geração) e pré-preenche
  // só o que ainda estiver vazio (edições manuais nunca são sobrescritas)
  function startSuggestionPolling(videoId: string) {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        const { video: v } = await res.json();
        if (!v) return;
        const st = v.transcript_status === "processando" ? "transcrevendo" : v.transcript_status;

        if (st === "erro") {
          clearInterval(timer);
          setStage("erro");
          setStageError(v.transcript_error || "Falha no processamento");
          return;
        }
        if (st === "transcrevendo" || st === "gerando") {
          setStage(st);
          const [base, cap] = STAGE_RANGE[st];
          setPipePct((p) => Math.min(cap, Math.max(base, p + 4)));
          return;
        }
        if (st === "concluida") {
          clearInterval(timer);
          if (v.suggestions) {
            applySuggestions(v.suggestions);
          } else {
            setStage("erro");
            setStageError(v.transcript_error || "Legendas não geradas");
          }
        }
      } catch { /* tenta de novo no próximo tick */ }
    }, 4000);
    setTimeout(() => clearInterval(timer), 8 * 60 * 1000);
  }

  function applySuggestions(s: Record<string, { title?: string; caption?: string; hashtags?: string }>) {
    setForms((f) => ({
      instagram: {
            ...f.instagram,
            caption: f.instagram.caption || s.instagram?.caption || "",
            hashtags: f.instagram.hashtags || s.instagram?.hashtags || "",
          },
          youtube: {
            ...f.youtube,
            title: f.youtube.title || s.youtube?.title || "",
            caption: f.youtube.caption || s.youtube?.caption || "",
            hashtags: f.youtube.hashtags || s.youtube?.hashtags || "",
          },
          tiktok: {
            ...f.tiktok,
            caption: f.tiktok.caption || s.tiktok?.caption || "",
            hashtags: f.tiktok.hashtags || s.tiktok?.hashtags || "",
          },
    }));
    setStage("concluida");
    setStageError(null);
    setPipePct(100);
  }

  // Retry manual: busca sugestões já salvas ou manda gerar de novo da transcrição
  async function fetchSuggestions() {
    if (!video) return;
    setStage("gerando");
    setStageError(null);
    setPipePct(75);
    try {
      const res = await fetch(`/api/videos/${video.id}`);
      let s = (await res.json()).video?.suggestions;
      if (!s) {
        const gen = await fetch(`/api/videos/${video.id}/suggest`, { method: "POST" });
        const gj = await gen.json();
        if (gj.error) { setStage("erro"); setStageError(gj.error); return; }
        s = gj.suggestions;
      }
      if (s) applySuggestions(s);
      else { setStage("erro"); setStageError("Legendas não geradas"); }
    } catch {
      setStage("erro");
      setStageError("Falha de rede ao buscar legendas");
    }
  }

  async function loadQueue() {
    const res = await fetch("/api/publications");
    const json = await res.json();
    setQueue(json.publications || []);
  }

  useEffect(() => {
    fetch("/api/publish/status")
      .then((r) => r.json())
      .then((j) => {
        const nets: NetworkStatus[] = j.networks || [];
        setStatuses(nets);
        // Redes conectadas já entram habilitadas no formulário
        setForms((f) => {
          const next = { ...f };
          for (const n of nets) next[n.network] = { ...next[n.network], enabled: n.connected };
          return next;
        });
      });
    loadQueue();
  }, []);

  // Lê as dimensões do arquivo local via metadata — instantâneo, sem upload
  function readVideoDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        resolve({ width: el.videoWidth, height: el.videoHeight });
        URL.revokeObjectURL(url);
      };
      el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("metadata")); };
      el.src = url;
    });
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setUploadPct(0);
    try {
      const signRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signed-upload", filename: file.name }),
      });
      const sign = await signRes.json();
      if (sign.error) throw new Error(sign.error);

      // PUT direto na URL assinada com progresso real — sem tocar no arquivo
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", sign.signedUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload falhou (HTTP ${xhr.status}) — verifique o limite de tamanho do storage`));
        xhr.onerror = () => reject(new Error("Falha de rede no upload"));
        xhr.send(file);
      });

      const createRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title: file.name.replace(/\.\w+$/, ""), filePath: sign.path }),
      });
      const created = await createRes.json();
      if (created.error) throw new Error(created.error);
      setUploadPct(100);
      setVideo({ id: created.video.id, title: created.video.title });

      // Transcrição em background — RF-11: sem ação do usuário
      fetch(`/api/videos/${created.video.id}/transcribe`, { method: "POST" }).catch(() => {});

      // Instagram rejeita largura >1920 (erro 2207053): normaliza em background
      // e trava o botão de publicar até terminar
      const dims = await readVideoDimensions(file).catch(() => null);
      if (dims && dims.width > 1920) {
        setNormalizing(true);
        fetch(`/api/videos/${created.video.id}/normalize`, { method: "POST" })
          .then(async (r) => {
            const j = await r.json().catch(() => ({}));
            if (!r.ok) setError(`Otimização pro Instagram falhou: ${j.error || r.status} — o IG pode rejeitar este vídeo`);
          })
          .catch(() => setError("Otimização pro Instagram falhou — o IG pode rejeitar este vídeo"))
          .finally(() => setNormalizing(false));
      }
      setStage("transcrevendo");
      setStageError(null);
      setPipePct(25);
      startSuggestionPolling(created.video.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function copyFrom(target: Network) {
    // Copia da primeira rede habilitada que já tem legenda
    const source = NETWORKS.map((n) => n.key).find(
      (k) => k !== target && forms[k].enabled && forms[k].caption
    );
    if (!source) return;
    setForms((f) => ({
      ...f,
      [target]: { ...f[target], caption: f[source].caption, hashtags: f[source].hashtags, title: f[target].title || f[source].title },
    }));
  }

  async function submit() {
    if (!video) return;
    const items = NETWORKS.filter((n) => forms[n.key].enabled).map((n) => ({
      network: n.key,
      title: forms[n.key].title,
      caption: forms[n.key].caption,
      hashtags: forms[n.key].hashtags,
    }));
    if (items.length === 0) { setError("Selecione ao menos uma rede"); return; }
    if (schedule && !scheduledAt) { setError("Defina data e hora do agendamento"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          items,
          scheduledAt: schedule ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      if (!schedule) {
        setNotice("Publicando nas redes selecionadas…");
        // 1 chamada POR rede: cada uma vira uma invocação isolada no servidor
        const ids = json.publications.map((p: { id: string }) => p.id);
        await Promise.allSettled(
          ids.map((id: string) =>
            fetch("/api/publish/run", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicationIds: [id] }),
            })
          )
        );
      } else {
        setNotice("Agendado. O cron executa no horário definido.");
      }

      setVideo(null);
      setForms({ instagram: emptyForm(), youtube: emptyForm(), tiktok: emptyForm() });
      setSchedule(false);
      setScheduledAt("");
      await loadQueue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao criar publicações");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryNow(id: string) {
    setNotice("Reprocessando…");
    // Reagendar zera as tentativas esgotadas antes de reprocessar
    await fetch(`/api/publications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
    });
    await fetch("/api/publish/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicationIds: [id] }),
    });
    await loadQueue();
    setNotice(null);
  }

  async function cancel(id: string) {
    await fetch(`/api/publications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    await loadQueue();
  }

  async function remove(id: string) {
    await fetch(`/api/publications/${id}`, { method: "DELETE" });
    await loadQueue();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
          Publicar
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
          1 vídeo → 3 redes. Transcrição e tema entram na base de inteligência automaticamente.
        </p>
      </div>

      {/* Status das conexões */}
      <div className="flex gap-3 flex-wrap">
        {NETWORKS.map((n) => {
          const st = statuses.find((s) => s.network === n.key);
          return (
            <div key={n.key} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
              style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}
              title={st?.detail || ""}>
              <n.Icon className="w-4 h-4" style={{ color: n.color }} />
              <span>{n.label}</span>
              {st?.connected
                ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
                : <XCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
            </div>
          );
        })}
      </div>

      {/* Upload */}
      {!video ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-2xl border border-dashed p-10 flex flex-col items-center gap-3 transition-all hover:bg-[rgba(255,255,255,0.03)]"
          style={{ borderColor: "var(--border-glass)", color: "var(--text-tertiary)" }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
              <span className="text-sm">Enviando… {uploadPct}%</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" style={{ color: "var(--accent)" }} />
              <span className="text-sm">Clique para enviar o vídeo (vertical 9:16, pronto e editado)</span>
            </>
          )}
        </button>
      ) : (
        <div className="rounded-2xl border p-4 space-y-3"
          style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {stage === "concluida"
                ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#22C55E" }} />
                : stage === "erro"
                ? <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#EF4444" }} />
                : <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" style={{ color: "var(--accent)" }} />}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{video.title}</div>
                <div className="text-xs" style={{ color: stage === "concluida" ? "#22C55E" : stage === "erro" ? "#EF4444" : "var(--text-tertiary)" }}>
                  {stage === "transcrevendo" && "Transcrevendo o áudio do vídeo…"}
                  {stage === "gerando" && "Escrevendo título, legenda e # na sua voz…"}
                  {stage === "concluida" && "Legendas prontas com SEO por plataforma — revise antes de publicar"}
                  {stage === "erro" && `Falhou: ${stageError || "erro no processamento"}`}
                  {!stage && "Vídeo no ar no storage"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {stage !== "concluida" && (
                <button onClick={fetchSuggestions} className="text-xs underline" style={{ color: "var(--accent)" }}>
                  {stage === "erro" ? "tentar de novo" : "puxar legendas"}
                </button>
              )}
              <button onClick={() => setVideo(null)} className="text-xs underline" style={{ color: "var(--text-tertiary)" }}>
                trocar vídeo
              </button>
            </div>
          </div>
          {/* Barra de progresso do pipeline (transcrição → legendas) */}
          {stage && stage !== "erro" && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pipePct}%`, background: stage === "concluida" ? "#22C55E" : "var(--accent)" }} />
              </div>
              <span className="text-xs tabular-nums w-9 text-right" style={{ color: "var(--text-tertiary)" }}>
                {pipePct}%
              </span>
            </div>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />

      {/* Legendas por rede */}
      {video && (
        <div className="space-y-4">
          {NETWORKS.map((n) => (
            <div key={n.key} className="rounded-2xl border p-4 space-y-3"
              style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)", opacity: forms[n.key].enabled ? 1 : 0.5 }}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={forms[n.key].enabled}
                    onChange={(e) => setForms((f) => ({ ...f, [n.key]: { ...f[n.key], enabled: e.target.checked } }))} />
                  <n.Icon className="w-4 h-4" style={{ color: n.color }} />
                  {n.label}
                </label>
                {forms[n.key].enabled && (
                  <button onClick={() => copyFrom(n.key)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all hover:bg-[rgba(255,255,255,0.05)]"
                    style={{ borderColor: "var(--border-glass)", color: "var(--text-tertiary)" }}>
                    <Copy className="w-3 h-3" /> copiar da outra rede
                  </button>
                )}
              </div>
              {forms[n.key].enabled && (
                <div className="space-y-2">
                  {n.key === "youtube" && (
                    <input placeholder="Título do Short" value={forms[n.key].title}
                      onChange={(e) => setForms((f) => ({ ...f, [n.key]: { ...f[n.key], title: e.target.value } }))}
                      className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--border-glass)" }} />
                  )}
                  <textarea placeholder="Legenda" rows={3} value={forms[n.key].caption}
                    onChange={(e) => setForms((f) => ({ ...f, [n.key]: { ...f[n.key], caption: e.target.value } }))}
                    className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none resize-y"
                    style={{ borderColor: "var(--border-glass)" }} />
                  <input placeholder="#hashtags" value={forms[n.key].hashtags}
                    onChange={(e) => setForms((f) => ({ ...f, [n.key]: { ...f[n.key], hashtags: e.target.value } }))}
                    className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--border-glass)" }} />
                </div>
              )}
            </div>
          ))}

          {/* Agora ou agendar */}
          <div className="rounded-2xl border p-4 flex flex-wrap items-center gap-4"
            style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={!schedule} onChange={() => setSchedule(false)} />
              <Send className="w-4 h-4" style={{ color: "var(--accent)" }} /> Publicar agora
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={schedule} onChange={() => setSchedule(true)} />
              <CalendarClock className="w-4 h-4" style={{ color: "var(--accent)" }} /> Agendar
            </label>
            {schedule && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border-glass)", colorScheme: "dark" }} />
            )}
            <button onClick={submit} disabled={submitting || normalizing}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#0A0A0F" }}>
              {submitting || normalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {normalizing ? "Otimizando vídeo pro Instagram…" : schedule ? "Agendar" : "Publicar"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-sm rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>{error}</div>}
      {notice && <div className="text-sm rounded-xl px-4 py-3" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>{notice}</div>}

      {/* Fila */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui" }}>Fila e histórico</h2>
          <button onClick={loadQueue} className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <RefreshCw className="w-3 h-3" /> atualizar
          </button>
        </div>
        {queue.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nenhuma publicação ainda.</p>
        )}
        {queue.map((p) => {
          const net = NETWORKS.find((n) => n.key === p.network)!;
          const chip = STATUS_CHIP[p.status] || STATUS_CHIP.rascunho;
          return (
            <div key={p.id} className="rounded-xl border p-3 flex items-center gap-3 flex-wrap"
              style={{ borderColor: "var(--border-glass)", background: "var(--background-elevated)" }}>
              <net.Icon className="w-4 h-4 flex-shrink-0" style={{ color: net.color }} />
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-medium">{p.videos?.title || "—"}</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {p.videos?.theme ? `${p.videos.theme} · ` : ""}
                  {p.status === "agendado" && p.scheduled_at
                    ? `agendado p/ ${new Date(p.scheduled_at).toLocaleString("pt-BR")}`
                    : p.published_at
                    ? new Date(p.published_at).toLocaleString("pt-BR")
                    : ""}
                </div>
                {p.error_message && (
                  <div className="text-xs mt-1" style={{ color: "#EF4444" }}>{p.error_message}</div>
                )}
              </div>
              <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{ background: `${chip.color}1A`, color: chip.color }}>
                {p.status === "agendado" && <Clock className="w-3 h-3" />}
                {chip.label}
              </span>
              {p.external_url && (
                <a href={p.external_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" style={{ color: "var(--accent)" }} />
                </a>
              )}
              {(p.status === "falhou" || p.status === "cancelado") && (
                <button onClick={() => retryNow(p.id)} title="Tentar de novo">
                  <RefreshCw className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}
              {p.status === "agendado" && (
                <button onClick={() => cancel(p.id)} className="text-xs underline" style={{ color: "var(--text-tertiary)" }}>
                  cancelar
                </button>
              )}
              {["falhou", "cancelado", "rascunho"].includes(p.status) && (
                <button onClick={() => remove(p.id)} title="Excluir">
                  <Trash2 className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
