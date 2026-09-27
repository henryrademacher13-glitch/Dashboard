#!/usr/bin/env python3
"""Pull local business leads from Google via the Oxylabs Web Scraper API.

Searches "<niche> <city>" across a list of cities, collects every business
listing Google shows (name, phone, address, rating, website), removes
duplicates, and stops once it has enough. Standard library only.

Usage:
    export OXY_USER='...'
    export OXY_PASS='...'
    python3 leads/find_leads.py "car detailing" --state NJ --count 100
"""

import argparse
import base64
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request

API_URL = "https://realtime.oxylabs.io/v1/queries"

# Ordered roughly by population so the first requests hit the densest areas.
CITIES = {
    "NJ": [
        "Newark", "Jersey City", "Paterson", "Elizabeth", "Lakewood", "Edison",
        "Woodbridge", "Toms River", "Hamilton", "Trenton", "Clifton", "Camden",
        "Brick", "Cherry Hill", "Passaic", "Middletown", "Union City",
        "Old Bridge", "Gloucester Township", "East Orange", "Bayonne",
        "Franklin Township", "North Bergen", "Vineland", "Union", "Piscataway",
        "New Brunswick", "Jackson", "Wayne", "Irvington", "Parsippany",
        "Howell", "Perth Amboy", "Hoboken", "Plainfield", "West New York",
        "Washington Township", "East Brunswick", "Bloomfield", "West Orange",
        "Evesham", "Bridgewater", "South Brunswick", "Egg Harbor", "Manchester",
        "Hackensack", "Sayreville", "Mount Laurel", "Berkeley", "North Brunswick",
        "Kearny", "Linden", "Marlboro", "Teaneck", "Atlantic City", "Winslow",
        "Monroe", "Manalapan", "Hillsborough", "Montclair", "Galloway",
        "Freehold", "Morristown", "Princeton", "Somerset", "Red Bank",
        "Paramus", "Fort Lee", "Livingston", "Ocean City",
    ],
}

STATE_NAMES = {"NJ": "New Jersey"}

FIELDS = ["name", "phone", "address", "city_searched", "rating", "reviews", "website", "maps_link"]


