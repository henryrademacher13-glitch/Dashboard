#!/usr/bin/env python3
"""Collect car detailer leads across New Jersey from Google local results via Scrape.do.

Usage:
    export SCRAPEDO_TOKEN=...          # your Scrape.do API token
    python3 nj_detailers.py --test     # one request, shows what it parsed
    python3 nj_detailers.py            # full run, stops at 200 leads

Writes nj_detailers.csv (name, phone, address, rating, reviews, category, search_town)
in the current folder, saving after every page so an interrupted run keeps its leads.
Uses curl for HTTP so it works with macOS's system Python without extra packages.
"""

import argparse
import csv
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse

TOWNS = [
    "Newark", "Jersey City", "Paterson", "Hackensack", "Paramus", "Wayne",
    "Morristown", "Elizabeth", "Union", "Edison", "New Brunswick", "Woodbridge",
    "Somerville", "Flemington", "Freehold", "Red Bank", "Toms River", "Brick",
    "Trenton", "Princeton", "Cherry Hill", "Mount Laurel", "Vineland",
    "Atlantic City", "Newton",
]
QUERY = "car detailing"
PAGE_SIZE = 20
MAX_PAGES_PER_TOWN = 3
FIELDS = ["name", "phone", "address", "rating", "reviews", "category", "search_town"]

# Tried in order until one returns parseable results; the winner is reused.
# Later modes cost more Scrape.do credits per request.
MODES = [
    {},
    {"render": "true"},
    {"super": "true", "render": "true"},
]

PHONE_RE = re.compile(r"\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-](\d{4})\b")
RATING_RE = re.compile(r"\b([1-5]\.\d)\s*\((\d[\d,.]*K?)\)")
STREET_RE = re.compile(r"^\d+[A-Za-z]?\s+\S+")


def fetch(token, url, extra):
    params = {"token": token, "url": url, "geoCode": "us", **extra}
    api = "https://api.scrape.do/?" + urllib.parse.urlencode(params)
    result = subprocess.run(
        ["curl", "-sS", "-m", "120", "-w", "\n__STATUS__%{http_code}", api],
        capture_output=True, text=True,
    )
    body, _, status = result.stdout.rpartition("\n__STATUS__")
    return int(status or 0), body


def credits_left(token):
    result = subprocess.run(
        ["curl", "-sS", "-m", "30", "https://api.scrape.do/info?token=" + token],
        capture_output=True, text=True,
    )
    try:
        return json.loads(result.stdout).get("RemainingMonthlyRequest")
    except ValueError:
        return None


def to_lines(fragment):
    fragment = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", fragment)
    fragment = re.sub(r"(?i)</div>|<br\s*/?>", "\n", fragment)
    text = html.unescape(re.sub(r"<[^>]+>", "", fragment))
    return [re.sub(r"\s+", " ", line).strip() for line in text.split("\n") if line.strip()]


def find_name(html_text, pos):
    window = html_text[max(0, pos - 3000):pos]
    for pattern in (r'<span class="OSrXXb"[^>]*>(.*?)</span>',
                    r'role="heading"[^>]*>(.*?)</div>'):
        matches = re.findall(pattern, window, re.S)
        if matches:
            name = " ".join(to_lines(matches[-1]))
            if name:
                return name
    return ""


def parse_block(lines):
    lead = {"phone": "", "address": "", "rating": "", "reviews": "", "category": ""}
    text = " · ".join(lines)
    phone = PHONE_RE.search(text)
    if phone:
        lead["phone"] = "({}) {}-{}".format(*phone.groups())
    rating = RATING_RE.search(text)
    if rating:
        lead["rating"], lead["reviews"] = rating.group(1), rating.group(2)
    for part in (p.strip() for p in re.split(r"[·⋅]", text)):
        if not part or PHONE_RE.search(part) or RATING_RE.search(part):
            continue
        low = part.lower()
        if not lead["category"] and ("detail" in low or "wash" in low or "service" in low):
            lead["category"] = part
        elif not lead["address"] and (STREET_RE.match(part) or re.search(r",\s*NJ\b", part)):
            lead["address"] = part
    return lead


