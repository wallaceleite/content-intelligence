"""Vision description via Claude Sonnet (multi-image)."""
from __future__ import annotations

import base64
from pathlib import Path

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.core.logging import log

VISION_PROMPT = """Você é um analista visual especializado em conteúdo de Instagram.

Descreva estas imagens em ordem cronológica/sequencial, focando em:
1. Texto visível na tela (overlays, legendas, caps-lock, grifos)
2. Hook visual dos primeiros frames (o que prende o olho)
3. Expressão facial / linguagem corporal do personagem (se houver)
4. Composição, cor dominante, ritmo visual
5. Mudanças de cena / corte / transição
6. Produtos, logos, identidade visual
7. Padrão de formato (talking head, tutorial, before/after, meme, carrossel educativo, etc)

Seja específico e conciso. Use bullets curtos por imagem, numerados."""


def _encode(path: str) -> tuple[str, str]:
    suffix = Path(path).suffix.lower()
    media_type = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
    }.get(suffix, "image/jpeg")
    with open(path, "rb") as f:
        return media_type, base64.standard_b64encode(f.read()).decode("utf-8")


async def describe_images(image_paths: list[str], context: str = "") -> str:
    """Return a consolidated visual description for a list of images."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    if not image_paths:
        return ""

    # Cap at 20 images to control cost
    image_paths = image_paths[:20]
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    content: list[dict] = []
    for p in image_paths:
        media_type, data = _encode(p)
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": data},
        })
    prompt = VISION_PROMPT
    if context:
        prompt += f"\n\nContexto adicional sobre o post:\n{context}"
    content.append({"type": "text", "text": prompt})

    log.info(f"Vision: analyzing {len(image_paths)} images with {settings.vision_model}")
    resp = await client.messages.create(
        model=settings.vision_model,
        max_tokens=2000,
        messages=[{"role": "user", "content": content}],
    )
    return resp.content[0].text if resp.content else ""
