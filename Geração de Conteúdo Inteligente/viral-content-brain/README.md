# Viral Content Brain

Sistema que monitora conteúdo viral no Instagram, faz engenharia reversa (transcreve vídeos, lê carrosséis/estáticos, extrai hook/estrutura/CTA/funil), classifica automaticamente o nicho e acumula tudo em um "cérebro" vetorial que vira um especialista em produção de conteúdo baseado em funil de vendas.

---

## Visão do produto

Um agente que responde coisas como:
- "Me mostra os 10 melhores hooks virais de copy do último mês."
- "Qual estrutura de carrossel converte melhor pra topo de funil no nicho de lançamento digital?"
- "Gera um roteiro de Reel baseado nos padrões virais do nicho X, estágio Y do funil."
- "Compara: o que os 3 maiores lançadores estão fazendo diferente nos últimos 30 dias?"

O "cérebro" aprende continuamente. Cada post analisado adiciona conhecimento estruturado + embeddings semânticos que podem ser consultados via RAG.

---

## Arquitetura (MVP)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Discovery   │────▶│  Ingestion   │────▶│  Analysis    │────▶│    Brain     │
│  (seeds,     │     │  (Apify,     │     │  (Whisper,   │     │  (Postgres + │
│   hashtags,  │     │   download   │     │   vision,    │     │   pgvector)  │
│   perfis)    │     │   mídia)     │     │   LLM)       │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
                                                                       ▼
                                                               ┌──────────────┐
                                                               │  Query / RAG │
                                                               │  (API + CLI) │
                                                               └──────────────┘
```

### Fluxo por post

1. **Discovery** — define o universo: lista de perfis semente, hashtags, top reels por engagement. Roda periodicamente.
2. **Ingestion** — dado um post/reel/carrossel, baixa metadata (likes, views, comments, saves, share, caption, duração) e mídia (vídeo, imagens).
3. **Viralidade score** — calcula `viral_score` = função(views, engagement_rate, velocidade de engajamento, proporção saves/likes, comments/views). Só processa se passar do threshold.
4. **Análise**:
   - **Vídeo/Reel**: Whisper → transcrição. Frame sampling a cada N segundos → Claude Vision descreve cena, expressão, ritmo, overlay de texto.
   - **Carrossel**: cada imagem → Claude Vision extrai texto + descrição + composição visual.
   - **Estático**: mesmo tratamento do carrossel (1 imagem).
5. **Engenharia reversa** — LLM (Claude Sonnet 4.6) recebe tudo e extrai em JSON:
   - `hook` (primeiras palavras/imagem/frame)
   - `narrative_structure` (abertura, desenvolvimento, clímax, CTA)
   - `cta` (tipo e copy)
   - `funnel_stage` (topo/meio/fundo)
   - `psychological_triggers` (escassez, prova social, autoridade, curiosidade, etc)
   - `content_archetype` (educativo, entretenimento, prova, contra-intuitivo, storytelling, etc)
   - `visual_hook` (o que prende visualmente nos 3 primeiros segundos)
   - `format_pattern` (talking head, texto na tela, tutorial, before/after, etc)
   - `detected_niche` (auto-classificação)
   - `transferable_template` (o "esqueleto" replicável)
6. **Classificação de nicho** — auto. Nicho detectado + embedding do conteúdo → cluster no cérebro. Novos nichos criados dinamicamente quando não há match semântico.
7. **Brain storage** — Postgres + pgvector. Cada post vira um registro com metadata estruturada + embedding da transcrição/texto + embedding da análise.

### Query / RAG

- **CLI**: `brain query "qual o padrão dos hooks que mais convertem no meu nicho"`
- **API**: endpoints REST com filtros (nicho, funil, arquétipo, data).
- **RAG**: contexto recuperado por similaridade vetorial + filtros estruturados é injetado em prompts de geração de conteúdo novo.

---

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | Python 3.11 | Ecossistema de IA/scraping |
| API | FastAPI | Async, tipado, rápido |
| Worker | arq (redis) ou Celery | Jobs assíncronos (transcrição, análise) |
| Banco | Postgres + pgvector | Estruturado + vetorial numa coisa só |
| Coleta IG | **Apify Instagram Scraper** | Actors maduros, proxy rotation, pay-per-use |
| Transcrição | OpenAI Whisper API | Qualidade + simplicidade (fallback: faster-whisper local) |
| Vision | Claude Sonnet 4.6 (vision) | Qualidade superior em descrição contextual |
| Análise LLM | Claude Sonnet 4.6 | Raciocínio melhor pra engenharia reversa |
| Embeddings | OpenAI text-embedding-3-large | Custo/qualidade equilibrados |
| Storage mídia | Local (MVP) → S3 (prod) | Simplicidade inicial |
| Infra local | docker-compose | Postgres + Redis + app |

### Por que Apify e não API oficial?

- **API oficial (Instagram Graph API)**: só funciona com perfis Business/Creator que autorizam explicitamente. Não serve pra monitorar concorrentes/virais. Morto pra esse caso de uso.
- **Apify**: actors dedicados (`apify/instagram-scraper`, `apify/instagram-reel-scraper`, `apify/instagram-hashtag-scraper`) com proxy rotation, manejo de rate limit e saída estruturada. Custo ~$0.30–0.50/1k posts. Zona cinza legal mas é o padrão do mercado pra inteligência competitiva. Blindado em termos de uso — o dado coletado é público.
- **Alternativas consideradas**: instaloader (grátis, alto risco de ban e você mantém a infra), RapidAPI/ScrapeCreators (similar ao Apify, comparar preço). Arquitetura fica agnóstica: interface `IngestionProvider` com implementação Apify primeiro, plugável.

### Disclaimer legal

Scraping do Instagram está em zona cinza. Coletamos apenas dados públicos, em volume compatível com uso legítimo de inteligência competitiva. Não armazenamos credenciais de usuários. Isso não constitui assessoria jurídica — consultar advogado antes de comercializar.

---

## Roadmap

### Fase 1 — MVP end-to-end (essa fase)
- [x] Estrutura do projeto + docker-compose
- [ ] Schema do banco (posts, analyses, niches, embeddings)
- [ ] Ingestion via Apify (1 URL → metadata + mídia)
- [ ] Transcrição de Reel via Whisper
- [ ] Análise de imagens (carrossel/estático) via Claude Vision
- [ ] Prompt de engenharia reversa + JSON estruturado
- [ ] Auto-classificação de nicho
- [ ] Storage no cérebro com embeddings
- [ ] CLI: `brain ingest <url>` / `brain query <texto>` / `brain stats`

### Fase 2 — Escala e descoberta
- [ ] Discovery automático (hashtags + perfis semente)
- [ ] Scheduler (monitoramento contínuo)
- [ ] Cálculo de viral_score + threshold
- [ ] Worker assíncrono (arq + redis)
- [ ] Deduplicação robusta

### Fase 3 — Geração
- [ ] RAG pra gerar roteiros novos a partir de padrões
- [ ] Templates transferíveis ("me dá o esqueleto do post X com o tema Y")
- [ ] Frontend (Next.js) com dashboard por nicho

### Fase 4 — Produto
- [ ] Multi-tenant (múltiplos usuários/nichos)
- [ ] Alertas de virais em tempo real
- [ ] Comparador de concorrentes
- [ ] Export pra editor de roteiro

---

## Como rodar (MVP local)

```bash
# 1. Copia o env
cp .env.example .env
# edita com: APIFY_TOKEN, OPENAI_API_KEY, ANTHROPIC_API_KEY

