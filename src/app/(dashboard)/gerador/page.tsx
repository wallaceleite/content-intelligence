"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Pencil,
  Image,
} from "lucide-react";
import {
  CAROUSEL_TEMPLATES,
  CAROUSEL_CATEGORIES,
  type CarouselTemplate,
} from "@/lib/carousel-templates";

interface GeneratedCard {
  number: number;
  label: string;
  text: string;
}

interface CarouselRecord {
  id: string;
  template_id: string;
  template_name: string;
  category: string;
  category_icon: string;
  funnel_stage: string;
  topic: string;
  angle: string | null;
  cards: GeneratedCard[];
  caption: string | null;
  cta_word: string | null;
  suggested_hook: string | null;
  status: string;
  rejection_note: string | null;
  cost: string | null;
  created_at: string;
}

type Tab = "gerar" | "kanban";

const KANBAN_COLUMNS = [
  { id: "revisao", label: "Em Revisão", color: "#FFB800", icon: "👀" },
  { id: "aprovado", label: "Aprovado", color: "#00E5CC", icon: "✅" },
  { id: "produzindo", label: "Produzindo", color: "#8B5CF6", icon: "🎨" },
  { id: "publicado", label: "Publicado", color: "#22C55E", icon: "🚀" },
  { id: "reprovado", label: "Reprovado", color: "#FF6B6B", icon: "❌" },
];

