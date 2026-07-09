"""Stage 3: system-wide text injection into the focused app.

    python -m voiceflow.stages.stage3_inject [--method keystrokes|paste] [--no-undo]

Gives you 3 seconds to focus any text field (Notes, browser, terminal...),
types a test sentence there, then deletes it again to exercise undo.
Requires the Accessibility permission on macOS.
"""

import argparse
import time

from ..injector import get_injector

SAMPLE = "Hello from VoiceFlow! Injection works. 123 — ünïcödé too. "


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--method", choices=["keystrokes", "paste"], default="keystrokes")
    parser.add_argument("--text", default=SAMPLE)
    parser.add_argument(
        "--no-undo", action="store_true", help="leave the text in place"
    )
    args = parser.parse_args()

    injector = get_injector(args.method)
    print(f"Focus a text field in any app... injecting in 3s via '{args.method}'.")
    for i in (3, 2, 1):
        print(i)
        time.sleep(1)

    injector.type_text(args.text)
    print("Injected.")

    if not args.no_undo:
        time.sleep(1.5)
        injector.delete_chars(len(args.text))
        print(f"Deleted {len(args.text)} chars (undo test).")


if __name__ == "__main__":
    main()
