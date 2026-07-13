from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://flayer:flayer@localhost:5432/flayer"
    secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from_email: str = "noreply@flayer.local"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
