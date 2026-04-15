"use client";

import { useState } from "react";
import {
  Loader2,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
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

interface GeneratedCarousel {
  title: string;
  caption: string;
  cards: GeneratedCard[];
  cta_word: string;
  suggested_hook: string;
}

export default function GeradorPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CarouselTemplate | null>(null);
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedCarousel | null>(null);
  const [error, setError] = useState("");
  const [copiedCard, setCopiedCard] = useState<number | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [usage, setUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    cost: string;
  } | null>(null);

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
    setSelectedCategory(template.category);
    setResult(null);
    setError("");
  };

  const generate = async () => {
    if (!selectedTemplate || !topic.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setUsage(null);

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

      setResult(data.carousel);
      setUsage(data.usage);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, cardNum?: number) => {
    await navigator.clipboard.writeText(text);
    if (cardNum !== undefined) {
      setCopiedCard(cardNum);
      setTimeout(() => setCopiedCard(null), 2000);
    } else {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const copyAll = async () => {
    if (!result) return;
    const allText = result.cards
      .map((c) => `--- CARD ${c.number} (${c.label}) ---\n${c.text}`)
      .join("\n\n");
    const full = `${allText}\n\n--- LEGENDA ---\n${result.caption}`;
    await navigator.clipboard.writeText(full);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', system-ui" }}
        >
          Gerador de Carrosséis
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          35+ modelos baseados na metodologia Carrosséis que Vendem
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Template Selector */}
        <div className="col-span-4 space-y-2">
          <h2
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Escolha o modelo
          </h2>

          {CAROUSEL_CATEGORIES.map((cat) => {
            const templates = CAROUSEL_TEMPLATES.filter(
              (t) => t.category === cat.id
            );
            const isExpanded = expandedCategories.has(cat.id);

            return (
              <div key={cat.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-all hover:opacity-80"
                >
                  <span className="text-base">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block truncate">
                      {cat.name.replace("Carrosséis ", "").replace("de ", "").replace("com ", "")}
                    </span>
                    <span
                      className="text-[10px] block"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {cat.function}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: funnelColor(cat.funnelStage) + "20",
                      color: funnelColor(cat.funnelStage),
                    }}
                  >
                    {funnelLabel(cat.funnelStage)}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  )}
                </button>

                {isExpanded && (
                  <div
                    className="border-t px-1 py-1"
                    style={{ borderColor: "var(--border-glass)" }}
                  >
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className="w-full px-3 py-2 text-left rounded-lg text-xs transition-all flex items-center justify-between gap-2"
                        style={{
                          background:
                            selectedTemplate?.id === t.id
                              ? "var(--accent-muted)"
                              : "transparent",
                          color:
                            selectedTemplate?.id === t.id
                              ? "var(--accent)"
                              : "var(--foreground)",
                        }}
                      >
                        <span className="truncate">{t.name}</span>
                        <span
                          className="text-[10px] shrink-0"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {t.cardCount} cards
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Generator */}
        <div className="col-span-8 space-y-4">
          {!selectedTemplate ? (
            <div
              className="glass-card p-12 text-center"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Selecione um modelo na lateral para começar
              </p>
            </div>
          ) : (
            <>
              {/* Selected template info */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">
                    {
                      CAROUSEL_CATEGORIES.find(
                        (c) => c.id === selectedTemplate.category
                      )?.icon
                    }
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">
                      {selectedTemplate.name}
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {selectedTemplate.funnelFunction} &middot;{" "}
                      {selectedTemplate.cardCount} cards
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded ml-auto"
                    style={{
                      background:
                        funnelColor(selectedTemplate.funnelStage) + "20",
                      color: funnelColor(selectedTemplate.funnelStage),
                    }}
                  >
                    {funnelLabel(selectedTemplate.funnelStage)}
                  </span>
                  {selectedTemplate.exampleUrl && (
                    <a
                      href={selectedTemplate.exampleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--accent)" }}
                    >
                      Ver exemplo
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Template structure preview */}
                <details className="group">
                  <summary
                    className="text-[10px] font-semibold cursor-pointer select-none"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    VER ESTRUTURA DO TEMPLATE
                  </summary>
                  <pre
                    className="mt-2 text-[10px] leading-relaxed whitespace-pre-wrap p-3 rounded-lg overflow-auto max-h-48"
                    style={{
                      background: "var(--muted)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {selectedTemplate.structure}
                  </pre>
                </details>
              </div>

              {/* Input form */}
              <div className="glass-card p-4 space-y-4">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Tema do carrossel *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: Por que a maioria dos infoprodutores não consegue vender no orgânico"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border-glass)",
                      color: "var(--foreground)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-glass)";
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Ângulo / abordagem{" "}
                    <span style={{ color: "var(--text-tertiary)" }}>
                      (opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    placeholder="Ex: Abordar pela perspectiva de quem já tentou tráfego pago e não funcionou"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border-glass)",
                      color: "var(--foreground)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-glass)";
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Contexto adicional{" "}
                    <span style={{ color: "var(--text-tertiary)" }}>
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    placeholder="Ex: Semana passada testei postar sem hook forte e o alcance caiu 60%. Quero usar isso como gancho."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border-glass)",
                      color: "var(--foreground)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-glass)";
                    }}
                  />
                </div>

                <button
                  onClick={generate}
                  disabled={loading || !topic.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background:
                      loading || !topic.trim()
                        ? "var(--muted)"
                        : "var(--accent)",
                    color:
                      loading || !topic.trim()
                        ? "var(--text-tertiary)"
                        : "var(--accent-foreground)",
                    cursor:
                      loading || !topic.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando carrossel...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar Carrossel
                    </>
                  )}
                </button>

                {error && (
                  <p
                    className="text-xs text-center"
                    style={{ color: "var(--danger)" }}
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* Result */}
              {result && (
                <div className="space-y-4">
                  {/* Header with copy all */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      Carrossel Gerado
                      {usage && (
                        <span
                          className="font-normal ml-2 text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          ({usage.cost})
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={copyAll}
                      className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                      }}
                    >
                      {copiedCaption ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedCaption ? "Copiado!" : "Copiar tudo"}
                    </button>
                  </div>

                  {/* Suggested hook */}
                  {result.suggested_hook && (
                    <div
                      className="glass-card p-3 text-xs"
                      style={{
                        borderLeft: "3px solid var(--accent)",
                      }}
                    >
                      <span
                        className="font-semibold block mb-1"
                        style={{ color: "var(--accent)" }}
                      >
                        Hook sugerido
                      </span>
                      {result.suggested_hook}
                    </div>
                  )}

                  {/* Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {result.cards.map((card) => (
                      <div
                        key={card.number}
                        className="glass-card p-4 relative group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: "var(--accent)" }}
                          >
                            CARD {card.number} — {card.label}
                          </span>
                          <button
                            onClick={() => copyText(card.text, card.number)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copiar card"
                          >
                            {copiedCard === card.number ? (
                              <Check
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--accent)" }}
                              />
                            ) : (
                              <Copy
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--text-tertiary)" }}
                              />
                            )}
                          </button>
                        </div>
                        <p
                          className="text-xs leading-relaxed whitespace-pre-wrap"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {card.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Caption */}
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: "var(--accent)" }}
                      >
                        LEGENDA DO POST
                      </span>
                      <button
                        onClick={() => copyText(result.caption)}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        title="Copiar legenda"
                      >
                        <Copy
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                      </button>
                    </div>
                    <p
                      className="text-xs leading-relaxed whitespace-pre-wrap"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {result.caption}
                    </p>
                    {result.cta_word && (
                      <div
                        className="mt-3 pt-3 border-t text-xs"
                        style={{
                          borderColor: "var(--border-glass)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Palavra do CTA:{" "}
                        <span
                          className="font-bold"
                          style={{ color: "var(--accent)" }}
                        >
                          {result.cta_word}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
