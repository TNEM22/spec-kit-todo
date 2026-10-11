"""Application settings read from the environment and `.env` (pydantic-settings).

The server itself is started with `python -m app`, which always binds to 127.0.0.1: Taskify has no
authentication in this phase, so it must only accept connections from the same machine.
"""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    Attributes:
        database_url: SQLAlchemy async URL. Changing it switches the database engine.
        cors_origins: Origins allowed to call the API and open the WebSocket (comma separated
            in the environment).
        log_level: Python logging level name.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./taskify.db"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:4200"]
    log_level: str = "INFO"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Accept a comma separated string as well as a list."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance."""
    return Settings()
