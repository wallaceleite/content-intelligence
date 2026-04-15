"""Pure-logic tests — no DB, no external services."""
from __future__ import annotations

import pytest

from app.analysis.reverse_engineer import _extract_json
from app.analysis.viral_score import compute_viral_score
from app.ingestion.base import IngestedPost, extract_shortcode


# ----- extract_shortcode -----

class TestExtractShortcode:
    def test_reel(self) -> None:
        assert extract_shortcode("https://www.instagram.com/reel/ABC123_xy/") == "ABC123_xy"

    def test_post_p(self) -> None:
        assert extract_shortcode("https://instagram.com/p/Cxy-9AB/") == "Cxy-9AB"

    def test_reels_plural(self) -> None:
        assert extract_shortcode("https://www.instagram.com/reels/DxB_aZ/") == "DxB_aZ"

    def test_with_query_params(self) -> None:
        assert (
            extract_shortcode("https://www.instagram.com/reel/DxABCD/?igsh=foo&utm=bar")
            == "DxABCD"
        )

    def test_tv(self) -> None:
        assert extract_shortcode("https://www.instagram.com/tv/ZZZ123/") == "ZZZ123"

    def test_invalid_raises(self) -> None:
        with pytest.raises(ValueError):
            extract_shortcode("https://twitter.com/foo")


# ----- viral_score -----

def _make_post(**kw) -> IngestedPost:
    base = dict(
        shortcode="X", url="https://instagram.com/reel/X/", post_type="reel",
        author_username="foo",
    )
    base.update(kw)
    return IngestedPost(**base)


class TestViralScore:
    def test_missing_data_returns_zero(self) -> None:
        post = _make_post()
        assert compute_viral_score(post) == 0.0

    def test_high_engagement(self) -> None:
        # 10k followers, 5k likes+comments, 100k views => very viral
        post = _make_post(
            author_followers=10_000,
            like_count=4500,
            comment_count=500,
            view_count=100_000,
        )
        score = compute_viral_score(post)
        assert 0.5 < score <= 1.0

    def test_score_bounded_0_1(self) -> None:
        post = _make_post(
            author_followers=1_000,
            like_count=1_000_000,
            comment_count=100_000,
            view_count=50_000_000,
        )
        assert 0.0 <= compute_viral_score(post) <= 1.0

    def test_modest_post(self) -> None:
        post = _make_post(
            author_followers=50_000,
            like_count=500,
            comment_count=10,
            view_count=5_000,
        )
        score = compute_viral_score(post)
        assert 0.0 <= score < 0.3


# ----- _extract_json -----

class TestExtractJson:
    def test_pure_json(self) -> None:
        assert _extract_json('{"hook": "abc"}') == {"hook": "abc"}

    def test_fenced_json(self) -> None:
        text = 'Here is the output:\n```json\n{"hook": "abc", "stage": "tofu"}\n```'
        out = _extract_json(text)
        assert out["hook"] == "abc"
        assert out["stage"] == "tofu"

    def test_fenced_no_lang(self) -> None:
        assert _extract_json('```\n{"a": 1}\n```') == {"a": 1}

    def test_preface_and_trailing(self) -> None:
        text = 'Claro! Aqui está:\n{"hook": "x", "nested": {"k": 1}}\nEspero ter ajudado.'
        assert _extract_json(text) == {"hook": "x", "nested": {"k": 1}}

    def test_no_json_raises(self) -> None:
        with pytest.raises(ValueError):
            _extract_json("apenas texto, nada de json")
