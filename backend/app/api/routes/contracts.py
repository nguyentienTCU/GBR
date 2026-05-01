from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.deps.auth import AuthUser, get_current_user, require_admin
from app.api.services.contracts import ContractService, get_contract_service


router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("/me/signed-file")
def get_my_signed_contract_file(
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    contract_service: Annotated[ContractService, Depends(get_contract_service)],
) -> Response:
    pdf_body = contract_service.get_current_user_signed_contract_pdf(
        auth_user=current_user,
    )
    return Response(
        content=pdf_body,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="signed-contract.pdf"',
        },
    )


@router.get("/users/{user_id}/signed-file")
def get_user_signed_contract_file(
    user_id: str,
    admin_user: Annotated[AuthUser, Depends(require_admin)],
    contract_service: Annotated[ContractService, Depends(get_contract_service)],
) -> Response:
    pdf_body = contract_service.get_user_signed_contract_pdf(
        user_id=user_id,
        auth_user=admin_user,
    )
    return Response(
        content=pdf_body,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="signed-contract-{user_id}.pdf"',
        },
    )


@router.get("/{contract_id}/signed-file")
def get_signed_contract_file(
    contract_id: str,
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    contract_service: Annotated[ContractService, Depends(get_contract_service)],
) -> Response:
    pdf_body = contract_service.get_signed_contract_pdf(
        contract_id=contract_id,
        auth_user=current_user,
    )
    return Response(
        content=pdf_body,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="contract-{contract_id}.pdf"',
        },
    )
