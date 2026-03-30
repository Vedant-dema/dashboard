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
  VIES_MAX_RETRIES         Retries for transient / concurrent-cap errors (default: 3).
  VIES_RETRY_BASE_SEC      Initial backoff before first retry, seconds (default: 0.4).
  VIES_RETRY_MAX_WAIT_SEC  Cap on single backoff sleep (default: 8).
  VIES_PRINT_RAW           If not 0/false/no/off: log full VIES JSON to stderr (default: on for debugging).
                           Set to 0 in production to avoid logging VAT numbers.
  VIES_OMIT_RAW_IN_JSON    If 1/true: do not include vies_raw in the HTTP JSON response (default: off).
  VIES_MAX_TOTAL_SEC       Hard wall-clock budget for one check (retries + sleeps, default: 12 s).
                           Must be below the cloud reverse-proxy timeout (typically 30 s on Render/Railway/
                           Heroku). Increase only if your platform allows long-running requests.
  VIES_SOAP_APPROX_FALLBACK If 0/false: skip SOAP checkVatApprox when REST omits fields (default: on).
  VIES_SOAP_CHECK_FALLBACK  If 0/false: skip SOAP checkVat before checkVatApprox (default: on).
                           checkVat is the classic operation and sometimes returns name/address when
                           checkVatApprox does not for a minimal request.
  VIES_SIMPLE_TIMEOUT_SEC   Timeout in seconds for simplified one-shot live check (default: 8).
  VIES_DISPLAY_TEXT_LANG     Target language for normalised trader name/address: de or en (default: de).
                             Clients may override per request with JSON field text_locale.
  NOMINATIM_API_BASE         OpenStreetMap Nominatim base URL (default: https://nominatim.openstreetmap.org).
  NOMINATIM_USER_AGENT       Required by Nominatim usage policy — identify this app (default: generic string;
                             set to your site URL + contact email in production).
  PHOTON_API_BASE            Komoot Photon OSM search base (default: https://photon.komoot.io). Merged with Nominatim.
  GEOCODE_DISABLE_PHOTON     If 1/true: skip Photon and use only Nominatim.
  GEOCODING_PROVIDER         osm (default): Photon+Nominatim. mapbox: Mapbox Geocoding API.
                             google: Google Geocoding API (Geocoding must be enabled for the key).
  MAPBOX_ACCESS_TOKEN        Required when GEOCODING_PROVIDER=mapbox (secret token).
  GOOGLE_MAPS_API_KEY        Google API key with Geocoding API enabled (alias: GOOGLE_GEOCODING_API_KEY).

Note: MS_MAX_CONCURRENT_REQ is enforced by the Commission/member states. We cannot remove it;
this app serializes outbound VIES calls and retries with backoff so many checks still succeed.

Official background (why name/address are often missing): EU Your Europe — check VAT (VIES);
VIES FAQ Q17 / Q22 — https://ec.europa.eu/taxation_customs/vies/faq.html

SOAP vs REST naming: the WSDL for checkVatApprox uses traderPostcode, requesterCountryCode, and
requesterVatNumber (see checkVatService.wsdl), while the public REST Swagger uses traderPostalCode,
requesterMemberStateCode, requesterNumber. This proxy maps REST-shaped payloads to WSDL element names.

REST VoW endpoints (see Technical information): live check, test service, status — proxied as
GET /api/v1/vat/status, POST /api/v1/vat/check-test, POST /api/v1/vat/check.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from urllib.parse import quote
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape as _xml_escape

import unicodedata

import httpx
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

try:
    from deep_translator import GoogleTranslator as _GoogleTranslator
    _TRANSLATOR_AVAILABLE = True
except ImportError:
    _TRANSLATOR_AVAILABLE = False


def _resolve_vies_display_locale(request_locale: str | None) -> str:
    """Pick de or en for normalised VIES trader strings (default: env or de)."""
    if request_locale in ("de", "en"):
        return request_locale
    env = os.environ.get("VIES_DISPLAY_TEXT_LANG", "de").strip().lower()
    return env if env in ("de", "en") else "de"


def _needs_vies_text_conversion(text: str) -> bool:
    """True when any letter is outside Latin-1 (ISO-8859-1), e.g. Polish Ł, Greek, Cyrillic."""
    for ch in text:
        if ch.isalpha() and ord(ch) > 0x00FF:
            return True
    return False


# Letters NFKD does not map to ASCII alone (stroke, ligatures, Romanian comma-below, etc.).
_VIES_LATIN_ASCII_MANUAL: dict[str, str] = {
    "Ł": "L",
    "ł": "l",
    "Ø": "O",
    "ø": "o",
    "Æ": "AE",
    "æ": "ae",
    "Œ": "OE",
    "œ": "oe",
    "Đ": "D",
    "đ": "d",
    "Ș": "S",
    "ș": "s",
    "Ț": "T",
    "ț": "t",
    "ẞ": "SS",
    "ß": "ss",
    "ſ": "s",
}


def _fold_latin_for_vies_fallback(text: str) -> str:
    """Strip combining marks and map a few Latin letters to ASCII when translation is unavailable."""
    mapped = "".join(_VIES_LATIN_ASCII_MANUAL.get(ch, ch) for ch in text)
    out: list[str] = []
    for ch in unicodedata.normalize("NFD", mapped):
        if unicodedata.category(ch) != "Mn":
            out.append(ch)
    return "".join(out)


def _normalize_vies_display_text(text: str | None, target_lang: str) -> str | None:
    """Unicode-normalise VIES text; convert extended or non-Latin scripts to de/en when possible.

    1. NFKC + replace VIES ``||`` with `` / ``.
    2. If any letter is outside Latin-1, try Google Translate → target_lang (de or en).
    3. If still needed, fold extended Latin to ASCII (no-op for unconverted Cyrillic/CJK without translator).
    4. Title-case for consistent CRM display.
    """
    if not text:
        return None
    text = unicodedata.normalize("NFKC", text).replace("||", " / ").strip()
    if not text:
        return None
    tgt = target_lang if target_lang in ("de", "en") else "de"
    if _needs_vies_text_conversion(text) and _TRANSLATOR_AVAILABLE:
        try:
            translated = _GoogleTranslator(source="auto", target=tgt).translate(text)
            if translated:
                text = unicodedata.normalize("NFKC", translated).strip()
        except Exception:
            pass
    if _needs_vies_text_conversion(text):
        text = _fold_latin_for_vies_fallback(text)
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


def _vies_ms_lookup_url(country_code: str, vat_number: str) -> str:
    return _vies_rest_url(f"ms/{country_code.strip().upper()}/vat/{vat_number.strip()}")


def _vies_soap_url() -> str:
    return os.environ.get(
        "VIES_SOAP_URL",
        "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
    ).strip()


def _vies_soap_approx_fallback_enabled() -> bool:
    v = os.environ.get("VIES_SOAP_APPROX_FALLBACK", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _vies_soap_check_fallback_enabled() -> bool:
    v = os.environ.get("VIES_SOAP_CHECK_FALLBACK", "1").strip().lower()
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


_VIES_CODE_MESSAGES: dict[str, str] = {
    "MS_UNAVAILABLE": (
        "MS_UNAVAILABLE: The member state's VIES server is temporarily offline. "
        "This is a transient EU infrastructure issue — please try again in a few minutes."
    ),
    "MS_MAX_CONCURRENT_REQ": (
        "MS_MAX_CONCURRENT_REQ: Too many simultaneous requests to the member state's VIES server. "
        "Please try again in a few moments."
    ),
    "VOW-SERVICE-UNAVAILABLE": (
        "VOW-SERVICE-UNAVAILABLE: The VIES validation service is temporarily unavailable. "
        "Please try again shortly."
    ),
    "SERVICE_UNAVAILABLE": (
        "SERVICE_UNAVAILABLE: VIES is temporarily unavailable. Please try again in a few minutes."
    ),
    "TIMEOUT": (
        "TIMEOUT: The member state's VIES server did not respond in time. "
        "Please try again in a few minutes."
    ),
    "INVALID_INPUT": (
        "INVALID_INPUT: The VAT number format is not valid for the selected country."
    ),
    "VAT_BLOCKED": (
        "VAT_BLOCKED: This VAT number is blocked in the VIES system."
    ),
    "VAT_REVOKED": (
        "VAT_REVOKED: This VAT number has been revoked."
    ),
    "GLOBAL_MAX_CONCURRENT_REQ": (
        "GLOBAL_MAX_CONCURRENT_REQ: VIES is currently overloaded. Please try again in a few moments."
    ),
}


def _vies_error_message(data: dict[str, Any]) -> str:
    errs = data.get("errorWrappers") or []
    parts: list[str] = []
    for e in errs:
        if not isinstance(e, dict):
            continue
        code = str(e.get("error") or "").upper()
        readable = _VIES_CODE_MESSAGES.get(code)
        if readable:
            parts.append(readable)
        else:
            raw = str(e.get("message") or e.get("error") or "unknown")
            parts.append(raw)
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
    _init_demo_store()
    timeout = httpx.Timeout(15.0, connect=8.0)
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
    text_locale: str | None = Field(
        default=None,
        description='Normalise trader name/address to this language: "de" or "en" (default: VIES_DISPLAY_TEXT_LANG or de).',
    )

    @field_validator("text_locale", mode="before")
    @classmethod
    def _coerce_text_locale(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        s = str(v).strip().lower()
        return s if s in ("de", "en") else None


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


def _payload_has_approx_inputs(payload: dict[str, Any]) -> bool:
    return any(
        _soap_text(payload.get(key))
        for key in (
            "requesterMemberStateCode",
            "requesterNumber",
            "traderName",
            "traderStreet",
            "traderPostalCode",
            "traderCity",
            "traderCompanyType",
        )
    )


def _normalize_ms_lookup_data(data: dict[str, Any], cc: str, vat: str) -> dict[str, Any]:
    approx = data.get("viesApproximate")
    approx_dict = approx if isinstance(approx, dict) else {}
    return {
        "countryCode": cc,
        "vatNumber": str(data.get("vatNumber") or vat),
        "requestDate": data.get("requestDate"),
        "valid": bool(data.get("isValid")),
        "requestIdentifier": data.get("requestIdentifier"),
        "name": data.get("name"),
        "address": data.get("address"),
        "traderName": approx_dict.get("name"),
        "traderStreet": approx_dict.get("street"),
        "traderPostalCode": approx_dict.get("postalCode"),
        "traderCity": approx_dict.get("city"),
        "traderCompanyType": approx_dict.get("companyType"),
        "traderNameMatch": _soap_match_to_rest(approx_dict.get("matchName")),
        "traderStreetMatch": _soap_match_to_rest(approx_dict.get("matchStreet")),
        "traderPostalCodeMatch": _soap_match_to_rest(approx_dict.get("matchPostalCode")),
        "traderCityMatch": _soap_match_to_rest(approx_dict.get("matchCity")),
        "traderCompanyTypeMatch": _soap_match_to_rest(approx_dict.get("matchCompanyType")),
        "msLookupRaw": data,
    }


def _vies_soap_http_headers() -> dict[str, str]:
    """WSDL checkVatBinding sets soapAction=\"\" for checkVat and checkVatApprox (empty URI)."""
    return {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": ""}


def _build_vies_soap_approx_envelope(payload: dict[str, Any]) -> str:
    # Element names and order follow checkVatApprox in checkVatService.wsdl (not REST Swagger).
    parts = [
        "<s11:Envelope xmlns:s11='http://schemas.xmlsoap.org/soap/envelope/'>",
        "<s11:Body>",
        "<tns1:checkVatApprox xmlns:tns1='urn:ec.europa.eu:taxud:vies:services:checkVat:types'>",
    ]
    seq: list[tuple[str, str | None]] = [
        ("countryCode", _soap_text(payload.get("countryCode"))),
        ("vatNumber", _soap_text(payload.get("vatNumber"))),
        ("traderName", _soap_text(payload.get("traderName"))),
        ("traderCompanyType", _soap_text(payload.get("traderCompanyType"))),
        ("traderStreet", _soap_text(payload.get("traderStreet"))),
        ("traderPostcode", _soap_text(payload.get("traderPostalCode"))),
        ("traderCity", _soap_text(payload.get("traderCity"))),
        ("requesterCountryCode", _soap_text(payload.get("requesterMemberStateCode"))),
        ("requesterVatNumber", _soap_text(payload.get("requesterNumber"))),
    ]
    for el_name, value in seq:
        if value:
            parts.append(f"<tns1:{el_name}>{_xml_escape(value)}</tns1:{el_name}>")
    parts.extend(("</tns1:checkVatApprox>", "</s11:Body>", "</s11:Envelope>"))
    return "".join(parts)


def _build_vies_soap_check_envelope(payload: dict[str, Any]) -> str:
    cc = _soap_text(payload.get("countryCode"))
    vn = _soap_text(payload.get("vatNumber"))
    if not cc or not vn:
        raise HTTPException(status_code=400, detail="countryCode and vatNumber required for SOAP checkVat")
    return (
        "<s11:Envelope xmlns:s11='http://schemas.xmlsoap.org/soap/envelope/'>"
        "<s11:Body>"
        "<tns1:checkVat xmlns:tns1='urn:ec.europa.eu:taxud:vies:services:checkVat:types'>"
        f"<tns1:countryCode>{_xml_escape(cc)}</tns1:countryCode>"
        f"<tns1:vatNumber>{_xml_escape(vn)}</tns1:vatNumber>"
        "</tns1:checkVat></s11:Body></s11:Envelope>"
    )


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
        "traderPostcode": "traderPostalCode",
        "traderCity": "traderCity",
        "traderAddress": "address",
        "traderNameMatch": "traderNameMatch",
        "traderCompanyTypeMatch": "traderCompanyTypeMatch",
        "traderStreetMatch": "traderStreetMatch",
        "traderPostalCodeMatch": "traderPostalCodeMatch",
        "traderPostcodeMatch": "traderPostalCodeMatch",
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


async def _vies_soap_check_with_retries(payload: dict[str, Any]) -> dict[str, Any]:
    """Retry official SOAP checkVat (classic); often returns name/address when REST/approx omit them."""
    max_retries = max(1, int(os.environ.get("VIES_MAX_RETRIES", "3")))
    base_wait = float(os.environ.get("VIES_RETRY_BASE_SEC", "0.4"))
    cap_wait = float(os.environ.get("VIES_RETRY_MAX_WAIT_SEC", "8"))
    max_total_sec = float(os.environ.get("VIES_MAX_TOTAL_SEC", "12.0"))

    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    client: httpx.AsyncClient = _vies_http
    url = _vies_soap_url() or "https://ec.europa.eu/taxation_customs/vies/services/checkVatService"
    body = _build_vies_soap_check_envelope(payload)
    headers = _vies_soap_http_headers()
    last_detail = "VIES SOAP checkVat temporarily unavailable"
    loop_start = asyncio.get_event_loop().time()
    label = "VIES SOAP checkVat"

    async with _vies_serial:
        for attempt in range(max_retries):
            elapsed = asyncio.get_event_loop().time() - loop_start
            if elapsed >= max_total_sec:
                raise HTTPException(
                    status_code=503,
                    detail=_vies_timeout_detail(label, elapsed, max_total_sec),
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
                    detail=_vies_timeout_detail(label, elapsed, max_total_sec),
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
                last_detail = _vies_timeout_detail(label, elapsed, max_total_sec)
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=503, detail=last_detail) from e
            except httpx.RequestError as e:
                last_detail = f"{label} request failed: {e!s}"
                if attempt < max_retries - 1 and _vies_failure_retryable({}, 503):
                    continue
                raise HTTPException(status_code=502, detail=last_detail) from e

            if r.status_code >= 500 and attempt < max_retries - 1 and _vies_failure_retryable({}, r.status_code):
                last_detail = f"{label} HTTP {r.status_code}"
                continue

            parsed = _parse_vies_soap_approx_response(r.text)
            if "valid" not in parsed:
                last_detail = f"Unexpected {label} response shape (expected valid field)"
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=502, detail=last_detail)
            return parsed

    raise HTTPException(status_code=503, detail=last_detail)


async def _vies_soap_approx_with_retries(payload: dict[str, Any]) -> dict[str, Any]:
    """Retry official SOAP checkVatApprox when REST omits trader details."""
    max_retries = max(1, int(os.environ.get("VIES_MAX_RETRIES", "3")))
    base_wait = float(os.environ.get("VIES_RETRY_BASE_SEC", "0.4"))
    cap_wait = float(os.environ.get("VIES_RETRY_MAX_WAIT_SEC", "8"))
    max_total_sec = float(os.environ.get("VIES_MAX_TOTAL_SEC", "12.0"))

    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    client: httpx.AsyncClient = _vies_http
    url = _vies_soap_url() or "https://ec.europa.eu/taxation_customs/vies/services/checkVatService"
    body = _build_vies_soap_approx_envelope(payload)
    headers = _vies_soap_http_headers()
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


def _merge_soap_trader_into_rest(
    rest_data: dict[str, Any],
    soap_data: dict[str, Any],
    *,
    fallback_used_key: str = "soapApproxFallbackUsed",
    raw_key: str = "soapApproxRaw",
) -> dict[str, Any]:
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

    merged[fallback_used_key] = True
    merged[raw_key] = soap_data
    return merged


def _merge_soap_approx_into_rest(rest_data: dict[str, Any], soap_data: dict[str, Any]) -> dict[str, Any]:
    return _merge_soap_trader_into_rest(rest_data, soap_data)


async def _vies_ms_lookup_with_retries(payload: dict[str, str]) -> dict[str, Any]:
    """Call the same website-style ms/{country}/vat/{vat} endpoint used by the VIES UI."""
    max_retries = max(1, int(os.environ.get("VIES_MAX_RETRIES", "3")))
    base_wait = float(os.environ.get("VIES_RETRY_BASE_SEC", "0.4"))
    cap_wait = float(os.environ.get("VIES_RETRY_MAX_WAIT_SEC", "8"))
    max_total_sec = float(os.environ.get("VIES_MAX_TOTAL_SEC", "12.0"))

    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    client: httpx.AsyncClient = _vies_http
    url = _vies_ms_lookup_url(payload["countryCode"], payload["vatNumber"])
    params = {
        key: value
        for key, value in {
            "requesterMemberStateCode": _soap_text(payload.get("requesterMemberStateCode")),
            "requesterNumber": _soap_text(payload.get("requesterNumber")),
            "traderName": _soap_text(payload.get("traderName")),
            "traderStreet": _soap_text(payload.get("traderStreet")),
            "traderPostalCode": _soap_text(payload.get("traderPostalCode")),
            "traderCity": _soap_text(payload.get("traderCity")),
            "traderCompanyType": _soap_text(payload.get("traderCompanyType")),
        }.items()
        if value
    }
    last_detail = "VIES ms lookup temporarily unavailable"
    loop_start = asyncio.get_event_loop().time()

    async with _vies_serial:
        for attempt in range(max_retries):
            elapsed = asyncio.get_event_loop().time() - loop_start
            if elapsed >= max_total_sec:
                raise HTTPException(status_code=503, detail=_vies_timeout_detail("VIES ms lookup", elapsed, max_total_sec))
            if attempt > 0:
                sleep_sec = base_wait * (2 ** (attempt - 1)) + random.uniform(0, 0.55)
                sleep_sec = min(sleep_sec, cap_wait, max_total_sec - elapsed - 1.0)
                if sleep_sec > 0:
                    await asyncio.sleep(sleep_sec)
            request_budget_sec = _vies_remaining_request_sec(loop_start, max_total_sec)
            if request_budget_sec <= 0.5:
                elapsed = asyncio.get_event_loop().time() - loop_start
                raise HTTPException(status_code=503, detail=_vies_timeout_detail("VIES ms lookup", elapsed, max_total_sec))
            try:
                r = await client.get(url, params=params, timeout=_vies_request_timeout(request_budget_sec))
            except httpx.TimeoutException as e:
                elapsed = asyncio.get_event_loop().time() - loop_start
                last_detail = _vies_timeout_detail("VIES ms lookup", elapsed, max_total_sec)
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=503, detail=last_detail) from e
            except httpx.RequestError as e:
                last_detail = f"VIES ms lookup request failed: {e!s}"
                if attempt < max_retries - 1 and _vies_failure_retryable({}, 503):
                    continue
                raise HTTPException(status_code=502, detail=last_detail) from e

            try:
                data: dict[str, Any] = r.json()
            except ValueError as e:
                raise HTTPException(status_code=502, detail="VIES ms lookup returned a non-JSON body") from e

            if r.status_code >= 400:
                last_detail = _vies_error_message(data) or r.text
                if attempt < max_retries - 1 and _vies_failure_retryable(data, r.status_code):
                    continue
                raise HTTPException(status_code=502, detail=last_detail)

            if "isValid" not in data:
                last_detail = "Unexpected VIES ms lookup response shape (expected isValid field)"
                if attempt < max_retries - 1:
                    continue
                raise HTTPException(status_code=502, detail=last_detail)
            return data

    raise HTTPException(status_code=503, detail=last_detail)


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


def _demo_customers_db_path() -> Path:
    raw = os.environ.get("DEMO_CUSTOMERS_DB_PATH", "demo_shared.db").strip() or "demo_shared.db"
    return Path(raw)


def _demo_api_key() -> str | None:
    key = os.environ.get("DEMO_API_KEY", "").strip()
    return key or None


def _assert_demo_api_key(x_demo_key: str | None) -> None:
    expected = _demo_api_key()
    if expected is None:
        return
    if (x_demo_key or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing x-demo-key")


def _demo_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _init_demo_store() -> None:
    db_path = _demo_customers_db_path()
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS demo_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _demo_get_customers_state() -> tuple[dict[str, Any] | None, str | None]:
    db_path = _demo_customers_db_path()
    with sqlite3.connect(db_path) as conn:
        cur = conn.execute(
            "SELECT value, updated_at FROM demo_store WHERE key = ?",
            ("customers_db",),
        )
        row = cur.fetchone()
    if row is None:
        return None, None
    try:
        parsed = json.loads(str(row[0]))
    except json.JSONDecodeError:
        return None, str(row[1])
    if isinstance(parsed, dict):
        return parsed, str(row[1])
    return None, str(row[1])


def _is_kunden_db_state_shape(state: dict[str, Any]) -> bool:
    required_array_keys = ("kunden", "kundenWash", "rollen", "unterlagen")
    required_number_keys = ("nextKundeId", "nextWashId", "nextRolleId", "nextUnterlageId")
    if state.get("version") != 1:
        return False
    for key in required_array_keys:
        if not isinstance(state.get(key), list):
            return False
    for key in required_number_keys:
        if not isinstance(state.get(key), int):
            return False
    return True


def _demo_save_customers_state(state: dict[str, Any]) -> tuple[dict[str, Any], str]:
    if not _is_kunden_db_state_shape(state):
        raise HTTPException(status_code=400, detail="Invalid customers state shape")
    updated_at = _demo_now_iso()
    db_path = _demo_customers_db_path()
    payload = json.dumps(state, ensure_ascii=False)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO demo_store (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            ("customers_db", payload, updated_at),
        )
        conn.commit()
    return state, updated_at


class DemoCustomersDbPayload(BaseModel):
    state: dict[str, Any]


def _nominatim_base() -> str:
    return os.environ.get(
        "NOMINATIM_API_BASE",
        "https://nominatim.openstreetmap.org",
    ).rstrip("/")


def _nominatim_user_agent() -> str:
    return os.environ.get(
        "NOMINATIM_USER_AGENT",
        "DemaDashboard/1.0 (address search proxy; configure NOMINATIM_USER_AGENT for production)",
    ).strip() or "DemaDashboard/1.0"


def _photon_base() -> str:
    return os.environ.get("PHOTON_API_BASE", "https://photon.komoot.io").rstrip("/")


def _photon_geocoding_enabled() -> bool:
    v = os.environ.get("GEOCODE_DISABLE_PHOTON", "").strip().lower()
    return v not in ("1", "true", "yes", "on")


def _stable_place_id(
    osm_type: str | None, osm_id: int | None, label: str
) -> int:
    raw = f"{osm_type or ''}|{osm_id or ''}|{label[:120]}"
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(h[:12], 16) % 1_000_000_000


def _photon_feature_to_nominatim(feature: Any) -> dict[str, Any] | None:
    """Map one Photon GeoJSON feature to a Nominatim-shaped dict for the frontend."""
    if not isinstance(feature, dict) or feature.get("type") != "Feature":
        return None
    props = feature.get("properties")
    if not isinstance(props, dict):
        return None

    def _s(key: str) -> str | None:
        v = props.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
        return None

    street = _s("street")
    housenumber = _s("housenumber")
    name = _s("name")
    postcode = _s("postcode")
    city = (
        _s("city")
        or _s("town")
        or _s("village")
        or _s("hamlet")
        or _s("locality")
        or _s("district")
    )
    country = _s("country")
    cc_raw = props.get("countrycode")
    country_code: str | None
    if isinstance(cc_raw, str) and cc_raw.strip():
        country_code = cc_raw.strip().upper()
    else:
        country_code = None
    state = _s("state")
    county = _s("county")

    line1 = ""
    if street and housenumber:
        line1 = f"{street} {housenumber}"
    elif street:
        line1 = street
    elif name:
        line1 = name
    else:
        line1 = ""

    tail: list[str] = []
    if postcode:
        tail.append(postcode)
    if city:
        tail.append(city)
    if country:
        tail.append(country)

    display_parts: list[str] = []
    if line1:
        display_parts.append(line1)
    display_parts.extend(tail)
    display_name = ", ".join(display_parts) if display_parts else (name or "")
    if not display_name.strip():
        return None

    osm_raw = props.get("osm_id")
    osm_id: int | None
    if isinstance(osm_raw, int):
        osm_id = osm_raw
    elif isinstance(osm_raw, str) and osm_raw.isdigit():
        osm_id = int(osm_raw)
    else:
        osm_id = None
    osm_t = props.get("osm_type")
    osm_type = osm_t[:1] if isinstance(osm_t, str) and osm_t else None

    addr: dict[str, Any] = {}
    if street:
        addr["road"] = street
    if housenumber:
        addr["house_number"] = housenumber
    if postcode:
        addr["postcode"] = postcode
    if city:
        addr["city"] = city
    if state:
        addr["state"] = state
    if county:
        addr["county"] = county
    if country:
        addr["country"] = country
    if country_code:
        addr["country_code"] = country_code.lower()

    return {
        "place_id": _stable_place_id(osm_type, osm_id, display_name),
        "display_name": display_name,
        "name": name,
        "address": addr,
    }


def _merge_geocode_results(
    photon_first: list[dict[str, Any]],
    nominatim: list[dict[str, Any]],
    *,
    max_items: int,
) -> list[dict[str, Any]]:
    """Prefer Photon ordering (strong for partial address typing), then add Nominatim-only hits."""
    seen: set[str] = set()
    out: list[dict[str, Any]] = []

    def norm(item: dict[str, Any]) -> str:
        dn = item.get("display_name")
        if not isinstance(dn, str):
            return ""
        return " ".join(dn.lower().split())

    for item in photon_first:
        k = norm(item)
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(item)
        if len(out) >= max_items:
            return out

    for item in nominatim:
        k = norm(item)
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(item)
        if len(out) >= max_items:
            break
    return out


async def _fetch_photon_results(
    client: httpx.AsyncClient, q: str, lang: str
) -> list[dict[str, Any]]:
    if not _photon_geocoding_enabled():
        return []
    photon_lang = lang[:2] if len(lang) >= 2 else "en"
    url = f"{_photon_base()}/api/"
    params = {"q": q, "limit": "18", "lang": photon_lang}
    try:
        r = await client.get(
            url,
            params=params,
            headers={
                "Accept": "application/json",
                "User-Agent": _nominatim_user_agent(),
            },
            timeout=httpx.Timeout(10.0, connect=5.0),
        )
    except (httpx.TimeoutException, httpx.RequestError):
        return []
    if r.status_code >= 400:
        return []
    try:
        data = r.json()
    except ValueError:
        return []
    if not isinstance(data, dict):
        return []
    features = data.get("features")
    if not isinstance(features, list):
        return []
    out: list[dict[str, Any]] = []
    for feat in features:
        conv = _photon_feature_to_nominatim(feat)
        if conv:
            out.append(conv)
    return out


async def _fetch_nominatim_results(
    client: httpx.AsyncClient, q: str, lang: str
) -> list[dict[str, Any]]:
    params = {
        "q": q,
        "format": "json",
        "addressdetails": "1",
        "limit": "15",
        "accept-language": lang,
    }
    url = f"{_nominatim_base()}/search"
    try:
        r = await client.get(
            url,
            params=params,
            headers={
                "User-Agent": _nominatim_user_agent(),
                "Accept": "application/json",
            },
            timeout=httpx.Timeout(12.0, connect=6.0),
        )
    except (httpx.TimeoutException, httpx.RequestError):
        return []
    if r.status_code >= 400:
        return []
    try:
        data = r.json()
    except ValueError:
        return []
    if not isinstance(data, list):
        return []
    return data


def _geocoding_provider_normalized() -> str:
    v = (os.environ.get("GEOCODING_PROVIDER") or "osm").strip().lower()
    if v in ("osm", "openstreetmap", "photon", "nominatim", ""):
        return "osm"
    if v == "mapbox":
        return "mapbox"
    if v in ("google", "google_maps", "gmaps"):
        return "google"
    return "invalid"


def _google_maps_api_key() -> str | None:
    k = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("GOOGLE_GEOCODING_API_KEY")
    if isinstance(k, str) and k.strip():
        return k.strip()
    return None


def _mapbox_access_token() -> str | None:
    k = os.environ.get("MAPBOX_ACCESS_TOKEN")
    if isinstance(k, str) and k.strip():
        return k.strip()
    return None


def _google_geocode_result_to_nominatim(gr: Any) -> dict[str, Any] | None:
    if not isinstance(gr, dict):
        return None
    formatted = gr.get("formatted_address")
    if not isinstance(formatted, str) or not formatted.strip():
        return None
    components = gr.get("address_components")
    if not isinstance(components, list):
        components = []
    by_type: dict[str, tuple[str, str]] = {}
    for c in components:
        if not isinstance(c, dict):
            continue
        types = c.get("types")
        if not isinstance(types, list):
            continue
        ln = str(c.get("long_name") or "")
        sn = str(c.get("short_name") or "")
        for t in types:
            if isinstance(t, str) and t not in by_type:
                by_type[t] = (ln, sn)

    def _long(*keys: str) -> str | None:
        for k in keys:
            p = by_type.get(k)
            if p and p[0].strip():
                return p[0].strip()
        return None

    route = _long("route")
    street_number = _long("street_number")
    city = _long(
        "locality",
        "postal_town",
        "sublocality",
        "sublocality_level_1",
        "administrative_area_level_2",
        "administrative_area_level_1",
    )
    postcode = _long("postal_code")
    country = _long("country")
    cc_pair = by_type.get("country")
    country_code = cc_pair[1].upper() if cc_pair and cc_pair[1] else None
    state = _long("administrative_area_level_1")
    county = _long("administrative_area_level_2")
    poi = _long("premise", "point_of_interest", "establishment")

    addr: dict[str, Any] = {}
    if route:
        addr["road"] = route
    if street_number:
        addr["house_number"] = street_number
    if postcode:
        addr["postcode"] = postcode
    if city:
        addr["city"] = city
    if state:
        addr["state"] = state
    if county:
        addr["county"] = county
    if country:
        addr["country"] = country
    if country_code:
        addr["country_code"] = country_code.lower()

    pid = gr.get("place_id")
    label_ref = str(pid) if isinstance(pid, str) else formatted
    place_id_num = _stable_place_id("G", None, label_ref)

    return {
        "place_id": place_id_num,
        "display_name": formatted.strip(),
        "name": poi,
        "address": addr,
    }


def _mapbox_parse_context(context: Any) -> dict[str, str]:
    out: dict[str, str] = {}
    if not isinstance(context, list):
        return out
    for item in context:
        if not isinstance(item, dict):
            continue
        cid = item.get("id")
        if not isinstance(cid, str) or "." not in cid:
            continue
        prefix = cid.split(".", 1)[0]
        txt = item.get("text")
        text = txt.strip() if isinstance(txt, str) else ""
        if prefix == "postcode":
            out["postcode"] = text
        elif prefix == "place":
            out["city"] = text
        elif prefix == "district":
            out["district"] = text
        elif prefix == "region":
            out["region"] = text
        elif prefix == "country":
            out["country"] = text
            sc = item.get("short_code")
            if isinstance(sc, str) and sc.strip():
                out["country_code"] = sc.strip().upper()
    return out


def _mapbox_feature_to_nominatim(feature: Any) -> dict[str, Any] | None:
    if not isinstance(feature, dict) or feature.get("type") != "Feature":
        return None
    place_name = feature.get("place_name")
    if not isinstance(place_name, str) or not place_name.strip():
        return None
    text_raw = feature.get("text")
    text = text_raw.strip() if isinstance(text_raw, str) else ""
    addr_num = feature.get("address")
    housenumber = addr_num.strip() if isinstance(addr_num, str) else ""

    ctx = _mapbox_parse_context(feature.get("context"))
    postcode = ctx.get("postcode")
    city = ctx.get("city")
    country = ctx.get("country")
    country_code = ctx.get("country_code")
    state = ctx.get("region")

    place_types = feature.get("place_type")
    is_address = isinstance(place_types, list) and "address" in place_types

    if is_address and housenumber and text:
        line1 = f"{housenumber} {text}"
    elif text:
        line1 = text
    else:
        line1 = place_name.split(",")[0].strip()

    addr: dict[str, Any] = {}
    if text and is_address:
        addr["road"] = text
    if housenumber:
        addr["house_number"] = housenumber
    if postcode:
        addr["postcode"] = postcode
    if city:
        addr["city"] = city
    if state:
        addr["state"] = state
    if country:
        addr["country"] = country
    if country_code:
        ccu = country_code.upper()
        addr["country_code"] = ccu.lower() if len(ccu) == 2 else ccu.lower()

    fid = feature.get("id")
    label_ref = str(fid) if isinstance(fid, str) else place_name

    return {
        "place_id": _stable_place_id("M", None, label_ref),
        "display_name": place_name.strip(),
        "name": line1 or None,
        "address": addr,
    }


async def _fetch_google_geocode_results(
    client: httpx.AsyncClient, q: str, lang: str, api_key: str
) -> list[dict[str, Any]]:
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    lang_param = lang if len(lang) > 2 and lang[2] == "-" else lang[:2]
    params: dict[str, str] = {"address": q, "key": api_key}
    if lang_param:
        params["language"] = lang_param
    try:
        r = await client.get(
            url,
            params=params,
            headers={"Accept": "application/json"},
            timeout=httpx.Timeout(12.0, connect=6.0),
        )
    except (httpx.TimeoutException, httpx.RequestError):
        return []
    if r.status_code >= 400:
        return []
    try:
        data = r.json()
    except ValueError:
        return []
    if not isinstance(data, dict):
        return []
    status = data.get("status")
    if status == "ZERO_RESULTS":
        return []
    if status != "OK":
        err = data.get("error_message")
        msg = f"Google Geocoding: {status}"
        if isinstance(err, str) and err.strip():
            msg = f"{msg}: {err.strip()[:200]}"
        raise HTTPException(status_code=502, detail=msg)
    results = data.get("results")
    if not isinstance(results, list):
        return []
    out: list[dict[str, Any]] = []
    for gr in results[:12]:
        conv = _google_geocode_result_to_nominatim(gr)
        if conv:
            out.append(conv)
    return out


async def _fetch_mapbox_geocode_results(
    client: httpx.AsyncClient, q: str, lang: str, token: str
) -> list[dict[str, Any]]:
    enc = quote(q, safe="")
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{enc}.json"
    lang_m = lang[:2] if len(lang) >= 2 else "en"
    params = {"access_token": token, "limit": "12", "language": lang_m}
    try:
        r = await client.get(
            url,
            params=params,
            headers={"Accept": "application/json"},
            timeout=httpx.Timeout(12.0, connect=6.0),
        )
    except (httpx.TimeoutException, httpx.RequestError):
        return []
    try:
        data = r.json()
    except ValueError:
        data = None
    if r.status_code >= 400:
        m = None
        if isinstance(data, dict):
            raw_m = data.get("message")
            if isinstance(raw_m, str):
                m = raw_m.strip()[:200]
        raise HTTPException(
            status_code=502,
            detail=f"Mapbox HTTP {r.status_code}: {m or 'request failed'}",
        )
    if not isinstance(data, dict):
        return []
    features = data.get("features")
    if not isinstance(features, list):
        return []
    out: list[dict[str, Any]] = []
    for feat in features:
        conv = _mapbox_feature_to_nominatim(feat)
        if conv:
            out.append(conv)
    return out


@app.get("/")
async def api_root() -> dict[str, Any]:
    """Browser hits this when you open http://127.0.0.1:8000/ — the UI lives on Vite (e.g. :5173)."""
    return {
        "service": "Dema Dashboard API",
        "note": "Open the app in the Vite dev server (usually http://localhost:5173), not this port.",
        "health": "/api/health",
        "docs": "/docs",
        "geocode_try": "/api/v1/geocode/search?q=berlin&lang=en",
        "geocode_provider": "/api/v1/geocode/provider",
    }


@app.head("/", include_in_schema=False)
async def api_root_head() -> Response:
    """Render and other platforms probe HEAD / for deploy health; must not return 404."""
    return Response(status_code=200)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    """Avoid 404 noise when a browser requests a favicon on the API origin."""
    return Response(status_code=204)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "cors_origins": _cors_origins()}


@app.get("/api/v1/geocode/provider")
def geocode_provider_public() -> dict[str, str]:
    """Which backend geocoder is active (for UI attribution). No secrets."""
    return {"provider": _geocoding_provider_normalized()}


@app.get("/api/v1/geocode/search")
async def geocode_search(
    q: str,
    lang: str = "en",
) -> list[dict[str, Any]]:
    """Address search.

    * ``GEOCODING_PROVIDER=osm`` (default): Photon + Nominatim (OpenStreetMap), merged.
    * ``GEOCODING_PROVIDER=mapbox``: Mapbox Geocoding v5 — set ``MAPBOX_ACCESS_TOKEN``.
    * ``GEOCODING_PROVIDER=google``: Google Geocoding API — set ``GOOGLE_MAPS_API_KEY``.
    """
    raw = (q or "").strip()
    if len(raw) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    if len(raw) > 256:
        raise HTTPException(status_code=400, detail="Query too long")
    lang_clean = (lang or "en").strip()[:12] or "en"
    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    client: httpx.AsyncClient = _vies_http

    prov = _geocoding_provider_normalized()
    if prov == "invalid":
        raise HTTPException(
            status_code=503,
            detail="Invalid GEOCODING_PROVIDER; use osm, mapbox, or google.",
        )

    if prov == "google":
        gkey = _google_maps_api_key()
        if not gkey:
            raise HTTPException(
                status_code=503,
                detail="GEOCODING_PROVIDER=google requires GOOGLE_MAPS_API_KEY "
                "(or GOOGLE_GEOCODING_API_KEY).",
            )
        return await _fetch_google_geocode_results(client, raw, lang_clean, gkey)

    if prov == "mapbox":
        tok = _mapbox_access_token()
        if not tok:
            raise HTTPException(
                status_code=503,
                detail="GEOCODING_PROVIDER=mapbox requires MAPBOX_ACCESS_TOKEN.",
            )
        return await _fetch_mapbox_geocode_results(client, raw, lang_clean, tok)

    photon_list, nomi_list = await asyncio.gather(
        _fetch_photon_results(client, raw, lang_clean),
        _fetch_nominatim_results(client, raw, lang_clean),
    )
    return _merge_geocode_results(photon_list, nomi_list, max_items=18)


@app.get("/api/v1/demo/customers-db")
async def demo_get_customers_db(
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> dict[str, Any]:
    _assert_demo_api_key(x_demo_key)
    state, updated_at = _demo_get_customers_state()
    return {"state": state, "updated_at": updated_at}


@app.put("/api/v1/demo/customers-db")
async def demo_put_customers_db(
    body: DemoCustomersDbPayload,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> dict[str, Any]:
    _assert_demo_api_key(x_demo_key)
    state, updated_at = _demo_save_customers_state(body.state)
    return {"state": state, "updated_at": updated_at}


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
    12 s for fast user-facing response.  Raise it (or set VIES_MAX_RETRIES higher) only if
    your cloud platform explicitly supports long-running requests.
    """
    max_retries = max(1, int(os.environ.get("VIES_MAX_RETRIES", "3")))
    base_wait = float(os.environ.get("VIES_RETRY_BASE_SEC", "0.4"))
    cap_wait = float(os.environ.get("VIES_RETRY_MAX_WAIT_SEC", "8"))
    # Hard wall-clock budget for the whole retry loop (including sleeps + VIES call time).
    # Keeps us well inside the 30 s window most cloud reverse proxies enforce.
    max_total_sec = float(os.environ.get("VIES_MAX_TOTAL_SEC", "12.0"))

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


async def _vies_call_simple_once(url: str, json_body: dict[str, Any]) -> dict[str, Any]:
    """Simple one-shot VIES REST call (no retries, no SOAP/MS fallbacks)."""
    if _vies_http is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    timeout_sec = float(os.environ.get("VIES_SIMPLE_TIMEOUT_SEC", "8.0"))
    try:
        r = await _vies_http.post(url, json=json_body, timeout=httpx.Timeout(timeout_sec, connect=min(4.0, timeout_sec)))
    except httpx.TimeoutException as e:
        raise HTTPException(
            status_code=503,
            detail=f"VIES check timed out after {timeout_sec:.0f} s. Please try again.",
        ) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"VIES request failed: {e!s}") from e

    try:
        data: dict[str, Any] = r.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail="VIES returned a non-JSON body") from e

    _dump_vies_response(r.status_code, 0, data)

    if data.get("actionSucceed") is False:
        raise HTTPException(status_code=503 if r.status_code < 400 else r.status_code, detail=_vies_error_message(data))
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=_vies_error_message(data) or r.text)
    if "valid" not in data:
        raise HTTPException(status_code=502, detail="Unexpected VIES response shape (expected check-vat response)")
    return data


def _sanitize_raw_for_display(data: dict[str, Any]) -> dict[str, Any]:
    """Replace VIES placeholder values ('---' etc.) with None in the raw payload for clean display."""
    out: dict[str, Any] = {}
    for k, v in data.items():
        if isinstance(v, str):
            if k.endswith("Match"):
                match_value = _soap_match_to_rest(v)
                out[k] = None if (not match_value or match_value == "NOT_PROCESSED") else match_value
            else:
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


async def _enrich_vies_data_with_fallbacks(payload: dict[str, str], initial_data: dict[str, Any]) -> dict[str, Any]:
    """Try extra VIES sources sequentially until details/matches are resolved.

    Each fallback is only called when the previous result still has gaps, so the
    common case (REST already returned everything) exits immediately.  The speed
    improvement over older code comes from the tighter retry/timeout defaults.
    """
    data = dict(initial_data)
    cc = payload.get("countryCode", "")
    vat = payload.get("vatNumber", "")

    needs_more = _rest_missing_trader_details(data) or _rest_matches_all_not_processed(data)
    if not needs_more:
        return data

    run_ms_lookup = _payload_has_approx_inputs(payload) or (
        bool(data.get("valid")) and _rest_missing_trader_details(data)
    )
    if run_ms_lookup:
        try:
            ms_raw = await _vies_ms_lookup_with_retries(payload)
        except HTTPException:
            ms_raw = {}
        if ms_raw:
            ms_data = _normalize_ms_lookup_data(ms_raw, cc, vat)
            data = _merge_soap_trader_into_rest(
                data, ms_data, fallback_used_key="msLookupFallbackUsed", raw_key="msLookupRaw"
            )

    if _vies_soap_check_fallback_enabled() and _rest_missing_trader_details(data):
        try:
            soap_check = await _vies_soap_check_with_retries(payload)
        except HTTPException:
            soap_check = {}
        if soap_check:
            data = _merge_soap_trader_into_rest(
                data, soap_check, fallback_used_key="soapCheckFallbackUsed", raw_key="soapCheckRaw"
            )

    if _vies_soap_approx_fallback_enabled() and (
        _rest_matches_all_not_processed(data) or _rest_missing_trader_details(data)
    ):
        try:
            soap_approx = await _vies_soap_approx_with_retries(payload)
        except HTTPException:
            soap_approx = {}
        if soap_approx:
            data = _merge_soap_approx_into_rest(data, soap_approx)

    return data


def _map_vies_check_response(
    data: dict[str, Any],
    cc: str,
    vat: str,
    fallback_name: str | None = None,
    fallback_address: str | None = None,
    display_locale: str = "de",
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

    loc = display_locale if display_locale in ("de", "en") else _resolve_vies_display_locale(None)
    trader_name = _normalize_vies_display_text(trader_name, loc)
    addr = _normalize_vies_display_text(addr, loc)

    details = bool(trader_name or addr)
    if valid and not trader_name and fallback_name:
        trader_name = fallback_name
    if valid and not addr and fallback_address:
        addr = fallback_address
    if valid and not trader_name:
        trader_name = "Not provided by VIES"
    if valid and not addr:
        addr = "Not provided by VIES"

    omit_raw = os.environ.get("VIES_OMIT_RAW_IN_JSON", "").strip().lower() in ("1", "true", "yes", "on")
    raw_payload: dict[str, Any] | None = None if omit_raw else _sanitize_raw_for_display(dict(data))

    def _m(key: str) -> str | None:
        """Expose only meaningful match values at top level."""
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
    display_locale = _resolve_vies_display_locale(body.text_locale)
    return _map_vies_check_response(
        data,
        cc,
        vat,
        fallback_name=fallback_name,
        fallback_address=fallback_address,
        display_locale=display_locale,
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
    data = await _enrich_vies_data_with_fallbacks(payload, data)
    fallback_name, fallback_address = _request_fallback_name_address(body)
    display_locale = _resolve_vies_display_locale(body.text_locale)
    return _map_vies_check_response(
        data,
        cc,
        vat,
        fallback_name=fallback_name,
        fallback_address=fallback_address,
        display_locale=display_locale,
    )
