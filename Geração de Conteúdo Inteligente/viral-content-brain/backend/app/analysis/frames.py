"""Sample frames from a video for vision analysis."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import log


async def sample_frames(video_path: str, interval_seconds: int | None = None) -> list[str]:
    """Extract one frame every N seconds. Returns list of frame paths."""
    settings = get_settings()
    interval = interval_seconds or settings.frame_sample_interval_seconds
    src = Path(video_path)
    out_dir = src.parent / "frames"
    out_dir.mkdir(exist_ok=True)
    pattern = str(out_dir / f"{src.stem}_%03d.jpg")

    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", f"fps=1/{interval}",
        "-q:v", "3",
        pattern,
    ]
    log.info(f"sampling frames: {' '.join(cmd)}")
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode(errors='ignore')[:500]}")

    frames = sorted(out_dir.glob(f"{src.stem}_*.jpg"))
    return [str(f) for f in frames]
