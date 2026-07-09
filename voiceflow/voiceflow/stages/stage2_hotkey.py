"""Stage 2: global hotkey start/stop, printed to console (no audio).

    python -m voiceflow.stages.stage2_hotkey [--mode hold|toggle] [--key alt_r]

Hold mode prints START on key-down and STOP on key-up (push-to-talk).
Toggle mode flips on each press of the combo. Requires the Input Monitoring
permission on macOS (grant it to your terminal app).
"""

import argparse
import time

from ..hotkey import create_dictation_hotkey
from ..settings import Config


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["hold", "toggle"], default="hold")
    parser.add_argument("--key", default="alt_r", help="hold key ('fn', 'alt_r', ...)")
    parser.add_argument(
        "--combo", default="<cmd>+<shift>+d", help="toggle combo"
    )
    args = parser.parse_args()

    cfg = Config(hotkey_mode=args.mode, hotkey=args.key, toggle_hotkey=args.combo)
    state = {"on": False}

    def on_start() -> None:
        if cfg.hotkey_mode == "toggle":
            state["on"] = not state["on"]
            print("START" if state["on"] else "STOP", flush=True)
        else:
            print("START", flush=True)

    def on_stop() -> None:
        print("STOP", flush=True)

    listener = create_dictation_hotkey(cfg, on_start=on_start, on_stop=on_stop)
    listener.start()
    target = args.key if args.mode == "hold" else args.combo
    print(f"Listening for {args.mode} hotkey: {target}  (Ctrl+C to quit)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        listener.stop()


if __name__ == "__main__":
    main()
