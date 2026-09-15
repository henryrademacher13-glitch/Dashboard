"""Apollo.io -> Lead.

  ! UNVERIFIED AGAINST THE LIVE API.
  !
  ! The Apollo connector was not authorized when this was written, so its
  ! tools never loaded and not one real response was ever seen. Field names
  ! below come from Apollo's documented People Search shape. The mapping is
  ! written defensively — every lookup has fallbacks and nothing raises on a
  ! missing key — but treat the first real run as a calibration run and check
  ! `unmapped_keys()` before trusting a full export.

Apollo arrives through MCP tools, not a REST client, so this module never
makes a network call. It takes the dicts those tools hand back and normalizes
them. That keeps the fragile part — field naming — in one testable place.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

from ..models import Lead

SOURCE_NAME = "apollo.io"

# Apollo nests the company under different keys depending on the endpoint:
# People Search returns `organization`, some enrichment paths return `account`.
ORG_KEYS = ("organization", "account", "company")

# Keys we deliberately ignore, so unmapped_keys() reports genuine surprises
# rather than noise on every single record.
IGNORED_KEYS = frozenset({
    "id", "photo_url", "headline", "intent_strength", "show_intent",
    "revealed_for_current_team", "is_likely_to_engage", "departments",
    "subdepartments", "functions", "seniority", "email_status",
    "organization_id", "account_id", "extrapolated_email_confidence",
})


def _first(record: dict, *keys: str, default: str = "") -> Any:
    """First key present with a non-empty, non-null value."""
    for key in keys:
        value = record.get(key)
        if value not in (None, "", [], {}):
            return value
    return default


def _org(record: dict) -> dict:
    for key in ORG_KEYS:
        value = record.get(key)
        if isinstance(value, dict):
            return value
    return {}


def _name(record: dict) -> str:
    full = _first(record, "name", "full_name")
    if full:
        return str(full).strip()
    parts = [str(_first(record, "first_name")), str(_first(record, "last_name"))]
    return " ".join(p for p in parts if p).strip()


def _phone(record: dict, org: dict) -> str:
    """Apollo scatters phone numbers across several shapes."""
    direct = _first(record, "sanitized_phone", "direct_phone", "mobile_phone", "phone")
    if direct:
        return str(direct)

    # phone_numbers: [{"sanitized_number": "+16105550134", "type": "work"}, ...]
    numbers = record.get("phone_numbers") or org.get("phone_numbers")
    if isinstance(numbers, list):
        for entry in numbers:
            if isinstance(entry, dict):
                value = _first(entry, "sanitized_number", "raw_number", "number")
                if value:
                    return str(value)
            elif entry:
                return str(entry)

    return str(_first(org, "sanitized_phone", "phone", "primary_phone") or "")


def _email(record: dict) -> str:
    email = _first(record, "email")
    # Apollo returns this placeholder for contacts whose address is gated
    # behind a credit spend. It is not an address; treat it as absent so the
    # contactable filter does not pass a lead you cannot actually reach.
    if isinstance(email, str) and email.strip().lower() in {
        "email_not_unlocked@domain.com", "not_unlocked@domain.com",
    }:
        return ""
    return str(email or "")


def from_record(record: dict, retrieved_at: str = "") -> Lead:
    """One Apollo person/organization record -> one Lead."""
    org = _org(record)
    stamp = retrieved_at or datetime.now(timezone.utc).isoformat(timespec="seconds")

    employees = _first(org, "estimated_num_employees", "employee_count", default=None)
    try:
        employees = int(employees) if employees is not None else None
    except (TypeError, ValueError):
        employees = None

    # Apollo's `industry` is its own taxonomy ("construction"), which is usually
    # too coarse to be the trade. Prefer the finer keywords when present.
    keywords = org.get("keywords")
    trade = ""
    if isinstance(keywords, list) and keywords:
        trade = ", ".join(str(k) for k in keywords[:3])
    if not trade:
        trade = str(_first(org, "industry", default="") or _first(record, "industry"))

    return Lead(
        company=str(_first(org, "name", default="") or _first(record, "organization_name")),
        trade=trade,
        city=str(_first(record, "city") or _first(org, "city")),
        state=str(_first(record, "state") or _first(org, "state")),
        country=str(_first(record, "country") or _first(org, "country") or "United States"),
        website=str(_first(org, "website_url", "primary_domain", "domain")),
        contact_name=_name(record),
        title=str(_first(record, "title", "job_title")),
        email=_email(record),
        phone=_phone(record, org),
        employees=employees,
        linkedin=str(_first(record, "linkedin_url") or _first(org, "linkedin_url")),
        source=SOURCE_NAME,
        source_id=str(_first(record, "id", "person_id", "contact_id")),
        retrieved_at=stamp,
    )


def from_response(payload: Any, retrieved_at: str = "") -> list[Lead]:
    """Pull the record list out of whatever envelope the tool returned.

    Apollo wraps results under `people`, `contacts`, or `organizations`
    depending on the call; a bare list is also accepted.
    """
    records: Iterable[Any] = []
    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        for key in ("people", "contacts", "organizations", "accounts", "results", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                records = value
                break

    stamp = retrieved_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    return [from_record(r, stamp) for r in records if isinstance(r, dict)]


def unmapped_keys(payload: Any) -> set[str]:
    """Top-level keys this adapter did not read. Run this on the first real call.

    A field carrying something you want — a second phone, a service-area list —
    will show up here rather than being silently dropped.
    """
    mapped = {
        "name", "full_name", "first_name", "last_name", "title", "job_title",
        "email", "city", "state", "country", "linkedin_url", "industry",
        "sanitized_phone", "direct_phone", "mobile_phone", "phone",
        "phone_numbers", "organization_name", "person_id", "contact_id",
        *ORG_KEYS,
    } | IGNORED_KEYS

    records: Iterable[Any] = []
    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        for key in ("people", "contacts", "organizations", "accounts", "results", "data"):
            if isinstance(payload.get(key), list):
                records = payload[key]
                break

    found: set[str] = set()
    for record in records:
        if isinstance(record, dict):
            found |= set(record.keys())
    return found - mapped
