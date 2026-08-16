from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    database_url: str = "sqlite:///./ticket_sim.db"
    anthropic_model: str = "claude-opus-5"

    # When true, all Anthropic API calls are replaced with canned/scripted
    # responses (see app/services/demo_fixtures.py) — used for public demo
    # deployments so visitors can never generate real API spend.
    demo_mode: bool = False

    # Comma-separated list of allowed CORS origins, e.g.
    # "http://localhost:3000,https://my-demo.vercel.app"
    allowed_origins: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
