interface PostData {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  duration?: number;
  engagementRate: number;
  commentToLikeRatio: number;
  salesPotentialScore: number;
  outlierScore: number;
  funnelStage?: string;
  hookType?: string;
  hookText?: string;
  ctaType?: string;
  ctaText?: string;
  contentTheme?: string;
  caption: string;
  transcript: string;
  hashtags: string[];
  postedAt?: string;
  url?: string;
  commentsSummary?: {
    purchaseIntent: number;
    objections: number;
    audienceVoice: number;
    praise: number;
    questions: number;
    topComments: string[];
  };
}

interface ProfileContext {
  username: string;
  fullName: string;
  bio?: string;
  bioLink?: string;
  followers?: number;
  totalPosts: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgEngagementRate: number;
  funnelDistribution: { tofu: number; mofu: number; bofu: number };
}

export function buildAnalysisPrompt(
  profile: ProfileContext,
  posts: PostData[]
): string {
  const sorted = [...posts].sort((a, b) => b.views - a.views);
  const top3 = sorted
    .slice(0, 3)
    .map((p) => `${p.postId} (${p.views.toLocaleString("pt-BR")} views, ${p.engagementRate}% eng)`)
    .join(", ");
  const bottom3 = sorted
    .slice(-3)
    .map((p) => `${p.postId} (${p.views.toLocaleString("pt-BR")} views, ${p.engagementRate}% eng)`)
    .join(", ");

  const reelsData = posts
    .map((p, i) => {
      let section = `
══════════════════════════════════════════
REEL ${i + 1} | ID: ${p.postId} | ${p.funnelStage?.toUpperCase() || "N/A"} | Outlier: ${p.outlierScore}x
══════════════════════════════════════════

MÉTRICAS:
  Views: ${p.views.toLocaleString("pt-BR")} | Likes: ${p.likes.toLocaleString("pt-BR")} | Comentários: ${p.comments.toLocaleString("pt-BR")}
  Engajamento: ${p.engagementRate}% | Comment/Like Ratio: ${p.commentToLikeRatio}
  Sales Potential Score: ${p.salesPotentialScore} | Duração: ${p.duration || "N/A"}s
  Data: ${p.postedAt || "N/A"} | Link: ${p.url || "N/A"}

CLASSIFICAÇÃO:
  Funil: ${p.funnelStage || "N/A"} | Hook: ${p.hookType || "N/A"} | CTA: ${p.ctaType || "N/A"}
  Tema: ${p.contentTheme || "N/A"}
  Hook Text: "${p.hookText || "N/A"}"
  CTA Text: "${p.ctaText || "N/A"}"

HASHTAGS: ${p.hashtags?.join(", ") || "Nenhuma"}

LEGENDA:
${p.caption || "Sem legenda"}

TRANSCRIÇÃO:
${p.transcript || "Sem transcrição"}`;

      if (p.commentsSummary) {
        section += `

ANÁLISE DE COMENTÁRIOS (${p.comments} total):
  Intenção de compra: ${p.commentsSummary.purchaseIntent} comentários
  Objeções: ${p.commentsSummary.objections}
  Voz da audiência: ${p.commentsSummary.audienceVoice}
  Elogios: ${p.commentsSummary.praise}
  Perguntas: ${p.commentsSummary.questions}

  Comentários destaque:
${p.commentsSummary.topComments.map((c) => `  - "${c}"`).join("\n")}`;
      }

      return section;
    })
    .join("\n\n");

  return `## PERFIL ANALISADO
- Username: @${profile.username}
- Nome: ${profile.fullName}
${profile.bio ? `- Bio: ${profile.bio}` : ""}
${profile.bioLink ? `- Link: ${profile.bioLink}` : ""}
${profile.followers ? `- Seguidores: ${profile.followers.toLocaleString("pt-BR")}` : ""}
- Total de reels analisados: ${profile.totalPosts}
- Média views: ${profile.avgViews.toLocaleString("pt-BR")}
- Média likes: ${profile.avgLikes.toLocaleString("pt-BR")}
- Média comentários: ${profile.avgComments.toLocaleString("pt-BR")}
- Média engajamento: ${profile.avgEngagementRate}%
- Distribuição funil: TOFU ${profile.funnelDistribution.tofu} | MOFU ${profile.funnelDistribution.mofu} | BOFU ${profile.funnelDistribution.bofu}
- Top 3: ${top3}
- Bottom 3: ${bottom3}

## DADOS COMPLETOS
${reelsData}

---

## ANÁLISE SOLICITADA — ENGENHARIA REVERSA PARA CRESCIMENTO + VENDAS

### BLOCO 1: PERFORMANCE E PADRÕES
- Ranking por Sales Potential Score (não só views)
- Correlações: temas × engajamento × funil × duração
- Sweet spot de duração
- O que os outliers (3x+) têm que os demais não têm?
- Posts com maior Comment-to-Like Ratio: por que geraram tanta conversa?

### BLOCO 2: ANÁLISE DE FUNIL DE CONTEÚDO
- Distribuição atual: ${profile.funnelDistribution.tofu} TOFU / ${profile.funnelDistribution.mofu} MOFU / ${profile.funnelDistribution.bofu} BOFU
- Qual estágio tem melhor performance?
- Que temas TOFU alimentam conversões BOFU?
- Que conteúdo MOFU está FALTANDO?
- Proporção ideal sugerida para maximizar vendas

### BLOCO 3: ROTEIRO E COPYWRITING
- Catalogar TODOS os hooks por tipo e performance
- Estrutura completa: abertura → desenvolvimento → clímax → CTA
- Técnicas de retenção: loops, escalada, revelações
- Linguagem: formalidade, vocabulário, expressões-marca, ritmo
- Persona e posicionamento
- Gatilhos mentais e técnicas de persuasão
- Palavras de poder recorrentes

### BLOCO 4: CONVERSÃO E VENDAS
- Posts com maior intenção de compra nos comentários
- CTAs que mais convertem (soft vs medium vs hard)
- Proporção valor gratuito vs pitch
- Como transiciona de conteúdo gratuito para oferta?
- Objeções nos comentários e quais posts as endereçam
- Linguagem de compra do público (termos exatos)

### BLOCO 5: VOZ DO PÚBLICO
- Elogios: o que dobrar a aposta
- Dúvidas: oportunidades de conteúdo
- Objeções: pontos a endereçar nos próximos roteiros
- Linguagem para espelhamento (termos exatos do público)
- Sinais de conversão e seu contexto
- Nível de sofisticação: Inconsciente → Problema → Solução → Produto → Mais Consciente

### BLOCO 6: LEGENDAS E HASHTAGS
- Padrões por funil stage
- Correlação legenda × performance
- Hashtags mais eficazes

### BLOCO 7: FRAMEWORK VIRAL REPLICÁVEL
a) Estrutura Base do Roteiro (com tempos)
b) Banco de 15+ Hooks classificados por tipo + funil + performance
c) Regras de Linguagem e Tom
d) Fórmulas de Retenção
e) Templates de CTA por objetivo (engajamento, lead, venda)
f) Diretrizes de Legenda e Hashtags
g) Temas por Funil Stage priorizados
h) Calendário 30 dias (mix de TOFU/MOFU/BOFU)
i) O que EVITAR
j) Duração e ritmo ideal

### BLOCO 8: SYSTEM PROMPT PARA AGENTE CRIADOR
System prompt completo para IA criar roteiros neste estilo:
- Persona e tom exatos (com exemplos)
- Regras obrigatórias de estrutura
- Banco de hooks e CTAs
- Fazer e NÃO fazer
- Formato de saída (roteiro pronto para gravar com marcações de tempo)
- Adaptação de temas mantendo estilo

## FORMATO
- Markdown estruturado
- Cite IDs dos reels como evidência
- Tabelas para comparações
- Exemplos reais entre aspas
- Este documento deve ser um MANUAL COMPLETO e ACIONÁVEL`;
}

export const ANALYSIS_SYSTEM_PROMPT = `Você é um estrategista de conteúdo digital de elite com 15 anos de experiência em crescimento orgânico no Instagram e conversão de seguidores em compradores.

Sua análise é cirúrgica e baseada em dados. Cada insight deve ser sustentado por evidência (IDs de reels, métricas, trechos de transcrições).

Seu foco é DUPLO:
1. CRESCIMENTO: identificar padrões que atraem audiência qualificada
2. CONVERSÃO: identificar padrões que transformam seguidores em compradores

Você nunca dá conselhos genéricos. Tudo é específico, baseado nos dados fornecidos, com exemplos reais.

Responda em português brasileiro com markdown estruturado.`;
