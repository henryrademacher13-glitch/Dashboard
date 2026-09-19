"""Apollo.io organization records -> Lead.

Separate from `apollo.py` on purpose. That module reads Apollo's *people*
shape, where the top-level `name` is a person and the company is nested under
`organization`. Company-enrichment records invert that: the top-level `name`
IS the company and there is no person at all. Feeding one shape to the other
adapter silently produces leads with no company and no contact, so the two
stay apart rather than growing a mode flag.

Source: apollo_organizations_bulk_enrich / apollo_organizations_enrich.
These records carry a corporate mainline phone, not an owner's direct dial —
the caller is reaching the business, not a named decision maker.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..models import Lead

SOURCE_NAME = "apollo.io/organizations"

# Apollo writes states out in full; criteria.json matches two-letter codes
# exactly (deliberately — substring matching would let "PA" hit "Campania").
# Normalizing here keeps that strictness without rewriting every criteria file.
STATE_CODES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "district of columbia": "DC", "florida": "FL", "georgia": "GA", "hawaii": "HI",
    "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME",
    "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
    "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
    "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI",
    "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
    "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
}

ENVELOPE_KEYS = ("organizations", "accounts", "results", "data")

# Read deliberately; anything else shows up in unmapped_keys().
IGNORED_KEYS = frozenset({
    "id", "logo_url", "linkedin_uid", "sic_codes", "naics_codes",
    "industry_tag_id", "industry_tag_hash", "industries", "secondary_industries",
    "snippets_loaded", "retail_location_count", "num_retail_locations",
    "num_languages", "num_suborganizations", "subsidiary_rollups",
    "funding_events", "departmental_head_count", "show_intent",
    "has_intent_signal_account", "languages", "twitter_url", "facebook_url",
    "angellist_url", "primary_phone", "raw_address", "short_description",
    "organization_revenue_printed", "owned_by_organization",
    "owned_by_organization_id", "owned_by_chain", "ultimate_parent_organization",
    "latest_funding_round_date", "latest_funding_stage",
    "latest_funding_detected_at", "total_funding", "total_funding_printed",
    "organization_headcount_six_month_growth",
    "organization_headcount_twelve_month_growth",
    "organization_headcount_twenty_four_month_growth",
    "keywords", "technology_names", "current_technologies", "batch",
    "org_chart_root_people_ids", "postal_code", "country",
})


def _records(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        for key in ENVELOPE_KEYS:
            value = payload.get(key)
            if isinstance(value, list):
                return [r for r in value if isinstance(r, dict)]
        if payload.get("organization"):
            return [payload["organization"]]
    return []


def _state(record: dict) -> str:
    raw = (record.get("state") or "").strip()
    return STATE_CODES.get(raw.lower(), raw)


def _trade(record: dict) -> str:
    """Best-guess vertical from the keyword list and industry.

    Apollo keyword lists are long and noisy, so this keeps only the terms a
    human would recognise as a trade. The filter also falls back to the company
    name, so a thin value here is not fatal.
    """
    terms: list[str] = []
    for key in ("keywords_sample", "keywords"):
        value = record.get(key)
        if isinstance(value, list):
            terms = [str(v) for v in value]
            break
    industry = str(record.get("industry") or "")
    picked = [t for t in terms if len(t) <= 40][:6]
    return ", ".join(picked) or industry


def from_response(payload: Any) -> list[Lead]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    leads: list[Lead] = []
    for record in _records(payload):
        company = str(record.get("name") or "").strip()
        if not company:
            continue
        employees = record.get("estimated_num_employees")
        if not isinstance(employees, int):
            employees = None
        note = record.get("_note") or record.get("_data_quality_note") or ""
        leads.append(Lead(
            company=company,
            trade=_trade(record),
            address=str(record.get("street_address") or "").strip(),
            city=str(record.get("city") or "").strip(),
            state=_state(record),
            country=str(record.get("country") or "United States").strip(),
            website=str(record.get("website_url") or record.get("primary_domain") or "").strip(),
            contact_name="",   # company enrichment carries no person
            title="",
            email="",          # nor an email
            phone=str(record.get("phone") or record.get("sanitized_phone") or "").strip(),
            employees=employees,
            linkedin=str(record.get("linkedin_url") or "").strip(),
            source=SOURCE_NAME,
            source_id=str(record.get("id") or ""),
            retrieved_at=now,
            notes=str(note),
        ))
    return leads


def unmapped_keys(payload: Any) -> set[str]:
    read = {
        "name", "city", "state", "country", "website_url", "primary_domain",
        "phone", "sanitized_phone", "estimated_num_employees", "linkedin_url",
        "id", "_note", "_data_quality_note", "industry", "keywords_sample",
        "street_address",
        "founded_year", "organization_revenue",
    }
    seen: set[str] = set()
    for record in _records(payload):
        seen |= set(record.keys())
    return seen - read - IGNORED_KEYS
