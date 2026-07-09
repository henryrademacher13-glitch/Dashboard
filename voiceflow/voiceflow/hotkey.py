"""Global hotkeys: push-to-talk (hold), toggle, and undo.

Three listeners:

- HoldKeyListener: pynput-based; fires on_start when the configured key goes
  down and on_stop when it is released (push-to-talk). Works for regular
  keys and modifiers like right-Option or F19.

- FnHoldListener: macOS-only Quartz event tap watching flagsChanged for the
  Fn/Globe modifier, which pynput cannot see. Used when hotkey == "fn".
  Requires Input Monitoring permission. Note: Fn also fires while pressing
  keys that carry the fn flag (arrow keys on laptops), so edge detection is
  on the modifier transition only.

- ComboHotkeys: pynput GlobalHotKeys for toggle mode and the undo shortcut
  (combo strings like "<cmd>+<shift>+z").
"""

from __future__ import annotations

import threading
from typing import Callable


def _parse_key(name: str):
    from pynput import keyboard

    name = name.strip().lower()
    if len(name) == 1:
        return keyboard.KeyCode.from_char(name)
    try:
        return keyboard.Key[name]
    except KeyError:
        raise ValueError(
            f"Unknown hotkey {name!r}. Use a single character or a pynput key "
            f"name like 'alt_r', 'cmd_r', 'f19', or 'fn' (macOS only)."
        )


class HoldKeyListener:
    def __init__(self, key: str, on_start: Callable, on_stop: Callable):
        self._key_name = key
        self.on_start = on_start
        self.on_stop = on_stop
        self._pressed = False
        self._listener = None

    def start(self) -> None:
        from pynput import keyboard

        target = _parse_key(self._key_name)

        def normalize(key):
            # Canonicalize so shifted chars / modifier variants still match.
            return self._listener.canonical(key) if hasattr(key, "char") else key

        def on_press(key):
            if normalize(key) == target and not self._pressed:
                self._pressed = True
                self.on_start()

        def on_release(key):
            if normalize(key) == target and self._pressed:
                self._pressed = False
                self.on_stop()

        self._listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        self._listener.start()

    def stop(self) -> None:
        if self._listener:
            self._listener.stop()
            self._listener = None


class FnHoldListener:
    """Watch the macOS Fn/Globe key via a Quartz event tap."""

    def __init__(self, on_start: Callable, on_stop: Callable):
        self.on_start = on_start
        self.on_stop = on_stop
        self._fn_down = False
        self._thread: threading.Thread | None = None
        self._loop = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True, name="fn-tap")
        self._thread.start()

    def _run(self) -> None:
        import Quartz

        def callback(proxy, event_type, event, refcon):
            flags = Quartz.CGEventGetFlags(event)
            fn_down = bool(flags & Quartz.kCGEventFlagMaskSecondaryFn)
            if fn_down and not self._fn_down:
                self._fn_down = True
                self.on_start()
            elif not fn_down and self._fn_down:
                self._fn_down = False
                self.on_stop()
            return event

        tap = Quartz.CGEventTapCreate(
            Quartz.kCGSessionEventTap,
            Quartz.kCGHeadInsertEventTap,
            Quartz.kCGEventTapOptionListenOnly,
            Quartz.CGEventMaskBit(Quartz.kCGEventFlagsChanged),
            callback,
            None,
        )
        if tap is None:
            raise RuntimeError(
                "Could not create event tap for the Fn key. Grant Input "
                "Monitoring permission in System Settings > Privacy & Security."
            )
        source = Quartz.CFMachPortCreateRunLoopSource(None, tap, 0)
        self._loop = Quartz.CFRunLoopGetCurrent()
        Quartz.CFRunLoopAddSource(self._loop, source, Quartz.kCFRunLoopCommonModes)
        Quartz.CGEventTapEnable(tap, True)
        Quartz.CFRunLoopRun()

    def stop(self) -> None:
        if self._loop is not None:
            import Quartz

            Quartz.CFRunLoopStop(self._loop)
            self._loop = None


class ComboHotkeys:
    """One pynput GlobalHotKeys instance for any number of combos."""

    def __init__(self, bindings: dict[str, Callable]):
        self._bindings = bindings
        self._listener = None

    def start(self) -> None:
        from pynput import keyboard

        self._listener = keyboard.GlobalHotKeys(self._bindings)
        self._listener.start()

    def stop(self) -> None:
        if self._listener:
            self._listener.stop()
            self._listener = None


def create_dictation_hotkey(cfg, on_start: Callable, on_stop: Callable):
    """Build the record hotkey listener described by the config.

    In toggle mode on_start is invoked for every press; the caller is
    expected to treat it as a toggle (it receives no on_stop).
    """
    if cfg.hotkey_mode == "toggle":
        return ComboHotkeys({cfg.toggle_hotkey: on_start})
    if cfg.hotkey.strip().lower() == "fn":
        return FnHoldListener(on_start, on_stop)
    return HoldKeyListener(cfg.hotkey, on_start, on_stop)
