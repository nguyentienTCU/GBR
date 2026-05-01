from types import SimpleNamespace

import pytest
from botocore.exceptions import ClientError
from fastapi import HTTPException

from app.api.services.contracts import ContractService
from app.schemas.docusign import DocusignServiceError


class FakeContractRepository:
    def __init__(self, contract):
        self.contract = contract

    def get_contract_by_id(self, contract_id):
        assert contract_id == self.contract["id"]
        return self.contract

    def get_latest_completed_contract_by_user_id(self, user_id):
        if self.contract and self.contract["user_id"] == user_id:
            return self.contract
        return None


class FakeS3Client:
    def __init__(self, error=None):
        self.requested_urls = []
        self.error = error

    def retrieve_pdf_from_url(self, s3_url):
        self.requested_urls.append(s3_url)
        if self.error:
            raise self.error
        return b"signed-pdf"


class FakeDocusignService:
    def __init__(self, error=None):
        self.recovered_contracts = []
        self.error = error

    def recover_signed_contract_pdf(self, contract):
        self.recovered_contracts.append(contract)
        if self.error:
            raise self.error
        return b"recovered-signed-pdf"


def _auth_user(user_id="user-1", role="buyer"):
    return SimpleNamespace(id=user_id, app_metadata={"role": role})


def _service_for(contract, s3_client=None, docusign_service=None):
    service = object.__new__(ContractService)
    service.contract_repository = FakeContractRepository(contract)
    service.s3_client = s3_client or FakeS3Client()
    service.docusign_service = docusign_service or FakeDocusignService()
    return service


def _missing_s3_object_error():
    return ClientError(
        {
            "Error": {
                "Code": "NoSuchKey",
                "Message": "The specified key does not exist.",
            }
        },
        "GetObject",
    )


def test_get_signed_contract_pdf_returns_completed_contract_pdf():
    s3_client = FakeS3Client()
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-1",
            "status": "completed",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        },
        s3_client=s3_client,
    )

    result = service.get_signed_contract_pdf(
        contract_id="contract-1",
        auth_user=_auth_user(),
    )

    assert result == b"signed-pdf"
    assert s3_client.requested_urls == [
        "s3://contract-bucket/contracts/local/contract-1.pdf"
    ]


def test_get_signed_contract_pdf_rejects_pending_contract():
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-1",
            "status": "pending",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        service.get_signed_contract_pdf(
            contract_id="contract-1",
            auth_user=_auth_user(),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Contract is not completed yet."


def test_get_signed_contract_pdf_rejects_other_users_contract():
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-2",
            "status": "completed",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        service.get_signed_contract_pdf(
            contract_id="contract-1",
            auth_user=_auth_user(),
        )

    assert exc_info.value.status_code == 403


def test_get_signed_contract_pdf_allows_admin():
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-2",
            "status": "completed",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        }
    )

    result = service.get_signed_contract_pdf(
        contract_id="contract-1",
        auth_user=_auth_user(user_id="admin-1", role="admin"),
    )

    assert result == b"signed-pdf"


def test_get_signed_contract_pdf_recovers_missing_file_url_from_docusign():
    docusign_service = FakeDocusignService()
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-1",
            "status": "completed",
            "envelope_id": "envelope-1",
            "signed_file_url": None,
        },
        docusign_service=docusign_service,
    )

    result = service.get_signed_contract_pdf(
        contract_id="contract-1",
        auth_user=_auth_user(),
    )

    assert result == b"recovered-signed-pdf"
    assert docusign_service.recovered_contracts[0]["id"] == "contract-1"


def test_get_signed_contract_pdf_recovers_missing_s3_object_from_docusign():
    docusign_service = FakeDocusignService()
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-1",
            "status": "completed",
            "envelope_id": "envelope-1",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        },
        s3_client=FakeS3Client(error=_missing_s3_object_error()),
        docusign_service=docusign_service,
    )

    result = service.get_signed_contract_pdf(
        contract_id="contract-1",
        auth_user=_auth_user(),
    )

    assert result == b"recovered-signed-pdf"
    assert docusign_service.recovered_contracts[0]["id"] == "contract-1"


def test_get_signed_contract_pdf_returns_bad_gateway_when_docusign_recovery_fails():
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-1",
            "status": "completed",
            "envelope_id": None,
            "signed_file_url": None,
        },
        docusign_service=FakeDocusignService(
            error=DocusignServiceError("Contract does not have a DocuSign envelope ID.")
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        service.get_signed_contract_pdf(
            contract_id="contract-1",
            auth_user=_auth_user(),
        )

    assert exc_info.value.status_code == 502


def test_get_current_user_signed_contract_pdf_uses_latest_completed_contract():
    s3_client = FakeS3Client()
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-1",
            "status": "completed",
            "envelope_id": "envelope-1",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        },
        s3_client=s3_client,
    )

    result = service.get_current_user_signed_contract_pdf(auth_user=_auth_user())

    assert result == b"signed-pdf"
    assert s3_client.requested_urls == [
        "s3://contract-bucket/contracts/local/contract-1.pdf"
    ]


def test_get_current_user_signed_contract_pdf_rejects_missing_completed_contract():
    service = _service_for(None)

    with pytest.raises(HTTPException) as exc_info:
        service.get_current_user_signed_contract_pdf(auth_user=_auth_user())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Completed contract not found."


def test_get_user_signed_contract_pdf_uses_latest_completed_contract_for_admin():
    s3_client = FakeS3Client()
    service = _service_for(
        {
            "id": "contract-1",
            "user_id": "user-2",
            "status": "completed",
            "envelope_id": "envelope-1",
            "signed_file_url": "s3://contract-bucket/contracts/local/contract-1.pdf",
        },
        s3_client=s3_client,
    )

    result = service.get_user_signed_contract_pdf(
        user_id="user-2",
        auth_user=_auth_user(user_id="admin-1", role="admin"),
    )

    assert result == b"signed-pdf"
    assert s3_client.requested_urls == [
        "s3://contract-bucket/contracts/local/contract-1.pdf"
    ]


def test_get_user_signed_contract_pdf_rejects_missing_completed_contract():
    service = _service_for(None)

    with pytest.raises(HTTPException) as exc_info:
        service.get_user_signed_contract_pdf(
            user_id="user-2",
            auth_user=_auth_user(user_id="admin-1", role="admin"),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Completed contract not found."
