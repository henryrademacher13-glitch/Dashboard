# VoiceFlow

System-wide local voice dictation for macOS, in the spirit of Wispr Flow:
hold a hotkey, speak, and your words are typed into whatever text field is
focused — in any application. Transcription runs entirely on-device with
[faster-whisper](https://github.com/SYSTRAN/faster-whisper); nothing is
uploaded anywhere.

- **Push-to-talk or toggle hotkey** (default: hold right-Option; `fn` and
  custom combos supported)
- **Near-real-time streaming**: audio is transcribed in rolling chunks and
  committed text is typed while you are still speaking
- **System-wide text injection** via synthetic Quartz keyboard events (or a
  clipboard-paste mode for long text)
- **Menu bar app** with a live level meter while recording — no window
- **Cleanup**: sentence capitalization, filler-word removal ("um", "uh", …),
  custom vocabulary for names/jargon/brands
- **Quick undo**: `⌘⇧Z`-style shortcut deletes the last inserted dictation

Non-goals for v1: cloud sync, collaboration, non-macOS UIs. Single-user,
local, macOS only. (The audio/transcription/cleanup pipeline itself is
portable and runs on Linux for development and tests.)

## Install

```bash
cd voiceflow
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
```

Python 3.10+. The first run downloads the Whisper model (~75 MB for
`base.en`) to the Hugging Face cache.

## Permissions (macOS)

VoiceFlow needs three permissions, each for one specific job. Grant them in
**System Settings → Privacy & Security** when prompted, then restart the app.
When running from a terminal, grant them to the *terminal app*
(Terminal/iTerm), since that is the process posting the events.

| Permission | Why |
|---|---|
| Microphone | To capture your speech. Audio is transcribed locally and never leaves the machine. |
| Accessibility | To type the transcribed text into the focused app (synthetic keystrokes are an assistive action). |
| Input Monitoring | To see the global hotkey while other apps have focus. |

Check status anytime with `python -m voiceflow --check-permissions`.

## Run

```bash
voiceflow            # or: python -m voiceflow
```

A 🎤 appears in the menu bar (🎤⏳ while the model loads). Hold **right
Option** (default), speak, release. Committed text streams into the focused
field as you talk; the last second or so is finalized on release.

- **Undo last dictation**: `⌘⇧Z` (configurable) or the menu item.
- **Menu**: start/stop, undo, input device, model size, hotkey, config file.
- The icon shows a red dot plus a live input-level bar while recording.

## Configuration

`~/Library/Application Support/VoiceFlow/config.json` (created on first run,
editable while the app is stopped; the menu changes common settings live):

```jsonc
{
  "model_size": "base.en",        // tiny.en = fastest, small.en = most accurate
  "input_device": null,            // substring of a device name, null = default
  "hotkey_mode": "hold",          // "hold" (push-to-talk) or "toggle"
  "hotkey": "alt_r",              // hold key: "alt_r", "fn", "f19", ...
  "toggle_hotkey": "<cmd>+<shift>+d",
  "undo_hotkey": "<cmd>+<shift>+z",
  "remove_fillers": true,
  "filler_words": ["um", "uh", "uhm", "erm", "hmm", "mm-hmm", "mhm"],
  "capitalize_sentences": true,
  "custom_vocab": { "wispr": "Wispr", "kubectl": "kubectl" },
  "injection_method": "keystrokes" // or "paste" (clipboard + Cmd-V)
}
```

Latency knobs: `transcribe_interval` (how often the rolling buffer is
re-transcribed), `holdback_seconds` (how much trailing audio stays
provisional before being committed). Lower = snappier, higher = fewer
mid-sentence corrections left uncommitted.

## How the streaming works

Audio is captured into a rolling 16 kHz buffer. Every ~0.7 s the uncommitted
part of the buffer is re-transcribed. Segments that end more than ~1.2 s
before the end of the buffer are *stable* — Whisper will not change them —
so their text is cleaned up, typed into the focused app, and their audio is
dropped from the buffer. The trailing window keeps being re-transcribed
until you stop, at which point it is flushed. This gives incremental output
without waiting for silence, at the cost of re-transcribing a short tail
(cheap with `tiny`/`base` models).

## Testing each stage in isolation

The app was built in stages, and each stage remains independently runnable:

```bash
# 1. Mic capture + local Whisper transcription -> console
python -m voiceflow.stages.stage1_transcribe --model base.en

# 2. Global hotkey start/stop -> console
python -m voiceflow.stages.stage2_hotkey --mode hold --key alt_r

# 3. Text injection into the focused app (3s countdown, types, then undoes)
python -m voiceflow.stages.stage3_inject --method keystrokes

# 4. The full menu bar app
python -m voiceflow
```

Unit tests (run anywhere, no audio hardware or macOS APIs needed):

```bash
pip install pytest && pytest
```

## Architecture

```
voiceflow/
  audio.py        MicRecorder: sounddevice capture into a rolling buffer
  transcriber.py  StreamingTranscriber: incremental commit/holdback logic
  textproc.py     TranscriptCleaner: fillers, capitalization, custom vocab
  injector.py     Keystroke (Quartz unicode events) & clipboard-paste injection
  hotkey.py       Hold (pynput), Fn (Quartz event tap), and combo hotkeys
  undo.py         Utterance-level undo stack
  permissions.py  Mic/Accessibility/Input Monitoring checks with explanations
  settings.py     JSON config load/save
  app.py          DictationController wiring + rumps menu bar UI
  stages/         Stage 1–3 standalone test scripts
```

## Known limitations (v1)

- The `fn` hotkey uses a flags-changed event tap; pressing keys that carry
  the fn flag (e.g. arrow keys on laptops) can briefly trigger it.
- Secure input fields (password boxes) block synthetic keystrokes by design.
- Undo replays backspaces, so it assumes the cursor hasn't moved since the
  dictation was inserted.
- `paste` mode briefly replaces the clipboard (restored ~0.4 s later).
