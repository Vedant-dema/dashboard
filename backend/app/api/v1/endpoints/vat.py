"""Modular VAT info endpoint.

The existing VAT check/status routes from the legacy backend remain available.
"""

from fastapi import APIRouter

from app.schemas.vat import VatStatusInfoResponse
from app.services.vat_service import VatService

router = APIRouter(tags=["vat"])
vat_service = VatService()


@router.get("/api/v1/vat/info", response_model=VatStatusInfoResponse)
def vat_info() -> VatStatusInfoResponse:
    return vat_service.status_info()

