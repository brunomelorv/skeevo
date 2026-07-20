from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    WAHA_WEBHOOK_SECRET: str = ""
    WAHA_API_URL: str = "http://waha:3000"
    WAHA_API_KEY: str = "1b4b5e0719254e3c905ae046449c5263"

    class Config:
        env_file = ".env"

settings = Settings()
