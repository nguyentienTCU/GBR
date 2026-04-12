from __future__ import annotations

from functools import lru_cache
from typing import Any

from docusign_esign import (
    ApiClient,
    EnvelopesApi,
    EnvelopeDefinition,
    TemplateRole,
    Tabs,
    Text,
    RecipientViewRequest,
)
from docusign_esign.client.api_exception import ApiException
from docusign_esign import TemplatesApi
from pathlib import Path

from app.core.config import get_settings
from app.schemas.contracts import ContractUpdateRequest
from app.schemas.docusign import (
    DocusignTokenResult,
    DocusignAuthError,
    DocusignServiceError,
    DocusignConsentRequiredError,
    CreateSigningSessionResponse,
)
from app.api.repository.contracts import ContractRepository
from app.api.repository.users import UserRepository

settings = get_settings()

ACTIVE_ENVELOPE_STATUSES = {
    "created",
    "sent",
    "delivered",
    "signed",
    "correct",
    "processing",
}
TERMINAL_ENVELOPE_STATUSES = {
    "completed",
    "declined",
    "voided",
    "deleted",
}

class DocusignService:
    def __init__(self) -> None:
        self.integration_key = settings.docusign_integration_key
        self.user_id = settings.docusign_user_id
        self.account_id = settings.docusign_account_id
        self.private_key = Path(settings.docusign_private_key_path).read_bytes()
        self.auth_server = settings.docusign_auth_server
        self.base_path = settings.docusign_base_path
        self.scopes = settings.docusign_scopes
        self.contract_repository = ContractRepository()
        self.user_repository = UserRepository()

    def get_access_token(self) -> DocusignTokenResult:
        """Obtain a JWT access token for the configured user."""
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
            if "consent_required" in str(body):
                raise DocusignConsentRequiredError(
                    "DocuSign JWT consent is required for this user."
                ) from e

            raise DocusignAuthError(f"Failed to get DocuSign JWT token: {body}") from e

        return DocusignTokenResult(
            access_token=token_response.access_token,
            expires_in=token_response.expires_in,
        )

    def create_api_client(self) -> ApiClient:
        """Create and return a DocuSign API client with a valid access token."""
        token = self.get_access_token()

        api_client = ApiClient()
        api_client.host = settings.docusign_base_path
        api_client.set_default_header(
            header_name="Authorization",
            header_value=f"Bearer {token.access_token}",
        )
        return api_client

    def create_signing_session(
        self,
        user_id: str,
        return_url: str,
    ) -> CreateSigningSessionResponse:
        """Create or reuse an active envelope and return an embedded signing URL."""
        print(f"[DocuSign] create_signing_session start user_id={user_id}")
        api_client = self.create_api_client()
        envelopes_api = EnvelopesApi(api_client)
        contract = self.contract_repository.get_latest_contract_by_user_id(
            user_id,
        )
        print(
            f"[DocuSign] contract loaded contract_id={contract['id']} "
            f"stored_envelope_id={contract.get('envelope_id')}"
        )
        user = self.user_repository.get_user_profile_by_id(user_id)
        # templates_api = TemplatesApi(api_client)
        # try:
        #     templates = templates_api.list_templates(account_id=self.account_id)
        #     for template in templates.envelope_templates or []:
        #         print(f"[DocuSign] available template template_id={template.template_id} "
        #               f"name={template.name}")
        # except ApiException as e:
        #     body = getattr(e, "body", "") or ""
        #     print("[DocuSign] failed to list templates")
        #     print("[DocuSign] status:", e.status)
        #     print("[DocuSign] reason:", e.reason)
        #     print("[DocuSign] body:", body)
        #     raise DocusignServiceError(f"Failed to list templates: {body}") from e

        signer_name = self._get_signer_name(user)
        envelope_id = contract.get("envelope_id")
        envelope_status = ""

        if envelope_id:
            print(f"[DocuSign] fetching existing envelope envelope_id={envelope_id}")
            try:
                envelope = envelopes_api.get_envelope(
                    account_id=self.account_id,
                    envelope_id=envelope_id,
                )
            except ApiException as e:
                body = getattr(e, "body", "") or ""
                raise DocusignServiceError(
                    f"Failed to fetch envelope: {body}"
                ) from e

            envelope_status = (envelope.status or "").lower()
            print(
                f"[DocuSign] existing envelope loaded envelope_id={envelope_id} "
                f"status={envelope_status}"
            )

        if not envelope_id or envelope_status in TERMINAL_ENVELOPE_STATUSES:
            template_id = self._get_template_id_for_role(user["role"])
            print(
                "[DocuSign] creating new envelope "
                f"reason={'missing_envelope_id' if not envelope_id else envelope_status}"
            )
            print(
                f"[DocuSign] envelope template selected role={user['role']} "
                f"template_id={template_id}"
            )
            template_role = TemplateRole(
                email=user["email"],
                name=signer_name,
                role_name="Client",
                client_user_id=user["id"],
                # tabs=Tabs(
                #     text_tabs=[
                #         Text(
                #             tab_label="full_name",
                #             value=signer_name,
                #         )
                #     ]
                # ),
            )
            envelope_definition = EnvelopeDefinition(
                template_id=template_id,
                template_roles=[template_role],
                status="sent",
            )

            print("[DocuSign] creating envelope with template_id:", template_id)
            try:
                created_envelope = envelopes_api.create_envelope(
                    account_id=self.account_id,
                    envelope_definition=envelope_definition,
                )
            except ApiException as e:
                print("[DocuSign] create_envelope failed")
                print("[DocuSign] status:", e.status)
                print("[DocuSign] reason:", e.reason)
                print("[DocuSign] body:", e.body)
                print("[DocuSign] template_id:", repr(template_id))
                print("[DocuSign] role_name:", repr("Client"))
                print("[DocuSign] account_id:", repr(self.account_id))
                raise DocusignServiceError(f"Failed to create envelope: {e.body}") from e

            envelope_id = created_envelope.envelope_id
            envelope_status = (created_envelope.status or "").lower()
            print(
                f"[DocuSign] new envelope created envelope_id={envelope_id} "
                f"status={envelope_status}"
            )
            self.contract_repository.update_contract(
                contract["id"],
                ContractUpdateRequest(envelope_id=envelope_id),
            )
            print(
                f"[DocuSign] contract updated contract_id={contract['id']} "
                f"new_envelope_id={envelope_id}"
            )
        elif envelope_status not in ACTIVE_ENVELOPE_STATUSES:
            print(
                f"[DocuSign] unsupported envelope status envelope_id={envelope_id} "
                f"status={envelope_status}"
            )
            raise DocusignServiceError(
                f"Envelope {envelope_id} has unsupported status '{envelope_status}'."
            )
        else:
            print(
                f"[DocuSign] reusing active envelope envelope_id={envelope_id} "
                f"status={envelope_status}"
            )

        print(
            f"[DocuSign] creating recipient view envelope_id={envelope_id} "
            f"return_url={return_url}"
        )
        try:
            recipient_view = envelopes_api.create_recipient_view(
                account_id=self.account_id,
                envelope_id=envelope_id,
                recipient_view_request=RecipientViewRequest(
                    authentication_method="none",
                    client_user_id=user["id"],
                    return_url=return_url,
                    user_name=signer_name,
                    email=user["email"],
                ),
            )
        except ApiException as e:
            body = getattr(e, "body", "") or ""
            raise DocusignServiceError(
                f"Failed to create recipient view: {body}"
            ) from e

        print(
            f"[DocuSign] recipient view created envelope_id={envelope_id} "
            f"url={recipient_view.url}"
        )
        return CreateSigningSessionResponse(
            contract_id=contract["id"],
            envelope_id=envelope_id,
            envelope_status=envelope_status or "",
            signing_url=recipient_view.url,
        )

    def process_connect_event(self, payload: dict[str, Any]) -> None:
        event = payload.get("event")
        data = payload.get("data") or {}
        envelope_id = data.get("envelopeId")
        account_id = data.get("accountId")

        print(f"[DocuSign] process_connect_event event={event} envelope_id={envelope_id}")

        if event != "envelope-completed":
            print(f"[Docusign] ignoring event={event}")
            return

        if not envelope_id:
            raise DocusignServiceError(
                "DocuSign Connect event is missing envelopeId."
            )

        if account_id and account_id != self.account_id:
            raise DocusignServiceError(
                f"DocuSign Connect account mismatch. Expected {self.account_id}, got {account_id}."
            )

        contract = self.contract_repository.get_contract_by_envelope_id(
            envelope_id,
        )
        if not contract:
            raise DocusignServiceError(
                f"No contract found for envelope_id={envelope_id}."
            )

        print(
            f"[DocuSign] matched contract contract_id={contract['id']} "
            f"user_id={contract['user_id']} envelope_id={envelope_id}"
        )

        self.contract_repository.update_contract(
            contract["id"],
            ContractUpdateRequest(
                status="completed",
            ),
        )
        print(f"[DocuSign] contract marked completed contract_id={contract['id']}")

        self.user_repository.update_user_step(contract["user_id"], 1)
        print(
            f"[DocuSign] user advanced to payment step "
            f"user_id={contract['user_id']} step=2"
        )


    def _get_template_id_for_role(self, role: str) -> str:
        if role == "buyer":
            return settings.docusign_buyer_template_id
        if role == "seller":
            return settings.docusign_seller_template_id

        raise DocusignServiceError(
            f"Unsupported DocuSign role '{role}'. Expected buyer or seller."
        )

    def _get_signer_name(self, user: dict[str, Any]) -> str:

        return f"{user['first_name']} {user['last_name']}".strip()

@lru_cache
def get_docusign_service() -> DocusignService:
    return DocusignService()
