from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.services.users import UserService
from app.schemas.users import UpdateUserRequest


class FakeUserRepository:
    def __init__(self):
        self.auth_updates = []
        self.profiles = {
            "user-1": {
                "id": "user-1",
                "email": "user-1@gmail.com",
                "first_name": "Old",
                "last_name": "Name",
                "company_name": "Old Co",
                "current_step": "1",
            }
        }

    def get_my_user_profile(self, user_id):
        return self.profiles[user_id]

    def get_user_profile_by_id(self, user_id):
        return self.profiles[user_id]

    def get_auth_user_by_id_admin(self, user_id):
        return SimpleNamespace(
            id=user_id,
            email="client@example.com",
            user_metadata={"first_name": "Old", "last_name": "Name", "keep": "value"},
            app_metadata={"role": "buyer", "password_changed": True},
        )

    def update_auth_user_by_id_admin(self, user_id, payload):
        self.auth_updates.append((user_id, payload))
        self.profiles[user_id] = {
            **self.profiles[user_id],
            "first_name": payload.get("user_metadata", {}).get("first_name", "Old"),
            "company_name": payload.get("user_metadata", {}).get("company_name", "Old Co"),
            "phone_number": payload.get("phone"),
        }


def make_service(repo):
    service = object.__new__(UserService)
    service.repo = repo
    return service


def test_update_my_account_merges_metadata_and_updates_auth_payload():
    repo = FakeUserRepository()
    service = make_service(repo)
    auth_user = SimpleNamespace(
        id="user-1",
        user_metadata={"first_name": "Old", "last_name": "Name", "keep": "value"},
    )

    result = service.update_my_account(
        auth_user,
        UpdateUserRequest(first_name="Ada", company_name="Ada LLC", phone_number="555-0100"),
    )

    assert repo.auth_updates == [
        (
            "user-1",
            {
                "phone": "555-0100",
                "user_metadata": {
                    "first_name": "Ada",
                    "last_name": "Name",
                    "keep": "value",
                    "company_name": "Ada LLC",
                },
            },
        )
    ]
    assert result["first_name"] == "Ada"
    assert result["company_name"] == "Ada LLC"


@pytest.mark.parametrize(
    ("stored_step", "expected"),
    [
        (2, 2),
        ("3", 3),
        ("not-a-number", 0),
        (True, 0),
        (None, 0),
    ],
)
def test_get_my_current_step_normalizes_profile_values(stored_step, expected):
    repo = FakeUserRepository()
    repo.profiles["user-1"]["current_step"] = stored_step
    service = make_service(repo)

    assert service.get_my_current_step("user-1") == {"current_step": expected}


def test_send_next_step_reminder_rejects_completed_onboarding():
    repo = FakeUserRepository()
    repo.profiles["user-1"]["role"] = "buyer"
    repo.profiles["user-1"]["current_step"] = 2
    service = make_service(repo)

    with pytest.raises(HTTPException) as exc_info:
        service.send_next_step_reminder_by_admin("user-1")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "User has already completed onboarding"
