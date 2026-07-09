"""Near-real-time transcription over a rolling audio buffer.

Strategy: every `interval` seconds the worker re-transcribes everything that
has not yet been committed. Segments that end more than `holdback` seconds
before the end of the buffer are considered stable — Whisper won't change
them anymore — so they are committed: their text is emitted, the commit
offset advances, and the audio behind it is freed. The trailing `holdback`
window keeps being re-transcribed until more speech (or stop) finalizes it.

This gives incremental output while speaking instead of waiting for silence,
at the cost of re-transcribing a small tail repeatedly (cheap with
faster-whisper tiny/base models).

The model is injectable so the streaming logic is testable without
faster-whisper installed; anything with faster-whisper's
`transcribe(audio, ...) -> (segments, info)` shape works.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Callable


@dataclass
class Segment:
    start: float
    end: float
    text: str


def split_committable(
    segments: list[Segment], buffer_duration: float, holdback: float
) -> list[Segment]:
    """Contiguous prefix of segments old enough to be considered stable."""
    committed = []
    for seg in segments:
        if seg.end <= buffer_duration - holdback:
            committed.append(seg)
        else:
            break
    return committed


class StreamingTranscriber:
    def __init__(
        self,
        on_text: Callable[[str], None],
        model_size: str = "base.en",
        language: str | None = "en",
        compute_type: str = "int8",
        beam_size: int = 1,
        sample_rate: int = 16000,
        interval: float = 0.7,
        holdback: float = 1.2,
        min_audio: float = 0.5,
        model=None,
    ):
        self.on_text = on_text
        self.model_size = model_size
        self.language = language
        self.compute_type = compute_type
        self.beam_size = beam_size
        self.sample_rate = sample_rate
        self.interval = interval
        self.holdback = holdback
        self.min_audio = min_audio
        self._model = model
        self._model_lock = threading.Lock()
        self._recorder = None
        self._committed = 0  # absolute sample offset of committed audio
        self._running = False
        self._worker: threading.Thread | None = None

    # -- model lifecycle ----------------------------------------------------

    @property
    def ready(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        """Load the Whisper model (slow on first call: downloads weights)."""
        with self._model_lock:
            if self._model is None:
                from faster_whisper import WhisperModel

                self._model = WhisperModel(
                    self.model_size, device="auto", compute_type=self.compute_type
                )

    def load_async(self, on_ready: Callable[[], None] | None = None) -> None:
        def run():
            self.load()
            if on_ready:
                on_ready()

        threading.Thread(target=run, daemon=True, name="model-load").start()

    # -- streaming ----------------------------------------------------------

    def start(self, recorder) -> None:
        if self._running:
            return
        self.load()
        self._recorder = recorder
        self._committed = 0
        self._running = True
        self._worker = threading.Thread(
            target=self._run, daemon=True, name="transcriber"
        )
        self._worker.start()

    def stop(self) -> None:
        """Stop streaming and flush whatever audio is still uncommitted.

        Call recorder.stop() first so no new audio arrives during the flush.
        """
        if not self._running:
            return
        self._running = False
        if self._worker is not None:
            self._worker.join()
            self._worker = None
        audio = self._recorder.get_audio(self._committed)
        if len(audio) >= int(self.min_audio * self.sample_rate) / 2:
            for seg in self._transcribe(audio):
                self.on_text(seg.text)
        self._recorder = None

    def _run(self) -> None:
        while self._running:
            time.sleep(self.interval)
            if not self._running:
                break
            audio = self._recorder.get_audio(self._committed)
            duration = len(audio) / self.sample_rate
            if duration < max(self.min_audio, self.holdback):
                continue
            segments = self._transcribe(audio)
            stable = split_committable(segments, duration, self.holdback)
            if not stable:
                continue
            for seg in stable:
                self.on_text(seg.text)
            self._committed += int(stable[-1].end * self.sample_rate)
            self._recorder.drop_until(self._committed)

    def _transcribe(self, audio) -> list[Segment]:
        try:
            import numpy as np

            audio = np.asarray(audio, dtype=np.float32)
        except ModuleNotFoundError:
            pass  # injected test models may accept plain sequences

        with self._model_lock:
            raw_segments, _info = self._model.transcribe(
                audio,
                language=self.language,
                beam_size=self.beam_size,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            return [Segment(s.start, s.end, s.text) for s in raw_segments]
