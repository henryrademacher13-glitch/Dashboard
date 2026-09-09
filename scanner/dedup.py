"""Deduplication: which messages still need an answer.

Kept dependency-free so it can be unit tested without Gmail or Anthropic
installed. This is the logic that decides whether mail gets answered twice,
so it is the piece most worth testing.
"""
from __future__ import annotations

from typing import Protocol, Sequence


class ThreadMessage(Protocol):
    sender: str
    internal_date: int

    @property
    def is_from_owner(self) -> bool: ...


def unanswered_messages(
    thread: Sequence[ThreadMessage], watched_sender: str
) -> list[ThreadMessage]:
    """Messages from the watched sender with no owner reply after them.

    A message is answered exactly when a message from the mailbox owner sits
    later in the thread. Ties (identical timestamps) count as answered — better
    to skip a message the next run picks up than to send a duplicate.
    """
    watched = watched_sender.lower()
    last_owner_reply = max(
        (m.internal_date for m in thread if m.is_from_owner),
        default=-1,
    )
    return [
        m for m in thread
        if m.sender.lower() == watched and m.internal_date > last_owner_reply
    ]
