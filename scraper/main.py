"""Entry point: one scrape run.

Reads scraper/sources.json, scrapes each enabled source through ScrapeGraphAI
with an Anthropic model, and writes public/data/scrapes.json for the React app.

    python -m scraper.main --dry-run      # resolve config, fetch nothing
    python -m scraper.main --validate     # check sources.json only
    python -m scraper.main --only hn-top  # one source
    python -m scraper.main                # the real thing
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import traceback
from datetime import datetime, timezone
from pathlib import Path

from .config import VENDOR_ROOT, Config, ConfigError
from .runner import scrape_source
from .sources import Source, load_sources

# Prefer the vendored copy over anything pip happens to have installed, so a
# run here matches the source in vendor/scrapegraph-ai/.
if str(VENDOR_ROOT) not in sys.path:
    sys.path.insert(0, str(VENDOR_ROOT))


def _summary_line(text: str) -> None:
    """Print, and also append to the GitHub Actions job summary when present."""
    print(text, flush=True)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        try:
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(text + "\n")
        except OSError:
            pass


def write_output(path: Path, payload: dict) -> None:
    """Write JSON atomically.

    The dev server and the browser can be reading this file while we write it;
    a truncated read would surface as a parse error in the dashboard. Write to
    a sibling temp file and rename, which is atomic on the same filesystem.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        os.replace(tmp_name, path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise


def select_sources(all_sources: list[Source], only: list[str]) -> list[Source]:
    if not only:
        return all_sources
    wanted = set(only)
    unknown = wanted - {s.id for s in all_sources}
    if unknown:
        raise ConfigError(f"--only named unknown source id(s): {sorted(unknown)}")
    return [s for s in all_sources if s.id in wanted]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="scraper", description=__doc__)
    parser.add_argument("--only", action="append", default=[], metavar="ID",
                        help="scrape only this source id (repeatable)")
    parser.add_argument("--sources", type=Path, default=None,
                        help="override the source list path")
    parser.add_argument("--output", type=Path, default=None,
                        help="override the output path")
    parser.add_argument("--dry-run", action="store_true",
                        help="resolve config and sources, fetch nothing")
    parser.add_argument("--validate", action="store_true",
                        help="validate sources.json and exit (no API key needed)")
    args = parser.parse_args(argv)

    # --validate deliberately runs before Config(), so it works in a checkout
    # with no ANTHROPIC_API_KEY set.
    if args.validate:
        try:
            from .config import DEFAULT_SOURCES

            path = args.sources or Path(
                os.environ.get("SCRAPER_SOURCES", str(DEFAULT_SOURCES))
            )
            source_file = load_sources(path)
        except ConfigError as exc:
            print(f"INVALID: {exc}", file=sys.stderr)
            return 2
        print(f"OK: {path} — {len(source_file.sources)} source(s), "
              f"{len(source_file.enabled())} enabled")
        for s in source_file.sources:
            print(f"  {'✓' if s.enabled else '·'} {s.id:<20} {s.url}")
        return 0

    try:
        config = Config()
        if args.sources:
            config.sources_path = args.sources
        if args.output:
            config.output_path = args.output
        source_file = load_sources(config.sources_path)
        selected = select_sources(source_file.enabled(), args.only)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2

    if not selected:
        print("No enabled sources selected — nothing to do.", file=sys.stderr)
        return 2

    if args.dry_run or config.dry_run:
        print("DRY RUN — no pages fetched, no model calls made.")
        print(json.dumps(config.graph_config(), indent=2))
        for s in selected:
            print(f"  would scrape {s.id:<20} {s.url}")
        print(f"  would write {config.output_path}")
        return 0

    results = []
    for source in selected:
        print(f"→ {source.id}: {source.url}", flush=True)
        result = scrape_source(source, config)
        if result["status"] == "error":
            print(f"  FAILED: {result['error']}", file=sys.stderr, flush=True)
        else:
            print(f"  ok ({result['durationMs']} ms)", flush=True)
        results.append(result)

    ok = [r for r in results if r["status"] == "ok"]
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": config.model,
        "sources": results,
    }

    # Written even when every source failed: an honest page of error cards
    # beats yesterday's numbers presented as today's.
    write_output(config.output_path, payload)

    _summary_line(
        f"Scrape run: {len(ok)}/{len(results)} source(s) ok → {config.output_path}"
    )
    return 0 if ok else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        sys.exit(1)