export default function GeradorPage() {
  const [tab, setTab] = useState<Tab>("gerar");
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate | null>(null);
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Kanban state
  const [carousels, setCarousels] = useState<CarouselRecord[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [selectedCarousel, setSelectedCarousel] = useState<CarouselRecord | null>(null);
  const [editingCards, setEditingCards] = useState<GeneratedCard[] | null>(null);
  const [editingCaption, setEditingCaption] = useState<string>("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const loadCarousels = useCallback(async () => {
    setKanbanLoading(true);
    try {
      const res = await fetch("/api/carousels");
      const data = await res.json();
      if (data.data) setCarousels(data.data);
    } catch {
      // ignore
    } finally {
      setKanbanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "kanban") loadCarousels();
  }, [tab, loadCarousels]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const selectTemplate = (template: CarouselTemplate) => {
    setSelectedTemplate(template);
    setError("");
  };

  const generate = async () => {
    if (!selectedTemplate || !topic.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          topic: topic.trim(),
          angle: angle.trim() || undefined,
          customContext: customContext.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar");

      // Success - switch to kanban
      setTopic("");
      setAngle("");
      setCustomContext("");
      setTab("kanban");
      loadCarousels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, rejNote?: string) => {
    await fetch(`/api/carousels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        rejectionNote: rejNote || null,
      }),
    });
    loadCarousels();
    if (selectedCarousel?.id === id) {
      setSelectedCarousel((prev) => prev ? { ...prev, status, rejection_note: rejNote || null } : null);
    }
  };

  const saveEdits = async (id: string) => {
    if (!editingCards) return;
    await fetch(`/api/carousels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cards: editingCards,
        caption: editingCaption,
      }),
    });
    setEditingCards(null);
    loadCarousels();
    if (selectedCarousel) {
      setSelectedCarousel({ ...selectedCarousel, cards: editingCards, caption: editingCaption });
    }
  };

  const deleteCarousel = async (id: string) => {
    await fetch(`/api/carousels/${id}`, { method: "DELETE" });
    loadCarousels();
    if (selectedCarousel?.id === id) setSelectedCarousel(null);
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async (carousel: CarouselRecord) => {
    const allText = carousel.cards
      .map((c) => `--- CARD ${c.number} (${c.label}) ---\n${c.text}`)
      .join("\n\n");
    const full = `${allText}\n\n--- LEGENDA ---\n${carousel.caption || ""}`;
    await copyText(full, "all-" + carousel.id);
  };

  const funnelColor = (stage: string) => {
    if (stage === "tofu") return "#00E5CC";
    if (stage === "mofu") return "#FFB800";
    return "#FF6B6B";
  };

  const funnelLabel = (stage: string) => {
    if (stage === "tofu") return "TOFU";
    if (stage === "mofu") return "MOFU";
    return "BOFU";
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
            Gerador de Carrosséis
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Gere, revise e aprove seus carrosséis antes de produzir
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--muted)" }}>
          {[
            { id: "gerar" as Tab, label: "Gerar", icon: Sparkles },
            { id: "kanban" as Tab, label: "Kanban", icon: RefreshCw },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "var(--accent-foreground)" : "var(--text-secondary)",
              }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: GERAR */}
      {tab === "gerar" && (
        <div className="grid grid-cols-12 gap-5">
          {/* Template selector */}
          <div className="col-span-4 space-y-1.5">
            <h2 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              Escolha o modelo
            </h2>
            {CAROUSEL_CATEGORIES.map((cat) => {
              const templates = CAROUSEL_TEMPLATES.filter((t) => t.category === cat.id);
              const isExpanded = expandedCategories.has(cat.id);
              return (
                <div key={cat.id} className="glass-card overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left transition-all hover:opacity-80"
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold block truncate">
                        {cat.name.replace("Carrosséis ", "").replace("de ", "").replace("com ", "")}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: funnelColor(cat.funnelStage) + "20", color: funnelColor(cat.funnelStage) }}
                    >
                      {funnelLabel(cat.funnelStage)}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    ) : (
                      <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-1 py-1" style={{ borderColor: "var(--border-glass)" }}>
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => selectTemplate(t)}
                          className="w-full px-2.5 py-1.5 text-left rounded-lg text-xs transition-all flex items-center justify-between gap-1"
                          style={{
                            background: selectedTemplate?.id === t.id ? "var(--accent-muted)" : "transparent",
                            color: selectedTemplate?.id === t.id ? "var(--accent)" : "var(--foreground)",
                          }}
                        >
                          <span className="truncate">{t.name}</span>
                          <span className="text-[10px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                            {t.cardCount}c
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Generator form */}
          <div className="col-span-8">
            {!selectedTemplate ? (
              <div className="glass-card p-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione um modelo na lateral</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected template info */}
                <div className="glass-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {CAROUSEL_CATEGORIES.find((c) => c.id === selectedTemplate.category)?.icon}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">{selectedTemplate.name}</h3>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {selectedTemplate.funnelFunction} &middot; {selectedTemplate.cardCount} cards
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: funnelColor(selectedTemplate.funnelStage) + "20", color: funnelColor(selectedTemplate.funnelStage) }}
                    >
                      {funnelLabel(selectedTemplate.funnelStage)}
                    </span>
                    {selectedTemplate.exampleUrl && (
                      <a href={selectedTemplate.exampleUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100" style={{ color: "var(--accent)" }}>
                        Exemplo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <details className="mt-3">
                    <summary className="text-[10px] font-semibold cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                      VER ESTRUTURA
                    </summary>
                    <pre className="mt-2 text-[10px] leading-relaxed whitespace-pre-wrap p-3 rounded-lg max-h-40 overflow-auto"
                      style={{ background: "var(--muted)", color: "var(--text-secondary)" }}>
                      {selectedTemplate.structure}
                    </pre>
                  </details>
                </div>

                {/* Form */}
                <div className="glass-card p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                      Tema do carrossel *
                    </label>
                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                      placeholder="Ex: Por que a maioria dos infoprodutores não consegue vender no orgânico"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-glass)"; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                      Ângulo <span style={{ color: "var(--text-tertiary)" }}>(opcional)</span>
                    </label>
                    <input type="text" value={angle} onChange={(e) => setAngle(e.target.value)}
                      placeholder="Ex: Pela perspectiva de quem já tentou tráfego pago e não funcionou"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-glass)"; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                      Contexto adicional <span style={{ color: "var(--text-tertiary)" }}>(opcional)</span>
                    </label>
                    <textarea value={customContext} onChange={(e) => setCustomContext(e.target.value)}
                      placeholder="Ex: Semana passada testei postar sem hook forte e o alcance caiu 60%"
                      rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                      style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-glass)"; }}
                    />
                  </div>
                  <button onClick={generate} disabled={loading || !topic.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: loading || !topic.trim() ? "var(--muted)" : "var(--accent)",
                      color: loading || !topic.trim() ? "var(--text-tertiary)" : "var(--accent-foreground)",
                      cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
                    }}>
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando carrossel...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Gerar e Enviar pra Revisão</>
                    )}
                  </button>
                  {error && <p className="text-xs text-center" style={{ color: "var(--danger)" }}>{error}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: KANBAN */}
      {tab === "kanban" && (
        <>
          {kanbanLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
              {KANBAN_COLUMNS.map((col) => {
                const items = carousels.filter((c) => c.status === col.id);
                return (
                  <div key={col.id} className="flex-shrink-0" style={{ width: 260 }}>
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-sm">{col.icon}</span>
                      <span className="text-xs font-bold">{col.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: col.color + "20", color: col.color }}>
                        {items.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="glass-card p-3 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedCarousel(item);
                            setEditingCards(null);
                          }}
                          style={{ borderLeft: `3px solid ${col.color}` }}>
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold line-clamp-2 flex-1">{item.topic}</p>
                            <span className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0"
                              style={{ background: funnelColor(item.funnel_stage) + "20", color: funnelColor(item.funnel_stage) }}>
                              {funnelLabel(item.funnel_stage)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              {item.category_icon} {item.template_name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              {item.cards.length} cards &middot; {timeAgo(item.created_at)}
                            </span>
                            {item.cost && (
                              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{item.cost}</span>
                            )}
                          </div>
                          {item.rejection_note && (
                            <p className="text-[10px] mt-2 px-2 py-1 rounded" style={{ background: "#FF6B6B20", color: "#FF6B6B" }}>
                              {item.rejection_note}
                            </p>
                          )}
                        </div>
                      ))}

                      {items.length === 0 && (
                        <div className="text-center py-8 opacity-30">
                          <p className="text-[10px]">Nenhum carrossel</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail Modal */}
          {selectedCarousel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={(e) => { if (e.target === e.currentTarget) { setSelectedCarousel(null); setEditingCards(null); } }}>
              <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl p-6 space-y-4"
                style={{ background: "var(--background-elevated)", border: "1px solid var(--border-glass)" }}>

                {/* Modal header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold">{selectedCarousel.topic}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {selectedCarousel.category_icon} {selectedCarousel.template_name} &middot;{" "}
                      {selectedCarousel.cards.length} cards &middot;{" "}
                      <span style={{ color: funnelColor(selectedCarousel.funnel_stage) }}>
                        {funnelLabel(selectedCarousel.funnel_stage)}
                      </span>
                    </p>
                  </div>
                  <button onClick={() => { setSelectedCarousel(null); setEditingCards(null); }}
                    className="p-1 rounded-lg hover:opacity-70">
                    <X className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {selectedCarousel.status === "revisao" && (
                    <>
                      <button onClick={() => updateStatus(selectedCarousel.id, "aprovado")}
                        className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
                        style={{ background: "#00E5CC20", color: "#00E5CC" }}>
                        <Check className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button onClick={() => setShowRejectModal(selectedCarousel.id)}
                        className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
                        style={{ background: "#FF6B6B20", color: "#FF6B6B" }}>
                        <X className="w-3.5 h-3.5" /> Reprovar
                      </button>
                      <button onClick={() => {
                        setEditingCards([...selectedCarousel.cards]);
                        setEditingCaption(selectedCarousel.caption || "");
                      }}
                        className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
                        style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </>
                  )}
                  {selectedCarousel.status === "aprovado" && (
                    <button disabled
                      className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 opacity-50"
                      style={{ background: "#8B5CF620", color: "#8B5CF6" }}>
                      <Image className="w-3.5 h-3.5" /> Gerar Imagens (em breve)
                    </button>
                  )}
                  {selectedCarousel.status === "reprovado" && (
                    <button onClick={() => updateStatus(selectedCarousel.id, "revisao")}
                      className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
                      style={{ background: "#FFB80020", color: "#FFB800" }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Voltar pra Revisão
                    </button>
                  )}
                  <button onClick={() => copyAll(selectedCarousel)}
                    className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 ml-auto"
                    style={{ background: "var(--muted)", color: "var(--text-secondary)" }}>
                    {copiedId === "all-" + selectedCarousel.id ? (
                      <><Check className="w-3.5 h-3.5" /> Copiado!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copiar tudo</>
                    )}
                  </button>
                  <button onClick={() => { if (confirm("Deletar este carrossel?")) deleteCarousel(selectedCarousel.id); }}
                    className="text-xs px-3 py-2 rounded-lg hover:opacity-70"
                    style={{ color: "var(--text-tertiary)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Rejection modal */}
                {showRejectModal && (
                  <div className="glass-card p-4 space-y-3" style={{ borderLeft: "3px solid #FF6B6B" }}>
                    <label className="text-xs font-semibold block" style={{ color: "#FF6B6B" }}>
                      Motivo da reprovação
                    </label>
                    <textarea value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder="O que precisa mudar? Ex: Tom muito genérico, precisa de mais dados específicos..."
                      rows={2} className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                      style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => {
                        updateStatus(showRejectModal, "reprovado", rejectionNote);
                        setShowRejectModal(null);
                        setRejectionNote("");
                      }}
                        className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                        style={{ background: "#FF6B6B", color: "#fff" }}>
                        Confirmar Reprovação
                      </button>
                      <button onClick={() => { setShowRejectModal(null); setRejectionNote(""); }}
                        className="text-xs px-4 py-1.5 rounded-lg"
                        style={{ color: "var(--text-tertiary)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggested hook */}
                {selectedCarousel.suggested_hook && (
                  <div className="p-3 rounded-lg text-xs" style={{ background: "var(--accent-muted)", borderLeft: "3px solid var(--accent)" }}>
                    <span className="font-semibold block mb-1" style={{ color: "var(--accent)" }}>Hook sugerido</span>
                    {selectedCarousel.suggested_hook}
                  </div>
                )}

                {/* Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {(editingCards || selectedCarousel.cards).map((card, idx) => (
                    <div key={card.number} className="glass-card p-3 group relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>
                          CARD {card.number} — {card.label}
                        </span>
                        {!editingCards && (
                          <button onClick={() => copyText(card.text, `card-${card.number}`)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {copiedId === `card-${card.number}` ? (
                              <Check className="w-3 h-3" style={{ color: "var(--accent)" }} />
                            ) : (
                              <Copy className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
                            )}
                          </button>
                        )}
                      </div>
                      {editingCards ? (
                        <textarea
                          value={editingCards[idx].text}
                          onChange={(e) => {
                            const updated = [...editingCards];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setEditingCards(updated);
                          }}
                          rows={4}
                          className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none"
                          style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
                        />
                      ) : (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                          {card.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Caption */}
                <div className="glass-card p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>LEGENDA</span>
                  </div>
                  {editingCards ? (
                    <textarea value={editingCaption}
                      onChange={(e) => setEditingCaption(e.target.value)}
                      rows={4} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none"
                      style={{ background: "var(--muted)", border: "1px solid var(--border-glass)", color: "var(--foreground)" }}
                    />
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                      {selectedCarousel.caption}
                    </p>
                  )}
                  {selectedCarousel.cta_word && !editingCards && (
                    <div className="mt-2 pt-2 border-t text-[10px]" style={{ borderColor: "var(--border-glass)", color: "var(--text-tertiary)" }}>
                      CTA: <span className="font-bold" style={{ color: "var(--accent)" }}>{selectedCarousel.cta_word}</span>
                    </div>
                  )}
                </div>

                {/* Save edits button */}
                {editingCards && (
                  <div className="flex gap-2">
                    <button onClick={() => saveEdits(selectedCarousel.id)}
                      className="text-xs font-semibold px-6 py-2 rounded-lg"
                      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                      Salvar Edições
                    </button>
                    <button onClick={() => setEditingCards(null)}
                      className="text-xs px-4 py-2 rounded-lg"
                      style={{ color: "var(--text-tertiary)" }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
