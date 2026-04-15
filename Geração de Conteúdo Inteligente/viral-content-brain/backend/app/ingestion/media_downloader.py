"""Download remote media to local disk for analysis."""
from __future__ import annotations

from pathlib import Path

import httpx

from app.core.config import get_settings
from app.core.logging import log


async def download_media(urls: list[str], shortcode: str) -> list[str]:
    """Download each URL under data/raw/<shortcode>/. Returns local paths."""
    settings = get_settings()
    target_dir = settings.media_dir / shortcode
    target_dir.mkdir(parents=True, exist_ok=True)

    local_paths: list[str] = []
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        for idx, url in enumerate(urls):
            if not url:
                continue
            ext = _guess_ext(url)
            out = target_dir / f"{idx:02d}{ext}"
            if out.exists() and out.stat().st_size > 0:
                log.info(f"media exists, skip: {out}")
                local_paths.append(str(out))
                continue
            log.info(f"downloading {url} -> {out}")
            try:
                r = await client.get(url)
                r.raise_for_status()
                out.write_bytes(r.content)
                local_paths.append(str(out))
            except Exception as e:
                log.error(f"failed to download {url}: {e}")
    return local_paths


def _guess_ext(url: str) -> str:
    lower = url.lower().split("?")[0]
    for ext in (".mp4", ".mov", ".webp", ".jpg", ".jpeg", ".png"):
        if lower.endswith(ext):
            return ext
    return ".bin"


def is_video(path: str) -> bool:
    return Path(path).suffix.lower() in {".mp4", ".mov", ".webm", ".mkv"}


def is_image(path: str) -> bool:
    return Path(path).suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