def parse(html_text):
    leads = []
    starts = [m.start() for m in re.finditer(r'class="[^"]*\brllt__details\b', html_text)]
    for i, pos in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else pos + 4000
        lead = parse_block(to_lines(html_text[pos:end])[:6])
        lead["name"] = find_name(html_text, pos)
        if lead["name"]:
            leads.append(lead)
    return leads


def search_url(town, page):
    q = f"{QUERY} {town} NJ"
    return "https://www.google.com/search?" + urllib.parse.urlencode(
        {"q": q, "tbm": "lcl", "hl": "en", "gl": "us", "start": page * PAGE_SIZE})


def looks_blocked(status, body):
    return status != 200 or "unusual traffic" in body or "/sorry/" in body


def fetch_page(token, url, state):
    """Fetch and parse one results page, escalating modes until one works."""
    modes = MODES[state["mode"]:] if state["mode"] is not None else MODES
    for mode in modes:
        state["requests"] += 1
        status, body = fetch(token, url, mode)
        label = ", ".join(f"{k}={v}" for k, v in mode.items()) or "standard"
        if looks_blocked(status, body):
            print(f"  [{label}] blocked or failed (HTTP {status})")
            continue
        leads = parse(body)
        if leads or state["mode"] is not None:
            state["mode"] = MODES.index(mode)
            return leads, body
        print(f"  [{label}] page loaded but no listings found, trying next mode")
        state["last_body"] = body
    return [], state.get("last_body", "")


def key(lead):
    digits = re.sub(r"\D", "", lead["phone"])
    return digits or lead["name"].lower()


def save(path, leads):
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(leads)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--test", action="store_true", help="one request only, print results")
    ap.add_argument("--limit", type=int, default=200, help="stop after this many leads")
    ap.add_argument("--max-requests", type=int, default=80, help="credit safety cap")
    ap.add_argument("--out", default="nj_detailers.csv")
    args = ap.parse_args()

    token = os.environ.get("SCRAPEDO_TOKEN")
    if not token:
        sys.exit("Set SCRAPEDO_TOKEN first: export SCRAPEDO_TOKEN=your_token")

    start_credits = credits_left(token)
    print(f"Credits remaining: {start_credits}")
    state = {"mode": None, "requests": 0}

    if args.test:
        leads, body = fetch_page(token, search_url(TOWNS[0], 0), state)
        print(f"\nParsed {len(leads)} listings for {TOWNS[0]}:")
        for lead in leads[:5]:
            print("  ", {k: lead[k] for k in ("name", "phone", "address", "rating")})
        if not leads:
            with open("nj_debug.html", "w") as f:
                f.write(body)
            print("Nothing parsed. Saved the raw page to nj_debug.html for troubleshooting.")
        end_credits = credits_left(token)
        if start_credits is not None and end_credits is not None:
            print(f"\nCredits used by this test: {start_credits - end_credits} (left: {end_credits})")
        return

    found, seen = [], set()
    for town in TOWNS:
        for page in range(MAX_PAGES_PER_TOWN):
            if len(found) >= args.limit or state["requests"] >= args.max_requests:
                break
            leads, _ = fetch_page(token, search_url(town, page), state)
            new = 0
            for lead in leads:
                k = key(lead)
                if k and k not in seen and len(found) < args.limit:
                    seen.add(k)
                    lead["search_town"] = town
                    found.append(lead)
                    new += 1
            save(args.out, found)
            print(f"{town} p{page + 1}: {len(leads)} listings, {new} new  (total {len(found)})")
            if new == 0:
                break
        if len(found) >= args.limit or state["requests"] >= args.max_requests:
            break

    print(f"\nSaved {len(found)} leads to {os.path.abspath(args.out)}")
    if state["requests"] >= args.max_requests:
        print(f"Stopped at the --max-requests cap ({args.max_requests}).")
    end_credits = credits_left(token)
    print(f"Credits remaining: {end_credits}")


if __name__ == "__main__":
    main()
