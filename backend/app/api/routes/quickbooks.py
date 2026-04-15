import base64
import hashlib
import hmac
from datetime import datetime, timezone
import httpx
from typing import Annotated

from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel

from urllib.parse import urlencode
import secrets

from app.api.deps.auth import AuthUser, get_current_user
from app.api.repository.quickbooks import QuickBooksRepository
from app.api.services.quickbooks_accounting import (
    QuickBooksAccountingService,
    get_quickbooks_accounting_service,
)
from app.core.config import get_settings
from app.schemas.quickbooks import CreateInvoicePayload, QuickBooksApiError

router = APIRouter(prefix="/quickbooks", tags=["quickbooks"])


class QuickBooksCreateInvoiceRequest(BaseModel):
    amount: float
    txn_date: str | None = None
    due_date: str | None = None
    customer_memo: str | None = None
    private_note: str | None = None

@router.post("/invoices")
async def create_quickbooks_invoice(
    payload: QuickBooksCreateInvoiceRequest,
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    quickbooks_service: Annotated[QuickBooksAccountingService, Depends(get_quickbooks_accounting_service)],
):
    invoice_payload = CreateInvoicePayload(
        amount=payload.amount,
        txn_date=payload.txn_date,
        due_date=payload.due_date,
        customer_memo=payload.customer_memo,
        private_note=payload.private_note,
    )

    try:
        return await quickbooks_service.create_invoice(
            payload=invoice_payload,
            current_user=current_user,
        )
    except (QuickBooksApiError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def exchange_code_for_tokens(code: str) -> dict:
    settings = get_settings()
    basic = base64.b64encode(
        f"{settings.qbo_client_id}:{settings.qbo_client_secret}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {basic}",
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.qbo_redirect_uri,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(settings.qbo_token_url, headers=headers, data=data)

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"QuickBooks token exchange failed: {response.text}",
        )

    return response.json()

# ------- QuickBooks webhooks -------
def verify_intuit_signature(raw_body: bytes, signature: str, verifier_token: str) -> bool:
    digest = hmac.new(
        verifier_token.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).digest()
    computed = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(computed, signature)


WEBHOOK_EVENT_TYPES = {
    "qbo.invoice.created.v1",
    "qbo.invoice.updated.v1",
    "qbo.invoice.voided.v1",
    "qbo.payment.created.v1",
    "qbo.payment.updated.v1",
}


@router.post("/webhooks")
async def quickbooks_webhook(
    request: Request,
    intuit_signature: str | None = Header(default=None, alias="intuit-signature"),
    quickbooks_service: Annotated[
        QuickBooksAccountingService, Depends(get_quickbooks_accounting_service)
    ] = None,
) -> Response:
    raw_body = await request.body()
    settings = get_settings()

    if not intuit_signature:
        raise HTTPException(status_code=400, detail="Missing intuit-signature header")

    if not verify_intuit_signature(
        raw_body,
        intuit_signature,
        settings.qbo_webhook_verifier_token,
    ):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    events = payload if isinstance(payload, list) else payload.get("events", [])

    for event in events:
        if event.get("type") not in WEBHOOK_EVENT_TYPES:
            continue

        invoice_id = event.get("intuitentityid")
        if not invoice_id:
            continue

        try:
            await quickbooks_service.sync_transaction_status_by_invoice_id(invoice_id)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise

    return Response(status_code=200)



# ------- QuickBooks OAUTH Routes -------
@router.get("/connect")
async def quickbooks_connect(request: Request):
    settings = get_settings()

    state = secrets.token_urlsafe(32)
    request.session["qbo_oauth_state"] = state

    params = {
        "client_id": settings.qbo_client_id,
        "response_type": "code",
        "scope": settings.qbo_scopes,
        "redirect_uri": settings.qbo_redirect_uri,
        "state": state,
    }

    auth_url = f"{settings.qbo_auth_base}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def quickbooks_callback(request: Request):
    code = request.query_params.get("code")
    realm_id = request.query_params.get("realmId")
    state = request.query_params.get("state")

    expected_state = request.session.get("qbo_oauth_state")
    if not state or state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    if not realm_id:
        raise HTTPException(status_code=400, detail="Missing realmId")

    token_data = await exchange_code_for_tokens(code)

    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_in = token_data.get("expires_in")
    refresh_expires_in = token_data.get("x_refresh_token_expires_in")

    expires_at = datetime.now(timezone.utc).replace(microsecond=0)
    expires_at = expires_at.fromtimestamp(
        expires_at.timestamp() + int(expires_in),
        tz=timezone.utc,
    )
    repo = QuickBooksRepository()
    repo.save_qbo_connection(
        realm_id=realm_id,
        refresh_token=refresh_token,
        access_token=access_token,
        expires_at=expires_at,
    )
    
    request.session.pop("qbo_oauth_state", None)
    return {
        "connected": True,
        "realm_id": realm_id,
        "expires_in": expires_in,
        "refresh_expires_in": refresh_expires_in,
    }
