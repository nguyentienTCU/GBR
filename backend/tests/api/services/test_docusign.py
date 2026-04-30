from types import SimpleNamespace

import pytest

from app.api.services import docusign as docusign_module
from app.api.services.docusign import DocusignService
from app.schemas.docusign import DocusignServiceError


class FakeContractRepository:
    def __init__(self):
        self.contracts = {
            "user-1": {"id": "contract-1", "user_id": "user-1", "envelope_id": None}
        }
        self.updated = []
        self.completed = []

    def get_latest_contract_by_user_id(self, user_id):
        return self.contracts.get(user_id)

    def update_contract(self, contract_id, payload):
        self.updated.append((contract_id, payload))
        self.contracts["user-1"]["envelope_id"] = payload.envelope_id
        return self.contracts["user-1"]

    def get_contract_by_envelope_id(self, envelope_id):
        if envelope_id == "envelope-1":
            return {"id": "contract-1", "user_id": "user-1", "envelope_id": envelope_id}
        return None

    def mark_contract_completed(self, contract_id):
        self.completed.append(contract_id)
        return {"id": contract_id, "status": "completed"}


class FakeUserRepository:
    def __init__(self):
        self.updated_steps = []

    def get_user_profile_by_id(self, user_id):
        return {
            "id": user_id,
            "email": "client@example.com",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "role": "buyer",
            "email_verified": True,
        }

    def update_user_step(self, user_id, step):
        self.updated_steps.append((user_id, step))


def make_service(contract_repo=None, user_repo=None):
    service = object.__new__(DocusignService)
    service.account_id = "account-1"
    service.contract_repository = contract_repo or FakeContractRepository()
    service.user_repository = user_repo or FakeUserRepository()
    service.create_api_client = lambda: object()
    return service


def test_create_signing_session_creates_envelope_from_latest_contract(monkeypatch):
    created_envelopes = []
    recipient_views = []

    class FakeEnvelopesApi:
        def __init__(self, api_client):
            self.api_client = api_client

        def create_envelope(self, account_id, envelope_definition):
            created_envelopes.append((account_id, envelope_definition))
            return SimpleNamespace(envelope_id="envelope-1", status="sent")

        def create_recipient_view(self, account_id, envelope_id, recipient_view_request):
            recipient_views.append((account_id, envelope_id, recipient_view_request))
            return SimpleNamespace(url="https://sign.example.test/session")

    monkeypatch.setattr(docusign_module, "EnvelopesApi", FakeEnvelopesApi)
    service = make_service()

    result = service.create_signing_session("user-1", "https://app.example.test/return")

    assert result.contract_id == "contract-1"
    assert result.envelope_id == "envelope-1"
    assert result.envelope_status == "sent"
    assert result.signing_url == "https://sign.example.test/session"
    assert service.contract_repository.updated[0][0] == "contract-1"
    assert service.contract_repository.updated[0][1].envelope_id == "envelope-1"
    assert created_envelopes[0][0] == "account-1"
    assert created_envelopes[0][1].template_id == "buyer-template-id"
    assert recipient_views[0][2].client_user_id == "user-1"


def test_create_signing_session_rejects_unverified_user(monkeypatch):
    class UnverifiedUserRepository(FakeUserRepository):
        def get_user_profile_by_id(self, user_id):
            user = super().get_user_profile_by_id(user_id)
            user["email_verified"] = False
            return user

    service = make_service(user_repo=UnverifiedUserRepository())

    with pytest.raises(DocusignServiceError) as exc_info:
        service.create_signing_session("user-1", "https://app.example.test/return")

    assert "User email is not verified" in str(exc_info.value)


def test_process_connect_event_marks_contract_complete_and_advances_user():
    contract_repo = FakeContractRepository()
    user_repo = FakeUserRepository()
    service = make_service(contract_repo=contract_repo, user_repo=user_repo)

    service.process_connect_event(
        {
            "event": "envelope-completed",
            "data": {"envelopeId": "envelope-1", "accountId": "account-1"},
        }
    )

    assert contract_repo.completed == ["contract-1"]
    assert user_repo.updated_steps == [("user-1", 1)]


def test_process_connect_event_ignores_non_completed_events():
    contract_repo = FakeContractRepository()
    user_repo = FakeUserRepository()
    service = make_service(contract_repo=contract_repo, user_repo=user_repo)

    service.process_connect_event(
        {
            "event": "envelope-sent",
            "data": {"envelopeId": "envelope-1", "accountId": "account-1"},
        }
    )

    assert contract_repo.completed == []
    assert user_repo.updated_steps == []
