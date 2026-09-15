"""Qualifying rules: is this lead worth your time?

Two filters, both from criteria.json:
  - contactable — has a usable email or phone
  - geography + trade — right service area, right vertical

A rejected lead is kept, not dropped, with its reasons recorded. You can see
what a filter threw away and why, which is the only way to tell a filter that
is too tight from a source that is too thin.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .models import Lead

CRITERIA_PATH = Path(__file__).resolve().parent / "criteria.json"


class CriteriaError(RuntimeError):
    """criteria.json is missing or malformed."""


@dataclass
class Criteria:
    states: list[str] = field(default_factory=list)
    cities: list[str] = field(default_factory=list)
    trades: list[str] = field(default_factory=list)
    require_contactable: bool = True

    @classmethod
    def load(cls, path: Path = CRITERIA_PATH) -> "Criteria":
        if not path.exists():
            raise CriteriaError(f"Criteria file not found: {path}")
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CriteriaError(f"{path} is not valid JSON: {exc}") from exc
        return cls.parse(raw, origin=str(path))

    @classmethod
    def parse(cls, raw: object, origin: str = "<memory>") -> "Criteria":
        if not isinstance(raw, dict):
            raise CriteriaError(f"{origin}: expected a JSON object")

        geo = raw.get("geography", {})
        if not isinstance(geo, dict):
            raise CriteriaError(f"{origin}: 'geography' must be an object")

        def str_list(value, label):
            if value is None:
                return []
            if not isinstance(value, list) or any(not isinstance(v, str) for v in value):
                raise CriteriaError(f"{origin}: '{label}' must be an array of strings")
            return [v.strip().lower() for v in value if v.strip()]

        return cls(
            states=str_list(geo.get("states"), "geography.states"),
            cities=str_list(geo.get("cities"), "geography.cities"),
            trades=str_list(raw.get("trades"), "trades"),
            require_contactable=bool(raw.get("require_contactable", True)),
        )


def _matches_any(haystack: str, needles: list[str]) -> bool:
    """Case-insensitive substring match. Empty needles = no constraint."""
    if not needles:
        return True
    hay = (haystack or "").strip().lower()
    if not hay:
        return False
    return any(n in hay for n in needles)


def reasons_to_reject(lead: Lead, criteria: Criteria) -> list[str]:
    """Every reason this lead fails, not just the first.

    Reporting all of them at once means one pass over the data tells you
    whether to loosen geography or drop the contactable requirement, instead of
    playing whack-a-mole one rerun at a time.
    """
    reasons: list[str] = []

    if criteria.require_contactable and not lead.is_contactable:
        reasons.append("no email or phone")

    # State is matched exactly (after normalizing), not by substring: "PA" as a
    # substring would also hit "Spain" and "Campania".
    if criteria.states:
        state = (lead.state or "").strip().lower()
        if state not in criteria.states:
            reasons.append(f"state {lead.state or '?'} not in target list")

    if criteria.cities and not _matches_any(lead.city, criteria.cities):
        reasons.append(f"city {lead.city or '?'} not in target list")

    if criteria.trades:
        # Trade wording varies by source, so check the declared trade and fall
        # back to the company name ("Chester County Roofing" declares itself).
        haystack = f"{lead.trade} {lead.company}"
        if not _matches_any(haystack, criteria.trades):
            reasons.append(f"trade {lead.trade or '?'} not in target list")

    return reasons


def qualify(leads: list[Lead], criteria: Criteria) -> tuple[list[Lead], list[Lead]]:
    """Split into (qualified, rejected). Rejected leads carry their reasons."""
    qualified: list[Lead] = []
    rejected: list[Lead] = []
    for lead in leads:
        reasons = reasons_to_reject(lead, criteria)
        lead.rejected_for = reasons
        (rejected if reasons else qualified).append(lead)
    return qualified, rejected
