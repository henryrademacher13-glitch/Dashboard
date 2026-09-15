# Leads

Turns a source payload into a qualified lead spreadsheet.

```
Apollo MCP tools  ->  raw JSON on disk
  -> leads/sources/apollo.py     normalize to Lead records
  -> leads/models.py             dedupe (domain first, then name+city)
  -> leads/filters.py            contactable + geography/trade
  -> leads/spreadsheet.py        Leads / Rejected / Summary tabs
```

## Status: blocked on Apollo authorization

The Apollo connector is attached to the session but **not authorized**, so its
tools never loaded and **no real Apollo response has ever been seen**. The
adapter in `sources/apollo.py` is written against Apollo's documented People
Search field names and is marked unverified at the top of the file.

To unblock: authorize Apollo in claude.ai → Settings → Connectors. The OAuth
flow cannot be run from a non-interactive session.

Everything downstream of the adapter — dedup, filters, the workbook — is source
agnostic and fully tested, so only the mapping needs calibration.

## Running

```bash
pip install openpyxl
python -m leads.main --input apollo.json --inspect      # field audit first
python -m leads.main --input apollo.json --output out/leads.xlsx
```

`--inspect` reports how many records parsed, how many carry contacts, and
**which top-level fields the adapter did not read**. Run it on the first real
payload before trusting a full export — a dropped field is invisible in the
spreadsheet.

Exit codes: `0` at least one lead qualified · `1` none qualified · `2` bad input.

## Criteria

Edit `criteria.json`, not the code:

```json
{
  "geography": { "states": ["PA"], "cities": [] },
  "trades": ["roofing", "hvac", "plumbing"],
  "require_contactable": true
}
```

- **States match exactly** (after lowercasing). Substring matching would let
  `PA` hit `Campania` and `Spain`.
- **Trades match as substrings**, against the declared trade *and* the company
  name — so "Chester County Roofing" qualifies with no trade field at all.
- **Empty list = no filter.** Both geography lists empty means no geographic
  constraint; `trades: []` accepts every vertical.
- **Contactable** means a syntactically plausible email or a 10–15 digit phone.
  Apollo's `email_not_unlocked@domain.com` placeholder is treated as *absent*,
  because a credit-gated address is not one you can actually write to.

## Rejected leads are kept

`qualify()` returns `(qualified, rejected)`, and each rejected lead carries
**every** reason it failed, not just the first. They land on their own tab.
This is the only cheap way to tell a filter that is too tight from a source
that is too thin — if 200 leads all rejected for "no email or phone", the
problem is the Apollo query, not your criteria.

## The workbook

| Tab | Contents |
| --- | --- |
| `Leads` | One qualified lead per row, autofiltered, header frozen. |
| `Rejected` | What was filtered out, with reasons. |
| `Summary` | Counts, pipeline breakdown, and a legend. |

Yellow cells (**Status**, **Notes**) are yours to type in; everything else is
overwritten on the next export. **Contactable** is a live formula — paste in a
missing phone number and it flips to `Yes` on its own.

> **Formulas are unrecalculated on write.** openpyxl stores formulas without
> cached values, so `pandas` and `data_only=True` read them as `None` until
> Excel or LibreOffice opens the file. Opening it once fixes this. LibreOffice
> could not run in the container where this was built (it timed out on a
> three-cell test workbook), so the formulas were verified by resolving each
> range against real cell contents instead — see `tests/test_leads.py`.
> Only Excel-2007-era functions are used (`IF`, `OR`, `COUNTA`, `COUNTIF`).

## Tests

```bash
python3 tests/test_leads.py    # 67 checks, needs only openpyxl
```

## Adding another source

Write a module in `sources/` exposing `from_response(payload) -> list[Lead]`.
Nothing downstream changes.
