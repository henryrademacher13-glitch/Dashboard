"""The declarative source list: what to scrape, and what to ask about it.

A source is a URL plus a natural-language prompt. ScrapeGraphAI fetches the
page and asks the model the prompt; whatever JSON comes back is handed to the
dashboard as-is, so the prompt is the schema. Ask for named fields explicitly.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .config import ConfigError

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


@dataclass
class Source:
    id: str
    label: str
    url: str
    prompt: str
    emoji: str = "🌐"
    color: str = "#6366f1"
    enabled: bool = True
    # Free-form note shown in the dashboard card's footer.
    note: str = ""


@dataclass
class SourceFile:
    sources: list[Source] = field(default_factory=list)

    def enabled(self) -> list[Source]:
        return [s for s in self.sources if s.enabled]


def load_sources(path: Path) -> SourceFile:
    """Read and validate sources.json. Raises ConfigError on anything bad."""
    if not path.exists():
        raise ConfigError(f"Source list not found: {path}")

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"{path} is not valid JSON: {exc}") from exc

    return parse_sources(raw, origin=str(path))


def parse_sources(raw: object, origin: str = "<memory>") -> SourceFile:
    """Validate an already-parsed sources document.

    Split out from load_sources so the rules can be tested without a file.
    """
    if not isinstance(raw, dict) or not isinstance(raw.get("sources"), list):
        raise ConfigError(f"{origin}: expected an object with a 'sources' array")

    sources: list[Source] = []
    seen: set[str] = set()

    for index, entry in enumerate(raw["sources"]):
        where = f"{origin}: sources[{index}]"
        if not isinstance(entry, dict):
            raise ConfigError(f"{where} is not an object")

        for required in ("id", "label", "url", "prompt"):
            value = entry.get(required)
            if not isinstance(value, str) or not value.strip():
                raise ConfigError(f"{where} is missing a non-empty '{required}'")

        source_id = entry["id"].strip()
        if not ID_RE.match(source_id):
            raise ConfigError(
                f"{where}: id {source_id!r} must be lowercase letters, digits "
                "and hyphens (it is used as a JSON key and a React key)"
            )
        if source_id in seen:
            # Duplicate ids would collide in the output map and silently drop
            # one source's results.
            raise ConfigError(f"{where}: duplicate id {source_id!r}")
        seen.add(source_id)

        url = entry["url"].strip()
        if not url.startswith(("http://", "https://")):
            raise ConfigError(f"{where}: url must be http(s), got {url!r}")

        sources.append(
            Source(
                id=source_id,
                label=entry["label"].strip(),
                url=url,
                prompt=entry["prompt"].strip(),
                emoji=str(entry.get("emoji", "🌐")),
                color=str(entry.get("color", "#6366f1")),
                enabled=bool(entry.get("enabled", True)),
                note=str(entry.get("note", "")),
            )
        )

    if not sources:
        raise ConfigError(f"{origin}: 'sources' is empty — nothing to scrape")

    return SourceFile(sources=sources)
