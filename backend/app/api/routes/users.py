from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from supabase import Client

from app.api.deps.auth import (
    AuthUser,
    get_current_user,
    get_user_supabase,
    require_admin,
)
from app.schemas.users import (
    CreateUserRequest,
    SendVerificationEmailResponse,
    UpdateUserRequest,
    UserResponse,
    CurrentStepResponse
)
from app.api.services.users import UserService, get_users_service

router = APIRouter(prefix="/users", tags=["users"])


# =========================
# user routes
# =========================

@router.get("/me", response_model=UserResponse)
def get_me(
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_user_supabase)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> UserResponse:
    return user_service.get_my_account(supabase, auth_user.id)

@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: Annotated[UpdateUserRequest, Body(...)],
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_user_supabase)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> UserResponse:
    return user_service.update_my_account(supabase, auth_user, payload)


@router.get("/current-step", response_model=CurrentStepResponse)
def get_current_step(
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_user_supabase)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> CurrentStepResponse:
    """Return the current onboarding step for the authenticated user."""
    current_step = user_service.get_current_user_step(supabase, auth_user.id)
    return CurrentStepResponse(
        step=current_step,
    )


# -------------- Admin-only user management routes --------------

@router.get("/", response_model=list[UserResponse])
def get_users(
    _admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    return user_service.get_buyer_seller_users()


@router.post("/")
def create_user(
    payload: Annotated[CreateUserRequest, Body(...)],
    admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    response = user_service.create_user_by_admin(payload)

    if not response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user",
        )

    return {
        "message": "User created successfully",
        "user_id": response.user.id,
        "created_by": admin_user.email,
    }


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: str,
    _admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    return user_service.get_buyer_seller_user_by_id(user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: Annotated[UpdateUserRequest, Body(...)],
    _admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    return user_service.update_user_by_admin(user_id, payload)


@router.post("/{user_id}/send-verification", response_model=SendVerificationEmailResponse)
def send_verification_email(
    user_id: str,
    _admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    return user_service.resend_verification_email_by_admin(user_id)