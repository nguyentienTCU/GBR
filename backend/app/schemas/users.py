from typing import Literal

from pydantic import AliasChoices, BaseModel, EmailStr, Field

Role = Literal["admin", "mod", "buyer", "seller"]

class CreateUserRequest(BaseModel):
    """Payload used by admins to create a new user account."""
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    role: Role
    company_name: str


class UpdateUserRequest(BaseModel):
    """Payload used to update mutable user profile fields."""
    first_name: str | None = None
    last_name: str | None = None
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
    current_step: int | None = Field(
        validation_alias=AliasChoices("current_step", "current-step"),
        serialization_alias="current_step",
    )
    company_name: str | None = None
    email_verified: bool


class SendVerificationEmailResponse(BaseModel):
    message: str
    user_id: str
    email: EmailStr