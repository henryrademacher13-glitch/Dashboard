"""One-time helper: mint a Gmail refresh token for headless use.

Run this ONCE on a machine with a browser:

    pip install -r scanner/requirements.txt
    GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... python -m scanner.authorize

It prints the refresh token. Store it as the GMAIL_REFRESH_TOKEN secret.
The token is long-lived but not eternal — if the scanner starts failing to
refresh, re-run this to mint a new one.
"""
from __future__ import annotations

import os
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

from .config import SCOPES


def main() -> int:
    client_id = os.environ.get("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.", file=sys.stderr)
        return 2

    flow = InstalledAppFlow.from_client_config(
        {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        },
        SCOPES,
    )
    # access_type=offline + prompt=consent is what actually returns a refresh
    # token; without prompt=consent a re-authorization returns none.
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    if not creds.refresh_token:
        print("No refresh token returned. Revoke the app's access and retry.", file=sys.stderr)
        return 1

    print("\nGMAIL_REFRESH_TOKEN:")
    print(creds.refresh_token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
