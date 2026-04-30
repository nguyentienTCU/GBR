import asyncio
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest

from app.api.services.quickbooks_accounting import QuickBooksAccountingService
from app.api.services.quickbooks_token import QuickBooksTokenService
from app.schemas.quickbooks import CreateInvoicePayload, QboConnection, QuickBooksApiError


class FakeQuickBooksRepository:
    def __init__(self):
        self.saved = []
        # connection currently having outdated access_token
        self.connection = QboConnection(
            realm_id="realm-1",
            access_token="expired-token",
            refresh_token="refresh-token",
            access_token_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )

    def get_qbo_connection(self):
        return self.connection

    def save_qbo_connection(self, **kwargs):
        self.saved.append(kwargs)


def test_token_service_reuses_cached_access_token():
    repo = FakeQuickBooksRepository()
    service = QuickBooksTokenService(repo=repo)
    connection = QboConnection(
        realm_id="realm-1",
        access_token="cached-token",
        refresh_token="refresh-token",
        access_token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )

    assert asyncio.run(service.get_access_token(connection)) == "cached-token"
    assert repo.saved == []


def test_token_service_refreshes_expired_token_and_persists_connection():
    repo = FakeQuickBooksRepository()
    service = QuickBooksTokenService(repo=repo)

    async def refresh_tokens(refresh_token):
        assert refresh_token == "refresh-token"
        return {
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "expires_in": 3600,
        }

    service._refresh_tokens = refresh_tokens

    assert asyncio.run(service.get_access_token(repo.connection)) == "new-access-token"
    assert repo.connection.refresh_token == "new-refresh-token"
    assert repo.saved[0]["realm_id"] == "realm-1"
    assert repo.saved[0]["access_token"] == "new-access-token"
    assert repo.saved[0]["refresh_token"] == "new-refresh-token"


def test_handle_qbo_response_raises_api_error_for_http_errors():
    response = httpx.Response(400, text='{"Fault": "bad request"}')

    with pytest.raises(QuickBooksApiError) as exc_info:
        QuickBooksAccountingService._handle_qbo_response(
            response,
            method="POST",
            url="https://quickbooks.example.test",
            realm_id="realm-1",
        )

    assert "QuickBooks API error 400" in str(exc_info.value)


def test_escape_qbo_query_literal_escapes_backslashes_and_quotes():
    assert QuickBooksAccountingService._escape_qbo_query_literal("Bob's \\ Shop") == "Bob\\'s \\\\ Shop"


def test_create_invoice_reuses_active_existing_invoice_and_resends_email():
    service = object.__new__(QuickBooksAccountingService)
    connection = QboConnection("realm-1", "token", "refresh-token", None)
    sent_paths = []

    class QboRepo:
        def get_qbo_connection(self):
            return connection

    class UserRepo:
        def get_user_profile_by_id(self, user_id):
            return {
                "id": user_id,
                "first_name": "Ada",
                "last_name": "Lovelace",
                "email": "ada@example.com",
                "phone": "555-0100",
                "company_name": "Analytical Engines",
                "qbo_customer_id": "customer-1",
            }

    class TransactionRepo:
        def get_latest_transaction_by_user_id(self, user_id):
            return {"id": "transaction-1", "qbo_invoice_id": "invoice-1"}

        def update_latest_transaction_by_user_id(self, user_id, payload):
            raise AssertionError("existing active invoice should not create a new transaction update")

    async def get_invoice_by_id(invoice_id):
        assert invoice_id == "invoice-1"
        return {"Id": "invoice-1", "DueDate": date.today().isoformat(), "Balance": "100.00"}

    async def qbo_post_without_body(connection, path, params=None):
        sent_paths.append((path, params))
        return {}

    service.quickbooks_repo = QboRepo()
    service.user_repo = UserRepo()
    service.transaction_repo = TransactionRepo()
    service.get_invoice_by_id = get_invoice_by_id
    service._qbo_post_without_body = qbo_post_without_body

    result = asyncio.run(
        service.create_invoice(
            CreateInvoicePayload(
                amount=100,
                txn_date="2026-04-29",
                due_date="2026-05-29",
                customer_memo="Memo",
                private_note="Private",
            ),
            "user-1",
        )
    )

    assert result["customer_id"] == "customer-1"
    assert result["invoice_id"] == "invoice-1"
    assert result["email_sent"] is True
    assert sent_paths == [
        ("/v3/company/realm-1/invoice/invoice-1/send", {"minorversion": "75"})
    ]
