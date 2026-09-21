"""Walk trade x city queries until a target number of unique businesses is hit.

Maps returns ~20 results per query, so coverage comes from many narrow queries
rather than one broad sweep. This runs trade x metro combinations, saves every
response verbatim, dedupes on place_id as it goes, and stops as soon as the
target is reached so you are not paying for requests you do not need.

    export SCRAPEDO_TOKEN=...
    python3 leads/fetch_gmaps_batch.py --state PA --target 200
    python3 leads/fetch_gmaps_batch.py --state NJ --target 200

Reruns resume by default: every place_id already on disk is loaded before the
first request, and any trade x metro query whose response file already exists
is skipped without spending a request. So --target means NEW unique businesses
this run, on top of whatever the directory already holds. Use --no-resume to
start the count from zero and re-issue every query.

Every response lands in leads/in/gmaps-<state>/ before anything parses it: if
a mapping needs fixing, that is a rerun over local files, not another 40
requests. Interrupt it safely at any point - whatever was fetched is on disk.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ENDPOINT = "https://api.scrape.do/plugin/google/maps/search"

TRADES = ["roofing contractor", "hvac contractor", "plumber",
          "electrician", "landscaping", "remodeling contractor",
          "painting contractor", "concrete contractor"]

# Ordered by population: the earlier metros return denser results, so the
# target is usually met before the tail is reached. The list runs long on
# purpose - a resumed run has already exhausted the head of it.
METROS = {
    "PA": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading",
           "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "York",
           "Wilkes-Barre", "Altoona", "Chester", "Williamsport", "State College",
           "Norristown", "Bethel Park", "King of Prussia", "West Chester",
           "Doylestown", "Pottstown", "Johnstown", "Easton", "Levittown",
           "Hazleton", "New Castle", "Butler", "Indiana", "Pottsville",
           "Stroudsburg", "Media", "Phoenixville", "Lebanon", "Carlisle",
           "Chambersburg", "Greensburg", "Washington", "Uniontown"],
    "NJ": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison",
           "Woodbridge", "Trenton", "Camden", "Clifton", "Toms River",
           "Brick", "Cherry Hill", "Passaic", "Union City", "Bayonne",
           "East Orange", "Vineland", "New Brunswick", "Hoboken", "Perth Amboy",
           "Princeton", "Morristown", "Hackensack", "Atlantic City",
           "Freehold", "Somerville", "Mount Laurel", "Wayne"],
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:70]


def load_existing(out_dir: Path) -> tuple[set[str], set[str]]:
    """Return (place_ids, query slugs) already captured in out_dir."""
    place_ids: set[str] = set()
    slugs: set[str] = set()
    for path in sorted(out_dir.glob("*.json")):
        slugs.add(path.stem)
        try:
            results = json.loads(path.read_text(encoding="utf-8")).get("local_results") or []
        except (OSError, json.JSONDecodeError, AttributeError):
            print(f"  ! unreadable, ignoring: {path.name}", file=sys.stderr)
            continue
        place_ids |= {r.get("place_id") for r in results if r.get("place_id")}
    return place_ids, slugs


def call(token: str, query: str, timeout: int = 90) -> tuple[int, str]:
    url = f"{ENDPOINT}?{urllib.parse.urlencode({'q': query, 'token': token})}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")
    except urllib.error.URLError as exc:
        return 0, f"URLError: {exc.reason}"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--state", required=True, choices=sorted(METROS))
    ap.add_argument("--target", type=int, default=200,
                    help="NEW unique businesses to collect before stopping")
    ap.add_argument("--trades", nargs="*", default=TRADES)
    ap.add_argument("--metros", nargs="*", default=None)
    ap.add_argument("--sleep", type=float, default=1.5)
    ap.add_argument("--max-requests", type=int, default=90,
                    help="hard ceiling so a bad run cannot spend unbounded")
    ap.add_argument("--no-resume", action="store_true",
                    help="ignore what is already on disk and re-issue every query")
    args = ap.parse_args(argv)

    token = os.environ.get("SCRAPEDO_TOKEN", "").strip()
    if not token:
        print("SCRAPEDO_TOKEN is not set.", file=sys.stderr)
        return 2

    metros = args.metros or METROS[args.state]
    out_dir = Path(__file__).resolve().parent / "in" / f"gmaps-{args.state.lower()}"
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.no_resume:
        known, done = set(), set()
    else:
        known, done = load_existing(out_dir)
        if known or done:
            print(f"Resuming: {len(known)} businesses already on disk across "
                  f"{len(done)} saved queries (those queries cost nothing to skip).")

    new_ids: set[str] = set()
    requests = failures = skipped = 0

    # City-major: sweeping all trades in one metro before moving on keeps the
    # list geographically balanced if the target is met early.
    for metro in metros:
        for trade in args.trades:
            if len(new_ids) >= args.target or requests >= args.max_requests:
                break
            query = f"{trade} {metro}, {args.state}"
            name = slug(query)
            if name in done:
                skipped += 1
                continue

            status, body = call(token, query)
            requests += 1

            if status != 200:
                failures += 1
                print(f"  ! {query}: HTTP {status} {body[:120]}", file=sys.stderr)
                if failures >= 3:
                    print("Three failures; stopping rather than burning "
                          "requests on a broken run.", file=sys.stderr)
                    return 1
                continue

            (out_dir / f"{name}.json").write_text(body, encoding="utf-8")
            try:
                results = json.loads(body).get("local_results") or []
            except json.JSONDecodeError:
                results = []
            new = {r.get("place_id") for r in results if r.get("place_id")} - known - new_ids
            new_ids |= new
            print(f"  {query:52} +{len(new):3} new  (this run {len(new_ids)})")
            time.sleep(args.sleep)
        if len(new_ids) >= args.target or requests >= args.max_requests:
            break

    total = len(known) + len(new_ids)
    print(f"\n{len(new_ids)} NEW unique businesses from {requests} requests "
          f"({skipped} queries skipped as already fetched)")
    print(f"{total} unique businesses total in {out_dir}")
    if len(new_ids) < args.target:
        print(f"Short of {args.target} new. Add --metros or --trades, or raise "
              f"--max-requests (hit the ceiling at {args.max_requests})."
              if requests >= args.max_requests else
              f"Short of {args.target} new. The metro x trade grid is exhausted; "
              f"add --metros or --trades.")
    print("\nNext:")
    print(f"  python3 -m leads.main --source gmaps --input {out_dir} --inspect")
    return 0


if __name__ == "__main__":
    sys.exit(main())
