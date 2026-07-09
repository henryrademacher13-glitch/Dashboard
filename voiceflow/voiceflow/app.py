"""VoiceFlow menu bar app: wires audio, transcription, hotkeys, injection.

The icon shows state: 🎤 idle, ⏳ model loading, and an animated level meter
(🔴 + bars) while recording. All dictation control flows through _start/_stop
so the hotkey, the menu item, and toggle mode behave identically.
"""

from __future__ import annotations

import subprocess
import sys
import threading

from . import hotkey, permissions, settings
from .audio import MicRecorder
from .injector import get_injector
from .textproc import TranscriptCleaner
from .transcriber import StreamingTranscriber
from .undo import UndoManager

MODEL_CHOICES = ["tiny.en", "base.en", "small.en", "tiny", "base", "small"]
_LEVEL_BARS = "▁▂▃▄▅▆▇"

IDLE_TITLE = "🎤"
LOADING_TITLE = "🎤⏳"


def build_cleaner(cfg: settings.Config) -> TranscriptCleaner:
    return TranscriptCleaner(
        remove_fillers=cfg.remove_fillers,
        filler_words=cfg.filler_words,
        capitalize_sentences=cfg.capitalize_sentences,
        custom_vocab=cfg.custom_vocab,
    )


class DictationController:
    """Everything except the menu bar UI, so it is reusable and testable."""

    def __init__(self, cfg: settings.Config, injector=None):
        self.cfg = cfg
        self.state = "loading"  # loading | idle | recording
        self._state_lock = threading.Lock()
        self.injector = injector or get_injector(cfg.injection_method)
        self.cleaner = build_cleaner(cfg)
        self.undo_manager = UndoManager()
        self.recorder = MicRecorder(
            samplerate=cfg.sample_rate, device=cfg.input_device
        )
        self.transcriber = StreamingTranscriber(
            on_text=self._on_text,
            model_size=cfg.model_size,
            language=cfg.language,
            compute_type=cfg.compute_type,
            beam_size=cfg.beam_size,
            sample_rate=cfg.sample_rate,
            interval=cfg.transcribe_interval,
            holdback=cfg.holdback_seconds,
            min_audio=cfg.min_audio_seconds,
        )
        self.transcriber.load_async(on_ready=self._on_model_ready)

    def _on_model_ready(self) -> None:
        with self._state_lock:
            if self.state == "loading":
                self.state = "idle"

    def _on_text(self, raw: str) -> None:
        cleaned = self.cleaner.process(raw)
        if cleaned:
            self.injector.type_text(cleaned)
            self.undo_manager.record(cleaned)

    def start(self) -> bool:
        with self._state_lock:
            if self.state != "idle":
                return False
            self.state = "recording"
        self.cleaner.reset()
        self.undo_manager.begin_utterance()
        self.recorder.start()
        self.transcriber.start(self.recorder)
        return True

    def stop(self) -> bool:
        with self._state_lock:
            if self.state != "recording":
                return False
            self.state = "stopping"
        self.recorder.stop()          # no new audio during the flush
        self.transcriber.stop()       # flushes the uncommitted tail
        self.undo_manager.end_utterance()
        with self._state_lock:
            self.state = "idle"
        return True

    def toggle(self) -> None:
        if self.state == "recording":
            self.stop()
        else:
            self.start()

    def undo_last(self) -> None:
        text = self.undo_manager.undo()
        if text:
            self.injector.delete_chars(len(text))

    def set_model(self, model_size: str) -> None:
        self.cfg.model_size = model_size
        settings.save(self.cfg)
        if self.state == "recording":
            self.stop()
        with self._state_lock:
            self.state = "loading"
        self.transcriber = StreamingTranscriber(
            on_text=self._on_text,
            model_size=model_size,
            language=self.cfg.language,
            compute_type=self.cfg.compute_type,
            beam_size=self.cfg.beam_size,
            sample_rate=self.cfg.sample_rate,
            interval=self.cfg.transcribe_interval,
            holdback=self.cfg.holdback_seconds,
            min_audio=self.cfg.min_audio_seconds,
        )
        self.transcriber.load_async(on_ready=self._on_model_ready)

    def set_input_device(self, name: str | None) -> None:
        self.cfg.input_device = name
        settings.save(self.cfg)
        self.recorder.device = name


def _recording_title(level: float) -> str:
    # Map RMS (~0..0.3 for speech) onto the bar glyphs.
    idx = min(len(_LEVEL_BARS) - 1, int(level * 25))
    return "🔴" + _LEVEL_BARS[idx]


