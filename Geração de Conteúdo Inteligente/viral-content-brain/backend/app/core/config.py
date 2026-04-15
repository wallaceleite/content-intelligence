"""Central config loaded from .env via pydantic-settings."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # APIs
    apify_token: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Apify actors
    apify_instagram_scraper_actor: str = "apify/instagram-scraper"
    apify_instagram_reel_actor: str = "apify/instagram-reel-scraper"
    apify_instagram_hashtag_actor: str = "apify/instagram-hashtag-scraper"

    # DB
    database_url: str = "postgresql+asyncpg://brain:brain@localhost:5432/viral_brain"
    redis_url: str = "redis://localhost:6379/0"

    # Models
    llm_model: str = "claude-sonnet-4-6"
    vision_model: str = "claude-sonnet-4-6"
    embedding_model: str = "text-embedding-3-large"
    whisper_model: str = "whisper-1"

    # Analysis config
    frame_sample_interval_seconds: int = 2
    viral_score_threshold: float = 0.6
    niche_similarity_threshold: float = 0.78
    media_storage_dir: str = "./data/raw"

    # App
    log_level: str = "INFO"
    environment: str = "development"

    @property
    def media_dir(self) -> Path:
        p = Path(self.media_storage_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()
