from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    WAHA_WEBHOOK_SECRET: str = ""
    WAHA_API_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()
