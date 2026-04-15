"""Minimal FastAPI app exposing ingest + query endpoints."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.brain.query import answer
from app.core.db import Niche, Post, SessionLocal, init_db
from app.pipeline import process_url


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Viral Content Brain", lifespan=lifespan)


async def get_db() -> AsyncSession:
    async with SessionLocal() as s:
        yield s


class IngestRequest(BaseModel):
    url: str
    force: bool = False
    background: bool = True


class QueryRequest(BaseModel):
    question: str
    k: int = 8
    niche: str | None = None
    funnel: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(req: IngestRequest, bg: BackgroundTasks) -> dict:
    if req.background:
        bg.add_task(process_url, req.url, req.force)
        return {"accepted": True, "url": req.url}
    result = await process_url(req.url, force=req.force)
    return result


@app.post("/query")
async def query(req: QueryRequest, db: AsyncSession = Depends(get_db)) -> dict:
    return await answer(
        db, req.question, k=req.k, niche_slug=req.niche, funnel_stage=req.funnel
    )


@app.get("/niches")
async def niches(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Niche).order_by(Niche.post_count.desc()))).scalars().all()
    return [
        {"slug": n.slug, "name": n.name, "post_count": n.post_count} for n in rows
    ]


@app.get("/posts/{shortcode}")
async def get_post(shortcode: str, db: AsyncSession = Depends(get_db)) -> dict:
    post = (
        await db.execute(select(Post).where(Post.shortcode == shortcode))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(404, "post not found")
    analysis = post.analysis
    return {
        "shortcode": post.shortcode,
        "url": post.url,
        "author": post.author_username,
        "viral_score": post.viral_score,
        "analysis": analysis.raw_analysis if analysis else None,
    }
