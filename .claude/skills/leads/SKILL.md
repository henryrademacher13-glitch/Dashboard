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

## Exporting to a CRM

`--output` ending in `.csv` writes a GoHighLevel-importable file instead of a
workbook: GHL takes CSV, and the column names in `leads/ghl.py` match its own
so the import mapping auto-resolves rather than needing manual pairing.

Phones are converted to E.164 (`+1XXXXXXXXXX`) because GHL matches and dials
on that reliably and rejects some display formats. Tags carry state, primary
trade, and `unclaimed-listing`, which is what makes the list segmentable into
workflows once it lands. A Maps listing is a business with no person, so
Company Name also fills Full Name — otherwise rows import nameless and are
hard to find afterwards.

The CSV path never imports `openpyxl` and prints no formula warning, because
a CSV has no formulas.

## Scaling a run

`leads/fetch_gmaps_batch.py` does this: it walks trade × metro combinations
for a state, saves each response, dedupes on `place_id` as it goes, and stops
the moment the target is reached so you are not buying requests you do not
need. It caps total requests and aborts after three consecutive failures
rather than burning a budget on a broken run.

## Asking for *more* leads

"I need 300 more" is not the same request as "I need 300". The batch script
resumes by default: it loads every `place_id` already saved under
`leads/in/gmaps-<state>/` before the first request, and skips any trade × metro
query whose response file is already on disk. So `--target` counts *new* unique
businesses on top of the existing corpus, and a rerun does not pay again for
ground the last run already covered. `--no-resume` re-issues everything.

When they want the new ones in their own file rather than mixed into the full
list, `--exclude` takes what was already delivered - the raw `.json` payloads a
previous run read, a directory of them, or a CSV a previous run wrote - and
emits only what is not in it. It matches on `Lead.dedup_key`, the same identity
`dedupe()` uses, so "already delivered" and "duplicate" can never drift apart.
Exclusions are reported on their own line, never folded into the duplicate
count. Exporting both files from the same corpus costs nothing extra: the raw
payloads are already paid for.

The reliable way to set that boundary is to snapshot the delivered CSV before
fetching more:

    python3 -m leads.main --source gmaps --input leads/in/gmaps-<state> \
        --output leads/out/<state>-all.csv
    cp leads/out/<state>-all.csv leads/out/<state>-delivered.csv
    python3 leads/fetch_gmaps_batch.py --state <STATE> --target <N>
    python3 -m leads.main --source gmaps --input leads/in/gmaps-<state> \
        --exclude leads/out/<state>-delivered.csv \
        --output leads/out/<state>-new.csv

The snapshot is what "already delivered" means, and it survives any number of
later fetches. Sorting raw files by mtime also works - a resumed run skips the
files it already has, so their timestamps stay put - but it depends on knowing
how many files the earlier run wrote, which nothing records.

Before spending anything on a "more leads" request, re-export what is already
on disk. A criteria fix or a mapping fix can recover dozens of leads from
payloads already paid for, at zero request cost, and that changes how many new
ones actually need fetching.

`--input` accepts a directory, so a batch of ~40 files is one command. Merging
happens before the adapter so adapters still see a single payload shape;
unreadable files are counted and skipped rather than killing the run.

Note that `leads/models.py` dedupes on domain before name+city, so a
multi-location contractor sharing one website collapses to a single row. For a
call sheet that is usually right — you are not dialling one company five
times — but say so rather than letting the count look like a shortfall. Apollo's free `apollo_organizations_lookup` is the cheap
way to size a list before spending: it costs nothing and returns candidates,
so you can count what exists before confirming an enrichment spend.

Save each batch as its own file under `leads/in/`. If a connection drops
mid-run, everything already paid for is on disk.
