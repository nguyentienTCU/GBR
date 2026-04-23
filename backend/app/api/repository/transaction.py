from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase_client import get_service_supabase_client
from app.schemas.transactions import TransactionCreateRequest, TransactionUpdateRequest


class TransactionRepository:
    """Repository for transaction-table reads and writes."""

    def __init__(self) -> None:
        self.supabase = get_service_supabase_client()

    def get_transaction_by_id(
        self,
        transaction_id: str,
    ) -> dict[str, Any]:
        result = (
            self.supabase.table("transaction")
            .select("*")
            .eq("id", transaction_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )

        return result.data

    def get_transactions_by_user_id(
        self,
        user_id: str,
    ) -> list[dict[str, Any]]:
        result = (
            self.supabase.table("transaction")
            .select("*")
            .eq("user_id", user_id)
            .order("time_started", desc=True)
            .execute()
        )

        return result.data or []

    def get_latest_transaction_by_user_id(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        transactions = self.get_transactions_by_user_id(user_id)

        if not transactions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )

        return transactions[0]

    def get_transaction_by_qbo_invoice_id(
        self,
        qbo_invoice_id: str,
    ) -> dict[str, Any]:
        result = (
            self.supabase.table("transaction")
            .select("*")
            .eq("qbo_invoice_id", qbo_invoice_id)
            .order("time_started", desc=True)
            .limit(1)
            .execute()
        )

        transactions = result.data or []
        if not transactions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )

        return transactions[0]

    def create_transaction(
        self,
        payload: TransactionCreateRequest,
    ) -> dict[str, Any]:
        insert_payload = payload.model_dump(mode="json")

        try:
            result = self.supabase.table("transaction").insert(insert_payload).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create transaction: {str(exc)}",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create transaction",
            )

        return result.data[0]

    def update_transaction(
        self,
        transaction_id: str,
        payload: TransactionUpdateRequest,
    ) -> dict[str, Any]:
        existing_transaction = self.get_transaction_by_id(transaction_id)

        update_data = payload.model_dump(exclude_unset=True, mode="json")
        if not update_data:
            return existing_transaction

        try:
            result = (
                self.supabase.table("transaction")
                .update(update_data)
                .eq("id", transaction_id)
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update transaction: {str(exc)}",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update transaction",
            )

        return self.get_transaction_by_id(transaction_id)

    def update_latest_transaction_by_user_id(
        self,
        user_id: str,
        payload: TransactionUpdateRequest,
    ) -> dict[str, Any]:
        latest_transaction = self.get_latest_transaction_by_user_id(user_id)
        transaction_id = latest_transaction["id"]
        return self.update_transaction(transaction_id, payload)

    def update_transaction_by_qbo_invoice_id(
        self,
        qbo_invoice_id: str,
        payload: TransactionUpdateRequest,
    ) -> dict[str, Any]:
        transaction = self.get_transaction_by_qbo_invoice_id(qbo_invoice_id)
        return self.update_transaction(transaction["id"], payload)


@lru_cache
def get_transaction_repository() -> TransactionRepository:
    return TransactionRepository()
