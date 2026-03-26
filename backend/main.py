"""
DEMA Dashboard — VAT (VIES) proxy API.

Run locally:  uvicorn main:app --reload --host 127.0.0.1 --port 8000

Environment:
  VIES_CHECK_URL           Full URL for live check-vat-number (overrides REST base path).
  VIES_REST_API_BASE       REST prefix (default: https://ec.europa.eu/taxation_customs/vies/rest-api).
  VIES_STATUS_URL          Full URL for GET check-status (default: {base}/check-status).
  VIES_TEST_SERVICE_URL    Full URL for POST check-vat-test-service (default: {base}/check-vat-test-service).
  VIES_REQUESTER_CC        Optional default requester member state code (e.g. DE/EU).
  VIES_REQUESTER_VAT       Optional default requester VAT number (used with VIES_REQUESTER_CC).
  CORS_ORIGINS             Comma-separated origins (default: http://localhost:5173,http://127.0.0.1:5173).
  VIES_MAX_RETRIES         Retries for transient / concurrent-cap errors (default: 8).
  VIES_RETRY_BASE_SEC      Initial backoff before first retry, seconds (default: 0.8).
  VIES_RETRY_MAX_WAIT_SEC  Cap on single backoff sleep (default: 28).
  VIES_PRINT_RAW           If not 0/false/no/off: log full VIES JSON to stderr (default: on for debugging).
                           Set to 0 in production to avoid logging VAT numbers.
  VIES_OMIT_RAW_IN_JSON    If 1/true: do not include vies_raw in the HTTP JSON response (default: off).
  VIES_MAX_TOTAL_SEC       Hard wall-clock budget for one check (retries + sleeps, default: 24 s).
                           Must be below the cloud reverse-proxy timeout (typically 30 s on Render/Railway/
                           Heroku). Increase only if your platform allows long-running requests.

Note: MS_MAX_CONCURRENT_REQ is enforced by the Commission/member states. We cannot remove it;
this app serializes outbound VIES calls and retries with backoff so many checks still succeed.

Official background (why name/address are often missing): EU Your Europe — check VAT (VIES);
VIES FAQ Q17 / Q22 — https://ec.europa.eu/taxation_customs/vies/faq.html

REST VoW endpoints (see Technical information): live check, test service, status — proxied as
GET /api/v1/vat/status, POST /api/v1/vat/check-test, POST /api/v1/vat/check.
"""

from __future__ import annotations

import asyncio
import json
import os
import random
import re
import sys
from contextlib import asynccontextmanager
from typing import Any
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape as _xml_escape

import unicodedata

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

try:
    from deep_translator import GoogleTranslator as _GoogleTranslator
    _TRANSLATOR_AVAILABLE = True
except ImportError:
    _TRANSLATOR_AVAILABLE = False

def _has_non_latin_alpha(text: str) -> bool:
    """Return True when text contains alphabetic chars outside Basic/Extended Latin."""
    for ch in text:
        if ch.isalpha() and ord(ch) > 0x024F:
            return True
    return False


def _to_de_title(text: str | None) -> str | None:
    """Translate non-Latin text to German and reformat to Title Case.

    Steps:
    1. Replace VIES double-pipe company-name separator with ' / '.
    2. If non-Latin characters are present, try Google Translate → German.
    3. Apply Python title-case (first letter of each word capitalised).
    Falls back to title-case of the original if translation is unavailable.
    """
    if not text:
        return None
    text = text.replace("||", " / ").strip()
    if _has_non_latin_alpha(text) and _TRANSLATOR_AVAILABLE:
        try:
            translated = _GoogleTranslator(source="auto", target="de").translate(text)
            if translated:
                text = translated
        except Exception:
            pass  # network error / rate-limit — keep original
    # Normalise runs of whitespace introduced during translation
    text = re.sub(r" {2,}", " ", text).strip()
    return text.title() if text else None


def _vies_rest_base_str() -> str:
    return os.environ.get(
        "VIES_REST_API_BASE",
        "https://ec.europa.eu/taxation_customs/vies/rest-api",
    ).rstrip("/")


def _vies_rest_url(path: str) -> str:
    return f"{_vies_rest_base_str()}/{path.strip('/')}"


def _default_live_check_url() -> str:
    return _vies_rest_url("check-vat-number")


