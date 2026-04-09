from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from supabase import Client

from app.api.deps.auth import (
    AuthUser,
    get_user_supabase,
    require_admin,
    get_current_user,
)
from app.schemas.docusign import (
    DocusignAuthError,
    DocusignServiceError,
    DocusignConsentRequiredError
)

from app.api.services.docusign import (
    get_docusign_service,
    DocusignService
)

from app.schemas.docusign import (
    CallBackResponse,
    CreateSigningSessionRequest,
    CreateSigningSessionResponse,
)

router = APIRouter(prefix="/docusign", tags=["docusign"])


@router.get("/auth/test")
def test_docusign_auth():
    service = DocusignService()

    try:
        token = service.get_access_token()
        return {
            "ok": True,
            "expires_in": token.expires_in,
            "token_preview": token.access_token[:20] + "...",
        }
    except DocusignConsentRequiredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DocusignAuthError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Callback URI that Docusign calls after giving consent to app
@router.get("/callback", response_model=CallBackResponse)
def docusign_callback(request: Request) -> CallBackResponse:
    return CallBackResponse(
        message="DocuSign callback reached",
        query_params=dict(request.query_params),
    )


@router.post("/recipient-view", response_model=CreateSigningSessionResponse)
def create_recipient_view(
    payload: Annotated[CreateSigningSessionRequest, Body(...)],
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_user_supabase)],
    docusign_service: Annotated[DocusignService, Depends(get_docusign_service)],
) -> CreateSigningSessionResponse:
    target_user_id = payload.user_id or current_user.id

    if target_user_id != current_user.id:
        require_admin(current_user)

    try:
        return docusign_service.create_signing_session(
            supabase=supabase,
            user_id=target_user_id,
            return_url=payload.return_url,
        )
    except DocusignConsentRequiredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DocusignServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

@router.post("/connect", status_code=status.HTTP_200_OK)
def handle_docusign_connect(
    payload: Annotated[dict[str, Any], Body(...)],
    supabase: Annotated[Client, Depends(get_user_supabase)],
    docusign_service: Annotated[DocusignService, Depends(get_docusign_service)]
) -> dict[str, str]:
    try:
        docusign_service.process_connect_event(supabase, payload)
        return {"status": "ok"}
    except DocusignServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
