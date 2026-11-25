from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    upload_dir: str = "/app/uploads"
    max_upload_mb: int = 5
    gestor_registration_code: str = ""
    # Origens separadas por vírgula. Em produção o Caddy serve frontend e API
    # na mesma origem, então a lista pode ficar vazia.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    enable_docs: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
