"""Database models + async engine. Postgres + pgvector."""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.config import get_settings

EMBEDDING_DIM = 3072  # text-embedding-3-large


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Niche(Base):
    """Auto-discovered niche cluster."""

    __tablename__ = "niches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    centroid: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    post_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    posts: Mapped[list[Post]] = relationship(back_populates="niche")


class Post(Base):
    """A single ingested Instagram post (reel, carousel, or static)."""

    __tablename__ = "posts"
    __table_args__ = (UniqueConstraint("shortcode", name="uq_posts_shortcode"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shortcode: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    url: Mapped[str] = mapped_column(Text)
    post_type: Mapped[str] = mapped_column(String(20))  # reel | carousel | image | video
    author_username: Mapped[str] = mapped_column(String(120), index=True)
    author_full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    author_followers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    caption: Mapped[str] = mapped_column(Text, default="")
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Metrics
    like_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    save_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    share_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    viral_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Raw payload for auditability
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Media paths (local for MVP)
    media_paths: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Niche
    niche_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("niches.id"), nullable=True
    )
    niche: Mapped[Niche | None] = relationship(back_populates="posts")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    analysis: Mapped[Analysis | None] = relationship(
        back_populates="post", uselist=False, cascade="all, delete-orphan"
    )


class Analysis(Base):
    """Reverse-engineered analysis of a post."""

    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), unique=True
    )

    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    visual_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured reverse-engineering output
    hook: Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative_structure: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    cta: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    funnel_stage: Mapped[str | None] = mapped_column(String(20), nullable=True)  # tofu|mofu|bofu
    psychological_triggers: Mapped[list[str]] = mapped_column(JSON, default=list)
    content_archetype: Mapped[str | None] = mapped_column(String(80), nullable=True)
    visual_hook: Mapped[str | None] = mapped_column(Text, nullable=True)
    format_pattern: Mapped[str | None] = mapped_column(String(120), nullable=True)
    detected_niche: Mapped[str | None] = mapped_column(String(200), nullable=True)
    transferable_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_lessons: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Raw JSON from the LLM for auditability
    raw_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Embeddings
    content_embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIM), nullable=True
    )
    analysis_embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIM), nullable=True
    )

    model_used: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    post: Mapped[Post] = relationship(back_populates="analysis")


# ----- engine / session -----

_settings = get_settings()
engine = create_async_engine(_settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    """Create extension + tables. Idempotent."""
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with SessionLocal() as s:
        yield s


if __name__ == "__main__":
    # python -m app.core.db  => creates tables
    asyncio.run(init_db())
    print("DB initialized.")