def _vies_soap_url() -> str:
    return os.environ.get(
        "VIES_SOAP_URL",
        "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
    ).strip()


def _vies_soap_approx_fallback_enabled() -> bool:
    v = os.environ.get("VIES_SOAP_APPROX_FALLBACK", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


# VIES member state / scheme codes (EU VoW); Greece is EL, Northern Ireland XI.
VIES_COUNTRY_CODES: frozenset[str] = frozenset(
    {
        "AT",
        "BE",
        "BG",
        "CY",
        "CZ",
        "DE",
        "DK",
        "EE",
        "EL",  # Greece
        "ES",
        "FI",
        "FR",
        "HR",
        "HU",
        "IE",
        "IT",
        "LT",
        "LU",
        "LV",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SE",
        "SI",
        "SK",
        "XI",  # Northern Ireland
    }
)


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


def _default_requester_from_env() -> tuple[str, str] | None:
    """Return configured requester identity for VIES approximate checks, if complete."""
    req_cc = os.environ.get("VIES_REQUESTER_CC", "").strip().upper()
    req_raw = os.environ.get("VIES_REQUESTER_VAT", "").strip()
    if not req_cc and not req_raw:
        return None
    if not req_cc or not req_raw:
        raise HTTPException(
            status_code=500,
            detail="VIES_REQUESTER_CC and VIES_REQUESTER_VAT must either both be set or both be empty.",
        )
    if req_cc not in REQUESTER_COUNTRY_CODES:
        raise HTTPException(
            status_code=500,
            detail=f"VIES_REQUESTER_CC not supported: {req_cc}",
        )
    req_num = _normalize_vat(req_cc, req_raw) if req_cc != "EU" else req_raw.upper().replace(" ", "")
    if not req_num:
        raise HTTPException(
            status_code=500,
            detail="VIES_REQUESTER_VAT is empty after normalization.",
        )
    return req_cc, req_num


def _vies_raw_print_enabled() -> bool:
    v = os.environ.get("VIES_PRINT_RAW", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _dump_vies_response(http_status: int, attempt_index: int, data: dict[str, Any]) -> None:
    if not _vies_raw_print_enabled():
        return
    print(
        f"\n{'=' * 72}\nVIES API raw JSON  |  HTTP {http_status}  |  attempt {attempt_index + 1}\n{'=' * 72}",
        file=sys.stderr,
    )
    print(json.dumps(data, ensure_ascii=False, indent=2), file=sys.stderr)
    print(f"{'=' * 72}\n", file=sys.stderr)


# One in-flight VIES HTTP call per process (avoids MS_MAX_CONCURRENT_REQ from our own parallelism).
_vies_serial = asyncio.Lock()


def _vies_error_codes(data: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for e in data.get("errorWrappers") or []:
        if isinstance(e, dict) and e.get("error"):
            out.append(str(e["error"]))
    return out


def _vies_error_message(data: dict[str, Any]) -> str:
    errs = data.get("errorWrappers") or []
    parts = [
        str(e.get("message") or e.get("error") or "unknown")
        for e in errs
        if isinstance(e, dict)
    ]
    return "; ".join(parts) if parts else "VIES rejected the request"


def _vies_failure_retryable(data: dict[str, Any], http_status: int) -> bool:
    """True when another attempt may succeed (concurrency / overload)."""
    if http_status == 429:
        return True
    if http_status >= 500:
        return True
    codes = _vies_error_codes(data)
    for c in codes:
        u = c.upper()
        if "CONCURRENT" in u or "MAX_CONCURRENT" in u:
            return True
        if u in (
            "VOW-SERVICE-UNAVAILABLE",
            "SERVICE_UNAVAILABLE",
            "TIMEOUT",
            "MS_UNAVAILABLE",
        ):
            return True
    msg = _vies_error_message(data).lower()
    if "retry" in msg or "try again" in msg or "later" in msg:
        return True
    return False


_vies_http: httpx.AsyncClient | None = None


@asynccontextmanager
async def _lifespan(app: FastAPI):
    global _vies_http
    timeout = httpx.Timeout(45.0, connect=15.0)
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    _vies_http = httpx.AsyncClient(timeout=timeout, limits=limits)
    try:
        yield
    finally:
        await _vies_http.aclose()
        _vies_http = None


app = FastAPI(title="Dema Dashboard API", version="0.1.0", lifespan=_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VatCheckRequest(BaseModel):
    """Mirrors EU CheckVatRequest (snake_case here; sent to VIES as camelCase)."""

    country_code: str = Field(..., min_length=2, max_length=2, description="Target VAT: ISO/VIES country code")
    vat_number: str = Field(..., min_length=1, max_length=32)
    requester_member_state_code: str | None = Field(
        default=None,
        max_length=4,
        description="Your VAT country (EU/XI or EU for MOSS). With requester_number enables requestIdentifier / approximate checks per Swagger.",
    )
    requester_number: str | None = Field(default=None, max_length=32, description="Your VAT number (without country prefix ok)")
    trader_name: str | None = Field(default=None, max_length=500)
    trader_street: str | None = Field(default=None, max_length=500)
    trader_postal_code: str | None = Field(default=None, max_length=32)
    trader_city: str | None = Field(default=None, max_length=200)
    trader_company_type: str | None = Field(default=None, max_length=100)


REQUESTER_COUNTRY_CODES: frozenset[str] = VIES_COUNTRY_CODES | {"EU"}


class VatCheckResponse(BaseModel):
    valid: bool
    country_code: str
    vat_number: str
    name: str | None = None
    address: str | None = None
    request_date: str | None = None
    request_identifier: str | None = None
    vies_error: str | None = None
    trader_details_available: bool = Field(
        default=False,
        description="False when member state returned no usable name/address (common; VAT may still be valid).",
    )
    vies_raw: dict[str, Any] | None = Field(
        default=None,
        description="Exact JSON object returned by VIES (for display/debug). Omitted when VIES_OMIT_RAW_IN_JSON is set.",
    )
    trader_name_match: str | None = None
    trader_street_match: str | None = None
    trader_postal_code_match: str | None = None
    trader_city_match: str | None = None
    trader_company_type_match: str | None = None

    @field_validator("name", "address", mode="before")
    @classmethod
    def _strip_vies_placeholders(cls, v: object) -> object:
        """Guarantee that VIES placeholder strings ('---' etc.) never appear in the response."""
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            return None
        low = s.lower()
        if low in ("---", "n/a", "na", "none", "...", "..", "-", "\u2013", "\u2014", "unknown"):
            return None
        # Any string composed entirely of dashes/dots/spaces is a masked placeholder.
        core = re.sub(r"[\s\-\u00ad\u2010-\u2015\u2212\u00a0\xb7\.]+", "", s)
        return s if core else None


def _normalize_vat(country: str, raw: str) -> str:
    s = raw.upper().replace(" ", "").strip()
    if s.startswith(country):
        s = s[len(country) :]
    return s


# Hyphens / spaces / dots VIES uses for masked fields (incl. Unicode dash variants).
_VIES_MASK_CHARS = re.compile(
    r"[\s\-\u00ad\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u00a0·\.]+",
    re.UNICODE,
)


def _vies_text_or_none(value: Any) -> str | None:
    """Drop VIES placeholder / masked values so clients never show '---' as real data."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    low = s.lower()
    if low in ("---", "n/a", "na", "none", "...", "..", "-", "–", "—", "unknown"):
        return None
    core = _VIES_MASK_CHARS.sub("", s)
    if not core:
        return None
    return s


def _vies_address_or_none(value: Any) -> str | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if not lines:
        return None
    kept: list[str] = []
    for ln in lines:
        # Collapse runs of internal whitespace that VIES pads fields with.
        ln = re.sub(r" {2,}", " ", ln).strip()
        t = _vies_text_or_none(ln)
        if t:
            kept.append(t)
    if not kept:
        return None
    return "\n".join(kept)


def _xml_local_name(tag: str) -> str:
    return tag.split("}", 1)[1] if "}" in tag else tag


def _soap_text(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def _soap_match_to_rest(value: Any) -> str | None:
    s = (_soap_text(value) or "").upper()
    if not s:
        return None
    return {
        "1": "VALID",
        "MATCH_VALID": "VALID",
        "VALID": "VALID",
        "2": "INVALID",
        "MATCH_INVALID": "INVALID",
        "INVALID": "INVALID",
        "3": "NOT_PROCESSED",
        "MATCH_NOT_PROCESSED": "NOT_PROCESSED",
        "NOT_PROCESSED": "NOT_PROCESSED",
    }.get(s, s)


def _rest_matches_all_not_processed(data: dict[str, Any]) -> bool:
    match_keys = (
        "traderNameMatch",
        "traderStreetMatch",
        "traderPostalCodeMatch",
        "traderCityMatch",
        "traderCompanyTypeMatch",
    )
    return all(_soap_match_to_rest(data.get(key)) == "NOT_PROCESSED" for key in match_keys)


def _rest_missing_trader_details(data: dict[str, Any]) -> bool:
    trader_name = _vies_text_or_none(data.get("traderName")) or _vies_text_or_none(data.get("name"))
    trader_addr = _vies_text_or_none(data.get("traderStreet")) or _vies_address_or_none(data.get("address"))
    return not trader_name or not trader_addr


def _build_vies_soap_approx_envelope(payload: dict[str, Any]) -> str:
    parts = [
        "<s11:Envelope xmlns:s11='http://schemas.xmlsoap.org/soap/envelope/'>",
        "<s11:Body>",
        "<tns1:checkVatApprox xmlns:tns1='urn:ec.europa.eu:taxud:vies:services:checkVat:types'>",
    ]
    for key in (
        "countryCode",
        "vatNumber",
        "requesterMemberStateCode",
        "requesterNumber",
        "traderName",
        "traderCompanyType",
        "traderStreet",
        "traderPostalCode",
        "traderCity",
    ):
        value = _soap_text(payload.get(key))
        if value:
            parts.append(f"<tns1:{key}>{_xml_escape(value)}</tns1:{key}>")
    parts.extend(("</tns1:checkVatApprox>", "</s11:Body>", "</s11:Envelope>"))
    return "".join(parts)


def _parse_vies_soap_approx_response(xml_text: str) -> dict[str, Any]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise HTTPException(status_code=502, detail="VIES SOAP fallback returned invalid XML") from e

    fault_parts = [(_soap_text(elem.text) or "") for elem in root.iter() if _xml_local_name(elem.tag) == "faultstring"]
    fault = "; ".join(x for x in fault_parts if x).strip()
    if fault:
        raise HTTPException(status_code=502, detail=f"VIES SOAP fallback failed: {fault}")

    values: dict[str, Any] = {}
    key_map = {
        "countryCode": "countryCode",
        "vatNumber": "vatNumber",
        "requestDate": "requestDate",
        "valid": "valid",
        "requestIdentifier": "requestIdentifier",
        "name": "name",
        "address": "address",
        "traderName": "traderName",
        "traderCompanyType": "traderCompanyType",
        "traderStreet": "traderStreet",
        "traderPostalCode": "traderPostalCode",
        "traderCity": "traderCity",
        "traderAddress": "address",
        "traderNameMatch": "traderNameMatch",
        "traderCompanyTypeMatch": "traderCompanyTypeMatch",
        "traderStreetMatch": "traderStreetMatch",
        "traderPostalCodeMatch": "traderPostalCodeMatch",
        "traderCityMatch": "traderCityMatch",
        "matchName": "traderNameMatch",
        "matchCompanyType": "traderCompanyTypeMatch",
        "matchStreet": "traderStreetMatch",
        "matchPostalCode": "traderPostalCodeMatch",
        "matchCity": "traderCityMatch",
    }
    for elem in root.iter():
        key = key_map.get(_xml_local_name(elem.tag))
        if not key:
            continue
        text = _soap_text(elem.text)
        if text is None:
            continue
        values[key] = text

    if "valid" in values:
        values["valid"] = str(values["valid"]).strip().lower() == "true"
    for key in (
        "traderNameMatch",
        "traderCompanyTypeMatch",
        "traderStreetMatch",
        "traderPostalCodeMatch",
        "traderCityMatch",
    ):
        if key in values:
            values[key] = _soap_match_to_rest(values[key])
    return values


async def _vies_soap_approx_with_retries(payload: dict[str, Any]) -> dict[str, Any]:
    """Retry official SOAP checkVatApprox when REST omits trader details."""
    max_retries = max(1, int(os.environ.get("VIES_MAX_RETRIES", "8")))
    base_wait = float(os.environ.get("VIES_RETRY_BASE_SEC", "0.8"))
    cap_wait = float(os.environ.get("VIES_RETRY_MAX_WAIT_SEC", "28"))
    max_total_sec = float(os.environ.get("VIES_MAX_TOTAL_SEC", "24.0"))

    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    client: httpx.AsyncClient = _vies_http
    url = _vies_soap_url() or "https://ec.europa.eu/taxation_customs/vies/services/checkVatService"
    body = _build_vies_soap_approx_envelope(payload)
    headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": "checkVatApprox"}
    last_detail = "VIES SOAP fallback temporarily unavailable"
    loop_start = asyncio.get_event_loop().time()

    async with _vies_serial:
        for attempt in range(max_retries):
            elapsed = asyncio.get_event_loop().time() - loop_start
            if elapsed >= max_total_sec:
                raise HTTPException(
                    status_code=503,
                    detail=_vies_timeout_detail("VIES SOAP fallback", elapsed, max_total_sec),
                )
            if attempt > 0:
                sleep_sec = base_wait * (2 ** (attempt - 1)) + random.uniform(0, 0.55)
                sleep_sec = min(sleep_sec, cap_wait, max_total_sec - elapsed - 1.0)
                if sleep_sec > 0:
                    await asyncio.sleep(sleep_sec)
            request_budget_sec = _vies_remaining_request_sec(loop_start, max_total_sec)
            if request_budget_sec <= 0.5:
                elapsed = asyncio.get_event_loop().time() - loop_start
                raise HTTPException(
                    status_code=503,
                    detail=_vies_timeout_detail("VIES SOAP fallback", elapsed, max_total_sec),
                )
            try:
                r = await client.post(
                    url,
                    content=body,
                    headers=headers,
                    timeout=_vies_request_timeout(request_budget_sec),
                )
            except httpx.TimeoutException as e:
                elapsed = asyncio.get_event_loop().time() - loop_start
                last_detail = _vies_timeout_detail("VIES SOAP fallback", elapsed, max_total_sec)
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=503, detail=last_detail) from e
            except httpx.RequestError as e:
                last_detail = f"VIES SOAP fallback request failed: {e!s}"
                if attempt < max_retries - 1 and _vies_failure_retryable({}, 503):
                    continue
                raise HTTPException(status_code=502, detail=last_detail) from e

            if r.status_code >= 500 and attempt < max_retries - 1 and _vies_failure_retryable({}, r.status_code):
                last_detail = f"VIES SOAP fallback HTTP {r.status_code}"
                continue

            parsed = _parse_vies_soap_approx_response(r.text)
            if "valid" not in parsed:
                last_detail = "Unexpected VIES SOAP response shape (expected valid field)"
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=502, detail=last_detail)
            return parsed

    raise HTTPException(status_code=503, detail=last_detail)


def _merge_soap_approx_into_rest(rest_data: dict[str, Any], soap_data: dict[str, Any]) -> dict[str, Any]:
    merged = dict(rest_data)

    for key in ("traderName", "traderStreet", "traderPostalCode", "traderCity", "traderCompanyType", "name", "address"):
        if not _vies_text_or_none(merged.get(key)) and _vies_text_or_none(soap_data.get(key)):
            merged[key] = soap_data[key]

    if not (merged.get("requestIdentifier") or "").strip():
        req_id = _soap_text(soap_data.get("requestIdentifier"))
        if req_id:
            merged["requestIdentifier"] = req_id

    for key in (
        "traderNameMatch",
        "traderStreetMatch",
        "traderPostalCodeMatch",
        "traderCityMatch",
        "traderCompanyTypeMatch",
    ):
        soap_match = _soap_match_to_rest(soap_data.get(key))
        if not soap_match:
            continue
        rest_match = _soap_match_to_rest(merged.get(key))
        if not rest_match or rest_match == "NOT_PROCESSED":
            merged[key] = soap_match

    merged["soapApproxFallbackUsed"] = True
    merged["soapApproxRaw"] = soap_data
    return merged


def _vies_timeout_detail(prefix: str, elapsed_sec: float, budget_sec: float) -> str:
    return (
        f"{prefix} timed out after {elapsed_sec:.0f} s "
        f"(budget: {budget_sec:.0f} s). "
        "VIES may be temporarily overloaded — please try again in a moment."
    )


def _vies_remaining_request_sec(loop_start: float, max_total_sec: float, reserve_sec: float = 0.75) -> float:
    return max_total_sec - (asyncio.get_event_loop().time() - loop_start) - reserve_sec


def _vies_request_timeout(remaining_sec: float) -> httpx.Timeout:
    total_sec = max(1.0, remaining_sec)
    connect_sec = min(8.0, max(1.0, total_sec / 3))
    return httpx.Timeout(total_sec, connect=connect_sec)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "cors_origins": _cors_origins()}


def _build_vies_check_payload(body: VatCheckRequest) -> dict[str, str]:
    cc = body.country_code.upper().strip()
    vat = _normalize_vat(cc, body.vat_number)
    if not vat:
        raise HTTPException(status_code=400, detail="VAT number is empty after normalization")
    out: dict[str, str] = {"countryCode": cc, "vatNumber": vat}

    req_cc = (body.requester_member_state_code or "").strip().upper()
    req_raw = (body.requester_number or "").strip()
    if not req_cc and not req_raw:
        default_req = _default_requester_from_env()
        if default_req:
            req_cc, req_raw = default_req

    if req_cc or req_raw:
        if not req_cc or not req_raw:
            raise HTTPException(
                status_code=400,
                detail="requester_member_state_code and requester_number must both be sent (EU Swagger CheckVatRequest).",
            )
        if req_cc not in REQUESTER_COUNTRY_CODES:
            raise HTTPException(
                status_code=400,
                detail=f"requester_member_state_code not supported: {req_cc}",
            )
        rnum = _normalize_vat(req_cc, req_raw) if req_cc != "EU" else req_raw.upper().replace(" ", "")
        if not rnum:
            raise HTTPException(status_code=400, detail="requester VAT number is empty after normalization")
        out["requesterMemberStateCode"] = req_cc
        out["requesterNumber"] = rnum

    if (t := (body.trader_name or "").strip()):
        out["traderName"] = t
    if (t := (body.trader_street or "").strip()):
        out["traderStreet"] = t
    if (t := (body.trader_postal_code or "").strip()):
        out["traderPostalCode"] = t
    if (t := (body.trader_city or "").strip()):
        out["traderCity"] = t
    if (t := (body.trader_company_type or "").strip()):
        out["traderCompanyType"] = t

    return out


async def _vies_call_with_retries(
    method: str,
    url: str,
    *,
    json_body: dict[str, Any] | None = None,
    require_valid_field: bool = False,
) -> dict[str, Any]:
    """Call VoW REST (GET or POST). Same queue + retry behaviour as the Commission documents.

    VIES_MAX_TOTAL_SEC caps total wall-clock time so cloud reverse proxies (which typically
    have a 25–30 s request timeout) don't kill the connection before we return.  Default is
    24 s, which fits comfortably under a 30 s proxy limit.  Raise it (or set VIES_MAX_RETRIES
    higher) only if your cloud platform explicitly supports long-running requests.
    """
    max_retries = max(1, int(os.environ.get("VIES_MAX_RETRIES", "8")))
    base_wait = float(os.environ.get("VIES_RETRY_BASE_SEC", "0.8"))
    cap_wait = float(os.environ.get("VIES_RETRY_MAX_WAIT_SEC", "28"))
    # Hard wall-clock budget for the whole retry loop (including sleeps + VIES call time).
    # Keeps us well inside the 30 s window most cloud reverse proxies enforce.
    max_total_sec = float(os.environ.get("VIES_MAX_TOTAL_SEC", "24.0"))

    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    client: httpx.AsyncClient = _vies_http
    last_detail = "VIES temporarily unavailable"
    m = method.upper()
    loop_start = asyncio.get_event_loop().time()
    async with _vies_serial:
        for attempt in range(max_retries):
            elapsed = asyncio.get_event_loop().time() - loop_start
            if elapsed >= max_total_sec:
                raise HTTPException(
                    status_code=503,
                    detail=_vies_timeout_detail("VIES check", elapsed, max_total_sec),
                )
            if attempt > 0:
                sleep_sec = base_wait * (2 ** (attempt - 1)) + random.uniform(0, 0.55)
                sleep_sec = min(sleep_sec, cap_wait, max_total_sec - elapsed - 1.0)
                if sleep_sec > 0:
                    await asyncio.sleep(sleep_sec)
            request_budget_sec = _vies_remaining_request_sec(loop_start, max_total_sec)
            if request_budget_sec <= 0.5:
                elapsed = asyncio.get_event_loop().time() - loop_start
                raise HTTPException(
                    status_code=503,
                    detail=_vies_timeout_detail("VIES check", elapsed, max_total_sec),
                )
            try:
                if m == "POST":
                    r = await client.post(url, json=json_body, timeout=_vies_request_timeout(request_budget_sec))
                elif m == "GET":
                    r = await client.get(url, timeout=_vies_request_timeout(request_budget_sec))
                else:
                    raise HTTPException(status_code=500, detail=f"Unsupported HTTP method: {method}")
            except httpx.TimeoutException as e:
                elapsed = asyncio.get_event_loop().time() - loop_start
                last_detail = _vies_timeout_detail("VIES check", elapsed, max_total_sec)
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=503, detail=last_detail) from e
            except httpx.RequestError as e:
                last_detail = f"VIES request failed: {e!s}"
                if attempt < max_retries - 1 and _vies_failure_retryable({}, 503):
                    continue
                raise HTTPException(status_code=502, detail=last_detail) from e

            try:
                data: dict[str, Any] = r.json()
            except ValueError:
                if _vies_raw_print_enabled():
                    print(
                        f"\n{'=' * 72}\nVIES API non-JSON body  |  HTTP {r.status_code}\n{'=' * 72}\n",
                        r.text,
                        f"\n{'=' * 72}\n",
                        file=sys.stderr,
                        sep="",
                    )
                raise HTTPException(
                    status_code=502,
                    detail="VIES returned a non-JSON body",
                )

            _dump_vies_response(r.status_code, attempt, data)

            if data.get("actionSucceed") is False:
                last_detail = _vies_error_message(data)
                if attempt < max_retries - 1 and _vies_failure_retryable(data, r.status_code):
                    continue
                raise HTTPException(
                    status_code=503 if r.status_code < 400 else r.status_code,
                    detail=last_detail,
                )

            if r.status_code >= 400:
                last_detail = _vies_error_message(data) or r.text
                if attempt < max_retries - 1 and _vies_failure_retryable(data, r.status_code):
                    continue
                raise HTTPException(status_code=502, detail=last_detail)

            if require_valid_field and "valid" not in data:
                last_detail = "Unexpected VIES response shape (expected check-vat response)"
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=502, detail=last_detail)

            return data

    raise HTTPException(status_code=503, detail=last_detail)


def _sanitize_raw_for_display(data: dict[str, Any]) -> dict[str, Any]:
    """Replace VIES placeholder values ('---' etc.) with None in the raw payload for clean display."""
    out: dict[str, Any] = {}
    for k, v in data.items():
        if isinstance(v, str):
            out[k] = _vies_text_or_none(v)
        elif isinstance(v, dict):
            out[k] = _sanitize_raw_for_display(v)
        else:
            out[k] = v
    return out


def _request_fallback_name_address(body: VatCheckRequest) -> tuple[str | None, str | None]:
    """Build name/address fallback from submitted trader fields when VIES omits details."""
    fallback_name = _vies_text_or_none(body.trader_name)
    street = _vies_text_or_none(body.trader_street)
    postal = _vies_text_or_none(body.trader_postal_code)
    city = _vies_text_or_none(body.trader_city)
    line2 = " ".join(x for x in (postal, city) if x).strip() or None
    fallback_addr = "\n".join(x for x in (street, line2) if x) or None
    return fallback_name, fallback_addr


def _map_vies_check_response(
    data: dict[str, Any],
    cc: str,
    vat: str,
    fallback_name: str | None = None,
    fallback_address: str | None = None,
) -> VatCheckResponse:
    valid = bool(data.get("valid"))
    trader_name = _vies_text_or_none(data.get("traderName")) or _vies_text_or_none(data.get("name"))

    street = _vies_text_or_none(data.get("traderStreet"))
    pc = _vies_text_or_none(data.get("traderPostalCode"))
    city = _vies_text_or_none(data.get("traderCity"))
    line2 = " ".join(x for x in (pc, city) if x).strip() or None
    addr = "\n".join(x for x in (street, line2) if x) or None
    if not addr:
        addr = _vies_address_or_none(data.get("address"))

    # Translate non-Latin text (e.g. Greek) to German and apply Title Case.
    trader_name = _to_de_title(trader_name)
    addr = _to_de_title(addr)

    details = bool(trader_name or addr)
    if valid and not trader_name and fallback_name:
        trader_name = fallback_name
    if valid and not addr and fallback_address:
        addr = fallback_address

    omit_raw = os.environ.get("VIES_OMIT_RAW_IN_JSON", "").strip().lower() in ("1", "true", "yes", "on")
    raw_payload: dict[str, Any] | None = None if omit_raw else _sanitize_raw_for_display(dict(data))

    def _m(key: str) -> str | None:
        """Normalize VIES match flags and suppress placeholder 'NOT_PROCESSED'."""
        match_value = _soap_match_to_rest(data.get(key))
        if not match_value or match_value == "NOT_PROCESSED":
            return None
        return match_value

    req_id = (data.get("requestIdentifier") or "").strip() or None

    return VatCheckResponse(
        valid=valid,
        country_code=str(data.get("countryCode") or cc),
        vat_number=str(data.get("vatNumber") or vat),
        name=trader_name,
        address=addr,
        request_date=data.get("requestDate"),
        request_identifier=req_id,
        vies_error=None,
        trader_details_available=details,
        vies_raw=raw_payload,
        trader_name_match=_m("traderNameMatch"),
        trader_street_match=_m("traderStreetMatch"),
        trader_postal_code_match=_m("traderPostalCodeMatch"),
        trader_city_match=_m("traderCityMatch"),
        trader_company_type_match=_m("traderCompanyTypeMatch"),
    )


@app.get("/api/v1/vat/status")
async def vies_member_state_status() -> dict[str, Any]:
    """Proxy VoW `check-status` (availability per member state). See EU Technical information."""
    url = os.environ.get("VIES_STATUS_URL", _vies_rest_url("check-status")).strip() or _vies_rest_url(
        "check-status"
    )
    return await _vies_call_with_retries("GET", url, require_valid_field=False)


@app.post("/api/v1/vat/check-test", response_model=VatCheckResponse)
async def vies_check_test_service(body: VatCheckRequest) -> VatCheckResponse:
    """Proxy VoW `check-vat-test-service` (synthetic valid/invalid numbers, e.g. 100 / 200)."""
    cc = body.country_code.upper().strip()
    if cc not in VIES_COUNTRY_CODES:
        raise HTTPException(
            status_code=400,
            detail=f"Country code not supported by VIES: {cc}",
        )
    url = os.environ.get("VIES_TEST_SERVICE_URL", _vies_rest_url("check-vat-test-service")).strip()
    if not url:
        url = _vies_rest_url("check-vat-test-service")
    payload = _build_vies_check_payload(body)
    vat = payload["vatNumber"]
    data = await _vies_call_with_retries(
        "POST",
        url,
        json_body=payload,
        require_valid_field=True,
    )
    fallback_name, fallback_address = _request_fallback_name_address(body)
    return _map_vies_check_response(
        data,
        cc,
        vat,
        fallback_name=fallback_name,
        fallback_address=fallback_address,
    )


@app.post("/api/v1/vat/check", response_model=VatCheckResponse)
async def check_vat(body: VatCheckRequest) -> VatCheckResponse:
    cc = body.country_code.upper().strip()
    if cc not in VIES_COUNTRY_CODES:
        raise HTTPException(
            status_code=400,
            detail=f"Country code not supported by VIES: {cc}",
        )
    url = os.environ.get("VIES_CHECK_URL", _default_live_check_url()).strip() or _default_live_check_url()
    payload = _build_vies_check_payload(body)
    vat = payload["vatNumber"]

    data = await _vies_call_with_retries(
        "POST",
        url,
        json_body=payload,
        require_valid_field=True,
    )
    if _vies_soap_approx_fallback_enabled() and (_rest_matches_all_not_processed(data) or _rest_missing_trader_details(data)):
        try:
            soap_data = await _vies_soap_approx_with_retries(payload)
        except HTTPException:
            soap_data = {}
        if soap_data:
            data = _merge_soap_approx_into_rest(data, soap_data)
    fallback_name, fallback_address = _request_fallback_name_address(body)
    return _map_vies_check_response(
        data,
        cc,
        vat,
        fallback_name=fallback_name,
        fallback_address=fallback_address,
    )
