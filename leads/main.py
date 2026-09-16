"""Turn a raw source payload into a qualified lead spreadsheet.

Apollo reaches this machine through MCP tools, not a REST client, so the flow
is: Claude calls the Apollo tools, saves the raw JSON, and this converts it.

    python -m leads.main --input apollo.json --output leads.xlsx
    python -m leads.main --input apollo.json --inspect   # field audit, no file

Keeping the raw payload on disk means a mapping fix is a rerun, not another
round of API credits.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .filters import CRITERIA_PATH, Criteria, CriteriaError, qualify
from .models import dedupe
from .sources import apollo, apollo_orgs
from .spreadsheet import write_workbook

DEFAULT_OUTPUT = Path("leads") / "out" / "leads.xlsx"


def describe(criteria: Criteria) -> str:
    bits = []
    if criteria.states:
        bits.append("states: " + ", ".join(s.upper() for s in criteria.states))
    if criteria.cities:
        bits.append("cities: " + ", ".join(criteria.cities))
    if criteria.trades:
        bits.append(f"{len(criteria.trades)} trades")
    if criteria.require_contactable:
        bits.append("contactable only")
    return "Filters applied — " + ("; ".join(bits) if bits else "none")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="leads", description=__doc__)
    parser.add_argument("--input", type=Path, required=True,
                        help="raw JSON payload from the source")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--criteria", type=Path, default=CRITERIA_PATH)
    parser.add_argument("--source", choices=("apollo", "apollo-orgs"),
                        default="apollo",
                        help="payload shape: 'apollo' for People Search records, "
                             "'apollo-orgs' for company-enrichment records")
    parser.add_argument("--inspect", action="store_true",
                        help="report field mapping coverage and exit")
    parser.add_argument("--keep-rejected", action="store_true", default=True,
                        help="include a Rejected tab (default: on)")
    args = parser.parse_args(argv)

    if not args.input.exists():
        print(f"Input not found: {args.input}", file=sys.stderr)
        return 2

    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"{args.input} is not valid JSON: {exc}", file=sys.stderr)
        return 2

    adapter = apollo_orgs if args.source == "apollo-orgs" else apollo
    leads = adapter.from_response(payload)
    unmapped = adapter.unmapped_keys(payload)

    if args.inspect:
        print(f"records parsed:      {len(leads)}")
        print(f"with a company name: {sum(1 for lead in leads if lead.company)}")
        print(f"with an email:       {sum(1 for lead in leads if lead.has_email)}")
        print(f"with a phone:        {sum(1 for lead in leads if lead.has_phone)}")
        print(f"unmapped top-level keys: {sorted(unmapped) or 'none'}")
        if not leads:
            print("\nNo records found. Check the payload's envelope key —"
                  " the adapter looks for people/contacts/organizations/results/data.",
                  file=sys.stderr)
        return 0 if leads else 1

    if unmapped:
        # Loud, because a dropped field is invisible in the output.
        print(f"NOTE: source returned unmapped fields: {sorted(unmapped)}",
              file=sys.stderr)

    try:
        criteria = Criteria.load(args.criteria)
    except CriteriaError as exc:
        print(f"Criteria error: {exc}", file=sys.stderr)
        return 2

    before = len(leads)
    leads = dedupe(leads)
    qualified, rejected = qualify(leads, criteria)

    path = write_workbook(
        args.output, qualified,
        rejected if args.keep_rejected else [],
        criteria_note=describe(criteria),
    )

    print(f"parsed {before} record(s), {before - len(leads)} duplicate(s) removed")
    print(f"qualified {len(qualified)}, rejected {len(rejected)}")
    print(f"wrote {path}")
    if qualified:
        print("\nRun scripts/recalc.py on the output before sharing it — openpyxl")
        print("writes formulas without cached values.")
    return 0 if qualified else 1


if __name__ == "__main__":
    sys.exit(main())