# 2. Sobe infra
docker-compose up -d

# 3. Instala deps
cd backend && pip install -r requirements.txt

# 4. Roda migrations
python -m app.core.db init

# 5. Ingere 1 post pra testar
python -m app.cli ingest https://www.instagram.com/reel/ABC123/

# 6. Consulta o cérebro
python -m app.cli query "padrões de hook em reels de lançamento"
```

---

## Estrutura de pastas

```
viral-content-brain/
├── README.md                    # este arquivo
├── docker-compose.yml           # postgres + redis
├── .env.example                 # variáveis de ambiente
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── core/                # config, db, logging
│   │   ├── ingestion/           # Apify, download de mídia
│   │   ├── analysis/            # Whisper, vision, LLM reverse-eng
│   │   ├── brain/               # embeddings, storage, RAG query
│   │   ├── api/                 # FastAPI endpoints
│   │   └── cli.py               # interface de linha de comando
│   └── tests/
├── prompts/                     # prompts versionados de engenharia reversa
├── docs/                        # decisões de arquitetura, exemplos
└── data/
    ├── raw/                     # mídia baixada (gitignored)
    └── processed/               # transcrições/análises em JSON
```

---

## Decisões em aberto

1. **Orquestração de jobs**: arq (mais leve) vs Celery (mais maduro). Decisão: arq no MVP.
2. **Whisper local vs API**: começar com API; se volume justificar, migrar pra `faster-whisper` em GPU.
3. **Dedup de posts**: por `shortcode` do Instagram (único e estável).
4. **Política de re-análise**: posts mudam engajamento no tempo. Reprocessar métricas a cada 24h nos primeiros 7 dias.
