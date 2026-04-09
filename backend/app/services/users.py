from functools import lru_cache
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.core.supabase_client import get_service_supabase_client
from app.lib.email import ConfirmationEmailError, send_confirmation_email
from app.repository.users import UserRepository
from app.schemas.users import (
    CreateUserRequest,
    UpdateUserRequest,
    get_current_step_for_role,
)


class EmailPayload(BaseModel):
    email: str
    first_name: str
    last_name: str
    role: str


class UserService:
    def __init__(self) -> None:
        self._get_supabase_client = get_service_supabase_client
        self.repo = UserRepository()

    # =========================
    # helpers
    # =========================

    def _build_metadata_update(
        self,
        existing_metadata: dict[str, Any],
        update_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Merge editable profile fields into the auth metadata payload."""
        new_metadata = dict(existing_metadata)

        if "first_name" in update_data:
            new_metadata["first_name"] = update_data["first_name"]

        if "last_name" in update_data:
            new_metadata["last_name"] = update_data["last_name"]

        if "company_name" in update_data:
            new_metadata["company_name"] = update_data["company_name"]

        return new_metadata

    # =========================
    # user flow
    # =========================

    def get_my_account(
        self,
        supabase: Client,
        user_id: str,
    ) -> dict[str, Any]:
        """Return the current user's profile row."""
        return self.repo.get_my_user_profile(supabase, user_id)

    def update_my_account(
        self,
        supabase: Client,
        auth_user: Any,
        payload: UpdateUserRequest,
    ) -> dict[str, Any]:
        """Update the logged-in user's auth metadata and profile-facing fields."""
        existing_profile = self.repo.get_my_user_profile(supabase, auth_user.id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return existing_profile

        existing_metadata = auth_user.user_metadata or {}
        new_metadata = self._build_metadata_update(existing_metadata, update_data)

        # Only send fields that live in Supabase Auth; profile reads still come from the app table.
        auth_update_payload: dict[str, Any] = {}

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
            auth_update_payload["user_metadata"] = new_metadata

        try:
            if auth_update_payload:
                # Use the service-role client for auth admin updates; the user-scoped client cannot do this.
                admin_supabase = self._get_supabase_client()
                self.repo.update_auth_user_by_id_admin(
                    admin_supabase,
                    auth_user.id,
                    auth_update_payload,
                )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        return self.repo.get_my_user_profile(supabase, auth_user.id)

    # =========================
    # admin flow
    # =========================

    def get_buyer_seller_users(self) -> list[dict[str, Any]]:
        """List admin-manageable buyer and seller users."""
        supabase = self._get_supabase_client()
        return self.repo.list_buyer_seller_users(supabase)

    def get_buyer_seller_user_by_id(self, user_id: str) -> dict[str, Any]:
        """Return one buyer or seller profile and reject non-managed roles."""
        supabase = self._get_supabase_client()
        user = self.repo.get_user_profile_by_id(supabase, user_id)

        # Admin management endpoints are intentionally limited to buyer/seller accounts.
        if user["role"] not in {"buyer", "seller"}:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer/Seller user not found",
            )

        return user

    def update_user_by_admin(
        self,
        user_id: str,
        payload: UpdateUserRequest,
    ) -> dict[str, Any]:
        """Apply admin-driven updates to another user's auth metadata."""
        supabase = self._get_supabase_client()

        existing_profile = self.repo.get_user_profile_by_id(supabase, user_id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return existing_profile

        auth_user = self.repo.get_auth_user_by_id_admin(supabase, user_id)
        existing_metadata = auth_user.user_metadata or {}
        new_metadata = self._build_metadata_update(existing_metadata, update_data)

        # Admin updates may touch both phone and user_metadata in Supabase Auth.
        auth_update_payload: dict[str, Any] = {}

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
            auth_update_payload["user_metadata"] = new_metadata

        try:
            if auth_update_payload:
                self.repo.update_auth_user_by_id_admin(
                    supabase,
                    user_id,
                    auth_update_payload,
                )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        return self.repo.get_user_profile_by_id(supabase, user_id)

    # =========================
    # create + email
    # =========================

    def create_user_by_admin(self, payload: CreateUserRequest) -> Any:
        """Create a new auth user and immediately send the confirmation email."""
        supabase = self._get_supabase_client()
        # The onboarding UI uses current_step to decide which step to show first.
        current_step = get_current_step_for_role(payload.role)

        try:
            response = supabase.auth.admin.create_user(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "email_confirm": False,
                    "phone": payload.phone_number,
                    "user_metadata": {
                        "first_name": payload.first_name,
                        "last_name": payload.last_name,
                        "role": payload.role,
                        "current_step": current_step,
                        "company_name": payload.company_name,
                    },
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create user: {str(e)}",
            ) from e

        self._send_confirmation_email(
            EmailPayload(
                email=payload.email,
                first_name=payload.first_name,
                last_name=payload.last_name,
                role=payload.role,
            )
        )

        return response

    def _send_confirmation_email(self, payload: EmailPayload) -> None:
        """Wrap shared confirmation email sending as an HTTP-friendly service call."""
        try:
            send_confirmation_email(
                email=payload.email,
                first_name=payload.first_name,
                last_name=payload.last_name,
                role=payload.role,
            )
        except ConfirmationEmailError as e:
            raise HTTPException(
                status_code=e.status_code,
                detail=e.detail,
            ) from e

    def resend_verification_email_by_admin(
            self,
            user_id: str,
    ) -> dict[str, str]:
        supabase = self._get_supabase_client()

        profile = self.get_buyer_seller_user_by_id(user_id)
        auth_user = self.repo.get_auth_user_by_id_admin(supabase, user_id)

        metadata = auth_user.user_metadata or {}
        email = getattr(auth_user, "email", None)

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Auth user email not found",
            )

        self._send_confirmation_email(
            EmailPayload(
                email=email,
                first_name=metadata.get("first_name") or "",
                last_name=metadata.get("last_name") or "",
                role=metadata.get("role") or profile.get("role") or "",
            )
        )

        return {
            "message": "Verification email resent successfully",
            "user_id": user_id,
            "email": email,
        }


@lru_cache
def get_users_service() -> UserService:
    """Return a cached user service instance for dependency injection."""
    return UserService()
