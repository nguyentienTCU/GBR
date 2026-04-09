from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.users import UpdateUserRequest


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

    def update_user_data(
        self,
        user_id: str,
        payload: UpdateUserRequest,
        supabase: Client
    ) -> dict[str, Any]:
        """Update both auth metadata and the mirrored application user profile."""
        existing_profile = self.get_user_profile_by_id(supabase, user_id)

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return existing_profile

        try:
            auth_user_response = supabase.auth.admin.get_user_by_id(user_id)
            auth_user = auth_user_response.user
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to fetch auth user: {str(exc)}",
            ) from exc

        if not auth_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Auth user not found",
            )

        existing_metadata = auth_user.user_metadata or {}
        new_metadata = dict(existing_metadata)

        if "first_name" in update_data:
            new_metadata["first_name"] = update_data["first_name"]

        if "last_name" in update_data:
            new_metadata["last_name"] = update_data["last_name"]

        if "company_name" in update_data:
            new_metadata["company_name"] = update_data["company_name"]

        auth_update_payload = {}

        if "email" in update_data:
            auth_update_payload["email"] = update_data["email"]
            auth_update_payload["email_confirm"] = True

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(
            field in update_data
            for field in ["first_name", "last_name", "company_name"]
        ):
            auth_update_payload["user_metadata"] = new_metadata

        try:
            if auth_update_payload:
                supabase.auth.admin.update_user_by_id(user_id, auth_update_payload)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        db_update_payload = {}
        for field in [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "company_name",
        ]:
            if field in update_data:
                db_update_payload[field] = update_data[field]

        try:
            if db_update_payload:
                result = (
                    supabase.table("user")
                    .update(db_update_payload)
                    .eq("id", user_id)
                    .execute()
                )

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to update user profile",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update user profile: {str(exc)}",
            ) from exc

        return self.get_user_profile_by_id(supabase, user_id)

    def update_user_step(
        self,
        supabase: Client,
        user_id: str,
        step: int,
    ) -> dict[str, Any]:
        """Update only the onboarding step stored in the application user table."""
        try:
            result = (
                supabase.table("user")
                .update({"current_step": step})
                .eq("id", user_id)
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update user step: {str(exc)}",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update user step",
            )

        return result.data[0]

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
