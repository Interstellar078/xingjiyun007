from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    database_url: str = Field(..., alias="DATABASE_URL")
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    gemini_api_key: str | None = Field(None, alias="GEMINI_API_KEY")

    cors_origins: str = Field("", alias="CORS_ORIGINS")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    log_json: bool = Field(False, alias="LOG_JSON")

    model_config = {
        "case_sensitive": False,
        "populate_by_name": True,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @property
    def parsed_cors_origins(self) -> list[str]:
        if isinstance(self.cors_origins, str) and self.cors_origins.strip():
            return _split_csv(self.cors_origins)
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3001",
        ]

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    return settings
