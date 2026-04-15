"""End-to-end pipeline test with fake providers.

Requires a running Postgres with pgvector. Start with `docker compose up -d` and then:

    pytest -m integration tests/test_pipeline_e2e.py -v

The test monkeypatches every external service so NO real API is called.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import pytest

pytestmark = pytest.mark.integration


FAKE_ANALYSIS = {
    "hook": "Você está fazendo isso errado.",
    "visual_hook": "Close no rosto com expressão séria nos primeiros 2s",
    "narrative_structure": {
        "opening": "Afirmação contra-intuitiva",
        "development": "3 evidências",
        "climax": "Revelação do insight",
        "close": "CTA para salvar",
    },
    "cta": {"type": "save", "copy": "Salva esse post pra não esquecer", "placement": "final"},
    "funnel_stage": "tofu",
    "funnel_reasoning": "Conteúdo educativo atraindo público frio",
    "psychological_triggers": ["contra-intuitivo", "curiosidade", "autoridade"],
    "content_archetype": "educativo",
    "format_pattern": "talking head com texto na tela",
    "detected_niche": "lançamento digital",
    "niche_confidence": 0.92,
    "transferable_template": "HOOK contra-intuitivo → 3 evidências → insight → CTA salvar",
    "key_lessons": ["Abertura contra-intuitiva", "Provas específicas", "CTA explícito"],
    "why_it_went_viral": "Hook quebra expectativa + timing do tema",
    "replication_risks": "Copiar o hook sem entregar prova real",
}


def _fake_embedding(seed: str) -> list[float]:
    """Deterministic 3072-dim vector from a seed string."""
    h = hashlib.sha256(seed.encode()).digest()
    # 32 bytes → expand to 3072 floats in [-1, 1]
    base = [(b - 128) / 128.0 for b in h]
    return (base * (3072 // 32 + 1))[:3072]


@pytest.fixture
async def db_ready():
    from app.core.db import init_db

    await init_db()
    yield


@pytest.fixture
def patched_providers(monkeypatch):
    """Replace every external-service call with a fast fake."""
    from datetime import datetime, timezone as tz

    from app.ingestion.base import IngestedPost

    # 1) Apify: return a deterministic IngestedPost
    async def fake_fetch_post(self, url):
        return IngestedPost(
            shortcode="FAKE123",
            url=url,
            post_type="reel",
            author_username="fakeaccount",
            author_full_name="Fake Creator",
            author_followers=50000,
            caption="Legenda fake para teste 🔥",
            posted_at=datetime.now(tz.utc),
            duration_seconds=22.5,
            like_count=8000,
            comment_count=400,
            view_count=250000,
            media_urls=["https://example.com/fake.mp4"],
            raw={"mock": True},
        )

    monkeypatch.setattr(
        "app.ingestion.apify_provider.ApifyProvider.fetch_post",
        fake_fetch_post,
        raising=True,
    )
    # Also patch the constructor so it doesn't require APIFY_TOKEN
    monkeypatch.setattr(
        "app.ingestion.apify_provider.ApifyProvider.__init__",
        lambda self, token=None: None,
    )

    # 2) Media downloader: no network
    async def fake_download(urls, shortcode):
        return []  # empty; pipeline must tolerate

    monkeypatch.setattr("app.pipeline.download_media", fake_download)

    # 3) Vision + transcript skipped because media_paths is empty
    # (collect_visual_inputs short-circuits on no videos/images)

    # 4) Reverse-engineer: return canned JSON
    async def fake_reverse(post, transcript=None, visual_description=None):
        return FAKE_ANALYSIS

    monkeypatch.setattr("app.pipeline.reverse_engineer", fake_reverse)

    # 5) Embeddings: deterministic, no network
    async def fake_embed(text):
        return _fake_embedding(text[:100])

    monkeypatch.setattr("app.pipeline.embed", fake_embed)
    yield


async def test_pipeline_end_to_end(db_ready, patched_providers):
    """Run the full pipeline with fakes; verify DB state."""
    from sqlalchemy import select

    from app.core.db import Analysis, Niche, Post, SessionLocal
    from app.pipeline import process_url

    url = "https://www.instagram.com/reel/FAKE123/"
    result = await process_url(url)
    assert result["shortcode"] == "FAKE123"
    assert result["niche"] == "lançamento digital"
    assert result["hook"] == FAKE_ANALYSIS["hook"]
    assert result["funnel_stage"] == "tofu"
    assert result["viral_score"] > 0

    async with SessionLocal() as s:
        post = (
            await s.execute(select(Post).where(Post.shortcode == "FAKE123"))
        ).scalar_one()
        assert post.author_username == "fakeaccount"
        assert post.view_count == 250000

        analysis = (
            await s.execute(select(Analysis).where(Analysis.post_id == post.id))
        ).scalar_one()
        assert analysis.hook == FAKE_ANALYSIS["hook"]
        assert analysis.funnel_stage == "tofu"
        assert analysis.psychological_triggers == FAKE_ANALYSIS["psychological_triggers"]
        assert analysis.raw_analysis["why_it_went_viral"] == FAKE_ANALYSIS["why_it_went_viral"]
        assert analysis.content_embedding is not None
        assert len(analysis.content_embedding) == 3072

        niche = (
            await s.execute(select(Niche).where(Niche.id == post.niche_id))
        ).scalar_one()
        assert niche.name == "lançamento digital"
        assert niche.post_count >= 1


async def test_pipeline_is_idempotent(db_ready, patched_providers):
    """Re-running same URL without force skips."""
    from app.pipeline import process_url

    url = "https://www.instagram.com/reel/FAKE123/"
    await process_url(url)
    result = await process_url(url)
    assert result.get("skipped") is True
