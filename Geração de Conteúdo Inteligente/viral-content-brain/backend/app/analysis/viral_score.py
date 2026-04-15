"""Heuristic viral score. Values in [0, 1]."""
from __future__ import annotations

from app.ingestion.base import IngestedPost


def compute_viral_score(post: IngestedPost) -> float:
    """
    Heuristic combining engagement vs audience and raw reach.
    Missing data => conservative estimate.
    """
    followers = post.author_followers or 0
    likes = post.like_count or 0
    comments = post.comment_count or 0
    views = post.view_count or 0

    # Engagement rate (likes+comments vs followers)
    if followers > 0:
        er = (likes + comments * 3) / followers
        er_score = min(er / 0.15, 1.0)  # 15% ER = great
    else:
        er_score = 0.0

    # Reach vs followers (reels)
    if followers > 0 and views > 0:
        reach_ratio = views / followers
        reach_score = min(reach_ratio / 5.0, 1.0)  # 5x followers = very viral
    elif views > 50_000:
        reach_score = min(views / 500_000, 1.0)
    else:
        reach_score = 0.0

    # Comments-to-likes ratio (conversation)
    if likes > 0:
        conv = comments / likes
        conv_score = min(conv / 0.05, 1.0)  # 5% comment/like = great
    else:
        conv_score = 0.0

    return round(0.4 * er_score + 0.4 * reach_score + 0.2 * conv_score, 3)
