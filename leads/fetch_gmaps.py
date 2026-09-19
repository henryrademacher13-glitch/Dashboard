"""Fetch Google Maps search results via scrape.do and save the raw JSON.

api.scrape.do is blocked by the egress policy inside Claude Code sessions, so
run this on a machine that can reach it.

    export SCRAPEDO_TOKEN=...
    python3 leads/fetch_gmaps.py --probe --query "roofing contractor Trenton NJ"
    python3 leads/fetch_gmaps.py --query "roofing contractor" --near "Trenton, NJ"

--probe walks a small matrix of parameter spellings and prints the status and
response body for each, so the API itself tells us the correct shape. Use it
once; after that the working spelling is known.

This never maps fields. It writes the payload verbatim to leads/in/gmaps-raw/
and reports only the key names it actually observed. sources/apollo.py was
written against documented field names with no live payload and mapped 0 of 10
company names on its first real run; raw-first exists so that cannot recur.
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
OUT_DIR = Path(__file__).resolve().parent / "in" / "gmaps-raw"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def call(token: str, params: dict, timeout: int = 90) -> tuple[int, str]:
    """Return (status, body). Never raises on HTTP error — the body is the point."""
    url = f"{ENDPOINT}?{urllib.parse.urlencode({**params, 'token': token})}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        # HTTPError *is* the response; its body carries the actual complaint.
        return exc.code, exc.read().decode("utf-8", "replace")
    except urllib.error.URLError as exc:
        return 0, f"URLError: {exc.reason}"


def describe(payload) -> None:
    """Report observed shape only — no assumptions about field names."""
    if isinstance(payload, dict):
        print(f"    top-level keys: {sorted(payload)}")
        for key, val in payload.items():
            if isinstance(val, list) and val and isinstance(val[0], dict):
                print(f"    {key}[{len(val)}] record keys: {sorted(val[0])}")
    elif isinstance(payload, list) and payload and isinstance(payload[0], dict):
        print(f"    list[{len(payload)}] record keys: {sorted(payload[0])}")
    else:
        print(f"    payload is {type(payload).__name__}")


def probe(token: str, query: str) -> int:
    """Try plausible parameter spellings; print status + body for each."""
    variants = [
        ("q only",             {"q": query}),
        ("query only",         {"query": query}),
        ("q + geo",            {"q": query, "hl": "en", "gl": "us"}),
        ("query + geo",        {"query": query, "hl": "en", "gl": "us"}),
        ("q + ll",             {"q": query, "ll": "@40.2206,-74.7597,11z"}),
        ("search_query",       {"search_query": query}),
        ("keyword",            {"keyword": query}),
    ]
    winner = None
    for label, params in variants:
        status, body = call(token, params)
        snippet = body[:300].replace("\n", " ")
        print(f"\n[{label}] HTTP {status}\n    params: {params}\n    body: {snippet}")
        if status == 200 and winner is None:
            winner = (label, params, body)

    if not winner:
        print("\nNo variant returned 200. Paste the bodies above back and the "
              "parameter names can be corrected from the API's own message.")
        return 1

    label, params, body = winner
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"probe-{slug(query)}.json"
    try:
        payload = json.loads(body)
        path.write_text(json.dumps(payload, indent=1), encoding="utf-8")
        print(f"\nWORKING VARIANT: [{label}] -> {params}")
        print(f"saved {path}")
        describe(payload)
    except json.JSONDecodeError:
        path.write_text(body, encoding="utf-8")
        print(f"\nWORKING VARIANT: [{label}] but body is not JSON; saved raw to {path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--query", required=True)
    ap.add_argument("--near", default="", help='appended to query, e.g. "Trenton, NJ"')
    ap.add_argument("--probe", action="store_true",
                    help="try parameter spellings and print each response body")
    ap.add_argument("--param", default="q", help="query parameter name (default: q)")
    ap.add_argument("--ll", default="", help="@lat,lng,zoom")
    ap.add_argument("--pages", type=int, default=1)
    ap.add_argument("--hl", default="en")
    ap.add_argument("--gl", default="us")
    ap.add_argument("--sleep", type=float, default=1.5)
    args = ap.parse_args(argv)

    token = os.environ.get("SCRAPEDO_TOKEN", "").strip()
    if not token:
        print("SCRAPEDO_TOKEN is not set.", file=sys.stderr)
        return 2

    query = f"{args.query} {args.near}".strip()

    if args.probe:
        return probe(token, query)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for page in range(args.pages):
        params = {args.param: query, "hl": args.hl, "gl": args.gl}
        if args.ll:
            params["ll"] = args.ll
        if page:
            params["start"] = page * 20

        status, body = call(token, params)
        if status != 200:
            print(f"page {page + 1}: HTTP {status}", file=sys.stderr)
            print(f"  body: {body[:500]}", file=sys.stderr)
            print("  re-run with --probe to find the correct parameter names.",
                  file=sys.stderr)
            return 1

        path = OUT_DIR / f"{slug(query)}-p{page + 1}.json"
        try:
            payload = json.loads(body)
            path.write_text(json.dumps(payload, indent=1), encoding="utf-8")
            print(f"page {page + 1}: wrote {path.name}")
            describe(payload)
        except json.JSONDecodeError:
            path.write_text(body, encoding="utf-8")
            print(f"page {page + 1}: non-JSON body saved to {path.name}")

        if page + 1 < args.pages:
            time.sleep(args.sleep)

    print(f"\nfiles in {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
