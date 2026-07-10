# PLANO MESTRE — Content Intelligence v2
> Gerado por análise profunda em 2026-07-09 (código completo + Método Vinci + APIs disponíveis).
> Norte: transformar um analisador de Instagram puxado a clique em uma **fábrica autônoma de conteúdo calibrada pela SUA marca** — Instagram + YouTube, da inteligência ao roteiro pronto.

---

## MÉTRICA NORTE (leia antes de qualquer fase)

O sucesso deste sistema NÃO é feature entregue. É **conteúdo publicado por semana**.
Cada fase abaixo termina com algo que empurra o Wallace a publicar. Se uma sessão de trabalho não aproxima disso, é rabbit hole.

---

## 1. DIAGNÓSTICO — o que o sistema é hoje

**O que funciona bem:**
- Pipeline de engenharia reversa de concorrentes IG (Apify → n8n → webhook → OCR/classificação Haiku → análise Sonnet em 4 partes) — o prompt de análise é forte, ancorado em Schwartz/Halbert/Ogilvy.
- 37 templates CQV de carrossel em 7 categorias mapeadas ao funil + Kanban de aprovação.
- Métricas derivadas inteligentes (outlier score, sales potential score com peso em saves).

**As 5 fraquezas estruturais (em ordem de gravidade):**
1. **Sem voz própria.** O sistema extrai a voz dos CONCORRENTES (Parte 3 da análise gera até system prompt do estilo deles), mas não existe nenhum artefato da voz do Wallace. Geração herda voz média do Sonnet + 4 linhas genéricas.
2. **Zero automação.** Nada roda sozinho: sem cron, `/api/generate-plan` e `/api/daily-sync` são órfãos (nenhuma UI/cron chama), `/calendar` sempre vazio, `strategy_plan` nunca populado.
3. **Zero YouTube.** Nenhuma linha de código, nenhuma chave no .env.
4. **Motor de geração fraco onde importa.** Prompts de geração genéricos ("metodologia CQV" citada mas nunca definida), sem few-shot, parsing por regex frágil, sem prompt caching (custo desperdiçado), modelos antigos (`claude-sonnet-4-20250514`).
5. **Sem feedback loop.** Publica → nada mede → nada aprende. `business_learnings` existe e está morta.

**Bugs concretos (Fase 0):**
- `analyze/route.ts:279` grava `model_used: "claude-sonnet-4-6-20250610"` mas chama `claude-sonnet-4-20250514` — telemetria falsa.
- `/estrategia` consulta colunas `category`/`description` que NÃO existem em `strategy_benchmarks` (migração só tem key/label/value/unit) + tabela nunca recebeu seed → seção vazia/quebrada.
- Duas fórmulas divergentes de engagement rate (`calculateDerivedMetrics` inclui shares/saves; `filterAndRankPosts` não).
- Tabela `carousels` sem migração (SQL em comentário); `calendar_items` e `carousel_slides` mortas.
- OCR limitado a 5 slides — a maioria dos templates tem 7-10 cards.
- Webhooks sem segredo/assinatura; rotas API todas com service-role sem checar auth; `markdownToHtml` caseiro duplicado com `dangerouslySetInnerHTML` (XSS).
- JSON extraído por regex `\{[\s\S]*\}` — quebra com dois blocos JSON.

---

## 2. VISÃO — os 5 motores da v2

```
[M1 DNA DE MARCA] ──calibra──> [M3 FÁBRICA DE ROTEIROS] ──publica──> [M5 FEEDBACK LOOP]
        ▲                              ▲                                    │
        │                              │                                    │
[M2 INTELIGÊNCIA IG+YT] ──alimenta─────┘                 aprende e recalibra┘
                 ▲
[M4 ESTEIRA AUTÔNOMA] — roda tudo sozinho (cron/n8n)
```

