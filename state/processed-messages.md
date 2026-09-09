# Auto-Answer Run Log

Append-only audit trail. **Not** the dedup mechanism — dedup is thread ordering
(see `docs/email-scanner.md`). A failed push here must never block a reply or
cause a double-send.

Format: `<UTC timestamp> | <thread id> | <message id> | <subject> | <outcome>`

| Timestamp | Thread | Message | Subject | Outcome |
| --- | --- | --- | --- | --- |