class VoiceFlowApp:
    def __init__(self, cfg: settings.Config):
        import rumps

        self.cfg = cfg
        self.controller = DictationController(cfg)
        self.app = rumps.App("VoiceFlow", title=LOADING_TITLE, quit_button="Quit")
        self._rumps = rumps
        self._build_menu()

        self._timer = rumps.Timer(self._tick, 0.15)
        self._timer.start()

        self._record_hotkey = hotkey.create_dictation_hotkey(
            cfg,
            on_start=self._hotkey_start,
            on_stop=self.controller.stop,
        )
        self._record_hotkey.start()
        self._undo_hotkey = hotkey.ComboHotkeys(
            {cfg.undo_hotkey: self.controller.undo_last}
        )
        self._undo_hotkey.start()

    def _hotkey_start(self) -> None:
        if self.cfg.hotkey_mode == "toggle":
            self.controller.toggle()
        else:
            self.controller.start()

    # -- menu ---------------------------------------------------------------

    def _build_menu(self) -> None:
        rumps = self._rumps
        self.start_item = rumps.MenuItem("Start Dictation", callback=self._menu_toggle)
        undo_item = rumps.MenuItem(
            f"Undo Last Dictation ({self.cfg.undo_hotkey})",
            callback=lambda _: self.controller.undo_last(),
        )

        device_menu = rumps.MenuItem("Input Device")
        device_menu.add(self._device_item(rumps, None, "System Default"))
        try:
            for name in MicRecorder.list_input_devices():
                device_menu.add(self._device_item(rumps, name, name))
        except Exception:
            pass  # no audio backend (e.g. dev machine without PortAudio)

        model_menu = rumps.MenuItem("Model")
        for size in MODEL_CHOICES:
            item = rumps.MenuItem(size, callback=self._pick_model)
            item.state = size == self.cfg.model_size
            model_menu.add(item)

        hotkey_desc = (
            f"Hotkey: hold '{self.cfg.hotkey}'"
            if self.cfg.hotkey_mode == "hold"
            else f"Hotkey: {self.cfg.toggle_hotkey} (toggle)"
        )
        hotkey_item = rumps.MenuItem(hotkey_desc, callback=self._change_hotkey)
        config_item = rumps.MenuItem(
            "Open Config File", callback=lambda _: self._open_config()
        )

        self.app.menu = [
            self.start_item,
            undo_item,
            None,
            device_menu,
            model_menu,
            hotkey_item,
            config_item,
            None,
        ]

    def _device_item(self, rumps, value: str | None, label: str):
        def pick(sender):
            self.controller.set_input_device(value)
            for item in self.app.menu["Input Device"].values():
                item.state = item.title == sender.title
        item = rumps.MenuItem(label, callback=pick)
        current = self.cfg.input_device
        item.state = (value == current) or (
            value is not None and current is not None and current in value
        )
        return item

    def _pick_model(self, sender) -> None:
        self.controller.set_model(sender.title)
        for item in self.app.menu["Model"].values():
            item.state = item.title == sender.title

    def _change_hotkey(self, sender) -> None:
        rumps = self._rumps
        window = rumps.Window(
            message=(
                "Enter a hotkey.\n\n"
                "Hold mode (push-to-talk): a key name like 'alt_r', 'f19' or "
                "'fn'.\nToggle mode: a combo like '<cmd>+<shift>+d'."
            ),
            title="VoiceFlow Hotkey",
            default_text=(
                self.cfg.hotkey
                if self.cfg.hotkey_mode == "hold"
                else self.cfg.toggle_hotkey
            ),
            ok="Save",
            cancel=True,
        )
        response = window.run()
        if not response.clicked or not response.text.strip():
            return
        text = response.text.strip()
        if "+" in text:
            self.cfg.hotkey_mode = "toggle"
            self.cfg.toggle_hotkey = text
        else:
            self.cfg.hotkey_mode = "hold"
            self.cfg.hotkey = text
        settings.save(self.cfg)
        self._record_hotkey.stop()
        self._record_hotkey = hotkey.create_dictation_hotkey(
            self.cfg, on_start=self._hotkey_start, on_stop=self.controller.stop
        )
        self._record_hotkey.start()
        sender.title = (
            f"Hotkey: hold '{text}'"
            if self.cfg.hotkey_mode == "hold"
            else f"Hotkey: {text} (toggle)"
        )

    def _open_config(self) -> None:
        settings.save(self.cfg)  # make sure the file exists
        subprocess.call(["open", str(settings.config_path())])

    def _menu_toggle(self, _sender) -> None:
        self.controller.toggle()

    # -- status -------------------------------------------------------------

    def _tick(self, _timer) -> None:
        state = self.controller.state
        if state == "recording":
            self.app.title = _recording_title(self.controller.recorder.level)
            self.start_item.title = "Stop Dictation"
        elif state in ("loading", "stopping"):
            self.app.title = LOADING_TITLE
            self.start_item.title = "Start Dictation"
        else:
            self.app.title = IDLE_TITLE
            self.start_item.title = "Start Dictation"

    def run(self) -> None:
        self.app.run()


def main() -> None:
    if sys.platform != "darwin":
        print(
            "VoiceFlow's menu bar app is macOS-only. On other platforms use "
            "the stage scripts, e.g. python -m voiceflow.stages.stage1_transcribe"
        )
        sys.exit(1)
    print("Checking macOS permissions...")
    permissions.report(prompt=True)
    cfg = settings.load()
    settings.save(cfg)  # write defaults on first run so users can edit them
    VoiceFlowApp(cfg).run()


if __name__ == "__main__":
    main()
