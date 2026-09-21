# Lead pull prompt

Paste into a session that has the Apollo connector loaded. Fill in the
`[BRACKETS]` first. Reference for the pipeline it feeds: `leads/README.md`.

---

## The prompt

```
Pull [200] contractor leads from Apollo and export them to a spreadsheet.

TARGET
- Trades: [roofing, HVAC, plumbing, electrical]
- Geography: [Chester County PA + surrounding — list the towns or metro]
- Company size: 1-50 employees
- Titles: Owner, President, Founder, General Manager, Partner

BEFORE SPENDING ANYTHING
1. Call apollo_usage_stats_credit_usage_stats and tell me the lead_credit
   balance. If it is below the number of leads I asked for, STOP and tell me
   what is actually affordable. Do not start a partial run without saying so.
2. Read leads/exclude.json if it exists. Every company domain and Apollo
   person id in there has already been pulled — exclude them, then top the
   batch back up so I still get the full count of NEW leads.

SEARCH (apollo_mixed_people_api_search)
- Set BOTH person_locations AND organization_locations to my geography.
  They are ANDed and independent: setting only organization_locations
  returns employees who live anywhere in the world, and enriching those
  wastes credits.
- Use organization_naics_codes ['238'] for specialty trade contractors —
  it is far cleaner than keyword matching. Narrow further if I named one
  trade: 2381 exterior/roofing, 2382 HVAC/plumbing/electrical, 2383 finishing.
- organization_num_employees_ranges: ['1,10', '11,50']
- person_titles as listed above; leave include_similar_titles at its default.
- per_page 100, and page through until you have enough AFTER exclusions.
  Do not assume one page is enough — dedup and filtering will cut into it.

ENRICHMENT — ASK ME FIRST
Search returns NO emails or phones. Enrichment is the step that spends lead
credits, one per record. So:
- Show me the count of unique new people found and the exact credit cost of
  enriching them. Wait for my go-ahead. Do not enrich on your own initiative.
- If I approve and it is 20+ records, use the record-collection path
  (apollo_custom_objects_create + apollo_fields_create +
  apollo_dynamic_field_enrichment_enrich), NOT a loop over
  apollo_people_bulk_match — the loop has no persistence or resumability.
- Masked last names in search results are normal and do not block enrichment.

EXPORT
- Save the raw Apollo JSON to leads/in/apollo-YYYY-MM-DD.json before parsing.
  A mapping fix should be a rerun, not another credit spend.
- Run: python -m leads.main --input <that file> --inspect
  Report the unmapped-fields list before exporting anything.
- Then export, and append every exported domain + Apollo id to
  leads/exclude.json so the next run cannot hand me the same people.
- Send me the .xlsx.

Report actual credits spent and the new balance when you are done.
```

---

## Why each guardrail is there

| Guardrail | What goes wrong without it |
| --- | --- |
| Check credits first | You discover the balance is short 150 leads into a run. |
| Read `exclude.json` | "200 more" silently returns people you already paid for. |
| Both location params | Apollo ANDs them independently. Setting only the org one returns employees living anywhere on earth — and you pay to enrich them. |
| NAICS over keywords | `238` is the specialty-trade-contractor code. Keyword matching on "roofing" also catches roofing *suppliers*, *distributors*, and software vendors. |
| Approve enrichment | Search is cheap; enrichment is one lead credit per record and is not reversible. |
| Record collection at 20+ | Apollo's own tooling says a `bulk_match` loop has no persistence, no resumability, no export path. |
| Save raw JSON | A field-mapping bug becomes a rerun instead of a second purchase. |
| `--inspect` before export | A dropped field is invisible in the spreadsheet. |

## Credit arithmetic

Enrichment is **1 lead credit per record**. Search itself is cheap — company
search is 1 credit per request returning results.

So "200 leads" means ~200 lead credits **if you want emails and phones**. If
you only need the identified list — name, title, company, city, LinkedIn —
searching gets you there for a few credits and no enrichment at all.
