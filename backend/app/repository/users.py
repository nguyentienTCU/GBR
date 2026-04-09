from typing import Any

from fastapi import HTTPException, status
from supabase import Client


class UserRepository:
    """
    Repository layer for user-related Supabase operations.

    Responsibilities:
    - Execute Supabase database queries
    - Execute admin auth operations (service role)
    """

    # =========================
    # profile queries
    # =========================

    def get_my_user_profile(self, supabase: Client, user_id: str) -> dict[str, Any]:
        """
        Fetch the current user's profile row using RLS.
        """
        result = (
            supabase.table("user")
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
        supabase: Client,
        user_id: str,
    ) -> dict[str, Any]:
        """
        Admin: fetch any user profile row by id.
        """
        result = (
            supabase.table("user")
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
        supabase: Client,
    ) -> list[dict[str, Any]]:
        """
        Admin: list all buyer and seller users.
        """
        result = (
            supabase.table("user")
            .select("*")
            .in_("role", ["buyer", "seller"])
            .execute()
        )

        return result.data or []

    # =========================
    # auth (admin only)
    # =========================

    def get_auth_user_by_id_admin(
        self,
        supabase: Client,
        user_id: str,
    ) -> Any:
        """
        Admin: fetch any auth user by id.
        """
        try:
            response = supabase.auth.admin.get_user_by_id(user_id)
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
        supabase: Client,
        user_id: str,
        auth_update_payload: dict[str, Any],
    ) -> None:
        """
        Admin: update another user's auth account.
        """
        supabase.auth.admin.update_user_by_id(user_id, auth_update_payload)