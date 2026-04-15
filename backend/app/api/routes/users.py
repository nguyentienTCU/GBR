from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.api.deps.auth import (
    AuthUser,
    get_current_user,
    require_admin,
)
from app.schemas.users import (
    CreateUserRequest,
    SendVerificationEmailResponse,
    UpdateUserRequest,
    UserResponse,
    ForgotPasswordResponse,
    ForgotPasswordRequest
)
from app.api.services.users import UserService, get_users_service

router = APIRouter(prefix="/users", tags=["users"])

# =========================
# auth routes
# =========================

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: Annotated[ForgotPasswordRequest, Body(...)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> ForgotPasswordResponse:
    return user_service.request_password_reset(payload.email)


# =========================
# user routes
# =========================

@router.get("/me", response_model=UserResponse)
def get_me(
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> UserResponse:
    return user_service.get_my_account(auth_user.id)

@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: Annotated[UpdateUserRequest, Body(...)],
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> UserResponse:
    return user_service.update_my_account(auth_user, payload)


@router.post("/me/password-changed", response_model=UserResponse)
def mark_my_password_changed(
    auth_user: Annotated[AuthUser, Depends(get_current_user)],
    user_service: Annotated[UserService, Depends(get_users_service)],
) -> UserResponse:
    return user_service.mark_my_password_changed(auth_user.id)


# -------------- Admin-only user management routes --------------

@router.get("", response_model=list[UserResponse])
def get_users(
    _admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    return user_service.get_buyer_seller_users()


@router.post("")
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


@router.post("/{user_id}/send-reminder")
def send_reminder_email(
    user_id: str,
    _admin_user: Annotated[AuthUser, Depends(require_admin)],
    user_service: Annotated[UserService, Depends(get_users_service)],
):
    return user_service.send_next_step_reminder_by_admin(user_id)
