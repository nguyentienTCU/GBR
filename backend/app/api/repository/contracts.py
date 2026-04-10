from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase_client import get_service_supabase_client
from app.schemas.contracts import ContractCreateRequest, ContractUpdateRequest


class ContractRepository:
    """Repository for contract-table reads and writes."""

    def __init__(self) -> None:
        self.supabase = get_service_supabase_client()

    def get_contract_by_id(
        self,
        contract_id: str,
    ) -> dict[str, Any]:
        """Fetch a contract row by its primary key."""
        result = (
            self.supabase.table("contract")
            .select("*")
            .eq("id", contract_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found",
            )

        return result.data

    def get_contract_by_envelope_id(
        self,
        envelope_id: str,
    ) -> dict[str, Any]:
        """Fetch a contract row by docusign envelope ID."""
        result = (
            self.supabase.table("contract")
            .select("*")
            .eq("envelope_id", envelope_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found",
            )

        return result.data

    def get_contracts_by_user_id(
        self,
        user_id: str,
    ) -> list[dict[str, Any]]:
        """Return all contracts associated with a user."""
        result = (
            self.supabase.table("contract")
            .select("*")
            .eq("user_id", user_id)
            .order("time_started", desc=True)
            .execute()
        )

        return result.data or []

    def get_latest_contract_by_user_id(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        """Return the most recent contract row for a user, creating one if needed."""
        contracts = self.get_contracts_by_user_id(user_id)

        if contracts:
            return contracts[0]

        return self.create_contract(
            ContractCreateRequest(
                user_id=user_id,
                envelope_id=None,
                time_started=datetime.now(timezone.utc),
            )
        )

    def create_contract(
        self,
        payload: ContractCreateRequest,
    ) -> dict[str, Any]:
        """Insert a contract row and return the created record."""
        insert_payload = payload.model_dump(mode="json")

        try:
            result = self.supabase.table("contract").insert(insert_payload).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create contract: {str(exc)}",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create contract",
            )

        return result.data[0]

    def update_contract(
        self,
        contract_id: str,
        payload: ContractUpdateRequest,
    ) -> dict[str, Any]:
        """Update mutable contract fields and return the fresh record."""
        existing_contract = self.get_contract_by_id(contract_id)

        update_data = payload.model_dump(exclude_unset=True, mode="json")
        if not update_data:
            return existing_contract

        try:
            result = (
                self.supabase.table("contract")
                .update(update_data)
                .eq("id", contract_id)
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update contract: {str(exc)}",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update contract",
            )

        return self.get_contract_by_id(contract_id)

    def mark_contract_completed(
        self,
        contract_id: str,
    ) -> dict[str, Any]:
        """Mark a contract as completed and stamp its completion time in UTC."""
        return self.update_contract(
            contract_id,
            ContractUpdateRequest(
                status="completed",
                time_end=datetime.now(timezone.utc),
            ),
        )


@lru_cache
def get_contract_repository() -> ContractRepository:
    return ContractRepository()
