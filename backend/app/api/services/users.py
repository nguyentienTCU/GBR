from functools import lru_cache
from typing import Any
import secrets
import string

from fastapi import HTTPException, status
from pydantic import BaseModel

from app.lib.email import ConfirmationEmailError, send_confirmation_email
from app.api.repository.users import UserRepository
from app.schemas.users import (
    CreateUserRequest,
    UpdateUserRequest,
)


class EmailPayload(BaseModel):
    email: str
    first_name: str
    last_name: str
    role: str
    temporary_password: str


class UserService:
    def __init__(self) -> None:
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

    def _generate_temporary_password(self, length: int = 16) -> str:
        """
        Generate a secure temporary password.
        Uses Python built-in cryptographic randomness.
        """
        if length < 12:
            length = 12

        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits = string.digits
        symbols = "!@#$%^&*()-_=+"

        all_chars = lowercase + uppercase + digits + symbols

        password_chars = [
            secrets.choice(lowercase),
            secrets.choice(uppercase),
            secrets.choice(digits),
            secrets.choice(symbols),
        ]

        password_chars.extend(secrets.choice(all_chars) for _ in range(length - 4))
        secrets.SystemRandom().shuffle(password_chars)

        return "".join(password_chars)

    # =========================
    # user flow
    # =========================

    def get_my_account(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        """Return the current user's profile row."""
        return self.repo.get_my_user_profile(user_id)

    def update_my_account(
        self,
        auth_user: Any,
        payload: UpdateUserRequest,
    ) -> dict[str, Any]:
        """Update the logged-in user's auth metadata and profile-facing fields."""
        existing_profile = self.repo.get_my_user_profile(auth_user.id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return existing_profile

        existing_metadata = auth_user.user_metadata or {}
        new_metadata = self._build_metadata_update(existing_metadata, update_data)

        auth_update_payload: dict[str, Any] = {}

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
            auth_update_payload["user_metadata"] = new_metadata

        try:
            if auth_update_payload:
                self.repo.update_auth_user_by_id_admin(auth_user.id, auth_update_payload)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        return self.repo.get_my_user_profile(auth_user.id)


    # =========================
    # admin flow
    # =========================

    def get_buyer_seller_users(self) -> list[dict[str, Any]]:
        """List admin-manageable buyer and seller users."""
        return self.repo.list_buyer_seller_users()

    def get_buyer_seller_user_by_id(self, user_id: str) -> dict[str, Any]:
        """Return one buyer or seller profile and reject non-managed roles."""
        user = self.repo.get_user_profile_by_id(user_id)

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
        existing_profile = self.repo.get_user_profile_by_id(user_id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return existing_profile

        auth_user = self.repo.get_auth_user_by_id_admin(user_id)
        existing_metadata = auth_user.user_metadata or {}
        new_metadata = self._build_metadata_update(existing_metadata, update_data)

        auth_update_payload: dict[str, Any] = {}

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
            auth_update_payload["user_metadata"] = new_metadata

        try:
            if auth_update_payload:
                self.repo.update_auth_user_by_id_admin(user_id, auth_update_payload)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        return self.repo.get_user_profile_by_id(user_id)

    # =========================
    # create + email
    # =========================

    def create_user_by_admin(self, payload: CreateUserRequest) -> Any:
        """Create a new auth user using a generated password and send confirmation email."""
        temporary_password = self._generate_temporary_password()

        try:
            response = self.repo.create_auth_user_admin(
                {
                    "email": payload.email,
                    "password": temporary_password,
                    "email_confirm": False,
                    "phone": payload.phone_number,
                    "user_metadata": {
                        "first_name": payload.first_name,
                        "last_name": payload.last_name,
                        "role": payload.role,
                        "current_step": 0,
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
                temporary_password=temporary_password,
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
                temporary_password=payload.temporary_password,
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
        """
        Resend the verification email and also reset the password
        to a new generated temporary password.
        """
        profile = self.get_buyer_seller_user_by_id(user_id)
        auth_user = self.repo.get_auth_user_by_id_admin(user_id)

        metadata = auth_user.user_metadata or {}
        email = getattr(auth_user, "email", None)

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Auth user email not found",
            )

        temporary_password = self._generate_temporary_password()

        try:
            self.repo.update_auth_user_by_id_admin(
                user_id,
                {
                    "password": temporary_password,
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to reset password: {str(exc)}",
            ) from exc

        self._send_confirmation_email(
            EmailPayload(
                email=email,
                first_name=metadata.get("first_name") or "",
                last_name=metadata.get("last_name") or "",
                role=metadata.get("role") or profile.get("role") or "",
                temporary_password=temporary_password,
            )
        )

        return {
            "message": "Verification email resent successfully and password reset",
            "user_id": user_id,
            "email": email,
        }


@lru_cache
def get_users_service() -> UserService:
    """Return a cached user service instance for dependency injection."""
    return UserService()
