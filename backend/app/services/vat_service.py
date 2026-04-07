from __future__ import annotations

from typing import Any

from app.legacy import legacy_main
from app.schemas.vat import VatCheckRequest, VatCheckResponse


class VatService:
    async def member_state_status(self) -> dict[str, Any]:
        return await legacy_main.vies_member_state_status()

    async def check_test(self, payload: VatCheckRequest) -> VatCheckResponse:
        legacy_payload = legacy_main.VatCheckRequest(**payload.model_dump(exclude_none=True))
        legacy_result = await legacy_main.vies_check_test_service(legacy_payload)
        return VatCheckResponse.model_validate(legacy_result.model_dump())

    async def check_live(self, payload: VatCheckRequest) -> VatCheckResponse:
        legacy_payload = legacy_main.VatCheckRequest(**payload.model_dump(exclude_none=True))
        legacy_result = await legacy_main.check_vat(legacy_payload)
        return VatCheckResponse.model_validate(legacy_result.model_dump())


vat_service = VatService()

