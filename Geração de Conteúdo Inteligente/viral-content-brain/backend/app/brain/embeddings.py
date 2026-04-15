"""Generate embeddings via OpenAI."""
from __future__ import annotations

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.logging import log


async def embed(text: str) -> list[float]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY not configured")
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    # Truncate conservatively (8192 token limit on embedding model)
    text = text[:30000]
    resp = await client.embeddings.create(model=settings.embedding_model, input=text)
    return resp.data[0].embedding


async def embed_many(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY not configured")
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    texts = [t[:30000] for t in texts]
    log.info(f"Embedding {len(texts)} texts with {settings.embedding_model}")
    resp = await client.embeddings.create(model=settings.embedding_model, input=texts)
    return [d.embedding for d in resp.data]
