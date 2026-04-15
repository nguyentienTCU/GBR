from __future__ import annotations

import base64
import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Optional

import httpx

from app.api.repository.quickbooks import QuickBooksRepository
from app.core.config import get_settings
from app.schemas.quickbooks import QboConnection, QuickBooksAuthError

settings = get_settings()
logger = logging.getLogger(__name__)
LOG_PREFIX = "[QuickBooksTokenService]"


class QuickBooksTokenService:
    def __init__(
        self,
        repo: Optional[QuickBooksRepository] = None,
        http_timeout: float = 30.0,
    ) -> None:
        self.client_id = settings.qbo_client_id
        self.client_secret = settings.qbo_client_secret
        self.token_url = settings.qbo_token_url
        self.quickbooks_repo = repo or QuickBooksRepository()
        self.http_timeout = http_timeout

    async def get_access_token(self, connection: QboConnection) -> str:
        if self._is_access_token_valid(connection):
            logger.info(
                "%s using cached access token realm_id=%s expires_at=%s",
                LOG_PREFIX,
                connection.realm_id,
                connection.access_token_expires_at.isoformat() if connection.access_token_expires_at else None,
            )
            assert connection.access_token is not None
            return connection.access_token

        if not connection.refresh_token:
            raise QuickBooksAuthError("Missing QuickBooks refresh token.")

        logger.info("%s refreshing access token realm_id=%s", LOG_PREFIX, connection.realm_id)
        token_data = await self._refresh_tokens(connection.refresh_token)

        connection.access_token = token_data["access_token"]
        connection.refresh_token = token_data.get("refresh_token", connection.refresh_token)
        connection.access_token_expires_at = self._build_expiry(
            int(token_data["expires_in"])
        )
        logger.info(
            "%s refreshed access token realm_id=%s new_expires_at=%s refresh_token_rotated=%s",
            LOG_PREFIX,
            connection.realm_id,
            connection.access_token_expires_at.isoformat(),
            "refresh_token" in token_data,
        )

        self.quickbooks_repo.save_qbo_connection(
            realm_id=connection.realm_id,
            refresh_token=connection.refresh_token,
            access_token=connection.access_token,
            expires_at=connection.access_token_expires_at,
        )

        return connection.access_token

    def _is_access_token_valid(self, connection: QboConnection) -> bool:
        if not connection.access_token:
            return False

        if not connection.access_token_expires_at:
            return False

        now = datetime.now(timezone.utc)
        safety_buffer = timedelta(minutes=5)
        return connection.access_token_expires_at > (now + safety_buffer)

    async def _refresh_tokens(self, refresh_token: str) -> dict[str, Any]:
        basic = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode("utf-8")
        ).decode("utf-8")

        headers = {
            "Authorization": f"Basic {basic}",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        async with httpx.AsyncClient(timeout=self.http_timeout) as client:
            response = await client.post(self.token_url, headers=headers, data=data)

        if response.status_code != 200:
            raise QuickBooksAuthError(
                f"Failed to refresh QuickBooks tokens: {response.status_code} {response.text}"
            )

        return response.json()

    @staticmethod
    def _build_expiry(expires_in_seconds: int) -> datetime:
        now = datetime.now(timezone.utc)
        return now + timedelta(seconds=expires_in_seconds)

@lru_cache()
def get_quickbooks_token_service() -> QuickBooksTokenService:
    return QuickBooksTokenService()
