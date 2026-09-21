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
import csv
import json
import sys
from pathlib import Path

from .filters import CRITERIA_PATH, Criteria, CriteriaError, qualify
from .models import Lead, dedupe
from .sources import apollo, apollo_orgs, gmaps

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


def exclusion_keys(paths: list[Path], adapter) -> tuple[set[str], int]:
    """Identities from already-delivered leads, so a rerun can emit only new ones.

    Accepts the raw payloads a previous run read (.json, or a directory of
    them) and the CSVs it wrote. Keys come from Lead.dedup_key either way, so
    "already delivered" means exactly what "duplicate" means everywhere else -
    a second definition of identity here would quietly disagree with dedupe().
    """
    keys: set[str] = set()
    files: list[Path] = []
    for path in paths:
        if path.is_dir():
            files.extend(sorted(path.glob("*.json")))
            files.extend(sorted(path.glob("*.csv")))
        else:
            files.append(path)

    for path in files:
        if not path.exists():
            print(f"--exclude: not found, ignoring: {path}", file=sys.stderr)
            continue
        suffix = path.suffix.lower()
        if suffix == ".json":
            try:
                blob = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                print(f"--exclude: unreadable, ignoring: {path}", file=sys.stderr)
                continue
            keys |= {lead.dedup_key for lead in adapter.from_response(blob)}
        elif suffix == ".csv":
            with path.open(newline="", encoding="utf-8") as handle:
                for row in csv.DictReader(handle):
                    # Same three fields dedup_key reads; anything else is noise.
                    keys.add(Lead(
                        company=row.get("Company Name") or row.get("Full Name") or "",
                        website=row.get("Website", ""),
                        city=row.get("City", ""),
                    ).dedup_key)
        else:
            print(f"--exclude: only .json and .csv are supported, ignoring: "
                  f"{path}", file=sys.stderr)
            continue
    return keys, len(files)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="leads", description=__doc__)
    parser.add_argument("--input", type=Path, required=True,
                        help="raw JSON payload from the source")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--criteria", type=Path, default=CRITERIA_PATH)
    parser.add_argument("--source", choices=("apollo", "apollo-orgs", "gmaps"),
                        default="apollo",
                        help="payload shape: 'apollo' for People Search records, "
                             "'apollo-orgs' for company-enrichment records, "
                             "'gmaps' for Google Maps local_results")
    parser.add_argument("--exclude", type=Path, nargs="*", default=[],
                        metavar="PATH",
                        help="leads already delivered, to leave out of this "
                             "export: raw .json payloads, a directory of them, "
                             "or a CSV a previous run wrote. Turns a rerun into "
                             "'only what is new since last time'.")
    parser.add_argument("--inspect", action="store_true",
                        help="report field mapping coverage and exit")
    parser.add_argument("--keep-rejected", action="store_true", default=True,
                        help="include a Rejected tab (default: on)")
    args = parser.parse_args(argv)

    if not args.input.exists():
        print(f"Input not found: {args.input}", file=sys.stderr)
        return 2

    # A batch run writes one file per query, so a directory is the normal unit
    # of input. Merging here rather than in each adapter keeps the adapters
    # working on a single payload shape.
    if args.input.is_dir():
        files = sorted(args.input.glob("*.json"))
        if not files:
            print(f"No .json files in {args.input}", file=sys.stderr)
            return 2
        merged: list = []
        bad = 0
        for f in files:
            try:
                blob = json.loads(f.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                bad += 1
                continue
            for key in ("local_results", "organizations", "accounts",
                        "results", "data", "people", "contacts"):
                chunk = blob.get(key) if isinstance(blob, dict) else None
                if isinstance(chunk, list):
                    merged.extend(chunk)
                    break
        print(f"merged {len(merged)} record(s) from {len(files)} file(s)"
              + (f", {bad} unreadable" if bad else ""))
        payload = {"local_results": merged}
    else:
        try:
            payload = json.loads(args.input.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"{args.input} is not valid JSON: {exc}", file=sys.stderr)
            return 2

    adapter = {"apollo-orgs": apollo_orgs, "gmaps": gmaps}.get(args.source, apollo)
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
    # Counted before --exclude runs, or exclusions get reported as duplicates.
    duplicates = before - len(leads)

    if args.exclude:
        known, n_files = exclusion_keys(list(args.exclude), adapter)
        kept = [lead for lead in leads if lead.dedup_key not in known]
        print(f"excluded {len(leads) - len(kept)} lead(s) already delivered "
              f"({len(known)} known from {n_files} file(s))")
        leads = kept
        if not leads:
            print("Nothing new to export - every lead was already delivered.",
                  file=sys.stderr)
            return 1

    qualified, rejected = qualify(leads, criteria)

    # Imported here, not at module scope: --inspect writes no spreadsheet and
    # must stay runnable on a machine without openpyxl installed.
    if args.output.suffix.lower() == ".csv":
        # CSV means a CRM import, so skip the workbook entirely - no
        # openpyxl, no formulas, just rows GoHighLevel can ingest.
        from .ghl import write_csv
        path = write_csv(args.output, qualified)
    else:
        from .spreadsheet import write_workbook
        path = write_workbook(
            args.output, qualified,
            rejected if args.keep_rejected else [],
            criteria_note=describe(criteria),
        )

    print(f"parsed {before} record(s), {duplicates} duplicate(s) removed")
    print(f"qualified {len(qualified)}, rejected {len(rejected)}")
    print(f"wrote {path}")
    if qualified and path.suffix.lower() != ".csv":
        print("\nOpen the workbook once in Excel before reading it with pandas —")
        print("openpyxl writes the Contactable formula without a cached value.")
    return 0 if qualified else 1


if __name__ == "__main__":
    sys.exit(main())
