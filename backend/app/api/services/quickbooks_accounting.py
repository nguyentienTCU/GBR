from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
import logging
from typing import Any, Optional

import httpx
from httpx import DecodingError

from app.api.repository.quickbooks import QuickBooksRepository
from app.api.repository.transaction import TransactionRepository
from app.api.repository.users import UserRepository
from app.core.config import get_settings
from app.schemas.quickbooks import (
    CreateInvoicePayload,
    QuickBooksApiError,
    QuickBooksCustomer,
    QboConnection,
)
from app.schemas.transactions import TransactionUpdateRequest
from app.api.services.quickbooks_token import QuickBooksTokenService

settings = get_settings()
logger = logging.getLogger(__name__)
LOG_PREFIX = "[QuickBooksAccountingService]"


class QuickBooksAccountingService:
    def __init__(
        self,
    ) -> None:
        self.http_timeout = 30
        self.api_base = "https://sandbox-quickbooks.api.intuit.com"
        self.token_service = QuickBooksTokenService()
        self.transaction_repo = TransactionRepository()
        self.user_repo = UserRepository()
        self.quickbooks_repo = QuickBooksRepository()

    async def create_invoice(
        self,
        payload: CreateInvoicePayload,
        current_user: Any,
    ) -> dict[str, Any]:
        if payload.amount <= 0:
            raise ValueError("Invoice amount must be greater than zero.")

        user_id = getattr(current_user, "id", None)
        if not user_id:
            raise ValueError("Authenticated user is missing an id.")

        connection = self.quickbooks_repo.get_qbo_connection()
        logger.info(
            "%s starting invoice creation user_id=%s realm_id=%s amount=%s",
            LOG_PREFIX,
            user_id,
            connection.realm_id,
            payload.amount,
        )
        customer_payload = self._build_customer_payload(current_user)

        try:
            # Create a QBO customer if we don't already have a customer_id for this user. We need a customer to create an invoice.
            customer = await self.transaction_repo.get_latest_transaction_by_user_id(user_id)
            customer_id = customer.get("qbo_customer_id")
            if not customer_id:
                customer_id =  await self._create_customer(connection=connection, payload=payload).get("Id"); 

            self.user_repo.update_user_qbo_customer_id(
                user_id=user_id,
                qbo_customer_id=customer_id,
            )

            self.transaction_repo.update_latest_transaction_by_user_id(
                user_id,
                TransactionUpdateRequest(
                    qbo_customer_id=customer_id,
                    amount=payload.amount,
                    status="pending",
                ),
            )

            # Get or create the service item for the invoice line. This is a sellable item in QBO that represents the service we're charging for.
            service_item = await self._get_item_by_name(
                connection=connection,
                item_name=item_name,
            )
            
            if not service_item:
                service_item = await self._create_service_item(
                    connection=connection,
                    item_name=item_name,
                    income_account_id=settings.qbo_income_account_id,
                    description=description,
                    unit_price=unit_price,
                )
            
            service_item_id = service_item.get("Id")
            if not service_item_id:
                raise QuickBooksApiError(
                    f"QuickBooks service item response missing Id: {service_item}"
                )

            body: dict[str, Any] = {
                "BillEmail": { "Address": current_user.email },
                "CustomerRef": {"value": customer_id},
                "Line": [
                    {
                        "DetailType": "SalesItemLineDetail",
                        "Amount": payload.amount,
                        "Description": "Brokerage Service Fee",
                        "SalesItemLineDetail": {
                            "ItemRef": {"value": service_item_id},
                        },
                    }
                ],
                "AllowOnlinePayment": True,
                "AllowOnlineCreditCardPayment": True,
                "AllowOnlineACHPayment": True,
            }

            if payload.txn_date:
                body["TxnDate"] = payload.txn_date
            if payload.due_date:
                body["DueDate"] = payload.due_date
            if payload.customer_memo:
                body["CustomerMemo"] = {"value": payload.customer_memo}
            if payload.private_note:
                body["PrivateNote"] = payload.private_note

            invoice_response = await self._qbo_post(
                connection=connection,
                path=f"/v3/company/{connection.realm_id}/invoice",
                json_body=body,
                params={"minorversion": "75"},
            )
            invoice = invoice_response.get("Invoice", invoice_response)
            invoice_id = invoice.get("Id")
            if not invoice_id:
                raise QuickBooksApiError(
                    f"QuickBooks invoice response missing Id: {invoice_response}"
                )
            bill_email = current_user.email
            send_result = await self._send_invoice_email(
                connection=connection,
                invoice_id=invoice_id,
            )
            logger.info(
                "%s invoice created user_id=%s realm_id=%s invoice_id=%s emailed=%s",
                LOG_PREFIX,
                user_id,
                connection.realm_id,
                invoice_id,
                True,
            )

            self.transaction_repo.update_latest_transaction_by_user_id(
                user_id,
                TransactionUpdateRequest(
                    qbo_customer_id=customer_id,
                    qbo_invoice_id=invoice_id,
                    amount=payload.amount,
                    status="pending",
                ),
            )
            self.user_repo.update_user_step(user_id, 2)

            return {
                "customer_id": customer_id,
                "invoice_id": invoice_id,
                "bill_email": bill_email,
                "email_sent": True,
                "send_result": send_result,
                "invoice": invoice_response,
            }
        except Exception:
            logger.exception(
                "%s invoice creation failed user_id=%s realm_id=%s amount=%s",
                LOG_PREFIX,
                user_id,
                connection.realm_id,
                payload.amount,
            )
            self.transaction_repo.update_latest_transaction_by_user_id(
                user_id,
                TransactionUpdateRequest(
                    amount=payload.amount,
                    status="failed",
                ),
            )
            raise

    async def get_invoice_by_id(
        self,
        invoice_id: str,
    ) -> dict[str, Any]:
        connection = self.quickbooks_repo.get_qbo_connection()
        invoice_response = await self._qbo_get(
            connection=connection,
            path=f"/v3/company/{connection.realm_id}/invoice/{invoice_id}",
            params={"minorversion": "75"},
        )
        return invoice_response.get("Invoice", invoice_response)

    async def _send_invoice_email(
        self,
        connection: QboConnection,
        invoice_id: str,
    ) -> dict[str, Any]:
        send_response = await self._qbo_post_without_body(
            connection=connection,
            path=f"/v3/company/{connection.realm_id}/invoice/{invoice_id}/send",
            params={"minorversion": "75"},
        )
        logger.info(
            "%s invoice email sent realm_id=%s invoice_id=%s",
            LOG_PREFIX,
            connection.realm_id,
            invoice_id,
        )
        return send_response

    async def sync_transaction_status_by_invoice_id(
        self,
        invoice_id: str,
    ) -> dict[str, Any]:
        invoice = await self.get_invoice_by_id(invoice_id)
        balance = float(invoice.get("Balance", 0) or 0)

        update_payload = TransactionUpdateRequest(
            amount=balance,
            status="completed" if balance == 0 else "pending",
        )
        if balance == 0:
            update_payload.time_end = datetime.now(timezone.utc)

        return self.transaction_repo.update_transaction_by_qbo_invoice_id(
            invoice_id,
            update_payload,
        )

    async def _get_item_by_name(
        self,
        connection: QboConnection,
        item_name: str,
    ) -> Optional[dict[str, Any]]:
        escaped = self._escape_qbo_query_literal(item_name)
        query = f"SELECT * FROM Item WHERE Name = '{escaped}'"

        data = await self._qbo_query(connection=connection, query=query)
        items = data.get("QueryResponse", {}).get("Item", [])

        for item in items:
            if item.get("Name") == item_name and item.get("Type") == "Service":
                return item

        return None

    async def _create_service_item(
        self,
        connection: QboConnection,
        item_name: str,
        income_account_id: str,
        description: Optional[str] = None,
        unit_price: Optional[float] = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "Name": item_name,
            "Type": "Service",
            "IncomeAccountRef": {
                "value": income_account_id,
            },
            "Active": True,
        }

        if description:
            body["Description"] = description

        # Optional. Useful only if you want a default sales price in QBO.
        if unit_price is not None:
            body["UnitPrice"] = unit_price

        data = await self._qbo_post(
            connection=connection,
            path=f"/v3/company/{connection.realm_id}/item",
            json_body=body,
            params={"minorversion": "75"},
        )

        # QBO usually returns {"Item": {...}, "time": "..."}
        item = data.get("Item")
        if not item:
            raise QuickBooksApiError(f"Unexpected QuickBooks item create response: {data}")

        return item

    async def _create_customer(
        self,
        connection,
        payload: QuickBooksCustomer,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"DisplayName": payload.display_name}

        if payload.given_name:
            body["GivenName"] = payload.given_name
        if payload.family_name:
            body["FamilyName"] = payload.family_name
        if payload.company_name:
            body["CompanyName"] = payload.company_name
        if payload.primary_email:
            body["PrimaryEmailAddr"] = {"Address": payload.primary_email}
        if payload.primary_phone:
            body["PrimaryPhone"] = {"FreeFormNumber": payload.primary_phone}

        return await self._qbo_post(
            connection=connection,
            path=f"/v3/company/{connection.realm_id}/customer",
            json_body=body,
            params={"minorversion": "75"},
        )

    async def _qbo_query(
        self,
        connection,
        query: str,
    ) -> dict[str, Any]:
        access_token = await self.token_service.get_access_token(connection)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/text",
            "Accept-Encoding": "identity",
        }

        url = f"{self.api_base}/v3/company/{connection.realm_id}/query"
        params = {"minorversion": "75"}

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.post(url, headers=headers, params=params, content=query)
        except DecodingError as exc:
            logger.error(
                "%s response decode failure method=POST realm_id=%s url=%s error=%s",
                LOG_PREFIX,
                connection.realm_id,
                url,
                str(exc),
            )
            raise QuickBooksApiError(
                f"QuickBooks response decode failure on POST {url}: {exc}"
            ) from exc

        return self._handle_qbo_response(response, "POST", url, connection.realm_id)

    async def _qbo_get(
        self,
        connection,
        path: str,
        params: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        access_token = await self.token_service.get_access_token(connection)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Accept-Encoding": "identity",
        }
        url = f"{self.api_base}{path}"

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.get(url, headers=headers, params=params)
        except DecodingError as exc:
            logger.error(
                "%s response decode failure method=GET realm_id=%s url=%s error=%s",
                LOG_PREFIX,
                connection.realm_id,
                url,
                str(exc),
            )
            raise QuickBooksApiError(
                f"QuickBooks response decode failure on GET {url}: {exc}"
            ) from exc

        return self._handle_qbo_response(response, "GET", url, connection.realm_id)

    async def _qbo_post(
        self,
        connection,
        path: str,
        json_body: dict[str, Any],
        params: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        access_token = await self.token_service.get_access_token(connection)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Accept-Encoding": "identity",
        }
        url = f"{self.api_base}{path}"

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.post(url, headers=headers, params=params, json=json_body)
        except DecodingError as exc:
            logger.error(
                "%s response decode failure method=POST realm_id=%s url=%s error=%s",
                LOG_PREFIX,
                connection.realm_id,
                url,
                str(exc),
            )
            raise QuickBooksApiError(
                f"QuickBooks response decode failure on POST {url}: {exc}"
            ) from exc

        return self._handle_qbo_response(response, "POST", url, connection.realm_id)

    async def _qbo_post_without_body(
        self,
        connection,
        path: str,
        params: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        access_token = await self.token_service.get_access_token(connection)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Accept-Encoding": "identity",
        }
        url = f"{self.api_base}{path}"

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.post(url, headers=headers, params=params)
        except DecodingError as exc:
            logger.error(
                "%s response decode failure method=POST realm_id=%s url=%s error=%s",
                LOG_PREFIX,
                connection.realm_id,
                url,
                str(exc),
            )
            raise QuickBooksApiError(
                f"QuickBooks response decode failure on POST {url}: {exc}"
            ) from exc

        return self._handle_qbo_response(response, "POST", url, connection.realm_id)

    @staticmethod
    def _handle_qbo_response(
        response: httpx.Response,
        method: str,
        url: str,
        realm_id: str,
    ) -> dict[str, Any]:
        if response.status_code >= 400:
            logger.error(
                "%s response error method=%s realm_id=%s url=%s status=%s body=%s",
                LOG_PREFIX,
                method,
                realm_id,
                url,
                response.status_code,
                response.text[:1000],
            )
            raise QuickBooksApiError(
                f"QuickBooks API error {response.status_code}: {response.text}"
            )

        try:
            return response.json()
        except ValueError as exc:
            logger.error(
                "%s returned non-JSON response method=%s realm_id=%s url=%s status=%s body=%s",
                LOG_PREFIX,
                method,
                realm_id,
                url,
                response.status_code,
                response.text[:1000],
            )
            raise QuickBooksApiError(
                f"QuickBooks returned non-JSON response: {response.text}"
            ) from exc

    @staticmethod
    def _escape_qbo_query_literal(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    @staticmethod
    def _build_customer_payload(current_user: Any) -> QuickBooksCustomer:
        metadata = current_user.user_metadata or {}
        first_name = metadata.get("first_name") or ""
        last_name = metadata.get("last_name") or ""
        display_name = f"{first_name} {last_name}".strip() or current_user.email

        return QuickBooksCustomer(
            display_name=display_name,
            given_name=first_name or None,
            family_name=last_name or None,
            primary_email=getattr(current_user, "email", None),
            primary_phone=getattr(current_user, "phone", None),
            company_name=metadata.get("company_name"),
        )


@lru_cache()
def get_quickbooks_accounting_service() -> QuickBooksAccountingService:
    return QuickBooksAccountingService()
