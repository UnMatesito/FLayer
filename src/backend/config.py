from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "dev"

    database_url: str
    secret_key: str

    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from_email: str

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
