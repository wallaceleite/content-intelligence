"""End-to-end ingestion → analysis → brain storage pipeline."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analysis.frames import sample_frames
from app.analysis.reverse_engineer import reverse_engineer
from app.analysis.transcribe import transcribe
from app.analysis.viral_score import compute_viral_score
from app.analysis.vision import describe_images
from app.brain.embeddings import embed
from app.brain.niche import classify_or_create_niche
from app.core.db import Analysis, Post, SessionLocal
from app.core.logging import log
from app.ingestion.apify_provider import ApifyProvider
from app.ingestion.base import IngestedPost
from app.ingestion.media_downloader import download_media, is_image, is_video


async def _collect_visual_inputs(post: IngestedPost, local_paths: list[str]) -> tuple[str | None, str | None]:
    """Returns (transcript, visual_description)."""
    transcript: str | None = None
    frames_for_vision: list[str] = []

    videos = [p for p in local_paths if is_video(p)]
    images = [p for p in local_paths if is_image(p)]

    if videos:
        # transcribe first (or only) video
        try:
            transcript = await transcribe(videos[0])
        except Exception as e:
            log.error(f"transcription failed: {e}")
        try:
            frames_for_vision = await sample_frames(videos[0])
        except Exception as e:
            log.error(f"frame sampling failed: {e}")

    visual_inputs = frames_for_vision + images
    visual_description: str | None = None
    if visual_inputs:
        try:
            visual_description = await describe_images(
                visual_inputs, context=post.caption[:500]
            )
        except Exception as e:
            log.error(f"vision failed: {e}")

    return transcript, visual_description


def _build_content_text(post: IngestedPost, transcript: str | None) -> str:
    parts = [f"@{post.author_username}", post.caption or ""]
    if transcript:
        parts.append(transcript)
    return "\n\n".join(parts)


def _build_analysis_text(analysis_dict: dict[str, Any]) -> str:
    parts = [
        f"Hook: {analysis_dict.get('hook', '')}",
        f"Niche: {analysis_dict.get('detected_niche', '')}",
        f"Funnel: {analysis_dict.get('funnel_stage', '')}",
        f"Archetype: {analysis_dict.get('content_archetype', '')}",
        f"Format: {analysis_dict.get('format_pattern', '')}",
        f"Triggers: {', '.join(analysis_dict.get('psychological_triggers', []) or [])}",
        f"Template: {analysis_dict.get('transferable_template', '')}",
        f"Why viral: {analysis_dict.get('why_it_went_viral', '')}",
        f"Lessons: {' | '.join(analysis_dict.get('key_lessons', []) or [])}",
    ]
    return "\n".join(parts)


async def process_url(url: str, force: bool = False) -> dict[str, Any]:
    """Full pipeline for one URL. Idempotent by shortcode unless force=True."""
    provider = ApifyProvider()

    async with SessionLocal() as session:  # type: AsyncSession
        ingested = await provider.fetch_post(url)
        log.info(f"ingested @{ingested.author_username} {ingested.post_type} {ingested.shortcode}")

        # Dedup
        existing = (
            await session.execute(select(Post).where(Post.shortcode == ingested.shortcode))
        ).scalar_one_or_none()
        if existing and not force:
            log.info(f"post {ingested.shortcode} already exists, skipping")
            return {"skipped": True, "shortcode": ingested.shortcode}

        # Download media
        media_paths = await download_media(ingested.media_urls, ingested.shortcode)

        # Visual + transcript
        transcript, visual_description = await _collect_visual_inputs(ingested, media_paths)

        # Reverse-engineer
        analysis_dict = await reverse_engineer(
            ingested, transcript=transcript, visual_description=visual_description
        )

        # Embeddings
        content_text = _build_content_text(ingested, transcript)
        analysis_text = _build_analysis_text(analysis_dict)
        content_emb = await embed(content_text)
        analysis_emb = await embed(analysis_text)

        # Niche clustering
        detected_niche_name = analysis_dict.get("detected_niche") or "geral"
        niche = await classify_or_create_niche(session, detected_niche_name, analysis_emb)

        # Viral score
        vscore = compute_viral_score(ingested)

        # Persist
        post = existing or Post(shortcode=ingested.shortcode)
        post.url = ingested.url
        post.post_type = ingested.post_type
        post.author_username = ingested.author_username
        post.author_full_name = ingested.author_full_name
        post.author_followers = ingested.author_followers
        post.caption = ingested.caption
        post.posted_at = ingested.posted_at
        post.duration_seconds = ingested.duration_seconds
        post.like_count = ingested.like_count
        post.comment_count = ingested.comment_count
        post.view_count = ingested.view_count
        post.raw = ingested.raw
        post.media_paths = media_paths
        post.niche_id = niche.id
        post.viral_score = vscore
        if not existing:
            session.add(post)
        await session.flush()

        analysis = existing.analysis if existing else None
        if analysis is None:
            analysis = Analysis(post_id=post.id)
            session.add(analysis)
        analysis.transcript = transcript
        analysis.visual_description = visual_description
        analysis.hook = analysis_dict.get("hook")
        analysis.narrative_structure = analysis_dict.get("narrative_structure")
        analysis.cta = analysis_dict.get("cta")
        analysis.funnel_stage = analysis_dict.get("funnel_stage")
        analysis.psychological_triggers = analysis_dict.get("psychological_triggers") or []
        analysis.content_archetype = analysis_dict.get("content_archetype")
        analysis.visual_hook = analysis_dict.get("visual_hook")
        analysis.format_pattern = analysis_dict.get("format_pattern")
        analysis.detected_niche = analysis_dict.get("detected_niche")
        analysis.transferable_template = analysis_dict.get("transferable_template")
        analysis.key_lessons = analysis_dict.get("key_lessons") or []
        analysis.raw_analysis = analysis_dict
        analysis.content_embedding = content_emb
        analysis.analysis_embedding = analysis_emb
        from app.core.config import get_settings

        analysis.model_used = get_settings().llm_model

        await session.commit()
        log.info(f"stored post {post.shortcode} in niche '{niche.name}' (viral={vscore})")

        return {
            "shortcode": post.shortcode,
            "niche": niche.name,
            "viral_score": vscore,
            "hook": analysis.hook,
            "funnel_stage": analysis.funnel_stage,
        }
