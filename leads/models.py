"""The normalized lead record.

Every source adapter produces these, so filters, dedup, and the spreadsheet
writer never learn where a lead came from. Adding a second source later means
writing one adapter, not touching anything downstream.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field, fields
from typing import Optional

# Deliberately permissive. This is a "could a human plausibly send to this"
# check for filtering, not an RFC 5322 validator — rejecting a real address
# costs a lead, accepting a bad one costs one bounce.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]+$")

# Apollo and most directories return E.164 or US-formatted numbers. Strip
# everything but digits and require enough of them to dial.
DIGITS_RE = re.compile(r"\D")


@dataclass
class Lead:
    """One business, optionally with one person attached."""

    company: str
    trade: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    country: str = "United States"
    website: str = ""

    contact_name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""

    employees: Optional[int] = None
    linkedin: str = ""

    # Provenance. Never guessed — set by the adapter that produced the record.
    source: str = ""
    source_id: str = ""
    retrieved_at: str = ""

    notes: str = ""
    # Populated by filters.qualify(); explains a rejection in the export.
    rejected_for: list[str] = field(default_factory=list)

    # --- derived ---

    @property
    def has_email(self) -> bool:
        return bool(EMAIL_RE.match(self.email.strip()))

    @property
    def has_phone(self) -> bool:
        digits = DIGITS_RE.sub("", self.phone)
        # 10 digits US, 11 with country code. Shorter is an extension or junk.
        return 10 <= len(digits) <= 15

    @property
    def is_contactable(self) -> bool:
        return self.has_email or self.has_phone

    @property
    def dedup_key(self) -> str:
        """Identity for deduplication.

        Domain first: two Apollo records for the same firm can differ in name
        formatting ("Smith & Sons" vs "Smith and Sons, Inc.") but share a site.
        Falls back to a normalized name plus city.
        """
        domain = normalize_domain(self.website)
        if domain:
            return f"domain:{domain}"
        name = re.sub(r"[^a-z0-9]", "", self.company.lower())
        return f"name:{name}|{self.city.strip().lower()}"

    def to_row(self) -> dict:
        return asdict(self)

    @classmethod
    def field_names(cls) -> list[str]:
        return [f.name for f in fields(cls)]


def normalize_domain(website: str) -> str:
    """example.com from https://www.Example.com/contact?x=1 — '' if unusable."""
    site = (website or "").strip().lower()
    if not site:
        return ""
    site = re.sub(r"^https?://", "", site)
    site = re.sub(r"^www\.", "", site)
    site = site.split("/")[0].split("?")[0].split("#")[0]
    # A bare label with no dot is not a domain (e.g. someone typed "none").
    return site if "." in site else ""


def dedupe(leads: list[Lead]) -> list[Lead]:
    """First occurrence wins, input order preserved."""
    seen: set[str] = set()
    out: list[Lead] = []
    for lead in leads:
        key = lead.dedup_key
        if key in seen:
            continue
        seen.add(key)
        out.append(lead)
    return out
