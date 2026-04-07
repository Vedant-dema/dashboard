"""VAT service wrappers for modular endpoints."""

from __future__ import annotations

import os

from app.schemas.vat import VatStatusInfoResponse


class VatService:
    def status_info(self) -> VatStatusInfoResponse:
        base = os.environ.get(
            "VIES_REST_API_BASE",
            "https://ec.europa.eu/taxation_customs/vies/rest-api",
        ).rstrip("/")
        return VatStatusInfoResponse(enabled=True, rest_api_base=base)

