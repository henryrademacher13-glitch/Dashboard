"""Entry point: one sweep of the mailbox.

Dedup is thread ordering. A message from the watched sender counts as answered
when a message from the mailbox owner sits after it in the same thread. No
state store, no labels — it self-heals if a run dies mid-flight, and a
follow-up in an old thread is correctly seen as new work.
"""
from __future__ import annotations

import os
import sys
import traceback

from .answerer import answer_email
from .config import Config, ConfigError
from .dedup import unanswered_messages
from .gmail_client import GmailClient


def _summary_line(text: str) -> None:
    print(text, flush=True)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        try:
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(text + "\n")
        except OSError:
            pass


def run() -> int:
    try:
        config = Config()
    except ConfigError as exc:
        print(f"CONFIG ERROR: {exc}", file=sys.stderr)
        return 2

    gmail = GmailClient(config)
    _summary_line(f"Mailbox: {gmail.address}")
    _summary_line(f"Watching: {config.watched_sender} (window {config.search_window})")
    if config.dry_run:
        _summary_line("DRY RUN — nothing will be sent.")

    thread_ids = gmail.find_threads()
    if not thread_ids:
        _summary_line("No mail from the watched sender in the window. Nothing to do.")
        return 0

    _summary_line(f"Threads matched: {len(thread_ids)}")
    sent = 0
    skipped = 0

    for thread_id in thread_ids:
        try:
            thread = gmail.get_thread(thread_id)
        except Exception as exc:  # noqa: BLE001
            _summary_line(f"  thread {thread_id}: could not read ({exc}) — skipped")
            skipped += 1
            continue

        pending = unanswered_messages(thread, config.watched_sender)
        if not pending:
            skipped += 1
            continue

        subject = pending[-1].subject or "(no subject)"

        if sent >= config.max_replies_per_run:
            _summary_line(f"  {subject}: reply cap ({config.max_replies_per_run}) reached — skipped")
            skipped += 1
            continue

        try:
            answer = answer_email(config, pending)
        except Exception as exc:  # noqa: BLE001
            _summary_line(f"  {subject}: answering failed ({exc}) — skipped, will retry next run")
            skipped += 1
            continue

        if answer.refused:
            _summary_line(f"  {subject}: model declined to answer — skipped, nothing sent")
            skipped += 1
            continue

        if not answer.text:
            _summary_line(f"  {subject}: empty answer — skipped, nothing sent")
            skipped += 1
            continue

        detail = ""
        if answer.unreadable:
            detail = f" [unreadable: {'; '.join(answer.unreadable)}]"

        if config.dry_run:
            _summary_line(f"  {subject}: would reply ({len(answer.text)} chars){detail}")
            print("-" * 60)
            print(answer.text)
            print("-" * 60, flush=True)
            continue

        try:
            message_id = gmail.send_reply(
                to_address=config.watched_sender,
                original=pending[-1],
                body=answer.text,
            )
        except Exception as exc:  # noqa: BLE001
            _summary_line(f"  {subject}: SEND FAILED ({exc}) — will retry next run")
            skipped += 1
            continue

        sent += 1
        _summary_line(f"  {subject}: replied (message {message_id}){detail}")

    _summary_line(f"Done. Replies sent: {sent}. Threads skipped: {skipped}.")
    return 0


def main() -> int:
    try:
        return run()
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
