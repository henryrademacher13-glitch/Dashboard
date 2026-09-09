"""Configuration, all from environment variables."""
from __future__ import annotations

import os


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or malformed."""


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"Missing required environment variable {name}. "
            "See scanner/README.md for the full list."
        )
    return value


def _flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    """Runtime configuration for one sweep."""

    def __init__(self) -> None:
        # Gmail OAuth (see scanner/authorize.py to mint the refresh token once).
        self.client_id = _required("GMAIL_CLIENT_ID")
        self.client_secret = _required("GMAIL_CLIENT_SECRET")
        self.refresh_token = _required("GMAIL_REFRESH_TOKEN")

        # Anthropic. The SDK reads ANTHROPIC_API_KEY itself; we check it early
        # so a missing key fails before we start reading someone's mail.
        _required("ANTHROPIC_API_KEY")

        self.watched_sender = os.environ.get(
            "WATCHED_SENDER", "s036407@students.lmsd.org"
        ).strip().lower()

        # How far back to look. Dedup is thread ordering, so a generous window
        # costs nothing but survives an outage.
        self.search_window = os.environ.get("SEARCH_WINDOW", "2d").strip()

        self.model = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5").strip()
        self.effort = os.environ.get("ANTHROPIC_EFFORT", "high").strip()
        self.max_tokens = int(os.environ.get("MAX_TOKENS", "16000"))

        # Nothing is sent when true — the composed reply is printed instead.
        self.dry_run = _flag("DRY_RUN")

        # Safety ceiling on how many replies one sweep may send.
        self.max_replies_per_run = int(os.environ.get("MAX_REPLIES_PER_RUN", "5"))

        if not self.watched_sender or "@" not in self.watched_sender:
            raise ConfigError(f"WATCHED_SENDER is not an email address: {self.watched_sender!r}")


# Gmail scopes: read mail, and send mail. Deliberately not gmail.modify —
# the scanner never needs to label, trash, or alter anything.
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]
