# Scrape Feed (Python)

Scrapes a list of web pages with an Anthropic model and writes
`public/data/scrapes.json`, which the dashboard's **Feed** tab renders.

The scraping itself is done by **ScrapeGraphAI**, vendored at
[`vendor/scrapegraph-ai/`](../vendor/scrapegraph-ai/VENDORED.md). This package
is the thin layer around it: config, a validated source list, error isolation,
and an atomic write.

```
scraper/sources.json          what to scrape + what to ask
  -> SmartScraperGraph        fetch page (playwright) -> parse -> ask Claude
  -> public/data/scrapes.json one entry per source, ok or error
  -> Feed tab                 src/useScrapes.js -> ScrapeFeed.jsx
```

## Requirements

**Python 3.12+** — upstream's `requires-python`. The 3.11 that ships in some
containers will not install the dependency tree.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r scraper/requirements.txt
playwright install chromium     # the fetch step drives a real browser
export ANTHROPIC_API_KEY=sk-ant-...
```

`scrapegraphai` itself is **not** installed from PyPI — `scraper/main.py` puts
`vendor/scrapegraph-ai/` on `sys.path` so runs match the vendored source.

## Running

```bash
python -m scraper.main --validate     # check sources.json (no API key needed)
python -m scraper.main --dry-run      # resolve config, fetch nothing
python -m scraper.main --only hn-top  # one source
python -m scraper.main                # the real thing
```

Exit codes: `0` at least one source succeeded · `1` every source failed ·
`2` bad configuration.

The output file is written even when every source fails, as a page of error
cards. Stale data presented as current is worse than a visible failure.

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | *(required)* | Checked before any page is fetched. |
| `SCRAPER_MODEL` | `claude-sonnet-5` | Model name, without a provider prefix. |
| `SCRAPER_MODEL_TOKENS` | `200000` | Input window. See the warning below. |
| `SCRAPER_TEMPERATURE` | `0` | Extraction wants determinism. |
| `SCRAPER_SOURCES` | `scraper/sources.json` | Source list path. |
| `SCRAPER_OUTPUT` | `public/data/scrapes.json` | Where the dashboard reads. |
| `SCRAPER_HEADLESS` | `true` | `0` to watch the browser locally. |
| `SCRAPER_VERBOSE` | `false` | ScrapeGraphAI's own node-by-node logging. |
| `SCRAPER_TIMEOUT` | `120` | Per-source ceiling, seconds. |
| `DRY_RUN` | `false` | Same as `--dry-run`. |

> **Why `model_tokens` is always passed explicitly.** ScrapeGraphAI resolves
> context windows from a hardcoded table
> (`scrapegraphai/helpers/models_tokens.py`) that predates the Claude 4.5/5
> families. On a miss it does **not** raise — it logs a warning and continues
> with an 8192-token window, silently truncating long pages and changing the
> answer. `scraper/runner.py` treats that fallback as a hard error rather than
> shipping quietly-wrong data.
>
> Relatedly, `SCRAPER_MODEL` is sent as `anthropic/<model>`. Without the prefix
> the library tries to infer the provider from that same stale table and raises
> `ValueError` for any recent Claude model.

## sources.json

```json
{
  "sources": [
    {
      "id": "hn-top",
      "label": "Top of Hacker News",
      "url": "https://news.ycombinator.com/",
      "prompt": "Return a JSON object with a key 'stories' holding ...",
      "emoji": "📰",
      "color": "#10b981",
      "note": "shown in the card footer",
      "enabled": true
    }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Lowercase letters, digits, hyphens. Unique — it is the React key. |
| `label` | yes | Card heading. |
| `url` | yes | Must be `http://` or `https://`. |
| `prompt` | yes | **The prompt is the schema.** Name the fields you want. |
| `emoji` | no | Defaults to 🌐. |
| `color` | no | Card's left border. Defaults to `#6366f1`. |
| `note` | no | Small footer line. |
| `enabled` | no | Defaults to `true`. `false` keeps it in the file, skips the run. |

Run `--validate` after editing; it catches duplicate ids, non-http URLs, and
missing fields before you spend any API calls.

### Writing prompts

The model returns whatever it decides to return, so be explicit:

- Name each key and its type — *"a key `points` (integer)"*.
- Cap list lengths — *"the top 5 stories"* — or a long page becomes a long bill.
- Say what not to do — *"do not invent stories that are not on the page"*.
- The dashboard renders any shape: scalars as text, short string arrays as
  chips, arrays of objects as numbered records. You do not need a flat schema.

## Tests

```bash
python3 tests/test_scraper.py
```

No dependencies required — the graph is injected, so validation, error
isolation, the token-fallback guard, and the atomic write are all covered
without installing playwright or langchain.
