"""macOS permission checks with plain-language explanations.

VoiceFlow needs three permissions, each for one specific job:

- Microphone           — to hear you (audio never leaves the machine).
- Accessibility        — to type the transcribed text into other apps
                         (synthetic keyboard events are an assistive action).
- Input Monitoring     — to see the global hotkey even while another app
                         has focus (that's what "global" means).

All are granted in System Settings > Privacy & Security. When run from a
terminal, grant them to the terminal app (Terminal/iTerm); when packaged as
an .app, grant them to VoiceFlow itself.
"""

from __future__ import annotations

import ctypes
import ctypes.util
import sys

EXPLANATIONS = {
    "microphone": "Microphone: needed to capture your speech. Audio is "
    "transcribed locally and never uploaded.",
    "accessibility": "Accessibility: needed to type the transcribed text "
    "into the focused app on your behalf.",
    "input_monitoring": "Input Monitoring: needed so the dictation hotkey "
    "works no matter which app is in front.",
}


def check_microphone(request: bool = True) -> bool:
    import AVFoundation

    status = AVFoundation.AVCaptureDevice.authorizationStatusForMediaType_(
        AVFoundation.AVMediaTypeAudio
    )
    if status == 3:  # AVAuthorizationStatusAuthorized
        return True
    if status == 0 and request:  # NotDetermined -> trigger the system prompt
        AVFoundation.AVCaptureDevice.requestAccessForMediaType_completionHandler_(
            AVFoundation.AVMediaTypeAudio, lambda granted: None
        )
    return False


def check_accessibility(prompt: bool = True) -> bool:
    import ApplicationServices

    if not prompt:
        return bool(ApplicationServices.AXIsProcessTrusted())
    options = {ApplicationServices.kAXTrustedCheckOptionPrompt: True}
    return bool(ApplicationServices.AXIsProcessTrustedWithOptions(options))


def check_input_monitoring() -> bool | None:
    """True/False, or None when undeterminable (pre-10.15 or lookup failure)."""
    try:
        iokit = ctypes.cdll.LoadLibrary(
            ctypes.util.find_library("IOKit")
            or "/System/Library/Frameworks/IOKit.framework/IOKit"
        )
        iokit.IOHIDCheckAccess.restype = ctypes.c_int
        iokit.IOHIDCheckAccess.argtypes = [ctypes.c_int]
        k_iohid_request_type_listen_event = 1
        return iokit.IOHIDCheckAccess(k_iohid_request_type_listen_event) == 0
    except (OSError, AttributeError):
        return None


def check_all(prompt: bool = True) -> dict[str, bool | None]:
    if sys.platform != "darwin":
        return {}
    return {
        "microphone": check_microphone(request=prompt),
        "accessibility": check_accessibility(prompt=prompt),
        "input_monitoring": check_input_monitoring(),
    }


def report(prompt: bool = True) -> bool:
    """Print status for each permission; return True when all are granted."""
    if sys.platform != "darwin":
        print("Not macOS: skipping permission checks.")
        return True
    results = check_all(prompt=prompt)
    all_ok = True
    for name, granted in results.items():
        if granted is True:
            print(f"  [ok] {EXPLANATIONS[name]}")
        elif granted is None:
            print(f"  [??] {EXPLANATIONS[name]} (could not determine status)")
        else:
            all_ok = False
            print(f"  [MISSING] {EXPLANATIONS[name]}")
    if not all_ok:
        print(
            "\nGrant the missing permissions in System Settings > Privacy & "
            "Security, then restart VoiceFlow. If running from a terminal, "
            "grant them to your terminal app."
        )
    return all_ok
