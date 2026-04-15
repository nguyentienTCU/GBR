from datetime import datetime

from pydantic import BaseModel


class TransactionCreateRequest(BaseModel):
    user_id: str
    status: str
    amount: float
    time_started: datetime | None = None
    time_end: datetime | None = None
    qbo_customer_id: str | None = None
    qbo_invoice_id: str | None = None


class TransactionUpdateRequest(BaseModel):
    status: str | None = None
    amount: float | None = None
    time_started: datetime | None = None
    time_end: datetime | None = None
    qbo_customer_id: str | None = None
    qbo_invoice_id: str | None = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    status: str
    amount: float
    time_started: datetime | None = None
    time_end: datetime | None = None
    qbo_customer_id: str | None = None
    qbo_invoice_id: str | None = None
