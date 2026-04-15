"""Apify-based ingestion provider. Uses apify/instagram-scraper actor."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from apify_client import ApifyClientAsync
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.logging import log
from app.ingestion.base import IngestedPost, IngestionProvider, extract_shortcode


class ApifyProvider(IngestionProvider):
    def __init__(self, token: str | None = None) -> None:
        settings = get_settings()
        self.token = token or settings.apify_token
        if not self.token:
            raise RuntimeError("APIFY_TOKEN not configured")
        self.client = ApifyClientAsync(self.token)
        self.actor = settings.apify_instagram_scraper_actor

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20))
    async def fetch_post(self, url: str) -> IngestedPost:
        shortcode = extract_shortcode(url)
        normalized_url = f"https://www.instagram.com/p/{shortcode}/"
        log.info(f"Apify: fetching {normalized_url}")

        run_input = {
            "directUrls": [normalized_url],
            "resultsType": "details",
            "resultsLimit": 1,
            "addParentData": False,
        }

        run = await self.client.actor(self.actor).call(run_input=run_input, timeout_secs=180)
        if not run:
            raise RuntimeError("Apify actor returned no run metadata")

        dataset_id = run["defaultDatasetId"]
        items = [item async for item in self.client.dataset(dataset_id).iterate_items()]
        if not items:
            raise RuntimeError(f"No items returned for {url}")

        return self._normalize(items[0], normalized_url, shortcode)

    def _normalize(self, item: dict[str, Any], url: str, shortcode: str) -> IngestedPost:
        raw_type = (item.get("type") or "").lower()
        product_type = (item.get("productType") or "").lower()
        is_video = bool(item.get("videoUrl")) or raw_type == "video" or product_type == "clips"
        is_carousel = raw_type == "sidecar" or bool(item.get("childPosts"))

        if product_type == "clips":
            post_type = "reel"
        elif is_carousel:
            post_type = "carousel"
        elif is_video:
            post_type = "video"
        else:
            post_type = "image"

        media_urls: list[str] = []
        if is_carousel and item.get("childPosts"):
            for child in item["childPosts"]:
                media_urls.append(child.get("videoUrl") or child.get("displayUrl") or "")
        else:
            media_urls.append(item.get("videoUrl") or item.get("displayUrl") or "")
        media_urls = [u for u in media_urls if u]

        timestamp = item.get("timestamp")
        posted_at: datetime | None = None
        if timestamp:
            try:
                posted_at = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                posted_at = None

        owner = item.get("owner") or {}
        return IngestedPost(
            shortcode=shortcode,
            url=url,
            post_type=post_type,
            author_username=item.get("ownerUsername") or owner.get("username") or "",
            author_full_name=item.get("ownerFullName") or owner.get("fullName"),
            author_followers=owner.get("followersCount") or owner.get("followers"),
            caption=item.get("caption") or "",
            posted_at=posted_at or datetime.now(timezone.utc),
            duration_seconds=item.get("videoDuration"),
            like_count=item.get("likesCount"),
            comment_count=item.get("commentsCount"),
            view_count=item.get("videoViewCount") or item.get("videoPlayCount"),
            save_count=None,  # not reliably exposed
            share_count=None,
            media_urls=media_urls,
            raw=item,
        )


async def _demo() -> None:  # pragma: no cover
    import sys

    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.instagram.com/reel/EXAMPLE/"
    provider = ApifyProvider()
    post = await provider.fetch_post(url)
    print(post)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(_demo())
