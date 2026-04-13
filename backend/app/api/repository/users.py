from typing import Any

from fastapi import HTTPException, status

from app.core.supabase_client import get_service_supabase_client


class UserRepository:
    """
    Repository layer for user-related Supabase operations.

    Responsibilities:
    - Execute Supabase database queries
    - Execute admin auth operations (service role)
    """

    def __init__(self) -> None:
        self.supabase = get_service_supabase_client()

    # =========================
    # profile queries
    # =========================

    def get_my_user_profile(self, user_id: str) -> dict[str, Any]:
        """
        Fetch the current user's profile row.
        """

        result = (
            self.supabase.table("user")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found",
            )

        return result.data

    def get_user_profile_by_id(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        """
        Admin: fetch any user profile row by id.
        """
        result = (
            self.supabase.table("user")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found",
            )

        return result.data

    def list_buyer_seller_users(
        self,
    ) -> list[dict[str, Any]]:
        """
        Admin: list all buyer and seller users.
        """
        result = (
            self.supabase.table("user")
            .select("*")
            .in_("role", ["buyer", "seller"])
            .execute()
        )

        return result.data or []

    def update_user_step(
        self,
        user_id: str,
        step: int,
    ) -> dict[str, Any]:
        """Update onboarding step via Supabase Auth metadata (safe merge)."""

        try:
            # 1. get current auth user
            user_response = self.supabase.auth.admin.get_user_by_id(user_id)
            user = user_response.user

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found",
                )

            existing_metadata = user.user_metadata or {}

            # 2. merge metadata
            updated_metadata = {
                **existing_metadata,
                "current_step": step,
            }

            # 3. update
            result = self.supabase.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": updated_metadata},
            )

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update user step: {str(exc)}",
            ) from exc

        if not result.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update user step",
            )

        return result.user

    # =========================
    # auth (admin only)
    # =========================

    def get_auth_user_by_id_admin(
        self,
        user_id: str,
    ) -> Any:
        """
        Admin: fetch any auth user by id.
        """
        try:
            response = self.supabase.auth.admin.get_user_by_id(user_id)
            user = response.user
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to fetch auth user: {str(exc)}",
            ) from exc

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Auth user not found",
            )

        return user

    def update_auth_user_by_id_admin(
        self,
        user_id: str,
        auth_update_payload: dict[str, Any],
    ) -> None:
        """
        Admin: update another user's auth account.
        """
        self.supabase.auth.admin.update_user_by_id(user_id, auth_update_payload)

    def create_auth_user_admin(self, payload: dict[str, Any]) -> Any:
        """Admin: create an auth user with the provided payload."""
        return self.supabase.auth.admin.create_user(payload)
