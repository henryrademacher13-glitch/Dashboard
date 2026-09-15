# Vendored: ScrapeGraphAI

This directory is a **vendored copy** of an upstream project. Do not edit files
here to fix Dashboard bugs — see "Local changes" below.

| | |
| --- | --- |
| Upstream | https://github.com/ScrapeGraphAI/Scrapegraph-ai |
| Commit | `c75c8084fae2d4f5ba01a8c218bc1168b67e3569` |
| Version | 2.2.4 |
| Vendored on | 2026-09-15 |
| License | MIT (see `LICENSE`) |

## What this is

`scrapegraphai` is a Python web-scraping library that drives an LLM through a
graph of nodes (fetch → parse → generate answer) to pull structured data out of
web pages. It is **not** a Claude skill — it has no `SKILL.md` and Claude does
not load anything from this directory. It is a library that `scraper/` imports.

## Local changes

Two directories were removed from the upstream tree:

- **`.git/`** — this is a source copy, not a submodule or a nested clone.
- **`.github/`** — upstream's CI workflows (including semantic-release and
  PyPI publish jobs). GitHub Actions only reads `.github/` at the repository
  root, so these would not have fired here, but they are dead weight that
  reads like Dashboard CI to anyone browsing the tree.

Everything else is byte-identical to upstream `c75c808`. Nothing under
`scrapegraphai/` has been patched.

> `AGENTS.md` in this directory is **upstream's** contributor guidance for the
> ScrapeGraphAI project. It does not apply to Dashboard work.

## Updating

```bash
git clone --depth 1 https://github.com/ScrapeGraphAI/Scrapegraph-ai.git /tmp/sgai
rm -rf vendor/scrapegraph-ai
cp -R /tmp/sgai vendor/scrapegraph-ai
rm -rf vendor/scrapegraph-ai/.git vendor/scrapegraph-ai/.github
# restore this file, then update the commit/version/date rows above
```

Re-check `scrapegraphai/helpers/models_tokens.py` after any update: `scraper/`
depends on how that table handles unknown model names (see
`scraper/config.py`).
