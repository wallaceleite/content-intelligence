"use client";

import { useEffect, useState } from "react";
import {
  Compass, Sparkles, Loader2, Video, Layers, Image as ImageIcon,
  MessageSquare, ChevronDown, ChevronUp, Check, Camera, Send, X, Target,
} from "lucide-react";

interface ScriptBeat { momento: string; fala: string; }
interface DirectionPost {
  id: string;
  planned_date: string;
  format: string;
  funnel_stage: string;
  title: string;
  hook_verbal: string;
  hook_visual: string;
  script: ScriptBeat[];
  legenda: string;
  cta: string;
  cta_word: string;
  based_on: string;
  why: string;
  kpi: string;
  status: string;
}

const FORMAT_ICON: Record<string, any> = { reel: Video, carrossel: Layers, imagem: ImageIcon, story: MessageSquare };
const STAGE_STYLE: Record<string, string> = {
  tofu: "bg-blue-500/10 text-blue-400",
  mofu: "bg-yellow-500/10 text-yellow-400",
  bofu: "bg-green-500/10 text-green-400",
};
const STATUS_FLOW = [
  { key: "aprovado", label: "Aprovar", icon: Check },
  { key: "gravado", label: "Gravei", icon: Camera },
  { key: "postado", label: "Postei", icon: Send },
  { key: "pulado", label: "Pular", icon: X },
];

export default function DirecaoPage() {
  const [posts, setPosts] = useState<DirectionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/direction");
    const json = await res.json();
    setPosts(json.posts || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-direction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao gerar direção");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch("/api/direction", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6" style={{ color: "var(--accent)" }} />
            Direção da Semana
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Roteiros prontos pra gravar — engenharia reversa dos cases, na sua voz
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400 max-w-56">{error}</span>}
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Dirigindo sua semana...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Gerar direção da semana</>
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mb-8">
        Baseado em: rafa.grandi · fernandomiranda777 · tay.ldantas · hanahfranklin — 52 hooks e ~500 comentários analisados
      </p>

      {loading ? (
        <div className="glass-card p-12 text-center text-[var(--muted-foreground)]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      ) : !posts.length ? (
        <div className="glass-card p-12 text-center">
          <Compass className="w-10 h-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma direção gerada ainda. Clique em &quot;Gerar direção da semana&quot; — em ~1 minuto você tem 7 posts com roteiro completo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => {
            const Icon = FORMAT_ICON[p.format] || Video;
            const isToday = p.planned_date === today;
            const isOpen = open === p.id;
            const done = ["postado", "pulado"].includes(p.status);
            return (
              <div
                key={p.id}
                className={`glass-card overflow-hidden ${isToday ? "ring-1 ring-[var(--accent)]" : ""} ${done ? "opacity-50" : ""}`}
              >
                <button
                  className="w-full p-5 flex items-center gap-4 text-left"
                  onClick={() => setOpen(isOpen ? null : p.id)}
                >
                  <div className="w-16 text-center shrink-0">
                    <p className={`text-xs font-bold ${isToday ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`}>
                      {isToday ? "HOJE" : new Date(p.planned_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {new Date(p.planned_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                  <Icon className="w-5 h-5 shrink-0 text-[var(--muted-foreground)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-medium ${STAGE_STYLE[p.funnel_stage] || ""}`}>
                        {p.funnel_stage}
                      </span>
                      <span className="text-[10px] uppercase text-[var(--muted-foreground)]">{p.format}</span>
                      {p.status !== "sugerido" && (
                        <span className="text-[10px] uppercase font-bold text-[var(--accent)]">{p.status}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">🎯 {p.hook_verbal}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[var(--border)] pt-4 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50">
                        <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] mb-1">Hook visual (o que aparece na tela)</p>
                        <p className="text-sm">{p.hook_visual}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50">
                        <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Por quê este post agora
                        </p>
                        <p className="text-sm">{p.why}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] mb-2">Roteiro — fala completa</p>
                      <div className="space-y-2">
                        {(p.script || []).map((b, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="shrink-0 w-28 text-[10px] font-bold text-[var(--accent)] pt-0.5">{b.momento}</span>
                            <p className="text-sm flex-1">{b.fala}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50">
                        <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] mb-1">Legenda</p>
                        <p className="text-xs whitespace-pre-wrap">{p.legenda}</p>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-[var(--accent)]/10">
                          <p className="text-[10px] uppercase font-bold text-[var(--accent)] mb-1">CTA — palavra: {p.cta_word}</p>
                          <p className="text-sm">{p.cta}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--muted)]/50">
                          <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] mb-1">Baseado em</p>
                          <p className="text-xs">{p.based_on}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] mt-1">KPI: {p.kpi}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      {STATUS_FLOW.map(({ key, label, icon: SIcon }) => (
                        <button
                          key={key}
                          onClick={() => setStatus(p.id, key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            p.status === key
                              ? "bg-[var(--accent)] text-black"
                              : "bg-[var(--muted)] hover:bg-[var(--muted)]/70"
                          }`}
                        >
                          <SIcon className="w-3.5 h-3.5" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
