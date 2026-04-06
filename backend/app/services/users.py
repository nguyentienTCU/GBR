from typing import Any
from functools import lru_cache

from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.supabase_client import get_service_supabase_client
from app.schemas.users import CreateUserRequest, UpdateUserRequest, get_current_step_for_role
from app.lib.users import _get_user_profile_by_id, _update_user_data
from app.lib.email import send_account_created_email, EmailSendError

class EmailPayload(BaseModel):
    email: str
    first_name: str
    last_name: str
    role: str

class UserService:
    """Service layer for buyer and seller user management flows."""

    def __init__(self) -> None:
        self._get_supabase_client = get_service_supabase_client

    def create_user_by_admin(self, payload: CreateUserRequest) -> Any:
        """
        Create a new auth user with unconfirmed email and preserve metadata.
        Then send a confirmation email through Supabase.
        """
        supabase = self._get_supabase_client()
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

        self.send_confirmation_email(
            EmailPayload(
                email=payload.email,
                first_name=payload.first_name,
                last_name=payload.last_name,
                role=payload.role,
            )
        )

        return response


    def send_confirmation_email(self, payload: EmailPayload) -> None:
        """
        Generate a Supabase invite link for an existing unconfirmed user
        and send it through custom SMTP.
        """
        supabase = self._get_supabase_client()

        try:
            response = supabase.auth.admin.generate_link(
                {
                    "type": "invite",
                    "email": payload.email,
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to generate confirmation link: {str(e)}",
            ) from e

        try:
            action_link = response.properties.action_link
        except AttributeError:
            try:
                action_link = response["properties"]["action_link"]
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Confirmation link was created but could not be read from the Supabase response.",
                ) from e

        try:
            send_account_created_email(
                to_email=payload.email,
                first_name=payload.first_name,
                last_name=payload.last_name,
                role=payload.role,
                confirmation_link=action_link,
            )
        except EmailSendError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send confirmation email: {str(e)}",
            ) from e


    def update_my_account(
        self,
        current_user_id: str,
        payload: UpdateUserRequest,
    ) -> dict[str, Any]:
        """Update the currently authenticated user's profile."""
        return _update_user_data(current_user_id, payload)

    def update_user_by_admin(
        self,
        user_id: str,
        payload: UpdateUserRequest,
    ) -> dict[str, Any]:
        """Update another user's profile through an admin-only workflow."""
        return _update_user_data(user_id, payload)


    def get_buyer_seller_users(self) -> list[dict[str, Any]]:
        """Return all application users whose role is buyer or seller."""
        supabase = self._get_supabase_client()

        result = (
            supabase.table("user")
            .select("*")
            .in_("role", ["buyer", "seller"])
            .execute()
        )

        return result.data or []


    def get_buyer_seller_user_by_id(self, user_id: str) -> dict[str, Any]:
        """Return a single buyer or seller profile and reject other roles."""
        user = _get_user_profile_by_id(user_id)

        if user["role"] not in {"buyer", "seller"}:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer/Seller user not found",
            )

        return user


@lru_cache
def get_users_service() -> UserService:
    return UserService()