### M1 — DNA de Marca (camada Vinci)
O Método Vinci vira o coração do sistema. Novas tabelas + onboarding `/dna`:
- **Posicionamento**: declaração de 5 campos (categoria, solução diferenciada, público, benefícios únicos, core problem), mapa perceptual (drivers de compra × concorrentes × "buraco" ocupável), faltas dos concorrentes → presenças a construir.
- **DNA**: promessa de marca, marca de duas palavras (paradoxo força+fraqueza), 3 atributos de percepção inegociáveis + apoio, 2 símbolos-âncora.
- **Narrativa**: arqueologia emocional (dor, escolha, descoberta, propósito), vilão do público, posição de MENTOR (nunca herói).
- **Identidade verbal**: tom, ritmo, bordões, léxico usa/não-usa.
- **Compilador de voz**: job que junta (a) respostas do DNA + (b) análise dos posts do PRÓPRIO Wallace (reusando a Parte 3 que hoje só roda para concorrentes) → gera `voice_prompt` versionado, cacheado (`cache_control`), injetado em TODA geração. A ironia atual (sistema clona a voz dos outros e ignora a sua) morre aqui.
- Fonte: transcrições em `~/Desktop/transcricoes_vinci/` destiladas em arquivos de método (`src/lib/method/*.ts`) — frameworks viram código, não citação nominal.

### M2 — Inteligência YouTube (novo pilar) + upgrade IG
**YouTube Data API v3** (gratuita, 10.000 unidades/dia — de sobra):
- Monitorar canais concorrentes via `playlistItems` da playlist de uploads (1 unidade/chamada, não `search` que custa 100) + `videos.list` para stats.
- **Detecção de outliers**: score = views do vídeo ÷ mediana do canal (mesma lógica do outlier_score atual). Vídeo 5x acima da mediana = padrão a engenheirar.
- **Pesquisa de palavras-chave**: mineração de títulos do corpus + endpoint de autocomplete → banco `keywords` com volume relativo (vídeos "pesquisáveis" evergreen — cauda longa, metodologia Diego Rosa).
- Transcrição de vídeos-outlier: pipeline Apify/AssemblyAI já existente (mesmo padrão do IG).
- **YouTube Analytics API** (OAuth, canal próprio, quando existir): CTR de impressões, AVD, APV, curva de retenção → **regra de diagnóstico do método como código**: CTR baixo + retenção boa = problema de thumb/título; retenção baixa = problema de roteiro.
- Novas tabelas: `channels`, `videos`, `video_snapshots` (velocidade de views), `keywords`.
- Upgrade IG: sinais do algoritmo (Mosseri) no scoring — watch time, likes/reach (connected), sends/reach (unconnected).

### M3 — Fábrica de Roteiros (o pedido central)
Um motor de geração unificado, tudo calibrado pelo `voice_prompt` do M1 + inteligência do M2:

