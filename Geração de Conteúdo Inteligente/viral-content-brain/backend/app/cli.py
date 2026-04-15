"""Command-line interface for the Viral Content Brain."""
from __future__ import annotations

import asyncio
import json

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import func, select

import app  # noqa: F401  # ensure package is importable
from app.brain.query import answer as brain_answer
from app.core.db import Analysis, Niche, Post, SessionLocal, init_db
from app.pipeline import process_url

console = Console()
cli = typer.Typer(help="Viral Content Brain CLI")


@cli.command("init")
def cmd_init() -> None:
    """Create DB extension and tables."""
    asyncio.run(init_db())
    console.print("[green]DB initialized.[/]")


@cli.command("ingest")
def cmd_ingest(
    url: str,
    force: bool = typer.Option(False, help="Reprocess if already ingested"),
) -> None:
    """Ingest and reverse-engineer a single Instagram post."""
    result = asyncio.run(process_url(url, force=force))
    console.print_json(data=result)


@cli.command("query")
def cmd_query(
    question: str,
    k: int = typer.Option(8, help="How many posts to use as context"),
    niche: str = typer.Option(None, help="Filter by niche slug"),
    funnel: str = typer.Option(None, help="Filter by funnel stage: tofu|mofu|bofu"),
) -> None:
    """Ask the brain a question (RAG over ingested posts)."""

    async def _run() -> None:
        async with SessionLocal() as s:
            result = await brain_answer(
                s, question, k=k, niche_slug=niche, funnel_stage=funnel
            )
            console.rule("[bold cyan]RESPOSTA")
            console.print(result["answer"])
            console.rule("[bold cyan]FONTES")
            for h in result["hits"]:
                console.print(
                    f"- @{h['author']} sim={h['similarity']} viral={h['viral_score']} "
                    f"funnel={h['funnel_stage']} → {h['url']}"
                )

    asyncio.run(_run())


@cli.command("stats")
def cmd_stats() -> None:
    """Show what's in the brain."""

    async def _run() -> None:
        async with SessionLocal() as s:
            total_posts = (await s.execute(select(func.count(Post.id)))).scalar_one()
            total_analyses = (
                await s.execute(select(func.count(Analysis.id)))
            ).scalar_one()
            niches = (await s.execute(select(Niche).order_by(Niche.post_count.desc()))).scalars().all()

            console.print(f"[bold]Posts:[/] {total_posts}  |  [bold]Analyses:[/] {total_analyses}")
            t = Table(title="Niches")
            t.add_column("slug")
            t.add_column("name")
            t.add_column("posts", justify="right")
            for n in niches:
                t.add_row(n.slug, n.name, str(n.post_count))
            console.print(t)

    asyncio.run(_run())


@cli.command("show")
def cmd_show(shortcode: str) -> None:
    """Show the full analysis of a stored post."""

    async def _run() -> None:
        async with SessionLocal() as s:
            post = (
                await s.execute(select(Post).where(Post.shortcode == shortcode))
            ).scalar_one_or_none()
            if not post:
                console.print(f"[red]Not found: {shortcode}[/]")
                return
            analysis = (
                await s.execute(select(Analysis).where(Analysis.post_id == post.id))
            ).scalar_one_or_none()
            out = {
                "post": {
                    "shortcode": post.shortcode,
                    "author": post.author_username,
                    "url": post.url,
                    "type": post.post_type,
                    "viral_score": post.viral_score,
                    "likes": post.like_count,
                    "comments": post.comment_count,
                    "views": post.view_count,
                },
                "analysis": analysis.raw_analysis if analysis else None,
            }
            console.print(json.dumps(out, indent=2, ensure_ascii=False, default=str))

    asyncio.run(_run())


if __name__ == "__main__":
    cli()
