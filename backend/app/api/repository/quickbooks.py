import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from app.core.supabase_client import get_service_supabase_client
from app.schemas.quickbooks import QboConnection

logger = logging.getLogger(__name__)
LOG_PREFIX = "[QuickBooksRepository]"


class QuickBooksRepository:
    def __init__(self) -> None:
        self.supabase = get_service_supabase_client()

    def get_qbo_connection(self) -> QboConnection:
        result = (
            self.supabase.table("quickbooks_cred")
            .select("*")
            .eq("id", 1)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="QuickBooks connection not found",
            )

        row: dict[str, Any] = result.data
        logger.info(
            "%s loaded connection table=quickbooks_cred id=%s realm_id=%s has_access_token=%s has_refresh_token=%s",
            LOG_PREFIX,
            row.get("id"),
            row.get("realm_id"),
            bool(row.get("access_token")),
            bool(row.get("refresh_token")),
        )
        expires_at = row.get("access_token_expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return QboConnection(
            realm_id=row["realm_id"],
            access_token=row.get("access_token"),
            refresh_token=row["refresh_token"],
            access_token_expires_at=expires_at,
        )

    def save_qbo_connection(
        self,
        realm_id: str,
        refresh_token: str,
        access_token: str,
        expires_at: datetime,
    ) -> None:
        logger.info(
            "%s saving connection table=quickbooks_cred id=1 realm_id=%s access_token_expires_at=%s",
            LOG_PREFIX,
            realm_id,
            expires_at.isoformat(),
        )
        (
            self.supabase.table("quickbooks_cred")
            .update(
                {
                    "realm_id": realm_id,
                    "refresh_token": refresh_token,
                    "access_token": access_token,
                    "access_token_expires_at": expires_at.isoformat(),
                }
            )
            .eq("id", 1)
            .execute()
        )
