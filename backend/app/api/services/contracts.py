from functools import lru_cache
from typing import Any

from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.api.repository.contracts import ContractRepository
from app.api.services.docusign import DocusignService
from app.schemas.docusign import DocusignServiceError
from app.core.s3_client import S3Client


class ContractService:
    def __init__(self) -> None:
        self.contract_repository = ContractRepository()
        self.s3_client = S3Client()
        self.docusign_service = DocusignService()

    def get_signed_contract_pdf(
        self,
        *,
        contract_id: str,
        auth_user: Any,
    ) -> bytes:
        contract = self.contract_repository.get_contract_by_id(contract_id)
        return self._get_contract_pdf_for_auth_user(contract, auth_user)

    def get_current_user_signed_contract_pdf(
        self,
        *,
        auth_user: Any,
    ) -> bytes:
        contract = self.contract_repository.get_latest_completed_contract_by_user_id(
            auth_user.id
        )
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Completed contract not found.",
            )

        return self._get_contract_pdf_for_auth_user(contract, auth_user)

    def get_user_signed_contract_pdf(
        self,
        *,
        user_id: str,
        auth_user: Any,
    ) -> bytes:
        contract = self.contract_repository.get_latest_completed_contract_by_user_id(
            user_id
        )
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Completed contract not found.",
            )

        return self._get_contract_pdf_for_auth_user(contract, auth_user)

    def _get_contract_pdf_for_auth_user(
        self,
        contract: dict[str, Any],
        auth_user: Any,
    ) -> bytes:
        user_role = (auth_user.app_metadata or {}).get("role")
        if contract.get("user_id") != auth_user.id and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this contract.",
            )

        if contract.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Contract is not completed yet.",
            )

        signed_file_url = contract.get("signed_file_url")
        if not signed_file_url:
            return self._recover_signed_contract_from_docusign(contract)

        try:
            return self.s3_client.retrieve_pdf_from_url(signed_file_url)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except ClientError as exc:
            if self._is_missing_s3_object_error(exc):
                return self._recover_signed_contract_from_docusign(contract)
            raise

    def _recover_signed_contract_from_docusign(self, contract: dict[str, Any]) -> bytes:
        try:
            return self.docusign_service.recover_signed_contract_pdf(contract)
        except DocusignServiceError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

    @staticmethod
    def _is_missing_s3_object_error(exc: ClientError) -> bool:
        error_code = exc.response.get("Error", {}).get("Code")
        return error_code in {"NoSuchKey", "404", "NotFound"}


@lru_cache
def get_contract_service() -> ContractService:
    return ContractService()
