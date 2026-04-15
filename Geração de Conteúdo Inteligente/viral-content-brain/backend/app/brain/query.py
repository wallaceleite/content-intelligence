"""RAG-style query against the brain. Returns relevant analyses + optional LLM answer."""
from __future__ import annotations

from typing import Any

from anthropic import AsyncAnthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.db import Analysis, Niche, Post
from app.brain.embeddings import embed


async def search_similar(
    session: AsyncSession,
    query: str,
    k: int = 8,
    niche_slug: str | None = None,
    funnel_stage: str | None = None,
) -> list[tuple[Post, Analysis, float]]:
    """Return top-k (post, analysis, similarity) tuples."""
    q_emb = await embed(query)

    stmt = (
        select(
            Post,
            Analysis,
            Analysis.analysis_embedding.cosine_distance(q_emb).label("dist"),
        )
        .join(Analysis, Analysis.post_id == Post.id)
        .where(Analysis.analysis_embedding.is_not(None))
    )
    if niche_slug:
        stmt = stmt.join(Niche, Niche.id == Post.niche_id).where(Niche.slug == niche_slug)
    if funnel_stage:
        stmt = stmt.where(Analysis.funnel_stage == funnel_stage)
    stmt = stmt.options(selectinload(Post.niche)).order_by("dist").limit(k)

    result = await session.execute(stmt)
    return [(p, a, 1.0 - float(d)) for p, a, d in result.all()]


def format_context(hits: list[tuple[Post, Analysis, float]]) -> str:
    """Build a compact context block for the LLM."""
    parts = []
    for post, analysis, sim in hits:
        parts.append(
            f"---\n"
            f"Post @{post.author_username} ({post.post_type}) sim={sim:.2f} viral={post.viral_score}\n"
            f"URL: {post.url}\n"
            f"Hook: {analysis.hook}\n"
            f"Funnel: {analysis.funnel_stage} | Archetype: {analysis.content_archetype}\n"
            f"Format: {analysis.format_pattern}\n"
            f"Triggers: {', '.join(analysis.psychological_triggers or [])}\n"
            f"Template: {analysis.transferable_template}\n"
            f"Why viral: {(analysis.raw_analysis or {}).get('why_it_went_viral', '')}\n"
        )
    return "\n".join(parts)


ANSWER_SYSTEM = """Você é um especialista em produção de conteúdo viral no Instagram baseado em funis de venda. Responda à pergunta do usuário USANDO APENAS os posts reais fornecidos no contexto. Quando citar um padrão, referencie a @handle e a URL do post. Seja específico e acionável. Se a pergunta pedir um roteiro/template novo, gere-o baseado nos padrões observados."""


async def answer(
    session: AsyncSession,
    question: str,
    k: int = 8,
    niche_slug: str | None = None,
    funnel_stage: str | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    hits = await search_similar(session, question, k=k, niche_slug=niche_slug, funnel_stage=funnel_stage)
    if not hits:
        return {"answer": "Cérebro vazio pra essa pergunta. Ingira mais posts relevantes.", "hits": []}

    context = format_context(hits)
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    resp = await client.messages.create(
        model=settings.llm_model,
        max_tokens=2500,
        system=ANSWER_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"PERGUNTA:\n{question}\n\nPOSTS DE REFERÊNCIA:\n{context}",
            }
        ],
    )
    answer_text = resp.content[0].text if resp.content else ""

    return {
        "answer": answer_text,
        "hits": [
            {
                "url": p.url,
                "author": p.author_username,
                "similarity": round(sim, 3),
                "viral_score": p.viral_score,
                "hook": a.hook,
                "funnel_stage": a.funnel_stage,
            }
            for p, a, sim in hits
        ],
    }
