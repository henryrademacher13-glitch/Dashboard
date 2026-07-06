# Claude Dashboard

A local web app that sits on top of [Claude Code](https://claude.com/claude-code) and makes it usable by anyone on the team — no terminal required once it's running.

**Three views:**

- **Today** — a daily report of everything Claude Code did: sessions, requests, work steps, files changed, activity by hour, and most-used tools. One click asks Claude to write the day up as a plain-language summary you can paste into a standup.
- **Actions** — your installed skills and slash commands as one-click Run buttons, a plain-English "ask Claude to do something" box, and a read-only list of configured automations (hooks). Runs stream live progress into the page.
- **Sessions** — a searchable log of every Claude Code conversation on the machine, with readable transcripts: your requests, Claude's replies, and the work in between collapsed into expandable "worked on it" blocks.

Light and dark mode follow your system setting.

## Requirements

- Node.js 20+
- The [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) installed and signed in (the dashboard reads `~/.claude` and shells out to `claude` for runs)

## Running it

Someone with a terminal starts it once:

```bash
npm install
npm start          # builds and serves at http://localhost:5173
```

Then anyone on the machine (or the LAN, if you expose the port) just opens **http://localhost:5173** in a browser.

For development with hot reload:

```bash
npm run dev
```

Set `PORT` to change the port.

## How runs work

Buttons on the Actions page execute `claude -p` headlessly in the project you pick, and stream Claude's progress back to the browser. Two permission levels:

- **Safe** (default) — Claude can read and edit files (`--permission-mode acceptEdits`); anything else is blocked.
- **Full access** — Claude can also run commands without asking (`--dangerously-skip-permissions`). Use with care.

Run history is kept in `~/.claude/dashboard-runs.json`.

## What it reads

Everything is local, read directly from Claude Code's own data — the dashboard never talks to the internet itself:

| Data | Source |
|---|---|
| Sessions & daily report | `~/.claude/projects/**/*.jsonl` |
| Skills | `~/.claude/skills`, `<project>/.claude/skills` |
| Slash commands | `~/.claude/commands`, `<project>/.claude/commands` |
| Automations (hooks) | `~/.claude/settings.json`, `<project>/.claude/settings.json` |
