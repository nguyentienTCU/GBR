from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env.
    """

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # DocuSign
    docusign_integration_key: str
    docusign_user_id: str
    docusign_account_id: str
    docusign_base_path: str = "https://demo.docusign.net/restapi"
    docusign_auth_server: str = "account-d.docusign.com"
    docusign_private_key_path: str
    docusign_redirect_uri: str
    docusign_buyer_template_id: str
    docusign_seller_template_id: str
    
    # Quickbooks
    qbo_scopes: str
    qbo_auth_base: str
    qbo_token_url: str
    qbo_base_url: str
    qbo_client_id: str
    qbo_redirect_uri: str
    qbo_client_secret: str
    qbo_income_account_id: str
    qbo_webhook_verifier_token: str
    qbo_webhook_verifier_token: str

    # Email
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_from_email: str

    # frontend url
    frontend_url: str

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
    """
    Return a cached settings instance
    """
    return Settings()
