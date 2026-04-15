# Guia de desenvolvimento

## Pré-requisitos
- Python 3.11+
- Docker + Docker Compose
- ffmpeg (`brew install ffmpeg` no Mac)
- Chaves: Apify, OpenAI, Anthropic

## Setup

```bash
cd viral-content-brain
cp .env.example .env
# Edite .env com suas chaves

docker compose up -d            # sobe Postgres com pgvector + Redis

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Inicializa o banco
python -m app.cli init
```

## Uso via CLI

```bash
# Ingere e analisa 1 post (Reel, carrossel ou estático)
python -m app.cli ingest "https://www.instagram.com/reel/EXEMPLO/"

# Mostra análise crua de um post
python -m app.cli show EXEMPLO

# Estatísticas do cérebro
python -m app.cli stats

# Consulta RAG
python -m app.cli query "quais hooks mais convertem pra topo de funil em lançamento digital"
python -m app.cli query "gere um roteiro de Reel no estilo dos top virais" --funnel tofu --k 12
python -m app.cli query "padrões de CTA no nicho fitness" --niche fitness
```

## API

```bash
cd backend
uvicorn app.api.main:app --reload --port 8000
```

- `POST /ingest` → `{"url": "...", "background": true}`
- `POST /query` → `{"question": "...", "niche": "...", "funnel": "tofu"}`
- `GET /niches`
- `GET /posts/{shortcode}`
- `GET /health`

## Mapa do pipeline (código)

1. `app.ingestion.apify_provider.ApifyProvider.fetch_post` → normaliza em `IngestedPost`.
2. `app.ingestion.media_downloader.download_media` → baixa para `data/raw/<shortcode>/`.
3. `app.analysis.transcribe.transcribe` (se vídeo) → Whisper.
4. `app.analysis.frames.sample_frames` (se vídeo) → 1 frame / N segundos.
5. `app.analysis.vision.describe_images` → Claude Vision.
6. `app.analysis.reverse_engineer.reverse_engineer` → Claude + prompt em `prompts/reverse_engineer.md`, retorna JSON.
7. `app.brain.embeddings.embed` → OpenAI embeddings (content + analysis).
8. `app.brain.niche.classify_or_create_niche` → cluster por similaridade do embedding, cria nicho novo se não bater.
9. Persiste `Post` + `Analysis` no Postgres.

## Testes

```bash
cd backend
pip install pytest pytest-asyncio

# Testes unitários (não precisam de nada rodando)
pytest -m "not integration" -v

# Testes end-to-end (precisa do Postgres via docker compose up -d)
pytest -m integration -v
```

O E2E usa fake providers monkeypatchados — nenhuma chamada real para Apify/OpenAI/Anthropic, mas grava de verdade no Postgres com pgvector. Valida: ingestão → análise → embeddings → clustering de nicho → persistência → idempotência.

## Troubleshooting

- **`APIFY_TOKEN not configured`** → preencha o `.env` e reinicie o terminal.
- **`ffmpeg failed`** → instale ffmpeg no PATH do sistema.
- **Pgvector dimension mismatch** → mudou o modelo de embedding? Ajuste `EMBEDDING_DIM` em `app/core/db.py` e dropa o banco.
- **Apify retornou vazio** → post privado, removido ou URL inválida. Teste o URL no browser.

## Próximos passos (Fase 2)

- `app.discovery` → scan de hashtags/perfis semente, fila de URLs pra ingestão.
- `app.worker` → arq workers pra processar a fila assíncrona.
- `app.metrics_refresh` → job agendado que atualiza métricas de posts recentes.
