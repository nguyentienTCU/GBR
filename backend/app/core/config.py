from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    docusign_integration_key: str
    docusign_user_id: str
    docusign_account_id: str
    docusign_base_path: str = "https://demo.docusign.net/restapi"
    docusign_auth_server: str = "account-d.docusign.com"
    docusign_private_key_path: str
    docusign_redirect_uri: str
    
    

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    @property
    def docusign_scopes(self) -> list[str]:
        return ["signature", "impersonation"]


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance"""
    return Settings()
