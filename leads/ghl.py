"""Write qualified leads as a GoHighLevel-importable CSV.

GHL's contact importer takes CSV and lets you map columns during upload, but
matching its field names means the mapping step auto-resolves instead of
needing 15 manual pairings. Headers below use GHL's own naming.

Maps listings are businesses, not people, so there is no first/last name and
no email. GHL requires a name-ish field per contact, so Company Name carries
it and Full Name mirrors it — otherwise rows import as blank-named contacts
that are painful to find later.
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

from .models import Lead

# GHL's importer recognises these spellings directly.
COLUMNS = [
    "Full Name", "Company Name", "Phone", "Email", "Website",
    "Address", "City", "State", "Postal Code", "Country",
    "Tags", "Source", "Notes",
]

PHONE_DIGITS = re.compile(r"\D")


def _e164(phone: str) -> str:
    """GHL matches and dials best on E.164; it rejects some pretty formats.

    Maps returns '(609) 555-0142'. Ten digits become +1XXXXXXXXXX; eleven
    starting with 1 likewise. Anything else is passed through unchanged rather
    than mangled into something undiallable.
    """
    digits = PHONE_DIGITS.sub("", phone or "")
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return phone or ""


def _tags(lead: Lead) -> str:
    """Tags drive GHL workflows, so make them filterable rather than prose."""
    tags = []
    if lead.state:
        tags.append(lead.state.lower())
    # First declared category only: the full list is too noisy for a tag.
    primary = (lead.trade or "").split(",")[0].strip().lower()
    if primary:
        tags.append(primary.replace(" ", "-"))
    if "UNCLAIMED LISTING" in (lead.notes or ""):
        tags.append("unclaimed-listing")
    return ", ".join(tags)


def write_csv(path: Path, leads: list[Lead]) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for lead in leads:
            writer.writerow({
                "Full Name": lead.company,
                "Company Name": lead.company,
                "Phone": _e164(lead.phone),
                "Email": lead.email,
                "Website": lead.website,
                "Address": lead.address,
                "City": lead.city,
                "State": lead.state,
                "Postal Code": "",
                "Country": lead.country,
                "Tags": _tags(lead),
                "Source": lead.source,
                "Notes": lead.notes,
            })
    return path
