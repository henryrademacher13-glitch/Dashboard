# Scalia — Customer Dashboard

A single-page dashboard for the Scalia agency to manage clients, review their
Meta ads performance, and keep track of scheduled meetings in one place.

## Views

- **Overview** — headline KPIs (total clients, active clients, monthly
  recurring revenue, meetings this week), client growth over time, upcoming
  meetings, and the newest clients.
- **Clients** — add, search, filter, and remove clients; update each client's
  status (active / onboarding / paused) and see their monthly fee, share of
  MRR, and start date at a glance.
- **Revenue** — how much clients pay per month: MRR, paying-client count,
  average fee, projected annual revenue, an MRR-over-time chart, a fee-by-client
  chart, and a table with editable fees and lifetime billed totals. Paused
  clients aren't counted as paying.
- **Meetings** — schedule meetings against clients (kickoff, check-in,
  performance review, strategy), grouped by day, with done/delete actions and
  a collapsible history of past meetings.

## Data

Clients (including their monthly fees) and meetings persist in `localStorage`.
Revenue figures are derived from each client's current fee and status.

## Development

```sh
npm install
npm run dev     # local dev server
npm run lint    # eslint
npm run build   # production build
```

Built with React 19, Vite, Recharts, and lucide-react.
