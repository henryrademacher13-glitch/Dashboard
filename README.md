# Two Homes

A coordination app for families whose children move between two households.

Four things, in one place, so nobody has to remember or remind:

- **Money** — shared expenses split four ways (evenly, by percentage, by a fixed amount, or in proportion to custody time), with a single running balance and a settlement record.
- **School** — projects broken into dated milestones, with warnings when a step lands on a handoff day or the supplies are at the other house.
- **Tasks** — every recurring obligation resolves its owner as *fixed*, *alternating*, or *whoever has the child that day*.
- **Gear** — where each child's things actually are, plus a packing checklist generated before every handoff.

Full product and technical specification: [`docs/family-coordination-app-spec.md`](docs/family-coordination-app-spec.md).

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm test         # domain logic tests
npm run lint
```

Opens with seeded demo data generated relative to today, so it is immediately
explorable. Use the avatar in the top right to switch between the two
households — both hold identical permissions by design — or to reset the data.

## How it is built

A responsive PWA. React + Vite, no backend, no build-time services. State lives
in `localStorage` only; nothing leaves the device.

```
src/family/
  model.js      pure domain logic — custody, splitting, responsibility, staleness, checklists
  seed.js       demo data, generated relative to the current date
  store.js      React state, persistence, and actions
  App.jsx       shell and navigation
  screens/      Today · Money · School · Tasks · Gear · Handoff
  components/   shared primitives
tests/
  model.test.mjs
```

`model.js` is deliberately free of side effects and React, so the parts that
are easy to get subtly wrong can be tested directly.

### Three decisions worth knowing about

**Resolution is frozen, never recomputed.** An expense's per-household shares
are calculated once when it posts, and a task occurrence's owner is fixed when
it materializes. Correcting today's custody schedule cannot silently rewrite
last month's balances or last week's answer to "whose turn was it."

**Rounding never disadvantages the household that did not pay.** Shares floor
first; leftover cents go to the payer before anyone else.

**The app never asserts a location it cannot vouch for.** An item unconfirmed
for over a week reads "Last seen at Sam's, 9 days ago" and asks to be
confirmed, rather than claiming to know.

## Privacy

No ads, no analytics, no third-party scripts, nothing sold. Deliberately not
collected: home addresses, children's legal names, dates of birth, phone
numbers, bank details, or anyone's device location. Objects have locations;
people do not.

Settlements are recorded, not processed — no payment credentials are stored,
which keeps the product out of PCI scope entirely.

## Status

Working prototype. Everything is local to the browser; there is no sync between
real households yet. See §9 of the spec for what a production build still
needs.
