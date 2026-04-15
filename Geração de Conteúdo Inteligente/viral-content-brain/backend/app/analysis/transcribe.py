"""Transcribe video audio using OpenAI Whisper API."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.logging import log


async def extract_audio(video_path: str) -> str:
    """Extract mono 16kHz audio for Whisper. Returns path to .mp3."""
    src = Path(video_path)
    dst = src.with_suffix(".mp3")
    if dst.exists() and dst.stat().st_size > 0:
        return str(dst)
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k",
        str(dst),
    ]
    log.info(f"extracting audio: {' '.join(cmd)}")
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode(errors='ignore')[:500]}")
    return str(dst)


async def transcribe(video_path: str) -> str:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY not configured")
    audio_path = await extract_audio(video_path)
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    log.info(f"Whisper: transcribing {audio_path}")
    with open(audio_path, "rb") as f:
        resp = await client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=f,
            response_format="text",
        )
    return resp if isinstance(resp, str) else str(resp)
