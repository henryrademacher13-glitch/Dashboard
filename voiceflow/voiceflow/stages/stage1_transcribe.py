"""Stage 1: mic capture + local Whisper transcription, printed to console.

    python -m voiceflow.stages.stage1_transcribe [--model base.en] [--device NAME]

Press Enter to start recording, Enter again to stop. Committed text streams
to the console while you speak; the remainder is flushed when you stop.
"""

import argparse

from ..audio import MicRecorder
from ..settings import Config
from ..textproc import TranscriptCleaner
from ..transcriber import StreamingTranscriber


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=Config.model_size)
    parser.add_argument("--device", default=None, help="input device name substring")
    parser.add_argument("--raw", action="store_true", help="skip text cleanup")
    args = parser.parse_args()

    cleaner = TranscriptCleaner()

    def on_text(raw: str) -> None:
        text = raw if args.raw else cleaner.process(raw)
        if text:
            print(text, end="", flush=True)

    recorder = MicRecorder(device=args.device)
    transcriber = StreamingTranscriber(on_text=on_text, model_size=args.model)
    print(f"Loading model '{args.model}' (downloads on first run)...")
    transcriber.load()
    print("Ready. Enter = start/stop recording, Ctrl+C = quit.")

    try:
        while True:
            input()
            cleaner.reset()
            recorder.start()
            transcriber.start(recorder)
            print("-- recording (Enter to stop) --")
            input()
            recorder.stop()
            transcriber.stop()
            print("\n-- stopped --")
    except (KeyboardInterrupt, EOFError):
        print("\nbye")


if __name__ == "__main__":
    main()
