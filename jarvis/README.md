# Jarvis — Phase 1

Personal AI assistant. Phase 1 scope: a persistent SQLite memory layer and a
basic CLI chat loop wired to Claude. No tool routing or skills yet — that's
Phase 2.

## Setup

```bash
cd jarvis
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npm run dev
```

`npm run dev` runs the TypeScript directly via `tsx`. Use `npm run build && npm start`
to run the compiled version.

## What's here

- **Memory layer** (`src/memory/`) — SQLite (`better-sqlite3`), file lives at
  `data/jarvis.db` (gitignored). Tables: `facts`, `projects`, `conversations`,
  `messages`. Facts and active projects are loaded into the system prompt on
  every turn; conversation history persists across process restarts.
- **Chat loop** (`src/core/conversation.ts`) — streams responses from Claude,
  logs every user/assistant turn to SQLite.
- **CLI** (`src/cli/repl.ts`) — a REPL with a few meta-commands for
  exercising the memory layer directly (not LLM-routed yet, just for testing):
  - `/remember <key> = <value>`
  - `/facts`
  - `/forget <key>`
  - `/project add <name> | <description>`
  - `/projects`
  - `/project done <name>`
  - `/help`, `/exit`

Try it: `/remember favorite_language = TypeScript`, then exit and restart —
ask "what's my favorite language?" and it should recall it from the system
prompt built out of `facts`.

## On process management

Phase 1 is a REPL you talk to in a live terminal, so there isn't really
anything to background yet — just run `npm run dev` in a terminal (or a
`tmux`/`screen` session if you want it to survive a disconnect). An
`ecosystem.config.js` is included for later: once Phase 3 adds things that
need to run without you actively typing (e.g. polling Gmail, firing
reminders on a schedule), pm2 becomes the right tool and you'd run
`pm2 start ecosystem.config.js` after `npm run build`. Attaching to a
REPL under pm2 works (`pm2 attach jarvis`) but is clunky — expect to migrate
the REPL to a thinner "attach on demand" interface once there's real
background work happening underneath it.

## Cost notes

- Every turn sends up to the last 30 messages of history plus all stored
  facts/active projects as the system prompt — cheap at this scale, but
  worth knowing this grows with usage. Summarization/trimming of older
  conversations into `conversations.summary` is the next lever if it
  becomes a real cost, not yet implemented.
- No other paid APIs are wired up in Phase 1.

## Next (Phase 2)

Intent routing via Claude's native tool-use, then skills in priority order:
Google Calendar, Gmail, web search, sandboxed shell runner.
