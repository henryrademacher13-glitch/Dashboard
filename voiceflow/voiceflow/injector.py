"""System-wide text injection into the focused application (macOS).

Two methods:

- KeystrokeInjector (default): posts synthetic keyboard events via Quartz
  with `CGEventKeyboardSetUnicodeString`, which types arbitrary Unicode into
  whatever has keyboard focus without needing keycode/layout mapping.
  Requires the Accessibility permission.

- PasteInjector: puts the text on the pasteboard, synthesizes Cmd+V, then
  restores the previous pasteboard contents. Faster for long text and works
  in a few apps that ignore synthetic unicode events, but briefly touches
  the user's clipboard.

Both support deleting N characters (synthetic Delete key) for undo.

On non-macOS platforms a ConsoleInjector is returned so the pipeline can be
developed and demoed without Quartz.
"""

from __future__ import annotations

import sys
import time

_DELETE_KEYCODE = 51
_V_KEYCODE = 9
# CGEventKeyboardSetUnicodeString accepts limited-length strings per event.
_MAX_UTF16_UNITS_PER_EVENT = 20


class ConsoleInjector:
    """Dev/test stand-in: prints instead of typing."""

    def __init__(self):
        self.typed: list[str] = []

    def type_text(self, text: str) -> None:
        self.typed.append(text)
        print(text, end="", flush=True)

    def delete_chars(self, n: int) -> None:
        print(f"\n[delete {n} chars]", flush=True)


class KeystrokeInjector:
    def __init__(self, inter_event_delay: float = 0.003):
        import Quartz  # noqa: F401 — fail fast if unavailable

        self._delay = inter_event_delay

    def type_text(self, text: str) -> None:
        import Quartz

        for chunk in _utf16_chunks(text):
            units = len(chunk.encode("utf-16-le")) // 2
            for key_down in (True, False):
                event = Quartz.CGEventCreateKeyboardEvent(None, 0, key_down)
                Quartz.CGEventKeyboardSetUnicodeString(event, units, chunk)
                Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
            time.sleep(self._delay)

    def delete_chars(self, n: int) -> None:
        import Quartz

        for _ in range(n):
            for key_down in (True, False):
                event = Quartz.CGEventCreateKeyboardEvent(
                    None, _DELETE_KEYCODE, key_down
                )
                Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
            time.sleep(self._delay)


class PasteInjector:
    def __init__(self, restore_delay: float = 0.4):
        import AppKit  # noqa: F401
        import Quartz  # noqa: F401

        self._restore_delay = restore_delay
        self._fallback = KeystrokeInjector()

    def type_text(self, text: str) -> None:
        import threading

        import AppKit
        import Quartz

        pasteboard = AppKit.NSPasteboard.generalPasteboard()
        previous = pasteboard.stringForType_(AppKit.NSPasteboardTypeString)
        pasteboard.clearContents()
        pasteboard.setString_forType_(text, AppKit.NSPasteboardTypeString)

        for key_down in (True, False):
            event = Quartz.CGEventCreateKeyboardEvent(None, _V_KEYCODE, key_down)
            Quartz.CGEventSetFlags(event, Quartz.kCGEventFlagMaskCommand)
            Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

        if previous is not None:
            def restore():
                pb = AppKit.NSPasteboard.generalPasteboard()
                pb.clearContents()
                pb.setString_forType_(previous, AppKit.NSPasteboardTypeString)

            threading.Timer(self._restore_delay, restore).start()

    def delete_chars(self, n: int) -> None:
        self._fallback.delete_chars(n)


def _utf16_chunks(text: str, max_units: int = _MAX_UTF16_UNITS_PER_EVENT):
    """Split text so no chunk exceeds the per-event UTF-16 unit limit."""
    chunk = ""
    units = 0
    for ch in text:
        ch_units = len(ch.encode("utf-16-le")) // 2
        if units + ch_units > max_units and chunk:
            yield chunk
            chunk, units = "", 0
        chunk += ch
        units += ch_units
    if chunk:
        yield chunk


def get_injector(method: str = "keystrokes"):
    if sys.platform != "darwin":
        return ConsoleInjector()
    if method == "paste":
        return PasteInjector()
    return KeystrokeInjector()
