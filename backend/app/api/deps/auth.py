from typing import Annotated, Any, TypeAlias

from fastapi import Depends, Header, HTTPException, status

from app.core.supabase_client import (
    get_supabase_client,
)
from app.lib.users import _get_user_profile_by_id


AuthUser: TypeAlias = Any
AppUser: TypeAlias = dict[str, Any]
AuthorizationHeader = Annotated[str | None, Header()]


def get_current_user(authorization: AuthorizationHeader = None) -> AuthUser:
    """Validate the bearer token and return the authenticated Supabase user."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    token = authorization.replace("Bearer ", "").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    supabase = get_supabase_client()
    response = supabase.auth.get_user(token)

    user = response.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return user


def get_current_app_user(
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
) -> AppUser:
    """Load the application user profile that matches the authenticated auth user."""
    return _get_user_profile_by_id(auth_user.id)


def require_admin(
    current_user: Annotated[AppUser, Depends(get_current_app_user)],
) -> AppUser:
    """Ensure the current application user has the admin role."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user
