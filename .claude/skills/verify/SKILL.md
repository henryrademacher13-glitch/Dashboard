---
name: verify
description: Build, serve, and drive the Husky Navigator app in a browser to verify changes.
---

# Verifying this app

Vite + React SPA; the surface is the browser.

```bash
npm install --no-audit --no-fund
npm run build
npm run preview -- --port 4173 &   # serves dist/ on http://localhost:4173
```

Drive it with the globally installed Playwright (do NOT `playwright install`;
Chromium is preconfigured):

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
```

Flows worth driving:
- Click a building in the sidebar list (`.bldg-row`) and on the map (`.bldg`)
  → route (`.route-line`) draws, detail panel shows in the sidebar.
- Click the selected building again → deselects (route disappears).
- Search box filters the list; typing clears any selection.
- Category chips dim non-matching map buildings.
- Zoom buttons + drag-pan on the SVG; drag must NOT trigger a click-select.
- Mobile viewport (390px): map first, then detail panel, then list.

Gotchas:
- Building names appear in both the list and the map SVG, so
  `getByRole('button', { name: ... })` hits strict-mode violations —
  scope selectors to `.bldg-row` (list) or `.bldg` (map).
- Pointer capture on the map SVG is deferred until a real drag starts;
  if map clicks stop selecting buildings, suspect that code path in
  `CampusMap.jsx`.
