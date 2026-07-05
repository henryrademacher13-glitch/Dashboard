# Momentum — personal productivity app

A single-page productivity app with four connected features:

- **Tasks** — to-do list with due dates, priorities, and filters (Active / Today / Upcoming / Done).
- **Calendar** — month view showing events, tasks due each day, and focus activity; add events or tasks directly on a day.
- **Notes** — searchable notes with pinning, auto-save, and optional links to tasks.
- **Focus timer** — Pomodoro-style timer with presets, pause/resume, breaks, and a per-task session log.

## How the features connect

- A task's due date shows up on the calendar; clicking the due-date chip jumps to that day.
- Every task has one-click shortcuts to start a focus session on it or open/create its linked note.
- Focus sessions are logged against tasks (a "12m focused" chip appears on the task) and appear as activity dots on the calendar.
- The Today dashboard pulls it all together: due/overdue tasks, today's events, focus stats, and recent notes.
- A running timer follows you everywhere via a sidebar pill and the browser tab title, and survives page reloads.

All data is stored locally in your browser (`localStorage`) — no account or server needed.

## Development

```sh
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

Built with React 19 + Vite.
