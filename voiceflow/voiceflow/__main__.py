import argparse


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="voiceflow", description="System-wide local voice dictation."
    )
    parser.add_argument(
        "--check-permissions",
        action="store_true",
        help="report macOS permission status and exit",
    )
    parser.add_argument(
        "--devices", action="store_true", help="list audio input devices and exit"
    )
    args = parser.parse_args()

    if args.check_permissions:
        from . import permissions

        permissions.report(prompt=True)
        return
    if args.devices:
        from .audio import MicRecorder

        for name in MicRecorder.list_input_devices():
            print(name)
        return

    from .app import main as app_main

    app_main()


if __name__ == "__main__":
    main()
