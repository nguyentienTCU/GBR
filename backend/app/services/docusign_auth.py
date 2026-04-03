from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from docusign_esign import ApiClient
from docusign_esign.client.api_exception import ApiException

from app.core.config import get_settings
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from pathlib import Path

settings = get_settings()

@dataclass
class DocusignTokenResult:
    access_token: str
    expires_in: int


class DocusignAuthError(Exception):
    pass


class DocusignConsentRequiredError(DocusignAuthError):
    pass


class DocusignAuthService:
    def __init__(self) -> None:
        self.integration_key = settings.docusign_integration_key
        self.user_id = settings.docusign_user_id
        self.private_key = Path(settings.docusign_private_key_path).read_bytes()
        self.auth_server = settings.docusign_auth_server
        self.scopes = settings.docusign_scopes

    def get_access_token(self) -> DocusignTokenResult:
        api_client = ApiClient()

        try:
            token_response = api_client.request_jwt_user_token(
                client_id=self.integration_key,
                user_id=self.user_id,
                oauth_host_name=self.auth_server,
                private_key_bytes=self.private_key,
                expires_in=3600,
                scopes=self.scopes,
            )
        except ApiException as e:
            body = getattr(e, "body", "") or ""

            # consent was never granted
            if b"consent_required" in body:
                raise DocusignConsentRequiredError(
                    "DocuSign JWT consent is required for this user."
                ) from e

            raise DocusignAuthError(f"Failed to get DocuSign JWT token: {body}") from e

        return DocusignTokenResult(
            access_token=token_response.access_token,
            expires_in=token_response.expires_in,
        )
    
    def create_api_client(self) -> ApiClient:
        token = self.get_access_token()

        api_client = ApiClient()
        api_client.host = settings.docusign_base_path
        api_client.set_default_header(
            header_name="Authorization",
            header_value=f"Bearer {token.access_token}",
        )
        return api_client
