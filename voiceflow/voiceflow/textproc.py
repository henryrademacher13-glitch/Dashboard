"""Cleanup of transcribed text before it is injected.

The cleaner is *streaming-aware*: text arrives in committed chunks, so it
keeps state across calls (whether the next word starts a sentence, whether a
joining space is needed) and must be reset between dictation sessions.
"""

from __future__ import annotations

import re

DEFAULT_FILLERS = ["um", "uh", "uhm", "erm", "hmm", "mm-hmm", "mhm"]

_SENTENCE_END = ".!?"
_NO_SPACE_BEFORE = ".,!?;:)]}»…'\""


class TranscriptCleaner:
    def __init__(
        self,
        remove_fillers: bool = True,
        filler_words: list[str] | None = None,
        capitalize_sentences: bool = True,
        custom_vocab: dict[str, str] | None = None,
    ):
        self.capitalize_sentences = capitalize_sentences
        if filler_words is None:
            filler_words = DEFAULT_FILLERS
        self._filler_re = None
        if remove_fillers and filler_words:
            words = "|".join(re.escape(w) for w in filler_words)
            # Remove the filler plus an immediately following comma
            # ("I think, um, that" -> "I think, that").
            self._filler_re = re.compile(rf"\s*\b(?:{words})\b,?", re.IGNORECASE)
        self._vocab: list[tuple[re.Pattern, str]] = []
        for spoken, written in (custom_vocab or {}).items():
            if spoken.strip():
                self._vocab.append(
                    (re.compile(rf"\b{re.escape(spoken)}\b", re.IGNORECASE), written)
                )
        self.reset()

    def reset(self) -> None:
        self._cap_next = True
        self._last_char = ""

    def process(self, chunk: str) -> str:
        """Clean one committed chunk and return exactly what should be typed."""
        text = chunk.strip()
        if not text:
            return ""

        if self._filler_re is not None:
            text = self._filler_re.sub("", text)
        for pattern, written in self._vocab:
            text = pattern.sub(written, text)

        text = re.sub(r"\s+", " ", text).strip()
        text = re.sub(r"\s+([.,!?;:])", r"\1", text)  # no space before punctuation
        text = re.sub(r",\s*([.!?,])", r"\1", text)   # ",." left by filler removal
        if not text or not re.search(r"\w", text):
            return ""

        out: list[str] = []
        for ch in text:
            if self.capitalize_sentences and self._cap_next and ch.isalnum():
                out.append(ch.upper() if ch.isalpha() else ch)
                self._cap_next = False
            else:
                out.append(ch)
                if ch in _SENTENCE_END:
                    self._cap_next = True
        result = "".join(out)

        # Joining space between this chunk and previously injected text.
        if (
            self._last_char
            and not self._last_char.isspace()
            and result[0] not in _NO_SPACE_BEFORE
        ):
            result = " " + result

        self._last_char = result[-1]
        return result
