"""Microphone capture into a rolling sample buffer.

The recorder accumulates mono float32 audio at 16 kHz. The transcriber reads
from an absolute sample offset and tells the recorder when old audio has been
committed so it can be freed (the buffer stays bounded no matter how long a
dictation session runs).
"""

from __future__ import annotations

import threading

import numpy as np
import sounddevice as sd


class MicRecorder:
    def __init__(self, samplerate: int = 16000, device: str | int | None = None):
        self.samplerate = samplerate
        self.device = device
        self.level = 0.0  # rolling RMS of the latest block, for the level meter
        self._lock = threading.Lock()
        self._chunks: list[np.ndarray] = []
        self._base = 0   # absolute sample index of _chunks[0][0]
        self._total = 0  # absolute sample count captured so far
        self._stream: sd.InputStream | None = None

    def start(self) -> None:
        with self._lock:
            self._chunks = []
            self._base = 0
            self._total = 0
        self.level = 0.0
        self._stream = sd.InputStream(
            samplerate=self.samplerate,
            channels=1,
            dtype="float32",
            device=self._resolve_device(),
            blocksize=int(self.samplerate * 0.05),
            callback=self._callback,
        )
        self._stream.start()

    def stop(self) -> None:
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self.level = 0.0

    def _callback(self, indata, frames, time_info, status) -> None:
        mono = indata[:, 0].copy()
        self.level = float(np.sqrt(np.mean(mono**2)))
        with self._lock:
            self._chunks.append(mono)
            self._total += len(mono)

    @property
    def total_samples(self) -> int:
        with self._lock:
            return self._total

    def get_audio(self, start_sample: int) -> np.ndarray:
        """Return all captured audio from an absolute sample offset onward."""
        with self._lock:
            if not self._chunks:
                return np.empty(0, dtype=np.float32)
            arr = np.concatenate(self._chunks)
            rel = max(0, start_sample - self._base)
            return arr[rel:]

    def drop_until(self, sample: int) -> None:
        """Free whole chunks that lie entirely before an absolute offset."""
        with self._lock:
            while self._chunks and self._base + len(self._chunks[0]) <= sample:
                self._base += len(self._chunks[0])
                self._chunks.pop(0)

    def _resolve_device(self) -> int | None:
        """Map a configured device-name substring to a sounddevice index."""
        if self.device is None or isinstance(self.device, int):
            return self.device
        wanted = self.device.lower()
        for idx, info in enumerate(sd.query_devices()):
            if info["max_input_channels"] > 0 and wanted in info["name"].lower():
                return idx
        return None  # fall back to system default

    @staticmethod
    def list_input_devices() -> list[str]:
        return [
            info["name"]
            for info in sd.query_devices()
            if info["max_input_channels"] > 0
        ]
