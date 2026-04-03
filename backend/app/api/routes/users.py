from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.api.deps.auth import AppUser, get_current_app_user, require_admin
from app.schemas.users import CreateUserRequest, UpdateUserRequest, UserResponse
from app.services.users import (
    get_buyer_seller_users,
    get_buyer_seller_user_by_id,
    create_user_by_admin,
    update_my_account,
    update_user_by_admin,
)

router = APIRouter(prefix="/users", tags=["admin"])


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[AppUser, Depends(get_current_app_user)],
) -> UserResponse:
    """Return the currently authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: Annotated[UpdateUserRequest, Body(...)],
    current_user: Annotated[AppUser, Depends(get_current_app_user)],
) -> UserResponse:
    """Update the current user's own profile."""
    return update_my_account(current_user["id"], payload)


@router.get("/", response_model=list[UserResponse])
def get_users(
    admin_user: Annotated[AppUser, Depends(require_admin)],
) -> list[UserResponse]:
    """Return all buyer and seller users for admin management views."""
    return get_buyer_seller_users()


# -------------- Admin-only user management routes --------------

@router.post("/")
def create_user(
    payload: Annotated[CreateUserRequest, Body(...)],
    admin_user: Annotated[AppUser, Depends(require_admin)],
):
    """Create a new user account through the admin workflow."""
    response = create_user_by_admin(payload)

    if not response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user",
        )

    return {
        "message": "User created successfully",
        "user_id": response.user.id,
        "created_by": admin_user["email"],
    }


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: str,
    admin_user: Annotated[AppUser, Depends(require_admin)],
) -> UserResponse:
    """Return a buyer or seller profile by its application user id."""
    return get_buyer_seller_user_by_id(user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: Annotated[UpdateUserRequest, Body(...)],
    admin_user: Annotated[AppUser, Depends(require_admin)],
) -> UserResponse:
    """Update a buyer or seller profile through the admin workflow."""
    return update_user_by_admin(user_id, payload)
