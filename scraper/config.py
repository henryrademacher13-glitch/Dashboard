"""Configuration for the scrape runner, all from environment variables.

Mirrors `scanner/config.py`: fail early and loudly on missing configuration
rather than halfway through a run that costs API calls.
"""
from __future__ import annotations

import os
from pathlib import Path

# Repo root — this file lives at <root>/scraper/config.py.
REPO_ROOT = Path(__file__).resolve().parents[1]

# The vendored library. Not on sys.path by default; main.py prepends it.
VENDOR_ROOT = REPO_ROOT / "vendor" / "scrapegraph-ai"

# Where the React app reads from. Vite serves public/ at the site root, so
# public/data/scrapes.json is fetched as <base>data/scrapes.json.
DEFAULT_OUTPUT = REPO_ROOT / "public" / "data" / "scrapes.json"

DEFAULT_SOURCES = REPO_ROOT / "scraper" / "sources.json"

# Every current Claude model has a 200k-token input window. ScrapeGraphAI
# ships a hardcoded table (`scrapegraphai/helpers/models_tokens.py`) that
# predates the Claude 4.5/5 families, and on a miss it does NOT fail — it
# warns once and silently continues with an 8192-token window, which quietly
# truncates long pages and changes the answer. So we always pass model_tokens
# explicitly and assert afterwards that the fallback did not fire.
DEFAULT_MODEL_TOKENS = 200_000


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or malformed."""


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"Missing required environment variable {name}. "
            "See scraper/README.md for the full list."
        )
    return value


def _flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    """Runtime configuration for one scrape run."""

    def __init__(self) -> None:
        # langchain-anthropic reads ANTHROPIC_API_KEY itself; check it here so
        # a missing key fails before we start fetching pages.
        _required("ANTHROPIC_API_KEY")

        self.model = os.environ.get("SCRAPER_MODEL", "claude-sonnet-5").strip()
        self.model_tokens = int(
            os.environ.get("SCRAPER_MODEL_TOKENS", str(DEFAULT_MODEL_TOKENS))
        )
        self.temperature = float(os.environ.get("SCRAPER_TEMPERATURE", "0"))

        self.sources_path = Path(
            os.environ.get("SCRAPER_SOURCES", str(DEFAULT_SOURCES))
        )
        self.output_path = Path(
            os.environ.get("SCRAPER_OUTPUT", str(DEFAULT_OUTPUT))
        )

        # Playwright fetches pages headless in CI; set SCRAPER_HEADLESS=0 to
        # watch a browser locally while debugging a selector-heavy page.
        self.headless = _flag("SCRAPER_HEADLESS", default=True)
        self.verbose = _flag("SCRAPER_VERBOSE", default=False)

        # Per-source ceiling. One wedged page should not stall the whole run.
        self.timeout_seconds = int(os.environ.get("SCRAPER_TIMEOUT", "120"))

        # Nothing is fetched and no LLM is called when true — the resolved
        # config and source list are printed instead.
        self.dry_run = _flag("DRY_RUN")

        if self.model_tokens < 1000:
            raise ConfigError(
                f"SCRAPER_MODEL_TOKENS is implausibly small: {self.model_tokens}"
            )

    def graph_config(self) -> dict:
        """The dict ScrapeGraphAI's graph classes take as `config`.

        The `anthropic/` prefix is load-bearing. Without it ScrapeGraphAI tries
        to infer the provider by looking the bare model name up in its token
        table, and raises ValueError for anything it has not heard of — which
        is every Claude model released after the table was last touched.
        """
        return {
            "llm": {
                "model": f"anthropic/{self.model}",
                "model_tokens": self.model_tokens,
                "temperature": self.temperature,
            },
            "headless": self.headless,
            "verbose": self.verbose,
        }
