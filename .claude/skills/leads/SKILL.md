---
name: leads
description: Build a qualified lead spreadsheet with phone numbers from Google Maps (via scrape.do) or Apollo.io, using the leads/ package in this repo. Use this whenever the user asks for leads, a prospect list, a call sheet, contractors or local businesses in a geography, or wants to scrape/enrich/export business contacts - including follow-ups like "now do NJ", "add plumbers", "more of those", or "re-export with different criteria". Also use it when they ask what a lead run would cost in Apollo credits.
---

# Lead generation

Two sources feed one pipeline. The pipeline is source-agnostic: an adapter in
`leads/sources/` normalizes a raw payload into `Lead` records, then dedup,
filters, and the workbook writer run identically regardless of origin.

```
raw JSON on disk
  -> leads/sources/<source>.py   normalize to Lead
  -> leads/models.py             dedupe (domain, then name+city)
  -> leads/filters.py            contactable + geography/trade
  -> leads/spreadsheet.py        Leads / Rejected / Summary tabs
```

## Pick the source first

**Google Maps (`--source gmaps`) is the default for local trades.** Phone
numbers ship with the listing, so there is no enrichment step and no
per-record cost. Google's own category (`types`) is far cleaner than keyword
matching, and `unclaimed_listing` plus rating and review count give buying
signals no B2B database provides. An unclaimed Google Business Profile means
nobody is managing that owner's online presence — for anyone selling
marketing services that is a pre-qualified prospect, which is why it leads
the Source Notes string.

**Apollo (`--source apollo-orgs`) is for B2B depth**: employee counts,
revenue, LinkedIn, corporate hierarchy, or coverage beyond what Maps indexes.
It costs 1 lead credit per matched company and its phone is a corporate
mainline, not a direct dial.

**Apollo People Search is paid-plan only.** On a Free plan it returns
`API_INACCESSIBLE`, which makes owner/GM direct dials unreachable — phone
reveal needs a person ID to spend against, so direct-dial credits sit
unspendable. Say this plainly rather than implying a direct dial is coming.

If the user wants both, run them separately and keep the workbooks separate;
the two carry different fields and merging them hides which is which.

## Before spending anything

Check the path works before committing to a run. For Apollo, call
`apollo_users_api_profile` with `include_credit_usage=true` — it returns the
real balance and `waterfall_email_enabled` / `waterfall_phone_enabled`. For
Maps, confirm `api.scrape.do` is reachable; it is blocked by egress policy in
Claude Code web sessions, so the fetch may need to run on the user's own
machine. A CONNECT-stage 403 is a network policy denial, not an auth failure —
a valid token cannot fix it, and the proxy README says to report blocked
hosts rather than route around them.

Apollo's bulk endpoint requires a verbatim confirmation before any spend.
State the exact company count and credit cost, then wait. Do not batch-confirm
incrementally; confirm total scope upfront.

## Save raw before mapping

Write the payload to `leads/in/` verbatim before any adapter touches it, one
file per batch. This is the rule the whole package is built around: a mapping
fix should be a rerun against data already on disk, not another API spend.

It exists because `sources/apollo.py` was written against documented field
names with no live payload, and mapped **0 of 10** company names on first
contact — it read top-level `name` as a person when the records were
companies. Never write an adapter for an unseen response shape. Capture one
real payload, read its actual keys, then map.

## Inspect before exporting

```bash
python3 -m leads.main --input <raw.json> --source <src> --inspect
```

Report the unmapped-fields list to the user before producing a workbook. A
dropped field is invisible in a spreadsheet, so this is the only cheap moment
to catch it. `--inspect` deliberately does not require `openpyxl`, so it runs
on a fresh clone; the export does need it (`pip3 install openpyxl`).

What good output looks like: records parsed equals company names, phone count
is close behind, and unmapped keys is `none`. If company names come back 0,
the adapter is reading the wrong shape — stop and fix the mapping, do not
export. If a genuinely useful field shows up unmapped, map it rather than
adding it to the ignore list.

## Export

```bash
python3 -m leads.main --input <raw.json> --source <src> \
  --criteria leads/criteria-<state>.json --output leads/out/<name>.xlsx
```

Criteria live in JSON, not code. States match **exactly** after lowercasing —
substring matching would let `PA` hit `Campania` and `Spain` — so an adapter
must normalize full state names to two-letter codes. Trades match as
substrings against the declared trade *and* the company name.

Tell the user to open the workbook once in Excel before reading it with
pandas: `Contactable` is a live formula and openpyxl writes formulas without
cached values, so `data_only=True` reads them as `None` until an application
recalculates. LibreOffice cannot open openpyxl output in this container, so
verify formulas by resolving their ranges against real cell contents instead.

Rejected leads are kept with every reason they failed. That is how you tell a
filter that is too tight from a source that is too thin: if 200 leads all
reject for "no email or phone", the query was wrong, not the criteria.

## Data quality traps worth checking

These are observed failures, not hypotheticals:

- **Apollo's `state` is unreliable.** Records have arrived tagged with a state
  contradicted by their own address, phone area code and description — an
  Irish company tagged Pennsylvania, a PA company tagged New Jersey, an
  Indiana landscaper tagged NJ, a Danish firm tagged NJ. The geography filter
  matches Apollo's field, so these pass. Cross-check `raw_address` and the
  phone area code, and flag mismatches in the record's note.
- **Keyword matching admits non-contractors.** Suppliers, manufacturers' reps,
  staffing agencies, trade associations and consultancies qualify because
  their keyword lists mention the trade. One run surfaced an IEEE journal.
  Flag them in notes; offer to tighten criteria rather than silently dropping.
- **Anything an adapter records in `notes` must reach the user.** `Notes` is a
  yellow user-input column; `Source Notes` is the read-only one bound to
  `lead.notes`. Flags written to the wrong one vanish from the export.

## Scaling a run

Maps returns 20 results per page, so coverage comes from many narrow queries —
trade × city — rather than one broad sweep. Dedup on `place_id` across
queries; `leads/models.py` already dedupes on domain then name+city, which
handles most of it. Apollo's free `apollo_organizations_lookup` is the cheap
way to size a list before spending: it costs nothing and returns candidates,
so you can count what exists before confirming an enrichment spend.

Save each batch as its own file under `leads/in/`. If a connection drops
mid-run, everything already paid for is on disk.
