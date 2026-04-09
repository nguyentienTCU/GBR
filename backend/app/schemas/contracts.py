from datetime import datetime
from typing import Literal

from pydantic import BaseModel


ContractStatus = Literal["pending", "completed"]


class ContractCreateRequest(BaseModel):
    user_id: str
    envelope_id: str | None = None
    status: ContractStatus = "pending"
    time_started: datetime | None = None
    time_end: datetime | None = None


class ContractUpdateRequest(BaseModel):
    envelope_id: str | None = None
    status: ContractStatus | None = None
    time_started: datetime | None = None
    time_end: datetime | None = None


class ContractResponse(BaseModel):
    id: str
    user_id: str
    envelope_id: str | None = None
    status: ContractStatus
    time_started: datetime | None = None
    time_end: datetime | None = None
