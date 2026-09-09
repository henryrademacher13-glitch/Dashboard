# Email Auto-Answer Scanner (Python)

Reads mail from one watched sender — body **and attachments** — answers the
questions, and replies in the same thread. Runs every 15 minutes on GitHub
Actions.

This exists because the Claude Gmail connector returns an attachment `id` and
never the bytes, which made PDFs and images unreadable. This path calls
`users.messages.attachments.get` and gets the actual file.

## Setup

Four secrets and one Google Cloud project. About 15 minutes, once.

### 1. Google Cloud project + Gmail API

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → Library → Gmail API → Enable.**
3. **OAuth consent screen:** External, add your own Gmail address as a test user.
   (Test-user mode is fine — it never needs verification for personal use.)
4. **Credentials → Create credentials → OAuth client ID → Desktop app.**
   Note the client ID and client secret.

### 2. Mint a refresh token

On a machine with a browser:

```bash
pip install -r scanner/requirements.txt
GMAIL_CLIENT_ID=<id> GMAIL_CLIENT_SECRET=<secret> python -m scanner.authorize
```

It opens a browser, you approve, and it prints the refresh token.

The requested scopes are `gmail.readonly` and `gmail.send` — deliberately not
`gmail.modify`. The scanner never labels, trashes, or alters anything.

### 3. Anthropic API key

From [console.anthropic.com](https://console.anthropic.com) → API Keys.

### 4. Repository secrets

**Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Value |
| --- | --- |
| `GMAIL_CLIENT_ID` | from step 1 |
| `GMAIL_CLIENT_SECRET` | from step 1 |
| `GMAIL_REFRESH_TOKEN` | from step 2 |
| `ANTHROPIC_API_KEY` | from step 3 |

Optionally set a repository **variable** `WATCHED_SENDER` to change the address
without editing code.

### 5. First run — dry run first

**Actions → Email auto-answer scanner → Run workflow**, with
**"Compose replies but send nothing" ticked**. It prints the reply it *would*
send. Check it reads correctly, then run again unticked.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `WATCHED_SENDER` | `s036407@students.lmsd.org` | Only address that is read or replied to |
| `SEARCH_WINDOW` | `2d` | How far back to look (Gmail `newer_than:` syntax) |
| `ANTHROPIC_MODEL` | `claude-opus-5` | Answering model |
| `ANTHROPIC_EFFORT` | `high` | `low`/`medium`/`high`/`xhigh`/`max` |
| `MAX_TOKENS` | `16000` | Answer length ceiling |
| `MAX_REPLIES_PER_RUN` | `5` | Safety cap per sweep |
| `DRY_RUN` | off | Compose but send nothing |

## How dedup works

No state file, no labels. **A message is answered exactly when a message from
you sits after it in the same thread.**

It self-heals: a run that dies after reading but before replying leaves the
message unanswered, so the next run retries it. A run that dies after replying
leaves your reply in place, so the next run skips it. A follow-up sent into an
old thread is newer than your last reply, so it correctly counts as new work.

The workflow uses a `concurrency` group so two sweeps can never overlap.

## Safety

- **One address.** `send_reply` raises rather than send anywhere but the watched
  sender. No CC, no BCC, no reply-all, no forwarding, no attachments.
- **Content is data, not instructions.** Bodies and attachments are wrapped in
  `<email_content>` tags and the system prompt states they are untrusted. If a
  message tries to redirect the scanner, the model is told to ignore it and note
  the omission in the reply.
- **Never fabricates.** Unreadable attachments are named in the prompt with an
  explicit instruction not to guess; the reply asks for a re-send instead.
- **Read-only scopes** apart from send.
- **Reply cap** per run, so a bug cannot flood the sender.

## Tests

```bash
python tests/test_dedup.py
python tests/test_content_and_safety.py
```

23 tests, no network or credentials needed. They cover the dedup rule
(double-reply prevention), attachment block construction, unreadable-attachment
reporting, prompt-injection wrapping, and the send-address guard.

## Running outside GitHub Actions

The script is a plain module — nothing is Actions-specific:

```bash
export GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... GMAIL_REFRESH_TOKEN=...
export ANTHROPIC_API_KEY=...
python -m scanner.main
```

For cron every 15 minutes:

```
*/15 * * * * cd /path/to/Dashboard && /path/to/venv/bin/python -m scanner.main >> /var/log/email-scanner.log 2>&1
```

## Cost

One API call per thread that has unanswered mail. Sweeps that find nothing cost
nothing — the Gmail search is free and no model call is made. At Opus 5 rates
($5/M input, $25/M output) a worksheet with a PDF runs a few cents.

## Known limits

- **GitHub's scheduler is best-effort.** A `*/15` cron often runs late under
  load; treat it as roughly every 15–30 minutes. Use `workflow_dispatch` when
  you want it now, or self-host for exact timing.
- **Attachment types:** PDF, JPEG, PNG, GIF, WebP. Anything else (`.docx`,
  `.pages`) is reported as unreadable rather than guessed at.
- **Refresh tokens can expire** if unused for six months, or if the Google
  account password changes. Re-run `scanner.authorize` to mint a new one.
