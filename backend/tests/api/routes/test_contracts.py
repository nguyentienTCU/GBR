from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.deps.auth import get_current_user
from app.api.services.contracts import get_contract_service
from app.main import app


class FakeContractService:
    def __init__(self):
        self.requests = []

    def get_signed_contract_pdf(self, *, contract_id, auth_user):
        self.requests.append((contract_id, auth_user.id))
        return b"signed-pdf"

    def get_current_user_signed_contract_pdf(self, *, auth_user):
        self.requests.append(("me", auth_user.id))
        return b"signed-pdf"

    def get_user_signed_contract_pdf(self, *, user_id, auth_user):
        self.requests.append((user_id, auth_user.id))
        return b"signed-pdf"


def _auth_user(user_id="user-1", role="buyer"):
    return SimpleNamespace(id=user_id, app_metadata={"role": role})


def _client_for(user=None, contract_service=None):
    app.dependency_overrides[get_current_user] = lambda: user or _auth_user()
    app.dependency_overrides[get_contract_service] = (
        lambda: contract_service or FakeContractService()
    )
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_get_signed_contract_file_returns_completed_contract_pdf():
    contract_service = FakeContractService()
    client = _client_for(contract_service=contract_service)

    response = client.get("/contracts/contract-1/signed-file")

    assert response.status_code == 200
    assert response.content == b"signed-pdf"
    assert response.headers["content-type"] == "application/pdf"
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="contract-contract-1.pdf"'
    )
    assert contract_service.requests == [("contract-1", "user-1")]


def test_get_my_signed_contract_file_returns_completed_contract_pdf():
    contract_service = FakeContractService()
    client = _client_for(contract_service=contract_service)

    response = client.get("/contracts/me/signed-file")

    assert response.status_code == 200
    assert response.content == b"signed-pdf"
    assert response.headers["content-type"] == "application/pdf"
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="signed-contract.pdf"'
    )
    assert contract_service.requests == [("me", "user-1")]


def test_get_user_signed_contract_file_returns_completed_contract_pdf_for_admin():
    contract_service = FakeContractService()
    client = _client_for(
        user=_auth_user(user_id="admin-1", role="admin"),
        contract_service=contract_service,
    )

    response = client.get("/contracts/users/user-2/signed-file")

    assert response.status_code == 200
    assert response.content == b"signed-pdf"
    assert response.headers["content-type"] == "application/pdf"
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="signed-contract-user-2.pdf"'
    )
    assert contract_service.requests == [("user-2", "admin-1")]
