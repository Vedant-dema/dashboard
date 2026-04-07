from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.schemas.vat import VatCheckRequest, VatCheckResponse
from app.services.vat_service import vat_service

router = APIRouter(prefix="/api/v1/vat", tags=["vat"])


@router.get("/status")
async def vat_status() -> dict[str, Any]:
    return await vat_service.member_state_status()


@router.post("/check-test", response_model=VatCheckResponse)
async def vat_check_test(body: VatCheckRequest) -> VatCheckResponse:
    return await vat_service.check_test(body)


@router.post("/check", response_model=VatCheckResponse)
async def vat_check(body: VatCheckRequest) -> VatCheckResponse:
    return await vat_service.check_live(body)

