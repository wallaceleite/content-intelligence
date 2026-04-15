"""Provider-agnostic ingestion contract."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol


SHORTCODE_REGEX = re.compile(r"instagram\.com/(?:p|reel|tv|reels)/([A-Za-z0-9_-]+)")


def extract_shortcode(url: str) -> str:
    m = SHORTCODE_REGEX.search(url)
    if not m:
        raise ValueError(f"Could not extract shortcode from URL: {url}")
    return m.group(1)


@dataclass
class IngestedPost:
    """Normalized representation of an Instagram post (any provider)."""

    shortcode: str
    url: str
    post_type: str  # reel | carousel | image | video
    author_username: str
    author_full_name: str | None = None
    author_followers: int | None = None
    caption: str = ""
    posted_at: datetime | None = None
    duration_seconds: float | None = None
    like_count: int | None = None
    comment_count: int | None = None
    view_count: int | None = None
    save_count: int | None = None
    share_count: int | None = None
    media_urls: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


class IngestionProvider(Protocol):
    """Any source of Instagram posts must implement this."""

    async def fetch_post(self, url: str) -> IngestedPost: ...
