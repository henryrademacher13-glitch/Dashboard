"""Google Maps (via scrape.do) -> Lead.

Written against a real payload, not documentation: the probe run returned
`local_results` with 20 records whose keys are

    address data_cid data_id extensions gps_coordinates hours open_state
    operating_hours phone place_id position provider_id rating reviews
    service_options thumbnail title type type_id type_ids types
    unsupported_extensions user_review website

The envelope (search_metadata / search_parameters / local_results) is SerpApi's
google_maps schema, which scrape.do mirrors.

Unlike the Apollo path, phone arrives with the listing — no enrichment step and
no per-record credit. There is no email: Maps does not publish one.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from ..models import Lead

SOURCE_NAME = "google-maps/scrape.do"

ENVELOPE_KEYS = ("local_results", "place_results", "results")

# Two-letter state sitting before an optional ZIP at the end of a US address.
STATE_RE = re.compile(r",\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$")

# Read deliberately; anything else surfaces in unmapped_keys().
IGNORED_KEYS = frozenset({
    "data_cid", "data_id", "provider_id", "position", "thumbnail",
    "gps_coordinates", "hours", "operating_hours", "open_state",
    "service_options", "extensions", "unsupported_extensions", "user_review",
    "type_id", "type_ids", "place_id", "description", "price", "booking_link",
    "order_online", "reserve_a_table", "web_results_link", "images",
})


def _records(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        for key in ENVELOPE_KEYS:
            value = payload.get(key)
            if isinstance(value, list):
                return [r for r in value if isinstance(r, dict)]
    return []


def _split_address(address: str) -> tuple[str, str, str]:
    """('123 Main St, Trenton, NJ 08608') -> ('123 Main St', 'Trenton', 'NJ').

    Street is returned separately because a CRM import wants it in its own
    column: repeating the city and state inside the street line duplicates the
    dedicated fields and confuses column auto-mapping on the way in.

    Maps writes the state as a two-letter code already, which is what
    criteria.json matches on, so no normalization table is needed here.
    """
    address = (address or "").strip()
    if not address:
        return "", "", ""
    match = STATE_RE.search(address)
    if not match:
        # No parseable state: keep the whole string as street rather than
        # discarding an address that a human could still read and use.
        return address, "", ""
    state = match.group(1)
    parts = [p.strip() for p in address[: match.start()].split(",") if p.strip()]
    city = parts[-1] if parts else ""
    street = ", ".join(parts[:-1]) if len(parts) > 1 else ""
    return street, city, state


def _trade(record: dict) -> str:
    """Maps categorises listings directly — far cleaner than keyword lists."""
    types = record.get("types")
    if isinstance(types, list) and types:
        return ", ".join(str(t) for t in types[:4])
    single = record.get("type")
    return str(single) if single else ""


def _notes(record: dict) -> str:
    """Qualification signals Apollo never provided.

    unclaimed_listing is the commercially interesting one: the owner has not
    claimed their Google Business Profile, so nobody is managing their online
    presence. For anyone selling marketing services that is a pre-qualified
    prospect, so it leads the string rather than being buried after the rating.
    """
    bits = []
    if record.get("unclaimed_listing"):
        bits.append("UNCLAIMED LISTING")
    rating, reviews = record.get("rating"), record.get("reviews")
    if rating is not None:
        bits.append(f"{rating}★")
    if reviews is not None:
        bits.append(f"{reviews} reviews")
    return " / ".join(bits)


def from_response(payload: Any) -> list[Lead]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    leads: list[Lead] = []
    for record in _records(payload):
        company = str(record.get("title") or "").strip()
        if not company:
            continue
        street, city, state = _split_address(str(record.get("address") or ""))
        leads.append(Lead(
            company=company,
            trade=_trade(record),
            address=street,
            city=city,
            state=state,
            country="United States",
            website=str(record.get("website") or "").strip(),
            contact_name="",            # Maps lists businesses, not people
            title="",
            email="",                   # Maps publishes no email
            phone=str(record.get("phone") or "").strip(),
            employees=None,             # not published
            linkedin="",
            source=SOURCE_NAME,
            source_id=str(record.get("place_id") or record.get("data_cid") or ""),
            retrieved_at=now,
            notes=_notes(record),
        ))
    return leads


def unmapped_keys(payload: Any) -> set[str]:
    read = {"title", "address", "website", "phone", "rating", "reviews",
            "types", "type", "place_id", "data_cid", "unclaimed_listing"}
    seen: set[str] = set()
    for record in _records(payload):
        seen |= set(record.keys())
    return seen - read - IGNORED_KEYS
