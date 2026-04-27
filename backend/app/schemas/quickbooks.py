from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class QboConnection:
    realm_id: str
    access_token: Optional[str]
    refresh_token: str
    access_token_expires_at: Optional[datetime]
    
class QuickBooksAuthError(Exception):
    pass


class QuickBooksApiError(Exception):
    pass


@dataclass
class CreateInvoicePayload:
    amount: float
    txn_date: str  # YYYY-MM-DD
    due_date: str  # YYYY-MM-DD
    customer_memo: str
    private_note: str
    doc_number: Optional[str] = None


@dataclass
class QuickBooksCustomer:
    display_name: str
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    company_name: Optional[str] = None
