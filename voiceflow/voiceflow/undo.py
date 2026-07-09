"""Undo support: revert the last inserted transcription.

Injected text is grouped into utterances (one hotkey press-and-release =
one utterance). Undo pops the most recent utterance and returns its text;
the caller deletes len(text) characters via the injector.
"""

from __future__ import annotations


class UndoManager:
    def __init__(self, max_depth: int = 10):
        self._max_depth = max_depth
        self._stack: list[str] = []
        self._current: list[str] | None = None

    def begin_utterance(self) -> None:
        self._finish_current()
        self._current = []

    def record(self, text: str) -> None:
        if not text:
            return
        if self._current is None:
            self._current = []
        self._current.append(text)

    def end_utterance(self) -> None:
        self._finish_current()

    def undo(self) -> str | None:
        """Return the text of the most recent utterance, removing it."""
        self._finish_current()
        if not self._stack:
            return None
        return self._stack.pop()

    def _finish_current(self) -> None:
        if self._current:
            self._stack.append("".join(self._current))
            del self._stack[: -self._max_depth]
        self._current = None
