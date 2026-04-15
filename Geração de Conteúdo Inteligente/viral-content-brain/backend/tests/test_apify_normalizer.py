"""Test Apify payload → IngestedPost normalization (no network calls)."""
from __future__ import annotations

from app.ingestion.apify_provider import ApifyProvider


def _make_provider() -> ApifyProvider:
    """Build a provider without touching the network."""
    p = ApifyProvider.__new__(ApifyProvider)
    return p


def test_normalize_reel() -> None:
    item = {
        "type": "Video",
        "productType": "clips",
        "videoUrl": "https://cdn.fb.com/video.mp4",
        "displayUrl": "https://cdn.fb.com/thumb.jpg",
        "videoDuration": 42.5,
        "caption": "Hook aqui 🔥",
        "timestamp": "2026-03-01T12:34:56.000Z",
        "ownerUsername": "fulano",
        "ownerFullName": "Fulano de Tal",
        "owner": {"followersCount": 123456},
        "likesCount": 9800,
        "commentsCount": 120,
        "videoViewCount": 450000,
    }
    post = _make_provider()._normalize(item, "https://www.instagram.com/p/AB-cd_01/", "AB-cd_01")
    assert post.shortcode == "AB-cd_01"
    assert post.post_type == "reel"
    assert post.author_username == "fulano"
    assert post.author_followers == 123456
    assert post.caption == "Hook aqui 🔥"
    assert post.duration_seconds == 42.5
    assert post.view_count == 450000
    assert post.media_urls == ["https://cdn.fb.com/video.mp4"]
    assert post.posted_at is not None and post.posted_at.year == 2026


def test_normalize_carousel() -> None:
    item = {
        "type": "Sidecar",
        "caption": "Dicas em carrossel",
        "ownerUsername": "contadecarrossel",
        "childPosts": [
            {"displayUrl": "https://cdn.fb.com/1.jpg"},
            {"displayUrl": "https://cdn.fb.com/2.jpg"},
            {"videoUrl": "https://cdn.fb.com/3.mp4"},
        ],
        "likesCount": 1200,
        "commentsCount": 55,
    }
    post = _make_provider()._normalize(item, "https://www.instagram.com/p/XYZ/", "XYZ")
    assert post.post_type == "carousel"
    assert len(post.media_urls) == 3
    assert post.media_urls[-1].endswith(".mp4")


def test_normalize_static_image() -> None:
    item = {
        "type": "Image",
        "displayUrl": "https://cdn.fb.com/static.jpg",
        "caption": "foto única",
        "ownerUsername": "foo",
        "likesCount": 100,
    }
    post = _make_provider()._normalize(item, "https://www.instagram.com/p/S/", "S")
    assert post.post_type == "image"
    assert post.media_urls == ["https://cdn.fb.com/static.jpg"]
    assert post.duration_seconds is None


def test_normalize_missing_timestamp() -> None:
    item = {
        "type": "Image",
        "displayUrl": "https://cdn.fb.com/a.jpg",
        "ownerUsername": "foo",
    }
    post = _make_provider()._normalize(item, "https://www.instagram.com/p/T/", "T")
    assert post.posted_at is not None  # falls back to now


def test_normalize_bad_timestamp_falls_back() -> None:
    item = {
        "type": "Image",
        "displayUrl": "https://cdn.fb.com/a.jpg",
        "ownerUsername": "foo",
        "timestamp": "not-a-date",
    }
    post = _make_provider()._normalize(item, "https://www.instagram.com/p/T/", "T")
    assert post.posted_at is not None
