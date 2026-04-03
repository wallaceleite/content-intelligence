# PROMPT M2 — Engenharia Reversa de Post Unico + Intelligence Rules

> Copie e cole este prompt inteiro no Claude Code (terminal) apontando para ~/Desktop/content-intelligence

---

## CONTEXTO

Projeto Content Intelligence — Next.js 16 + Supabase + Claude API.

O projeto ja tem um pipeline funcionando via n8n:
- Formulario com campos: urlInsta, quantidade, minViews, minEngajamento, topN, observacaoEstrategica
- O n8n detecta automaticamente se e perfil completo ou post unico (regex /\/(reel|p|tv)\//i)
- Quando e post unico, manda resultsLimit = 1 pro Apify
- O payload chega no webhook /api/webhook com posts[], profile{}, observacaoEstrategica

O problema: a app trata post unico e perfil completo da mesma forma. Precisamos de:
1. Modo de analise especifico para post unico (engenharia reversa cirurgica)
2. Extracao de intelligence_rules apos qualquer analise (perfil ou post)
3. Usar a observacaoEstrategica de forma mais forte no prompt de analise

Os imports do supabase usam `@/lib/supabase-admin` (nao `@/lib/supabase`).

---

## TAREFA 1: Criar tabela intelligence_rules

Criar novo arquivo de migration: `supabase/migrations/20260403_add_intelligence_rules.sql`

```sql
-- Intelligence rules extracted from analyses
CREATE TABLE IF NOT EXISTS intelligence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('profile_study', 'single_post', 'own_performance')),
  source_profile TEXT, -- @username de onde veio
  source_post_id TEXT, -- shortcode do post, se aplicavel
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,

  -- Rule content
  category TEXT NOT NULL CHECK (category IN (
    'hook_pattern',       -- padroes de hook que funcionam
    'cta_strategy',       -- estrategias de CTA
    'content_structure',  -- estrutura de conteudo (progressao, beats)
    'engagement_tactic',  -- taticas especificas de engajamento
    'audience_insight',   -- insights sobre comportamento da audiencia
    'posting_strategy',   -- frequencia, horarios, formatos
    'language_pattern',   -- padroes de linguagem e tom
    'sales_mechanism',    -- mecanismos de venda identificados
    'retention_formula',  -- formulas de retencao
    'theme_opportunity'   -- temas e angulos com potencial
  )),

  rule_text TEXT NOT NULL, -- a regra em linguagem clara
  evidence TEXT, -- evidencia que sustenta (ex: "Post X teve 45% eng usando esse padrao")
  confidence_score NUMERIC(3,2) DEFAULT 0.5, -- 0 a 1, quanto confiamos nessa regra

  -- Metadata
  tags TEXT[], -- tags livres pra busca
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- regras podem expirar (tendencias mudam)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intelligence_rules_category ON intelligence_rules(category);
CREATE INDEX idx_intelligence_rules_active ON intelligence_rules(active) WHERE active = true;
CREATE INDEX idx_intelligence_rules_source ON intelligence_rules(source_type, source_profile);
```

---

## TAREFA 2: Criar prompt de engenharia reversa para post unico

Criar novo arquivo: `src/lib/prompts-single-post.ts`

Este arquivo exporta duas funcoes:

### Funcao 1: `buildSinglePostAnalysisPrompt(post, profile, strategicNote)`

O prompt deve ser COMPLETAMENTE DIFERENTE do prompt de perfil. Focado em dissecar UM post.

Estrutura do prompt:

```
## POST ANALISADO
URL: [url]
Perfil: @[username] ([followers] seguidores)
Tipo: [video/carousel/image]
Metricas: [views] views | [likes] likes | [comments] comentarios | [saves] saves | [shares] shares
Engajamento: [rate]%
Duracao: [duration]s (se video)
Data: [posted_at]

## OBSERVACAO ESTRATEGICA DO ANALISTA
[strategicNote — a razao pela qual este post esta sendo analisado]

## CONTEUDO
Legenda: [caption completa]
Transcricao: [transcript completo — sem truncar]
Hashtags: [hashtags]

## COMENTARIOS ([total] comentarios analisados)
Intencao de compra: [n] ([%])
Elogios: [n] ([%])
Perguntas: [n] ([%])
Voz da audiencia: [n] ([%])
Objecoes: [n] ([%])
Neutros: [n] ([%])

Top comentarios por relevancia:
[lista dos comentarios mais relevantes, nao neutros, com intent_type]

---

## INSTRUCOES: ENGENHARIA REVERSA COMPLETA DESTE POST

### 1. POR QUE ESTE POST FUNCIONOU (ou nao)
- Diagnostico geral: performance relativa ao perfil
- O que fez a audiencia parar de scrollar (hook analysis)
- O que fez a audiencia assistir ate o final (retention analysis)
- O que fez a audiencia interagir (engagement triggers)

### 2. ANATOMIA BEAT-BY-BEAT
Desmembre o post segundo a segundo (se video) ou slide a slide (se carrossel):
- [0-3s] Hook: texto exato, tecnica usada, gatilho emocional
- [3-10s] Setup: como cria contexto
- [10-30s] Desenvolvimento: como mantem atencao
- [30-50s] Climax/Revelacao: ponto de virada
- [50-60s] CTA: como fecha

Para cada beat:
- Texto exato (entre aspas)
- Tecnica identificada
- Por que funciona nesse ponto especifico

### 3. ANALISE DOS COMENTARIOS
- Sentimento predominante e o que revela sobre a audiencia
- Comentarios com intencao de compra: o que exatamente disseram?
- Perguntas da audiencia = gaps de conteudo a explorar
- Objecoes = pontos a enderecar em proximos posts
- Linguagem da audiencia: palavras e expressoes que eles usam (para espelhamento)

### 4. PADROES REPLICAVEIS (extraia como REGRAS)
Para CADA padrao identificado, formate assim:

REGRA: [descricao clara e acionavel da regra]
CATEGORIA: [hook_pattern | cta_strategy | content_structure | engagement_tactic | audience_insight | language_pattern | sales_mechanism | retention_formula | theme_opportunity]
EVIDENCIA: [evidencia especifica deste post]
CONFIANCA: [alta | media | baixa]
TAGS: [tag1, tag2, tag3]

Extraia no MINIMO 5 regras, no MAXIMO 15.

### 5. TEMPLATE REPLICAVEL
Crie um template generico baseado neste post que eu possa usar para criar conteudo similar:
- Estrutura (beats com tempo)
- Tipo de hook a usar
- Progressao narrativa
- Tipo de CTA
- Tom e linguagem

### 6. COMO ADAPTAR PARA @owallaceleite
[Se strategicNote existir, usar como guia]
- Como replicar esse padrao mantendo meu tom de voz
- Adaptacoes necessarias pro meu nicho
- 3 ideias de conteudo inspiradas neste post (com hooks escritos)

### FORMATO DE SAIDA
- Markdown estruturado
- TABELAS para dados numericos
- Textos exatos SEMPRE entre aspas
- Cada insight com evidencia
- As REGRAS devem seguir o formato acima EXATAMENTE (o sistema vai extrair via regex)
```

### Funcao 2: `buildSinglePostSystemPrompt()`

```typescript
export const SINGLE_POST_SYSTEM_PROMPT = `Voce e um especialista em engenharia reversa de conteudo viral.
Sua tarefa e dissecar UM UNICO POST do Instagram com precisao cirurgica.

Voce analisa:
- Por que funcionou (ou nao) em termos de algoritmo e psicologia
- Estrutura beat-by-beat (segundo a segundo ou slide a slide)
- Comportamento da audiencia nos comentarios
- Padroes replicaveis que podem ser extraidos como REGRAS

REGRAS INVIOLAVEIS:
1. Seja CIRURGICO — este e UM post, nao um perfil. Va fundo.
2. Cada insight deve ter EVIDENCIA do proprio post.
3. Extraia REGRAS no formato especificado (REGRA/CATEGORIA/EVIDENCIA/CONFIANCA/TAGS).
4. Foque em padroes ACIONAVEIS — coisas que eu possa replicar hoje.
5. A secao de adaptacao para @owallaceleite e OBRIGATORIA.

Responda em portugues brasileiro com markdown estruturado.`;
```

---

## TAREFA 3: Modificar /api/analyze para detectar modo single post

Arquivo: `src/app/api/analyze/route.ts`

Adicionar logica ANTES da fase de analise Sonnet:

```typescript
// Detect if this is a single post analysis
const isSinglePost = posts.length === 1;

// Get strategic note from batch
const { data: batchData } = await supabaseAdmin
  .from("batches")
  .select("strategic_note")
  .eq("id", batch.id)
  .single();

let analysisResult;

if (isSinglePost) {
  // Use single post prompt
  const singlePostPrompt = buildSinglePostAnalysisPrompt(
    posts[0],          // post completo com metricas e comentarios
    profileContext,     // perfil de origem
    batchData?.strategic_note || ""
  );

  analysisResult = await analyzeWithSonnet(
    SINGLE_POST_SYSTEM_PROMPT,
    singlePostPrompt
  );
} else {
  // Use existing profile prompt
  const profilePrompt = buildAnalysisPrompt(profileContext, postsData);
  analysisResult = await analyzeWithSonnet(
    ANALYSIS_SYSTEM_PROMPT,
    profilePrompt
  );
}
```

Apos salvar a analise, adicionar a extracao de intelligence rules:

```typescript
// Extract intelligence rules from analysis
const rules = extractIntelligenceRules(analysisResult.text, {
  sourceType: isSinglePost ? 'single_post' : 'profile_study',
  sourceProfile: profile.username,
  sourcePostId: isSinglePost ? posts[0].post_id : null,
  batchId: batch.id
});

if (rules.length > 0) {
  await supabaseAdmin.from("intelligence_rules").insert(rules);
}
```

---

## TAREFA 4: Criar funcao extractIntelligenceRules

Adicionar em `src/lib/prompts-single-post.ts` (ou criar `src/lib/intelligence.ts`):

```typescript
interface ExtractedRule {
  source_type: string;
  source_profile: string;
  source_post_id: string | null;
  batch_id: string;
  category: string;
  rule_text: string;
  evidence: string;
  confidence_score: number;
  tags: string[];
  active: boolean;
}

export function extractIntelligenceRules(
  analysisText: string,
  context: {
    sourceType: string;
    sourceProfile: string;
    sourcePostId: string | null;
    batchId: string;
  }
): ExtractedRule[] {
  const rules: ExtractedRule[] = [];

  // Regex to extract rules in the specified format
  const rulePattern = /REGRA:\s*(.+?)[\n\r]+CATEGORIA:\s*(.+?)[\n\r]+EVIDENCIA:\s*(.+?)[\n\r]+CONFIANCA:\s*(.+?)[\n\r]+TAGS:\s*(.+?)(?=[\n\r]{2}|REGRA:|$)/gis;

  let match;
  while ((match = rulePattern.exec(analysisText)) !== null) {
    const confidenceMap: Record<string, number> = {
      'alta': 0.9,
      'media': 0.6,
      'média': 0.6,
      'baixa': 0.3
    };

    const category = match[2].trim().toLowerCase().replace(/\s+/g, '_');
    const validCategories = [
      'hook_pattern', 'cta_strategy', 'content_structure',
      'engagement_tactic', 'audience_insight', 'posting_strategy',
      'language_pattern', 'sales_mechanism', 'retention_formula',
      'theme_opportunity'
    ];

    rules.push({
      source_type: context.sourceType,
      source_profile: context.sourceProfile,
      source_post_id: context.sourcePostId,
      batch_id: context.batchId,
      category: validCategories.includes(category) ? category : 'engagement_tactic',
      rule_text: match[1].trim(),
      evidence: match[3].trim(),
      confidence_score: confidenceMap[match[4].trim().toLowerCase()] || 0.5,
      tags: match[5].split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      active: true
    });
  }

  return rules;
}
```

---

## TAREFA 5: Atualizar prompt de analise de perfil para tambem extrair regras

No arquivo `src/lib/prompts.ts`, adicionar ao final da PARTE 2 (antes da PARTE 3):

```
**2.9 REGRAS EXTRAIDAS**
Para CADA padrao importante identificado nesta analise, formate assim:

REGRA: [descricao clara e acionavel]
CATEGORIA: [hook_pattern | cta_strategy | content_structure | engagement_tactic | audience_insight | posting_strategy | language_pattern | sales_mechanism | retention_formula | theme_opportunity]
EVIDENCIA: [evidencia especifica com ID do reel]
CONFIANCA: [alta | media | baixa]
TAGS: [tag1, tag2, tag3]

Extraia no MINIMO 8 regras, no MAXIMO 20.
```

---

## TAREFA 6: Melhorar uso do strategicNote no prompt de perfil

No arquivo `src/lib/prompts.ts`, substituir as linhas 98-100:

DE:
```typescript
const strategicContext = profile.strategicNote
  ? `\n## CONTEXTO ESTRATÉGICO (por que este perfil está sendo analisado)\n${profile.strategicNote}\n`
  : "";
```

PARA:
```typescript
const strategicContext = profile.strategicNote
  ? `\n## ⚡ DIRETRIZ ESTRATÉGICA (PRIORIDADE MÁXIMA)
Este perfil está sendo analisado com um OBJETIVO ESPECÍFICO definido pelo analista:

"${profile.strategicNote}"

TODA a análise deve ser DIRECIONADA por esta diretriz.
- Na PARTE 1, priorize padrões relacionados a este objetivo
- Na PARTE 2, foque hooks e templates alinhados com este objetivo
- Na PARTE 3, o system prompt deve refletir este foco
- Na PARTE 4, as sugestões para @owallaceleite devem atacar DIRETAMENTE este objetivo
\n`
  : "";
```

---

## RESUMO DAS ALTERACOES

Arquivos a CRIAR:
1. `supabase/migrations/20260403_add_intelligence_rules.sql` — nova tabela
2. `src/lib/prompts-single-post.ts` — prompt de engenharia reversa + extractor de regras

Arquivos a MODIFICAR:
3. `src/app/api/analyze/route.ts` — detectar single post, usar prompt diferente, extrair rules
4. `src/lib/prompts.ts` — adicionar secao 2.9 de regras + melhorar strategicNote

## CRITERIO DE CONCLUSAO

- [ ] Nova tabela intelligence_rules criada na migration
- [ ] Ao analisar um batch com 1 post, usa prompt de engenharia reversa (cirurgico)
- [ ] Ao analisar um batch com multiplos posts, usa prompt de perfil (existente) com secao de regras
- [ ] Apos QUALQUER analise (perfil ou post), intelligence_rules sao extraidas e salvas
- [ ] O strategicNote direciona toda a analise com prioridade
- [ ] `npm run build` passa sem erros
- [ ] Listar todos os arquivos modificados/criados ao final

## RESTRICOES

- NAO modifique o workflow do n8n (ele ja funciona corretamente)
- NAO altere o webhook /api/webhook (payload ja vem correto)
- NAO modifique a UI/dashboard neste prompt (sera feito depois)
- Mantenha imports usando `@/lib/supabase-admin`
- Mantenha compatibilidade com o pipeline existente (perfil completo continua funcionando igual)