def search(user, password, query, geo, local_mode):
    body = {
        "source": "google_search",
        "query": query,
        "geo_location": geo,
        "parse": True,
    }
    if local_mode:
        # Google's "Places" results page: ~20 businesses instead of 3.
        body["context"] = [{"key": "tbm", "value": "lcl"}]
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Basic {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        if e.code == 401:
            sys.exit("HTTP 401: Oxylabs rejected OXY_USER / OXY_PASS.")
        print(f"  HTTP {e.code} for '{query}': {detail}", file=sys.stderr)
        return None


def find_listings(node):
    """Walk the parsed JSON and yield anything that looks like a business listing.

    Oxylabs nests local results differently per page type, so rather than
    hard-coding one path we match on shape: a title plus a phone or address.
    """
    if isinstance(node, dict):
        if node.get("title") and (node.get("phone") or node.get("address")):
            yield node
            return
        for value in node.values():
            yield from find_listings(value)
    elif isinstance(node, list):
        for item in node:
            yield from find_listings(item)


def absolute(href):
    if not href:
        return ""
    return href if href.startswith("http") else "https://www.google.com" + href


def to_row(item, city):
    website = maps_link = ""
    for link in item.get("links") or []:
        title = (link.get("title") or "").lower()
        if title == "website":
            website = absolute(link.get("href"))
        elif title == "directions":
            maps_link = absolute(link.get("href"))
    website = website or absolute(item.get("url") or item.get("website"))
    return {
        "name": item.get("title", "").strip(),
        "phone": item.get("phone", "") or "",
        "address": item.get("address", "") or "",
        "city_searched": city,
        "rating": item.get("rating") or "",
        "reviews": item.get("rating_count") or item.get("reviews") or "",
        "website": website,
        "maps_link": maps_link,
    }


def find_phone(data):
    """Pull a phone number from a search for one specific business.

    Google usually answers a business-name search with a knowledge panel
    whose "Phone" factoid holds the number; fall back to any listing.
    """
    for result in (data or {}).get("results", []):
        results = (result.get("content") or {}).get("results") or {}
        for fact in (results.get("knowledge") or {}).get("factoids") or []:
            if (fact.get("title") or "").lower() == "phone" and fact.get("content"):
                return fact["content"].strip()
    for item in find_listings(data):
        if item.get("phone"):
            return item["phone"]
    return ""


def fill_phones(user, password, leads, state, state_name, max_requests):
    missing = [r for r in leads if not r["phone"].strip()]
    print(f"{len(missing)} of {len(leads)} leads have no phone; looking them up.")
    requests_made = 0
    for row in missing:
        if requests_made >= max_requests:
            break
        where = row["address"] or row["city_searched"]
        query = f'{row["name"]} {where} {state}'
        geo = f'{row["city_searched"]},{state_name},United States'
        row["phone"] = find_phone(search(user, password, query, geo, False))
        requests_made += 1
        print(f"[{requests_made:>2}] {row['name']}: {row['phone'] or 'not found'}")
    return requests_made


def dedupe_key(row):
    digits = re.sub(r"\D", "", row["phone"])
    if len(digits) >= 10:
        return digits[-10:]
    return (row["name"].lower(), row["address"].lower())


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("niche", help='what to search for, e.g. "car detailing"')
    p.add_argument("--state", default="NJ", choices=sorted(CITIES))
    p.add_argument("--count", type=int, default=100, help="stop after this many unique leads")
    p.add_argument("--max-requests", type=int, default=40, help="hard cap on paid API calls")
    p.add_argument("--out", help="CSV path (default: <niche>_<state>.csv)")
    p.add_argument("--resume", action="store_true",
                   help="keep leads already in the CSV and continue after the last city searched")
    p.add_argument("--fill-phones", action="store_true",
                   help="don't search for new leads; look up phone numbers missing from the CSV (1 request each)")
    args = p.parse_args()

    user, password = os.environ.get("OXY_USER"), os.environ.get("OXY_PASS")
    if not user or not password:
        sys.exit("Set OXY_USER and OXY_PASS first (export OXY_USER='...').")

    state_name = STATE_NAMES[args.state]
    out = args.out or f"{re.sub(r'[^a-z0-9]+', '_', args.niche.lower()).strip('_')}_{args.state.lower()}.csv"

    if args.fill_phones:
        with open(out, newline="") as f:
            leads = list(csv.DictReader(f))
        used = fill_phones(user, password, leads, args.state, state_name, args.max_requests)
        with open(out, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(leads)
        have = sum(1 for r in leads if r["phone"].strip())
        print(f"\n{have} of {len(leads)} leads now have phones; saved to {out} using {used} API requests.")
        return

    leads, seen = [], set()
    cities = CITIES[args.state]
    if args.resume and os.path.exists(out):
        with open(out, newline="") as f:
            leads = list(csv.DictReader(f))
        seen = {dedupe_key(r) for r in leads}
        searched = {r["city_searched"] for r in leads}
        last = max((i for i, c in enumerate(cities) if c in searched), default=-1)
        cities = cities[last + 1:]
        print(f"Resuming with {len(leads)} leads; starting at {cities[0] if cities else '(no cities left)'}.")
    # Oxylabs rejects tbm=lcl (it wants the google_maps source, which can't be
    # parsed), so plain search with its 3-business local pack is what works.
    local_mode = False
    requests_made = 0

    for city in cities:
        if len(leads) >= args.count or requests_made >= args.max_requests:
            break
        query = f"{args.niche} {city} {args.state}"
        geo = f"{city},{state_name},United States"
        data = search(user, password, query, geo, local_mode)
        requests_made += 1

        found = list(find_listings(data)) if data else []
        if not found and local_mode and requests_made == 1:
            print("  Places view returned no listings; switching to regular search.")
            local_mode = False
            data = search(user, password, query, geo, local_mode)
            requests_made += 1
            found = list(find_listings(data)) if data else []

        new = 0
        for item in found:
            row = to_row(item, city)
            key = dedupe_key(row)
            if not row["name"] or key in seen:
                continue
            seen.add(key)
            leads.append(row)
            new += 1
            if len(leads) >= args.count:
                break
        print(f"[{requests_made:>2}] {query}: +{new} new ({len(leads)} total)")

    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(leads)

    print(f"\nSaved {len(leads)} leads to {out} using {requests_made} API requests.")
    if len(leads) < args.count:
        print("Fewer than requested: raise --max-requests or add cities to the list.")


if __name__ == "__main__":
    main()
