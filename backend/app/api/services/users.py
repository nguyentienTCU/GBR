from functools import lru_cache
from typing import Any
import secrets
import string

from fastapi import HTTPException, status
from pydantic import BaseModel

from app.lib.email import (
    ConfirmationEmailError,
    EmailSendError,
    send_confirmation_email,
    send_next_step_reminder_email,
    send_password_reset_email,
    PasswordResetEmailError,
)
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

    def _build_user_metadata_update(
        self,
        existing_metadata: dict[str, Any],
        update_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Merge editable profile fields into user_metadata."""
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

    def _send_next_step_reminder_email(
        self,
        *,
        email: str,
        first_name: str,
        current_step: int | None,
    ) -> None:
        """Wrap reminder email sending as an HTTP-friendly service call."""
        try:
            send_next_step_reminder_email(
                to_email=email,
                first_name=first_name,
                current_step=current_step,
            )
        except EmailSendError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e

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
        """Update the logged-in user's profile-facing auth fields."""
        existing_profile = self.repo.get_my_user_profile(auth_user.id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return existing_profile

        existing_user_metadata = auth_user.user_metadata or {}
        new_user_metadata = self._build_user_metadata_update(
            existing_user_metadata,
            update_data,
        )

        auth_update_payload: dict[str, Any] = {}

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
            auth_update_payload["user_metadata"] = new_user_metadata

        try:
            if auth_update_payload:
                self.repo.update_auth_user_by_id_admin(auth_user.id, auth_update_payload)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        return self.repo.get_my_user_profile(auth_user.id)

    def request_password_reset(
            self,
            email: str,
    ) -> dict[str, str]:
        """
        Generate a Supabase recovery link and send it using our own SMTP email flow.
        """
        try:
            send_password_reset_email(email=email)
        except PasswordResetEmailError as e:
            detail_lower = e.detail.lower()

            if "user not found" in detail_lower or "email not found" in detail_lower:
                return {
                    "message": "If an account exists for that email, a password reset link has been sent."
                }

            raise HTTPException(
                status_code=e.status_code,
                detail=e.detail,
            ) from e

        return {
            "message": "If an account exists for that email, a password reset link has been sent."
        }

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
        """Apply admin-driven updates to another user's profile-facing auth fields."""
        existing_profile = self.repo.get_user_profile_by_id(user_id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return existing_profile

        auth_user = self.repo.get_auth_user_by_id_admin(user_id)
        existing_user_metadata = auth_user.user_metadata or {}
        new_user_metadata = self._build_user_metadata_update(
            existing_user_metadata,
            update_data,
        )

        auth_update_payload: dict[str, Any] = {}

        if "phone_number" in update_data:
            auth_update_payload["phone"] = update_data["phone_number"]

        if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
            auth_update_payload["user_metadata"] = new_user_metadata

        try:
            if auth_update_payload:
                self.repo.update_auth_user_by_id_admin(user_id, auth_update_payload)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {str(exc)}",
            ) from exc

        return self.repo.get_user_profile_by_id(user_id)

    def send_next_step_reminder_by_admin(
        self,
        user_id: str,
    ) -> dict[str, str]:
        """
        Send a reminder email to the user about their current onboarding step.
        """
        profile = self.get_buyer_seller_user_by_id(user_id)
        auth_user = self.repo.get_auth_user_by_id_admin(user_id)

        email = getattr(auth_user, "email", None)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Auth user email not found",
            )

        current_step = profile.get("current_step")
        if current_step == 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has already completed onboarding",
            )

        self._send_next_step_reminder_email(
            email=email,
            first_name=profile.get("first_name") or "",
            current_step=current_step,
        )

        return {
            "message": "Reminder email sent successfully",
            "user_id": user_id,
            "email": email,
        }

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
                        "company_name": payload.company_name,
                    },
                    "app_metadata": {
                        "role": payload.role,
                        "current_step": 0,
                        "password_changed": False,
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

        user_metadata = auth_user.user_metadata or {}
        app_metadata = auth_user.app_metadata or {}
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
                    "app_metadata": {
                        **app_metadata,
                        "password_changed": False,
                    },
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
                first_name=user_metadata.get("first_name") or "",
                last_name=user_metadata.get("last_name") or "",
                role=app_metadata.get("role") or profile.get("role") or "",
                temporary_password=temporary_password,
            )
        )

        return {
            "message": "Verification email resent successfully and password reset",
            "user_id": user_id,
            "email": email,
        }

    # =========================
    # others
    # =========================

    def mark_my_password_changed(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        """
        Mark the current user's password_changed flag as true.
        """
        self.repo.mark_password_changed(user_id)
        return self.repo.get_my_user_profile(user_id)


@lru_cache
def get_users_service() -> UserService:
    """Return a cached user service instance for dependency injection."""
    return UserService()