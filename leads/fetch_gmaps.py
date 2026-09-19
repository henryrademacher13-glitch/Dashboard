"""Fetch Google Maps search results via scrape.do and save the raw JSON.

Run this where api.scrape.do is reachable — it is blocked by the egress policy
inside the Claude Code session, so this script is written to run on your own
machine and hand the payload back.

    export SCRAPEDO_TOKEN=...          # never pass the token as an argument
    python leads/fetch_gmaps.py --query "roofing contractor" --near "Trenton, NJ" --pages 3

This deliberately does NOT parse anything. It writes the payload verbatim to
leads/in/gmaps-raw/ so the field mapping can be written against a real
response. sources/apollo.py was written against documented field names without
a live payload and mapped 0 of 10 company names on its first real run; the
whole point of saving raw first is not to repeat that.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ENDPOINT = "https://api.scrape.do/plugin/google/maps/search"
OUT_DIR = Path(__file__).resolve().parent / "in" / "gmaps-raw"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def fetch(token: str, params: dict, timeout: int = 90) -> dict:
    url = f"{ENDPOINT}?{urllib.parse.urlencode({**params, 'token': token})}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--query", required=True, help='e.g. "roofing contractor"')
    ap.add_argument("--near", default="", help='e.g. "Trenton, NJ" (appended to query)')
    ap.add_argument("--ll", default="", help="pin to @lat,lng,zoom — e.g. @40.2206,-74.7597,11z")
    ap.add_argument("--pages", type=int, default=1, help="pages to walk (20 results each)")
    ap.add_argument("--hl", default="en")
    ap.add_argument("--gl", default="us")
    ap.add_argument("--sleep", type=float, default=1.5, help="seconds between pages")
    args = ap.parse_args(argv)

    token = os.environ.get("SCRAPEDO_TOKEN", "").strip()
    if not token:
        print("SCRAPEDO_TOKEN is not set. export it first — do not paste the token "
              "into a shell argument or a chat window.", file=sys.stderr)
        return 2

    query = f"{args.query} {args.near}".strip()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for page in range(args.pages):
        params = {"query": query, "hl": args.hl, "gl": args.gl}
        if args.ll:
            params["ll"] = args.ll
        if page:
            params["start"] = page * 20

        try:
            payload = fetch(token, params)
        except Exception as exc:                      # noqa: BLE001 - report and stop
            print(f"page {page + 1}: request failed: {exc}", file=sys.stderr)
            print("If this is a 403 at CONNECT, the host is blocked by a network "
                  "policy rather than by your token.", file=sys.stderr)
            return 1

        path = OUT_DIR / f"{slug(query)}-p{page + 1}.json"
        path.write_text(json.dumps(payload, indent=1), encoding="utf-8")
        written.append(path)

        # Report shape only — no mapping, no assumptions about field names.
        if isinstance(payload, dict):
            top = sorted(payload.keys())
            listy = [k for k, v in payload.items() if isinstance(v, list) and v]
            print(f"page {page + 1}: wrote {path.name} | top-level keys: {top}")
            for key in listy:
                first = payload[key][0]
                if isinstance(first, dict):
                    print(f"    {key}[{len(payload[key])}] record keys: {sorted(first)}")
        else:
            print(f"page {page + 1}: wrote {path.name} | payload is {type(payload).__name__}")

        if page + 1 < args.pages:
            time.sleep(args.sleep)

    print(f"\n{len(written)} file(s) in {OUT_DIR}")
    print("Send these back and the mapping gets written against the real shape.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
