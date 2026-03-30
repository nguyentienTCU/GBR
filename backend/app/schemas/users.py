from typing import Literal

from pydantic import BaseModel, EmailStr

Role = Literal["admin", "mod", "buyer", "seller"]


def get_current_step_for_role(role: Role) -> int | None:
    """Return the onboarding step to assign when a new user is created."""
    if role in {"buyer", "seller"}:
        return 1
    return None


class CreateUserRequest(BaseModel):
    """Payload used by admins to create a new user account."""
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str | None = None
    password: str
    role: Role
    company_name: str | None = None


class UpdateUserRequest(BaseModel):
    """Payload used to update mutable user profile fields."""
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    company_name: str | None = None


class UserResponse(BaseModel):
    """User profile returned by read and update endpoints."""
    id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str | None = None
    role: Role
    current_step: int | None
    company_name: str | None = None
