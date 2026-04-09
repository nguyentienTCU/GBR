from pydantic import BaseModel, Field
from dataclasses import dataclass


class CallBackResponse(BaseModel):
    message: str
    query_params: dict[str, str] = Field(default_factory=dict)

@dataclass
class DocusignTokenResult:
    access_token: str
    expires_in: int


@dataclass
class CreateEnvelopeRequest:
    template_id: str
    signer_name: str
    signer_email: str
    role_name: str
    client_user_id: str
    full_name: str | None = None
    status: str = "sent"  # use "created" for draft if needed


@dataclass
class CreateEnvelopeResult:
    envelope_id: str
    status: str

@dataclass
class CreateRecipientViewRequestData:
    envelope_id: str
    signer_name: str
    signer_email: str
    client_user_id: str
    return_url: str

@dataclass
class CreateRecipientViewResult:
    url: str


class CreateSigningSessionRequest(BaseModel):
    user_id: str | None = None
    return_url: str


class CreateSigningSessionResponse(BaseModel):
    contract_id: str
    envelope_id: str
    envelope_status: str
    signing_url: str


class DocusignServiceError(Exception):
    pass


class DocusignConsentRequiredError(DocusignServiceError):
    pass


class DocusignAuthError(DocusignServiceError):
    pass
