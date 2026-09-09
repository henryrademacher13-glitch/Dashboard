"""Gmail API access: search, read, fetch attachment bytes, send replies.

The whole reason this module exists is `users.messages.attachments.get` —
the Gmail connector used by the Claude Routine returns an attachment id and
never the bytes, so PDFs and images were unreadable. Here we fetch them.
"""
from __future__ import annotations

import base64
import re
from dataclasses import dataclass, field
from email.message import EmailMessage
from email.utils import parseaddr
from typing import Any, Iterator

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .config import SCOPES, Config

TOKEN_URI = "https://oauth2.googleapis.com/token"


@dataclass
class Attachment:
    filename: str
    mime_type: str
    data: bytes | None  # None when the bytes could not be fetched
    error: str | None = None

    @property
    def readable(self) -> bool:
        return self.data is not None and len(self.data) > 0


@dataclass
class Message:
    id: str
    thread_id: str
    sender: str          # bare address, lowercased
    subject: str
    date: str
    internal_date: int   # ms since epoch; used for ordering
    body: str
    rfc822_message_id: str
    label_ids: list[str] = field(default_factory=list)
    attachments: list[Attachment] = field(default_factory=list)

    @property
    def is_from_owner(self) -> bool:
        """True when the mailbox owner sent this message."""
        return "SENT" in self.label_ids


def _header(payload: dict[str, Any], name: str) -> str:
    wanted = name.lower()
    for h in payload.get("headers", []):
        if h.get("name", "").lower() == wanted:
            return h.get("value", "")
    return ""


def _decode(data: str | None) -> bytes:
    if not data:
        return b""
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def _walk_parts(payload: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield payload
    for part in payload.get("parts", []) or []:
        yield from _walk_parts(part)


def _html_to_text(html: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?</\1>", " ", html)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p\s*>", "\n\n", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = (
        text.replace("&nbsp;", " ").replace("&amp;", "&")
        .replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    )
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]{2,}", " ", text)).strip()


class GmailClient:
    def __init__(self, config: Config) -> None:
        self._config = config
        creds = Credentials(
            token=None,
            refresh_token=config.refresh_token,
            client_id=config.client_id,
            client_secret=config.client_secret,
            token_uri=TOKEN_URI,
            scopes=SCOPES,
        )
        creds.refresh(Request())
        self._service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        self.address = (
            self._service.users().getProfile(userId="me").execute().get("emailAddress", "")
        ).lower()

    # ---------- reading ----------

    def find_threads(self) -> list[str]:
        """Thread ids with mail from the watched sender inside the window."""
        query = f"from:{self._config.watched_sender} newer_than:{self._config.search_window}"
        result = (
            self._service.users().threads()
            .list(userId="me", q=query, maxResults=50)
            .execute()
        )
        return [t["id"] for t in result.get("threads", []) or []]

    def get_thread(self, thread_id: str, *, fetch_attachments: bool = True) -> list[Message]:
        """All messages in a thread, oldest first."""
        raw = (
            self._service.users().threads()
            .get(userId="me", id=thread_id, format="full")
            .execute()
        )
        messages = [
            self._parse_message(m, fetch_attachments=fetch_attachments)
            for m in raw.get("messages", []) or []
        ]
        messages.sort(key=lambda m: m.internal_date)
        return messages

    def _parse_message(self, raw: dict[str, Any], *, fetch_attachments: bool) -> Message:
        payload = raw.get("payload", {}) or {}
        sender = parseaddr(_header(payload, "From"))[1].lower()

        plain_parts: list[str] = []
        html_parts: list[str] = []
        attachments: list[Attachment] = []

        for part in _walk_parts(payload):
            mime = part.get("mimeType", "")
            body = part.get("body", {}) or {}
            filename = part.get("filename") or ""

            if filename:
                attachments.append(
                    self._load_attachment(
                        message_id=raw["id"],
                        filename=filename,
                        mime_type=mime or "application/octet-stream",
                        body=body,
                        fetch=fetch_attachments,
                    )
                )
                continue

            if mime == "text/plain":
                plain_parts.append(_decode(body.get("data")).decode("utf-8", "replace"))
            elif mime == "text/html":
                html_parts.append(_decode(body.get("data")).decode("utf-8", "replace"))

        text = "\n".join(p for p in plain_parts if p.strip())
        if not text.strip() and html_parts:
            text = _html_to_text("\n".join(html_parts))

        return Message(
            id=raw["id"],
            thread_id=raw.get("threadId", ""),
            sender=sender,
            subject=_header(payload, "Subject"),
            date=_header(payload, "Date"),
            internal_date=int(raw.get("internalDate", "0")),
            body=text.strip(),
            rfc822_message_id=_header(payload, "Message-ID"),
            label_ids=list(raw.get("labelIds", []) or []),
            attachments=attachments,
        )

    def _load_attachment(
        self, *, message_id: str, filename: str, mime_type: str,
        body: dict[str, Any], fetch: bool,
    ) -> Attachment:
        if not fetch:
            return Attachment(filename, mime_type, None, "not fetched")

        # Small attachments arrive inline; larger ones need a second call.
        if body.get("data"):
            return Attachment(filename, mime_type, _decode(body["data"]))

        attachment_id = body.get("attachmentId")
        if not attachment_id:
            return Attachment(filename, mime_type, None, "no data and no attachmentId")

        try:
            fetched = (
                self._service.users().messages().attachments()
                .get(userId="me", messageId=message_id, id=attachment_id)
                .execute()
            )
            return Attachment(filename, mime_type, _decode(fetched.get("data")))
        except Exception as exc:  # noqa: BLE001 - one bad attachment must not kill the run
            return Attachment(filename, mime_type, None, f"fetch failed: {exc}")

    # ---------- sending ----------

    def send_reply(self, *, to_address: str, original: Message, body: str) -> str:
        """Reply in-thread, to the one address only. Never reply-all."""
        if to_address.lower() != self._config.watched_sender:
            raise ValueError(
                f"refusing to send to {to_address!r}; only {self._config.watched_sender!r} is allowed"
            )

        subject = original.subject or "(no subject)"
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        mime = EmailMessage()
        mime["To"] = to_address
        mime["Subject"] = subject
        if original.rfc822_message_id:
            mime["In-Reply-To"] = original.rfc822_message_id
            mime["References"] = original.rfc822_message_id
        mime.set_content(body)

        encoded = base64.urlsafe_b64encode(mime.as_bytes()).decode("utf-8")
        sent = (
            self._service.users().messages()
            .send(userId="me", body={"raw": encoded, "threadId": original.thread_id})
            .execute()
        )
        return sent.get("id", "")
