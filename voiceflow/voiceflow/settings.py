"""Persistent user configuration.

Stored as JSON in ~/Library/Application Support/VoiceFlow/config.json on
macOS (or ~/.config/voiceflow/config.json elsewhere, for development).
"""

from __future__ import annotations

import dataclasses
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .textproc import DEFAULT_FILLERS


@dataclass
class Config:
    # Transcription
    model_size: str = "base.en"          # tiny/base/small (.en variants for English-only)
    language: str | None = "en"          # None = auto-detect
    compute_type: str = "int8"           # int8 keeps latency low on CPU
    beam_size: int = 1                   # greedy decoding: fastest

    # Audio
    input_device: str | None = None      # substring of device name; None = system default
    sample_rate: int = 16000

    # Streaming behaviour
    transcribe_interval: float = 0.7     # how often the rolling buffer is re-transcribed (s)
    holdback_seconds: float = 1.2        # trailing audio kept "provisional" before commit (s)
    min_audio_seconds: float = 0.5       # don't bother transcribing less than this

    # Hotkeys
    hotkey_mode: str = "hold"            # "hold" (push-to-talk) or "toggle"
    hotkey: str = "alt_r"                # key name for hold mode ("fn", "alt_r", "f19", ...)
    toggle_hotkey: str = "<cmd>+<shift>+d"   # combo for toggle mode
    undo_hotkey: str = "<cmd>+<shift>+z"     # revert last inserted transcription

    # Text cleanup
    remove_fillers: bool = True
    filler_words: list[str] = field(default_factory=lambda: list(DEFAULT_FILLERS))
    capitalize_sentences: bool = True
    custom_vocab: dict[str, str] = field(default_factory=dict)  # spoken -> written

    # Injection
    injection_method: str = "keystrokes"  # "keystrokes" or "paste"


def config_path() -> Path:
    if sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support" / "VoiceFlow"
    else:
        base = Path.home() / ".config" / "voiceflow"
    return base / "config.json"


def load(path: Path | None = None) -> Config:
    path = path or config_path()
    cfg = Config()
    if path.exists():
        try:
            data = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            return cfg
        known = {f.name for f in dataclasses.fields(Config)}
        for key, value in data.items():
            if key in known:
                setattr(cfg, key, value)
    return cfg


def save(cfg: Config, path: Path | None = None) -> Path:
    path = path or config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dataclasses.asdict(cfg), indent=2) + "\n")
    return path
