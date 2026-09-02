# Contractor.Ads — website

A single, self-contained landing page for the agency. One file, no build step, no
dependencies: `index.html` holds the markup, the CSS and the (very small) JS surface.
Fonts load from Google Fonts; everything else ships inside the file.

## Deploy it

Any static host works. Pick one:

| Host | How |
| --- | --- |
| Netlify | Drag the `site/` folder onto app.netlify.com/drop |
| Vercel | `vercel deploy site --prod` |
| Cloudflare Pages | New project → upload `site/` |
| GoDaddy / cPanel / any FTP | Upload `index.html` to the web root |
| GitHub Pages | Push, then set Pages source to `/site` on this branch |

Point your domain at it and you're live.

## Fill in your details

Contact details, pricing and the year are all set. Three editable values are left, still
wrapped in `[SQUARE BRACKETS]` — open `index.html`, search for `[`, and replace.

| Placeholder | What to put there | Times used |
| --- | --- | --- |
| `[BOOKING LINK]` | Your Calendly / GoHighLevel calendar URL | 5 |
| `[2]` | Open contractor slots this month (hero note and mobile dock) | 2 |
| `[$500k]` | Revenue floor in the qualification list | 1 |

The booking link is the only one that blocks launch:

```bash
sed -i '' -e 's|\[BOOKING LINK\]|https://calendly.com/your-handle/20min|g' site/index.html
```

(Drop the `''` after `-i` on Linux.)

Already live in the page: phone `267-667-8665` (dialing `+12676678665`),
`Contractor.adsagency@gmail.com`, $500 build, $2,000/mo management, $100/day ad spend
minimum, © 2026.

### One thing worth doing by hand

- **The job math calculator (Sec. 04).** Visitors drag their own numbers and the sheet
  rebuilds live. What you set are the *starting* positions — the `value=""` on each
  `<input type="range">` in `#calc-form`. Defaults are ad spend $3,000 — the slider floors
  there, because $3,000/mo is the $100/day minimum — management $2,000 (your retainer),
  CPL $24, booking 40%, close 24%, ticket $9,400, margin 35%. They resolve cleanly to
  $100 per booked estimate and 7.9× return. **If you change any of them, sanity-check the
  hero scorecard** (`.card-score`, which carries matching `data-target` values) so the two
  still agree — right now both say $100 and 7.9×.

## Before you send traffic

- [ ] Meta Pixel / Conversions API installed — paste the snippet before `</head>`
- [ ] Booking link tested on a phone
- [ ] `tel:` and `mailto:` links tested on a phone
- [ ] Privacy policy page linked in the footer (required for Meta lead forms)
- [ ] Open Graph image and tags added if you'll be sharing the URL in ads
- [ ] Real title/description checked in a link preview

## What moves

All vanilla JS in one `<script>` at the bottom of the file — no libraries, nothing to build.

| Behavior | How it works |
| --- | --- |
| Scroll progress rail | `transform: scaleX()` on a 2px bar under the header, one rAF-gated scroll pass |
| Section reveals | IntersectionObserver adds `.is-in`; the hidden state is only applied when JS runs, so with JS off the page renders fully visible |
| Annotation rules | Each section's `SEC. 0x` hairline fills with terracotta as you read through it |
| Build-sequence rail | Vertical rail fills and phase markers light as each phase passes the viewport middle |
| Nav scroll-spy | Active section's nav link gets the terracotta underline |
| Trades ticker | CSS marquee, pauses on hover and focus |
| Counting figures | Hero scorecard and calculator KPIs tween up the first time they're reached |
| Live calculator | Seven sliders drive the KPIs, funnel bars and every line of the estimate sheet; changed amounts flash terracotta |
| Mobile dock | Booking bar slides up after the hero, hides again over the real CTA |

Everything above is disabled under `prefers-reduced-motion: reduce` — values render at their
final state, the ticker stops, nothing translates.

## Design notes

Colors, type and spacing are all CSS custom properties in the `:root` block at the top
of the stylesheet — change `--rust` in one place and the whole page follows.

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#16181C` | Page ground, taken from the logo |
| `--rust` | `#C5563B` | The square in the mark; the only loud color |
| `--muted` | `#98A0AB` | Secondary text |

Type is Archivo (display, matching the logo's heavy grotesque), IBM Plex Sans (body) and
IBM Plex Mono (labels and figures). The page is committed to the dark brand palette in
both light and dark browsers — that's deliberate, not an oversight.

The logo is drawn in HTML and CSS (`.mark` / `.mark-dot`), so it stays sharp at any size
and needs no image file. If you have a proper SVG of the mark, swap it in and keep the
same class names.
