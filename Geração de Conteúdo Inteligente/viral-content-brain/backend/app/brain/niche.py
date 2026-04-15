"""Auto-classify a post into a niche cluster. Creates new niches on demand."""
from __future__ import annotations

import uuid

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import Niche
from app.core.logging import log


async def classify_or_create_niche(
    session: AsyncSession,
    detected_name: str,
    embedding: list[float],
) -> Niche:
    """
    Look up an existing niche by semantic similarity to its centroid.
    If the closest niche is under the threshold or doesn't exist, create a new one.
    Update the centroid as a running mean.
    """
    settings = get_settings()

    # Find closest existing niche by cosine distance (pgvector `<=>` operator)
    q = (
        select(Niche, Niche.centroid.cosine_distance(embedding).label("dist"))
        .where(Niche.centroid.is_not(None))
        .order_by("dist")
        .limit(1)
    )
    result = await session.execute(q)
    row = result.first()

    if row:
        niche, distance = row
        similarity = 1.0 - float(distance)
        if similarity >= settings.niche_similarity_threshold:
            log.info(f"matched niche '{niche.name}' (sim={similarity:.3f})")
            await _update_centroid(session, niche, embedding)
            return niche

    # Create new niche
    base_slug = slugify(detected_name)[:100] or f"niche-{uuid.uuid4().hex[:6]}"
    slug = base_slug
    n = 1
    while (await session.execute(select(Niche).where(Niche.slug == slug))).first():
        n += 1
        slug = f"{base_slug}-{n}"

    niche = Niche(
        slug=slug,
        name=detected_name,
        description=f"Auto-discovered niche from posts analyzed by the brain.",
        centroid=embedding,
        post_count=1,
    )
    session.add(niche)
    await session.flush()
    log.info(f"created new niche '{niche.name}' (slug={slug})")
    return niche


async def _update_centroid(session: AsyncSession, niche: Niche, new_emb: list[float]) -> None:
    """Running mean update."""
    if niche.centroid is None:
        niche.centroid = new_emb
    else:
        n = niche.post_count or 1
        niche.centroid = [
            (c * n + e) / (n + 1) for c, e in zip(niche.centroid, new_emb)
        ]
    niche.post_count = (niche.post_count or 0) + 1
    await session.flush()
