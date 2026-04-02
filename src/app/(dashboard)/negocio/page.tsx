"use client";

import { useState, useEffect } from "react";
import {
  Briefcase, Target, UserCheck, Megaphone, BarChart3,
  Wrench, Brain, Save, CheckCircle, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

interface SectionConfig {
  icon: any;
  title: string;
  description: string;
  color: string;
  fields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "number" | "select";
    placeholder: string;
    options?: string[];
    tip?: string;
  }[];
}

const SECTIONS: Record<string, SectionConfig> = {
  produto: {
    icon: Briefcase,
    title: "Meu Produto/Oferta",
    description: "O que você vende e como entrega valor",
    color: "text-blue-400",
    fields: [
      { key: "nome", label: "Nome do produto/serviço", type: "text", placeholder: "Ex: Mentoria de Estratégia Digital" },
      { key: "tipo", label: "Tipo", type: "select", placeholder: "Selecione", options: ["Mentoria 1:1", "Mentoria em grupo", "Curso online", "Consultoria", "Serviço recorrente", "SaaS/Ferramenta", "Infoproduto", "Outro"] },
      { key: "ticket", label: "Ticket médio (R$)", type: "text", placeholder: "Ex: 2.997" },
      { key: "entrega", label: "Como entrega?", type: "textarea", placeholder: "Ex: 8 encontros de 1h via Zoom + grupo no WhatsApp + materiais" },
      { key: "funil_vendas", label: "Funil de vendas atual", type: "textarea", placeholder: "Ex: Instagram → Link na bio → Landing page → Call de vendas → Fechamento", tip: "Descreva cada etapa do caminho que o lead percorre até comprar" },
      { key: "lead_magnet", label: "Isca digital / Lead magnet", type: "textarea", placeholder: "Ex: E-book '10 estratégias de IA para escalar negócios' — captura pelo link na bio" },
      { key: "diferencial_oferta", label: "O que torna sua oferta única?", type: "textarea", placeholder: "Ex: Combino IA + estratégia sob medida, não é curso genérico" },
    ],
  },
  icp: {
    icon: Target,
    title: "ICP — Cliente Ideal",
    description: "Quem é a pessoa que compra de você. Evolui com dados dos concorrentes.",
    color: "text-green-400",
    fields: [
      { key: "quem", label: "Quem é?", type: "textarea", placeholder: "Ex: Empreendedor digital, 28-45 anos, faturando 10-50k/mês, quer escalar usando IA e estratégia" },
      { key: "cargo_setor", label: "Cargo / Setor", type: "text", placeholder: "Ex: Dono de agência, infoprodutor, prestador de serviço digital" },
      { key: "dor_principal", label: "Dor principal (1 frase)", type: "text", placeholder: "Ex: Produz conteúdo mas não converte em vendas" },
      { key: "dores", label: "Todas as dores", type: "textarea", placeholder: "Liste as dores separadas por linha:\n- Posta todo dia mas não cresce\n- Não sabe o que postar\n- Engajamento baixo\n- Não converte seguidores em clientes", tip: "Quanto mais dores você listar, melhor o sistema direciona os roteiros" },
      { key: "objecoes", label: "Objeções de compra", type: "textarea", placeholder: "- Será que funciona pro meu nicho?\n- Já tentei e não deu certo\n- É caro\n- Não tenho tempo", tip: "Essas objeções viram temas de conteúdo MOFU" },
      { key: "desejos", label: "O que deseja alcançar?", type: "textarea", placeholder: "- Viver de digital com liberdade\n- Escalar sem depender de tráfego pago\n- Ter autoridade no nicho" },
      { key: "linguagem", label: "Linguagem que usa", type: "textarea", placeholder: "Palavras e expressões que seu cliente fala:\n- 'precisei de mais clientes'\n- 'meu conteúdo não converte'\n- 'quero escalar'", tip: "Extraída automaticamente dos comentários dos concorrentes" },
      { key: "nivel_consciencia", label: "Nível de consciência", type: "select", placeholder: "Selecione", options: ["Inconsciente (não sabe que tem o problema)", "Problema-consciente (sabe da dor, não da solução)", "Solução-consciente (sabe que existe solução, não te conhece)", "Produto-consciente (te conhece, compara opções)", "Mais consciente (pronto para comprar)"] },
    ],
  },
  posicionamento: {
    icon: Megaphone,
    title: "Posicionamento",
    description: "Como você quer ser percebido no mercado",
    color: "text-purple-400",
    fields: [
      { key: "frase_posicionamento", label: "Eu sou o cara que ___", type: "text", placeholder: "Ex: ...usa IA para escalar negócios digitais com estratégia sob medida" },
      { key: "diferencial", label: "Diferencial vs concorrentes", type: "textarea", placeholder: "O que você faz que ninguém mais faz? Por que escolher você?" },
      { key: "historia", label: "Sua história (gera conexão)", type: "textarea", placeholder: "De onde veio, o que passou, por que faz o que faz. Essa história vira conteúdo.", tip: "Histórias pessoais são os conteúdos mais humanos e geram conexão profunda" },
      { key: "tom_voz", label: "Tom de voz", type: "select", placeholder: "Selecione", options: ["Autoritário e direto", "Consultivo e estratégico", "Inspiracional e motivacional", "Educativo e didático", "Provocativo e polêmico", "Próximo e conversacional"] },
      { key: "pilares", label: "Pilares de conteúdo (3-5 temas)", type: "textarea", placeholder: "1. Estratégia digital com IA\n2. Copywriting para vendas\n3. Posicionamento de autoridade\n4. Cases e resultados" },
      { key: "nao_sou", label: "O que NÃO sou (anti-posicionamento)", type: "textarea", placeholder: "Ex: Não sou guru de fórmula mágica. Não vendo resultado fácil. Não faço coaching genérico." },
    ],
  },
  metas: {
    icon: BarChart3,
    title: "Metas (90 dias)",
    description: "Números concretos que o painel vai rastrear",
    color: "text-yellow-400",
    fields: [
      { key: "seguidores_90d", label: "Meta seguidores em 90 dias", type: "number", placeholder: "Ex: 10000" },
      { key: "leads_semana", label: "Meta leads/DMs por semana", type: "number", placeholder: "Ex: 20" },
      { key: "vendas_mes", label: "Meta vendas por mês", type: "number", placeholder: "Ex: 5" },
      { key: "faturamento_mes", label: "Meta faturamento mensal (R$)", type: "text", placeholder: "Ex: 15.000" },
      { key: "investimento_trafego", label: "Investimento em tráfego pago (R$/mês)", type: "text", placeholder: "Ex: 0 (100% orgânico) ou 500" },
      { key: "engajamento_meta", label: "Meta de engajamento médio (%)", type: "text", placeholder: "Ex: 5" },
    ],
  },
  capacidade: {
    icon: Wrench,
    title: "Capacidade de Produção",
    description: "O que é realista para você produzir",
    color: "text-orange-400",
    fields: [
      { key: "posts_semana", label: "Posts por semana (realista)", type: "number", placeholder: "Ex: 7" },
      { key: "formatos", label: "Formatos que produz", type: "textarea", placeholder: "Ex:\n- Reels falando para câmera\n- Carrosséis com dados\n- Posts estáticos com texto" },
      { key: "grava_video", label: "Grava vídeo falando?", type: "select", placeholder: "Selecione", options: ["Sim, confortável", "Sim, mas estou aprendendo", "Não, prefiro carrossel/texto", "Quero começar"] },
      { key: "equipe", label: "Equipe", type: "select", placeholder: "Selecione", options: ["Faço tudo sozinho", "Tenho editor de vídeo", "Tenho social media", "Tenho equipe completa"] },
      { key: "tempo_diario", label: "Tempo diário para Instagram", type: "select", placeholder: "Selecione", options: ["30 minutos", "1 hora", "2 horas", "3+ horas", "Tempo integral"] },
      { key: "ferramentas", label: "Ferramentas que usa", type: "textarea", placeholder: "Ex: Canva, CapCut, ChatGPT, Notion" },
    ],
  },
};

