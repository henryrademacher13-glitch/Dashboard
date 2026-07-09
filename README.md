# Scalia — Customer Dashboard

A single-page dashboard for the Scalia agency to manage clients, review their
Meta ads performance, and keep track of scheduled meetings in one place.

## Views

- **Overview** — headline KPIs (total clients, active clients, 30-day ad spend,
  meetings this week), client growth over time, upcoming meetings, and the
  newest clients.
- **Clients** — add, search, filter, and remove clients; update each client's
  status (active / onboarding / paused) and see their 30-day spend, ROAS, and
  monthly budget at a glance.
- **Ads Analytics** — per-client Meta ads metrics for a 7/14/30-day window:
  spend, impressions, clicks, CTR, CPC, and ROAS, with daily spend and
  conversion charts and a campaign-level breakdown table.
- **Meetings** — schedule meetings against clients (kickoff, check-in,
  performance review, strategy), grouped by day, with done/delete actions and
  a collapsible history of past meetings.

## Data

Clients and meetings persist in `localStorage`. Ad metrics are currently
generated deterministically per client (seeded from the client id) so the demo
is stable across reloads — swap `getDailyAdMetrics` / `getCampaignBreakdown`
in `src/store.js` for a Meta Marketing API integration to show real data.

## Development

```sh
npm install
npm run dev     # local dev server
npm run lint    # eslint
npm run build   # production build
```

Built with React 19, Vite, Recharts, and lucide-react.
