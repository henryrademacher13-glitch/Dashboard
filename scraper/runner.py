"""Run one source through ScrapeGraphAI and shape the result for the dashboard.

The graph factory is injected so this module can be tested without installing
the whole scrapegraphai dependency tree (playwright, langchain, tiktoken, ...).
"""
from __future__ import annotations

import time
from typing import Callable, Optional

from .config import Config
from .sources import Source

# A factory takes (prompt, url, graph_config) and returns an object with .run().
GraphFactory = Callable[[str, str, dict], object]


class ModelWindowError(RuntimeError):
    """The library silently fell back to an 8192-token context window."""


def default_graph_factory(prompt: str, url: str, graph_config: dict) -> object:
    """Import SmartScraperGraph lazily.

    Deferred so that `--dry-run`, `--validate`, and the tests never pay the
    import cost of the vendored dependency tree.
    """
    from scrapegraphai.graphs import SmartScraperGraph

    return SmartScraperGraph(prompt=prompt, source=url, config=graph_config)


def scrape_source(
    source: Source,
    config: Config,
    graph_factory: Optional[GraphFactory] = None,
) -> dict:
    """Scrape one source. Never raises — failures are reported in the result.

    One bad URL should degrade one dashboard card, not abort the run and leave
    the other cards stale with no explanation.
    """
    factory = graph_factory or default_graph_factory
    started = time.monotonic()

    def elapsed_ms() -> int:
        return int((time.monotonic() - started) * 1000)

    try:
        graph = factory(source.prompt, source.url, config.graph_config())

        # See config.DEFAULT_MODEL_TOKENS. The library logs a warning and
        # carries on with 8192 tokens when it does not recognise the model;
        # that truncates long pages and changes the answer without failing, so
        # treat it as an error rather than shipping quietly-wrong data.
        if getattr(graph, "model_tokens_defaulted", False):
            raise ModelWindowError(
                f"ScrapeGraphAI did not accept model_tokens for "
                f"{config.model!r} and fell back to an 8192-token window. "
                "Check SCRAPER_MODEL_TOKENS and the model name."
            )

        result = graph.run()
    except Exception as exc:  # noqa: BLE001 - deliberately broad, see docstring
        return {
            "id": source.id,
            "label": source.label,
            "url": source.url,
            "emoji": source.emoji,
            "color": source.color,
            "note": source.note,
            "status": "error",
            "error": f"{type(exc).__name__}: {exc}",
            "data": None,
            "durationMs": elapsed_ms(),
        }

    return {
        "id": source.id,
        "label": source.label,
        "url": source.url,
        "emoji": source.emoji,
        "color": source.color,
        "note": source.note,
        "status": "ok",
        "error": None,
        "data": normalize_result(result),
        "durationMs": elapsed_ms(),
    }


def normalize_result(result: object) -> object:
    """Coerce a graph result into something json.dump can handle.

    SmartScraperGraph usually returns a dict, but a schema-bound run returns a
    pydantic model and a confused run can return a bare string.
    """
    if result is None:
        return None
    if isinstance(result, (str, int, float, bool)):
        return result
    if isinstance(result, dict):
        return {str(k): normalize_result(v) for k, v in result.items()}
    if isinstance(result, (list, tuple)):
        return [normalize_result(v) for v in result]

    # pydantic v2 / v1
    for attr in ("model_dump", "dict"):
        dumper = getattr(result, attr, None)
        if callable(dumper):
            try:
                return normalize_result(dumper())
            except Exception:  # noqa: BLE001
                pass

    return str(result)
