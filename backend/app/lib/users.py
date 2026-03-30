from typing import Any

from fastapi import HTTPException, status

from app.core.supabase_client import get_service_supabase_client
from app.schemas.users import UpdateUserRequest


def _get_user_profile_by_id(user_id: str) -> dict[str, Any]:
    """Fetch an application user profile by id from the database."""
    supabase = get_service_supabase_client()

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


def _update_user_data(user_id: str, payload: UpdateUserRequest) -> dict[str, Any]:
    """Update both auth metadata and the mirrored application user profile."""
    supabase = get_service_supabase_client()

    existing_profile = _get_user_profile_by_id(user_id)

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
        )

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

    if any(field in update_data for field in ["first_name", "last_name", "company_name"]):
        auth_update_payload["user_metadata"] = new_metadata

    try:
        if auth_update_payload:
            supabase.auth.admin.update_user_by_id(user_id, auth_update_payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update auth user: {str(exc)}",
        )

    db_update_payload = {}
    for field in ["first_name", "last_name", "email", "phone_number", "company_name"]:
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
        )

    return _get_user_profile_by_id(user_id)

