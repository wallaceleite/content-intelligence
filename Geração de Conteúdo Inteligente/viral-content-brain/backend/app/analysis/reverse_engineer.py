"""Reverse-engineer a post using Claude + structured JSON output."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.core.logging import log
from app.ingestion.base import IngestedPost


PROMPT_PATH = Path(__file__).resolve().parents[2].parent / "prompts" / "reverse_engineer.md"


def _load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _build_user_message(
    post: IngestedPost, transcript: str | None, visual_description: str | None
) -> str:
    sections = []
    sections.append("## METADATA")
    sections.append(
        f"- Autor: @{post.author_username} ({post.author_followers or '?'} seguidores)\n"
        f"- Tipo: {post.post_type}\n"
        f"- Duração: {post.duration_seconds or '-'}s\n"
        f"- Likes: {post.like_count or '-'} | Comments: {post.comment_count or '-'} "
        f"| Views: {post.view_count or '-'}\n"
        f"- URL: {post.url}"
    )
    sections.append("\n## CAPTION")
    sections.append(post.caption or "(vazia)")
    if transcript:
        sections.append("\n## TRANSCRIÇÃO")
        sections.append(transcript)
    if visual_description:
        sections.append("\n## DESCRIÇÃO VISUAL")
        sections.append(visual_description)
    return "\n".join(sections)


def _extract_json(text: str) -> dict[str, Any]:
    """Tolerant JSON extraction — LLM sometimes wraps in ``` or adds preface."""
    # Strip code fences if present
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        return json.loads(fenced.group(1))
    # Find the first { ... } block
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"no JSON found in response: {text[:200]}")
    return json.loads(text[start : end + 1])


async def reverse_engineer(
    post: IngestedPost,
    transcript: str | None = None,
    visual_description: str | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    system_prompt = _load_prompt()
    user_msg = _build_user_message(post, transcript, visual_description)

    log.info(f"Reverse-engineering post {post.shortcode} with {settings.llm_model}")
    resp = await client.messages.create(
        model=settings.llm_model,
        max_tokens=4000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_msg}],
    )
    text = resp.content[0].text if resp.content else ""
    return _extract_json(text)
