from typing import Annotated, Any, TypeAlias

from fastapi import Depends, Header, HTTPException, status
from supabase import Client

from app.core.supabase_client import (
    get_supabase_client,
    get_service_supabase_client,
    get_user_supabase_client,
)

AuthUser: TypeAlias = Any
AuthorizationHeader = Annotated[str | None, Header()]


# =========================
#   token extraction
# =========================
def get_access_token(authorization: AuthorizationHeader = None) -> str:
    """Extract Bearer token from Authorization header."""
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

    token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    return token


# =========================
#   get auth user
# =========================
def get_current_user(
    token: Annotated[str, Depends(get_access_token)],
) -> AuthUser:
    """Validate token with Supabase and return auth user."""
    supabase = get_supabase_client()

    try:
        response = supabase.auth.get_user(token)
        user = response.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return user


# =========================
#   admin check
# =========================
def require_admin(
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
) -> AuthUser:
    """Ensure user is admin using metadata (no DB call)."""
    role = (auth_user.user_metadata or {}).get("role")

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return auth_user


# =========================
#   get supabase clients
# =========================
def get_user_supabase(
    token: Annotated[str, Depends(get_access_token)],
) -> Client:
    """Supabase client acting as the logged-in user"""
    return get_user_supabase_client(token)