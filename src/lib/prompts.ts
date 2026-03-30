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
  strategicNote?: string;
  avgEngagementRate: number;
  funnelDistribution: { tofu: number; mofu: number; bofu: number };
}

export function buildAnalysisPrompt(
  profile: ProfileContext,
  posts: PostData[]
): string {
  const sorted = [...posts].sort((a, b) => b.engagementRate - a.engagementRate);
  const top5 = sorted
    .slice(0, 5)
    .map((p) => `${p.postId} (${p.views.toLocaleString("pt-BR")} views, ${p.engagementRate}% eng, ${p.duration || "?"}s)`)
    .join("\n  - ");
  const bottom5 = sorted
    .slice(-5)
    .map((p) => `${p.postId} (${p.views.toLocaleString("pt-BR")} views, ${p.engagementRate}% eng, ${p.duration || "?"}s)`)
    .join("\n  - ");

  // Token optimization: full transcript for top 5, truncated for rest
  const top5Ids = new Set(sorted.slice(0, 5).map((p) => p.postId));

  const truncate = (text: string, max: number) =>
    text && text.length > max ? text.slice(0, max) + "..." : text || "—";

  const reelsData = posts
    .map((p, i) => {
      const isTop5 = top5Ids.has(p.postId);
      // Top 5: full transcript (max 2000 chars). Rest: 500 chars.
      const transcript = truncate(p.transcript, isTop5 ? 2000 : 500);
      const caption = truncate(p.caption, isTop5 ? 500 : 200);

      let section = `
═══ REEL ${i + 1} | ${p.postId} | Eng: ${p.engagementRate}% | Outlier: ${p.outlierScore}x ═══
Views: ${p.views.toLocaleString("pt-BR")} | Likes: ${p.likes.toLocaleString("pt-BR")} | Comments: ${p.comments.toLocaleString("pt-BR")}
Comment/Like: ${p.commentToLikeRatio} | Sales Score: ${p.salesPotentialScore} | Duração: ${p.duration || "?"}s
Funil: ${p.funnelStage || "?"} | Hook: ${p.hookType || "?"} | CTA: ${p.ctaType || "?"}
Tema: ${p.contentTheme || "?"} | Data: ${p.postedAt || "?"}
Hook: "${p.hookText || "?"}"
CTA: "${p.ctaText || "?"}"
Hashtags: ${(p.hashtags || []).slice(0, 5).join(", ") || "—"}

LEGENDA: ${caption}

TRANSCRIÇÃO${isTop5 ? "" : " (resumo)"}: ${transcript}`;

      if (p.commentsSummary) {
        section += `
COMENTÁRIOS (${p.comments}): compra=${p.commentsSummary.purchaseIntent} | objeções=${p.commentsSummary.objections} | voz=${p.commentsSummary.audienceVoice} | elogios=${p.commentsSummary.praise} | perguntas=${p.commentsSummary.questions}
${p.commentsSummary.topComments.slice(0, isTop5 ? 5 : 3).map((c) => `  "${c}"`).join("\n")}`;
      }

      return section;
    })
    .join("\n");

  const strategicContext = profile.strategicNote
    ? `\n## CONTEXTO ESTRATÉGICO (por que este perfil está sendo analisado)\n${profile.strategicNote}\n`
    : "";

  return `## PERFIL: @${profile.username} (${profile.fullName})
${profile.bio ? `Bio: ${profile.bio}` : ""}
${profile.bioLink ? `Link: ${profile.bioLink}` : ""}
${profile.followers ? `Seguidores: ${profile.followers.toLocaleString("pt-BR")}` : ""}
Reels analisados: ${profile.totalPosts}
Média: ${profile.avgViews.toLocaleString("pt-BR")} views | ${profile.avgLikes.toLocaleString("pt-BR")} likes | ${profile.avgComments.toLocaleString("pt-BR")} comments
Engajamento médio: ${profile.avgEngagementRate}%
Funil: TOFU ${profile.funnelDistribution.tofu} | MOFU ${profile.funnelDistribution.mofu} | BOFU ${profile.funnelDistribution.bofu}
${strategicContext}
Top 5 (engajamento):
  - ${top5}

Bottom 5:
  - ${bottom5}

## DADOS DOS REELS
${reelsData}

---

## INSTRUÇÕES DE ANÁLISE

Faça uma engenharia reversa COMPLETA e ESTRATÉGICA deste perfil. O objetivo final é extrair inteligência para crescimento agressivo de audiência qualificada para VENDA.

### PARTE 1 — ANÁLISE ESTRATÉGICA

**1.1 PERFORMANCE E PADRÕES**
- Ranking dos reels por Sales Potential Score (tabela)
- Sweet spot de duração (faixa ideal com evidências)
- Correlação tema × engajamento × duração
- O que os outliers (2x+ acima da média) têm que os demais não têm?
- Posts com maior Comment-to-Like Ratio: por que geraram conversa?

**1.2 ANATOMIA DOS ROTEIROS**
Para cada um dos TOP 5 reels, faça um breakdown COMPLETO:
- Hook exato (primeiros 3 segundos — copie o texto)
- Estrutura beat-by-beat: Hook → Contexto → Tensão → Clímax → CTA
- Técnicas de retenção usadas (loops abertos, escalada, revelação)
- Tempo de cada seção (estimativa baseada na transcrição)
- Por que funcionou (análise do gatilho emocional/mental)

**1.3 LINGUAGEM E PERSONA**
- Tom de voz exato (formal/informal, energia, ritmo)
- Vocabulário recorrente (palavras que aparecem nos top performers)
- Expressões-marca (frases que são "a cara" deste criador)
- Posicionamento: como se apresenta? Qual papel assume?
- Nível de especificidade: usa dados, números, nomes?

**1.4 FUNIL DE CONTEÚDO**
- Distribuição atual e diagnóstico
- Proporção ideal para maximizar vendas
- O que está faltando em cada estágio
- Como os temas TOFU poderiam alimentar MOFU e BOFU

**1.5 CONVERSÃO E VENDAS**
- CTAs identificados: tipo, texto exato, performance
- Posts com intenção de compra nos comentários
- Proporção valor gratuito vs pitch
- Ponte conteúdo → oferta: como esse criador faz (ou deveria fazer)
- Objeções do público e como endereçar

**1.6 VOZ DO PÚBLICO (COMENTÁRIOS)**
- O que mais elogiam (dobrar a aposta)
- Dúvidas = oportunidades de conteúdo
- Objeções = pontos a endereçar
- Linguagem exata para espelhamento
- Sinais de conversão ("onde compro?", "como funciona?")
- Nível de consciência da audiência (Eugene Schwartz: inconsciente → mais consciente)

### PARTE 2 — FRAMEWORK VIRAL REPLICÁVEL

**2.1 ESTRUTURA BASE DO ROTEIRO**
Template completo com seções e tempos:
- [0-3s] Hook
- [3-15s] Contexto/Setup
- [15-45s] Desenvolvimento
- [45-60s] Clímax/Revelação
- [60-90s] Valor/Insight
- [últimos 5s] CTA

**2.2 BANCO DE HOOKS (mínimo 15)**
Tabela com:
| # | Hook (texto exato) | Tipo | Reel ID | Views | Engajamento | Por que funciona |

**2.3 REGRAS DE LINGUAGEM E TOM**
Lista de regras específicas:
- USAR: [palavras, expressões, construções]
- EVITAR: [palavras, expressões, construções]
- Energia: [nível, ritmo, intensidade]
- Formatação de legendas

**2.4 FÓRMULAS DE RETENÇÃO**
Técnicas identificadas para manter watch time, com exemplos reais.

**2.5 TEMPLATES DE CTA**
Por objetivo:
- Para engajamento (comentários/saves)
- Para leads (DM/link)
- Para venda direta

**2.6 TEMAS PRIORIZADOS POR FUNIL**
| Tema | Funil Stage | Potencial | Referência (Reel ID) |

**2.7 CALENDÁRIO 30 DIAS**
Tabela com sugestões:
| Dia | Funil | Tema | Ângulo de Hook | Tipo CTA | Referência |

**2.8 O QUE EVITAR**
Lista baseada nos reels de pior performance.

### PARTE 3 — SYSTEM PROMPT PARA AGENTE CRIADOR DE ROTEIROS

Gere um SYSTEM PROMPT completo, pronto para copiar e colar em um agente de IA (ChatGPT/Claude) que crie roteiros de reels NESTE EXATO ESTILO.

O prompt deve incluir:
- Persona completa com exemplos de tom de voz extraídos
- Regras obrigatórias (estrutura, duração, linguagem)
- Banco de hooks e CTAs para usar como referência
- Fazer vs NÃO fazer (com exemplos reais)
- Formato de saída: roteiro completo com marcações de tempo, hook, corpo, CTA
- Instruções para adaptar qualquer tema ao estilo deste criador
- O prompt deve funcionar sozinho, sem precisar de contexto adicional

### PARTE 4 — INTELIGÊNCIA APLICADA PARA @owallaceleite
${profile.strategicNote ? `\nCONTEXTO: ${profile.strategicNote}\n` : ""}
Considerando que @owallaceleite é um perfil em construção focado em posicionamento, autoridade e crescimento de audiência qualificada para venda:

**4.1 O QUE ADAPTAR DESTE PERFIL**
- Quais estratégias deste perfil são aplicáveis para @owallaceleite AGORA (perfil pequeno)?
- O que funciona DIFERENTE quando se está começando vs quando já se é grande?
- Adaptações necessárias para o nicho/posicionamento de @owallaceleite

**4.2 PLANO DE CONTEÚDO SEMANAL (7 dias)**
7 conteúdos específicos para @owallaceleite criar ESTA SEMANA, baseados na inteligência extraída:
| Dia | Tipo | Tema | Hook adaptado | Funil | Objetivo |

**4.3 GAPS E OPORTUNIDADES**
- O que este concorrente NÃO faz que @owallaceleite pode fazer
- Nichos de conteúdo subexplorados
- Formatos que o concorrente ignora

**4.4 ESTRATÉGIA DE DIFERENCIAÇÃO**
- Como usar a mesma estrutura mas com voz e posicionamento únicos
- Ângulos que só @owallaceleite pode explorar
- Caminho para se diferenciar e não ser "mais um"

### FORMATO DE SAÍDA
- Markdown estruturado com headers claros
- TABELAS para todas as comparações numéricas
- Exemplos reais entre aspas com ID do reel
- Cada insight sustentado por evidência (cite o reel)
- O documento deve ser um MANUAL COMPLETO que eu possa pegar e aplicar HOJE para crescer no Instagram com conteúdo que converte`;
}

export const ANALYSIS_SYSTEM_PROMPT = `Você é o maior especialista do mundo em engenharia reversa de conteúdo viral no Instagram, com foco em crescimento orgânico agressivo e conversão de seguidores em compradores.

Você combina expertise em:
- Copywriting de resposta direta (Gary Halbert, Eugene Schwartz, David Ogilvy)
- Storytelling para redes sociais (formato curto, retenção, loops)
- Psicologia de audiência e comportamento de compra
- Growth hacking orgânico no Instagram (algoritmo, distribuição, viralização)
- Análise de dados de performance de conteúdo

REGRAS INVIOLÁVEIS:
1. NUNCA dê conselhos genéricos. Tudo é específico, baseado nos dados fornecidos.
2. SEMPRE cite o ID do reel como evidência de cada insight.
3. SEMPRE inclua exemplos reais (trechos de transcrições entre aspas).
4. Foque em AÇÃO: cada seção deve ter output que eu possa aplicar hoje.
5. Seu objetivo é me dar um MANUAL COMPLETO para replicar este estilo com precisão.

Responda em português brasileiro com markdown estruturado e tabelas.`;