function SectionForm({
  sectionKey,
  config,
  data,
  onSave,
  saving,
}: {
  sectionKey: string;
  config: SectionConfig;
  data: Record<string, any>;
  onSave: (section: string, data: Record<string, any>) => void;
  saving: string | null;
}) {
  const [formData, setFormData] = useState<Record<string, any>>(data || {});
  const [open, setOpen] = useState(false);
  const Icon = config.icon;

  const filledCount = config.fields.filter((f) => formData[f.key]?.toString().trim()).length;
  const totalFields = config.fields.length;
  const completePct = Math.round((filledCount / totalFields) * 100);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-center gap-4 hover:bg-[var(--muted)]/30 transition-colors"
      >
        <Icon className={`w-5 h-5 ${config.color} shrink-0`} />
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <p className="text-xs text-[var(--muted-foreground)]">{config.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${completePct === 100 ? "bg-green-500" : completePct > 0 ? "bg-yellow-500" : "bg-[var(--muted)]"}`}
              style={{ width: `${completePct}%` }}
            />
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{filledCount}/{totalFields}</span>
          {open ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />}
        </div>
      </button>

      {open && (
        <div className="p-5 pt-0 space-y-4 border-t border-[var(--border)]">
          <div className="pt-4 space-y-4">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium mb-1 block">
                  {field.label}
                </label>
                {field.tip && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{field.tip}</p>
                )}
                {field.type === "textarea" ? (
                  <textarea
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)]/50 resize-y"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)]/50"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => onSave(sectionKey, formData)}
            disabled={saving === sectionKey}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {saving === sectionKey ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar {config.title}
          </button>
        </div>
      )}
    </div>
  );
}

export default function NegocioPage() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business-config")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (section: string, data: Record<string, any>) => {
    setSaving(section);
    try {
      await fetch("/api/business-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      setConfig({ ...config, [section]: data });
      setSaved(section);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(null);
  };

  // Calculate overall completion
  const totalFields = Object.values(SECTIONS).reduce((s, c) => s + c.fields.length, 0);
  const filledFields = Object.entries(SECTIONS).reduce((s, [key, c]) => {
    const data = config[key] || {};
    return s + c.fields.filter((f) => data[f.key]?.toString().trim()).length;
  }, 0);
  const overallPct = Math.round((filledFields / totalFields) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Central de Inteligência</h1>
          <p className="text-[var(--muted-foreground)]">
            O cérebro que alimenta toda a estratégia de conteúdo
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overallPct === 100 ? "bg-green-500" : overallPct > 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span className="text-sm font-bold">{overallPct}%</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">{filledFields}/{totalFields} campos preenchidos</p>
        </div>
      </div>

      {overallPct < 50 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6 text-sm text-yellow-400">
          <Brain className="w-4 h-4 inline mr-2" />
          Preencha pelo menos 50% para o sistema gerar recomendações personalizadas. Quanto mais dados, melhor a inteligência.
        </div>
      )}

      {saved && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Salvo com sucesso
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(SECTIONS).map(([key, sectionConfig]) => (
          <SectionForm
            key={key}
            sectionKey={key}
            config={sectionConfig}
            data={config[key] || {}}
            onSave={handleSave}
            saving={saving}
          />
        ))}
      </div>

      <div className="mt-8 p-6 glass-card text-center" style={{ borderStyle: "dashed" }}>
        <Brain className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-3" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Esses dados alimentam automaticamente: análises de concorrentes, geração de roteiros,
          alertas do painel estratégico e o plano semanal de conteúdo.
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-2">
          Atualize sempre que ganhar nova inteligência sobre seu público ou negócio.
        </p>
      </div>
    </div>
  );
}