**YouTube (roteiro completo):**
1. **Filtro de ideia** (3 perguntas Vinci: aderência ao público? eu clicaria? é "sexy"?) — ideia reprovada nem vira roteiro.
2. **Embalagem ANTES do roteiro** (método MrBeast): título NATA (Número+Adjetivo+Tempo+Ação) em 3 variações + conceito de thumbnail (7 práticas: emoção nos 3 E's, storytelling visual, contraste, nunca repetir o título) + classificação pesquisável vs recomendável.
3. **Roteiro com arquitetura de retenção**: hook 0-30s (onde se perde 30-50% da audiência), open loops, oscilação emocional +/−, ganchos de antecipação, estrutura de mentor (4 pilares: conexão → vilão → solução matadora → moral), capítulos.
4. **Pacote de publicação**: descrição SEO, tags, comentário fixado com CTA.
- *Nota honesta: o módulo de roteirização do curso (aula ~26, os "80%") NÃO está na pasta de transcrições. Compensamos com: frameworks de storytelling das aulas 16/38 + engenharia reversa dos outliers transcritos + skills RMBC (vsl-script, hook-battery). Se o Wallace tiver essa aula, ela entra no M1.*

**Instagram:**
- **Reels**: roteiro AIDA com hook duplo (verbal+visual), lacuna aberta, virada emocional, B-roll sugerido + checklist automático (criança de 10 anos entende? não-público assistiria? lacuna nos 3s?).
- **Carrosséis**: upgrade do gerador atual com a metodologia real (hoje "CQV" é citada sem definição): 1 ideia central, AIDA por tela, teste da eliminação, penúltima tela = aterrissagem de produto, CTA específico.
- **Stories**: sequências de 3-5 (Valor/Bastidor/Prova) com AIDA adaptado.
- **Repurposing**: 1 roteiro YouTube → N cortes de reels + 1 carrossel + sequência de stories ("trocar segundos por minutos").

**Infra do motor:**
- Tabela unificada `content_pieces` (type: yt_script | reel_script | carousel | story_sequence) — Kanban único, aposenta o CRUD paralelo de `carousels`.
- **Tool use / structured output** no lugar de regex JSON (fim dos 500 por parsing).
- **Prompt caching** em voice_prompt + método + business_config (corte de ~60-80% do custo de input).
- Modelos atualizados: Haiku 4.5 (classificação, mantém), **Sonnet 5** (geração), análise profunda com opção Opus para batches grandes.
- **Few-shot real**: exemplos classificados corretos para hooks/funil; posts vencedores do próprio Wallace como few-shot de geração (via M5).

### M4 — Esteira Autônoma
- **Sync diário automático** (cron n8n → `/api/daily-sync`, que já existe e está órfão).
- **Briefing diário** (7h, WhatsApp/Telegram via n8n): "hoje é dia de [categoria do calendário]; aqui estão 3 roteiros prontos aguardando aprovação; ontem seu post fez X".
- **Relatório semanal automático** (segunda, ritual da aula 22): números + hipóteses qualitativas + gaps do funil vs 50/35/15 (agora configurável, não hardcoded).
- **Radar de outliers** (diário): concorrente estourou (IG ou YT) → engenharia reversa automática → sugestão de adaptação já na fila de revisão.
- **Calendário vivo**: `generate-plan` ganha UI + cron; `calendar_items`/`strategy_plan` deixam de ser mortos; monoflow e linha editorial (50-60% técnico / 20-30% paixões / 10-20% pessoal) e regra 70/20/10 de formatos como restrições do gerador.
- Aprovação continua HUMANA (Kanban) — automação até a porta da publicação, não além.

### M5 — Feedback Loop (o que nenhum concorrente tem)
- Ao marcar "publicado", vincular ao post/vídeo real (IG media id / YT video id).
- Sync compara **performance prevista vs real** por peça → grava em `business_learnings` (tabela já existe, morta).
- Aprendizados viram: (a) few-shot dos vencedores próprios nos prompts, (b) ajuste dos pesos de scoring, (c) seção "o que aprendemos" no relatório semanal.
- No YouTube: curva de retenção real → diagnóstico automático (thumb vs roteiro) → instrução corretiva no próximo roteiro do mesmo tema.

---

## 3. FASES DE EXECUÇÃO

| Fase | Entrega | Depende do Wallace |
|---|---|---|
| **0. Fundação** (1 sessão) | Todos os bugs do diagnóstico corrigidos; tool-use structured output; prompt caching; modelos atualizados; migração `carousels`; seed benchmarks; segredo nos webhooks; fórmula única de engajamento | — |
| **1. DNA de Marca** (1-2 sessões) | Destilação Vinci em `src/lib/method/`; tabelas + página `/dna`; compilador de voz v1 (Vinci + posts próprios); voz injetada no gerador atual de carrosséis | Responder o questionário DNA (posso pré-preencher 80% com as transcrições + suas memórias); enviar aula 26 se tiver |
| **2. YouTube Intelligence** (1-2 sessões) | Tabelas YT; ingestão de canais concorrentes; outlier radar; keywords; transcrição de outliers via pipeline existente | Criar API key no Google Cloud (5 min, te guio); lista de 5-10 canais concorrentes |
| **3. Fábrica de Roteiros** (2 sessões) | Gerador YT completo (ideia→embalagem→roteiro→pacote); gerador reels/stories; upgrade carrosséis; `content_pieces` + Kanban unificado; repurposing | Aprovar/reprovar as primeiras gerações (calibração) |
| **4. Esteira Autônoma** (1 sessão) | Crons n8n; briefing diário; relatório semanal; radar de outliers; calendário vivo | Definir canal do briefing (WhatsApp/Telegram) |
| **5. Feedback Loop** (1 sessão) | Previsto vs real; learnings ativos; few-shot dos próprios vencedores; diagnóstico de retenção YT | Publicar consistentemente (sem isso não há loop) |

**Fase 6 (opcional, decisão de negócio):** multi-tenant — o sistema vira produto/entregável para os experts dos seus lançamentos (Squad Turbo). É onde esta ferramenta deixa de ser custo e vira receita direta. Decidir só depois da Fase 5 rodando para você.

---

## 4. O QUE SÓ O WALLACE PODE FAZER
1. **Google Cloud API key** (YouTube Data API v3) — Fase 2.
2. **Aula 26 do Vinci** (roteirização/copy de vídeo) se existir — enriquece M3.
3. **Questionário DNA** — 30 min de respostas; eu pré-preencho com o que já sei.
4. **Gravar e publicar.** O sistema inteiro existe para isso.
