# Scrape Feed

The dashboard's **Feed** tab shows structured data pulled off the open web by
an Anthropic model. This document covers how the pieces fit together and how to
operate it; the reference material (env vars, `sources.json` fields, prompt
advice) lives in [`scraper/README.md`](../scraper/README.md).

## Where this came from

The request was "download this skill: `ScrapeGraphAI/Scrapegraph-ai`".
ScrapeGraphAI is **not** a Claude skill — it has no `SKILL.md` and Claude loads
nothing from it. It is a Python library that drives an LLM through a graph of
nodes (fetch → parse → generate answer) to extract structured data from a page.

It was vendored rather than pip-installed, by explicit choice. See
[`vendor/scrapegraph-ai/VENDORED.md`](../vendor/scrapegraph-ai/VENDORED.md) for
the upstream commit and the two directories that were dropped.

## The pipeline

```
scraper/sources.json                     url + prompt per source
  -> python -m scraper.main
  -> vendor/scrapegraph-ai SmartScraperGraph
       playwright fetches the page
       html is parsed and chunked
       Claude answers the prompt against the chunks
  -> public/data/scrapes.json            atomic write
  -> src/useScrapes.js                   fetch on mount, no-store
  -> src/components/ScrapeFeed.jsx       one card per source
```

Nothing is live. The dashboard reads a file; a scrape run rewrites that file.
The Feed tab's ↻ button re-reads the file, it does not trigger a scrape.

## Design decisions worth knowing

**One bad source degrades one card.** `scrape_source` catches everything and
returns an error result. A 404, a timeout, a page that changed its markup —
each becomes a red card with the exception text, and the other sources still
publish. The run only exits non-zero when *every* source failed.

**The output is written even on total failure.** Leaving yesterday's numbers on
screen, labelled as if they were current, is the worse failure mode.

**The 8192-token trap is a hard error.** ScrapeGraphAI's model-token table does
not know any recent Claude model, and its miss path is a log line plus a silent
downgrade to an 8192-token context window — which truncates the page and
changes the answer without failing. `scraper/runner.py` raises `ModelWindowError`
instead. If a run starts failing with that after a vendor update, the table
changed shape; do not just widen the window and move on.

**The prompt is the schema.** There is no pydantic model in the loop, so the
dashboard renders whatever comes back generically. That keeps adding a source a
one-JSON-entry change, at the cost of no guarantee about the returned shape.

## Operating it

Add or change a source:

```bash
$EDITOR scraper/sources.json
python -m scraper.main --validate
python -m scraper.main --only <new-id>
npm run dev            # check the Feed tab
```

Commit `public/data/scrapes.json` if you want the deployed dashboard to show
that snapshot — the build copies `public/` verbatim, so whatever is committed
is what a fresh visitor sees until the next run.

## Running it on a schedule

Not wired up. `scraper/main.py` already writes to `GITHUB_STEP_SUMMARY` when it
sees it, so a workflow modelled on `.github/workflows/email-scanner.yml` would
work: install `scraper/requirements.txt`, `playwright install chromium`, run
`python -m scraper.main`, commit `public/data/scrapes.json`. It needs
`ANTHROPIC_API_KEY` as a repository secret and nothing else.

Worth doing only once the source list is one you actually care about — the two
in there now are samples.

## Cost and etiquette

Every source is one page fetch plus at least one model call per chunk, on every
run. A long page is several calls. Before putting this on a 15-minute schedule
like the email scanner, check that the pages you are watching actually change
that often, and that scraping them is allowed — ScrapeGraphAI reads
`robots.txt` but does not enforce it.
