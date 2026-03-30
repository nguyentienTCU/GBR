from typing import Any

from fastapi import HTTPException, status

from app.core.supabase_client import get_service_supabase_client
from app.schemas.users import CreateUserRequest, UpdateUserRequest, get_current_step_for_role
from app.lib.users import _get_user_profile_by_id, _update_user_data


def create_user_by_admin(payload: CreateUserRequest) -> Any:
    """Create a new auth user and seed its metadata for buyer or seller onboarding."""
    supabase = get_service_supabase_client()
    current_step = get_current_step_for_role(payload.role)

    response = supabase.auth.admin.create_user(
        {
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
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

    return response


def update_my_account(
    current_user_id: str,
    payload: UpdateUserRequest,
) -> dict[str, Any]:
    """Update the currently authenticated user's profile."""
    return _update_user_data(current_user_id, payload)


def update_user_by_admin(user_id: str, payload: UpdateUserRequest) -> dict[str, Any]:
    """Update another user's profile through an admin-only workflow."""
    return _update_user_data(user_id, payload)


def get_buyer_seller_users() -> list[dict[str, Any]]:
    """Return all application users whose role is buyer or seller."""
    supabase = get_service_supabase_client()

    result = (
        supabase.table("user")
        .select("*")
        .in_("role", ["buyer", "seller"])
        .execute()
    )

    return result.data or []


def get_buyer_seller_user_by_id(user_id: str) -> dict[str, Any]:
    """Return a single buyer or seller profile and reject other roles."""
    user = _get_user_profile_by_id(user_id)

    if user["role"] not in {"buyer", "seller"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer/Seller user not found",
        )

    return user
