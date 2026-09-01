# C. Ads — website

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

Every editable value is wrapped in `[SQUARE BRACKETS]`. Open `index.html`, search for
`[`, and replace. The full list is also in an HTML comment at the top of the file.

| Placeholder | What to put there | Times used |
| --- | --- | --- |
| `[BOOKING LINK]` | Your Calendly / GoHighLevel calendar URL | 5 |
| `[PHONE]` | Display phone, e.g. `(555) 123-4567` | 2 |
| `[PHONE-DIGITS]` | Digits only for `tel:` links, e.g. `5551234567` | 2 |
| `[EMAIL]` | Contact email | 4 |
| `[SERVICE AREA]` | e.g. `Denver Metro` or `Nationwide` | 2 |
| `[BUILD FEE]` | One-time build price | 1 |
| `[RETAINER]` | Monthly management fee | 1 |
| `[MIN SPEND]` | Minimum monthly ad spend | 3 |
| `[GUARANTEE #]` | Booked estimates promised in 60 days | 1 |
| `[$500k]`, `[2]` | Revenue floor, open slots this month | 2 |
| `[CLIENT QUOTE 1–3]` | Real testimonials, with name, company, trade, city | 3 |
| `[YEAR]` | Footer copyright year | 1 |

One-liner for the obvious ones:

```bash
sed -i '' \
  -e 's|\[BOOKING LINK\]|https://calendly.com/your-handle/20min|g' \
  -e 's|\[PHONE-DIGITS\]|5551234567|g' \
  -e 's|\[PHONE\]|(555) 123-4567|g' \
  -e 's|\[EMAIL\]|you@cads.com|g' \
  site/index.html
```

(Drop the `''` after `-i` on Linux.)

### Two things worth doing by hand

- **Testimonials (Sec. 07).** Left as visible placeholders on purpose. Use real quotes
  from clients who gave permission — contractors call each other to check. Delete the
  whole `<section id="results">` block if you don't have any yet.
- **The job math calculator (Sec. 04).** Visitors drag their own numbers and the sheet
  rebuilds live. What you set are the *starting* positions — the `value=""` on each
  `<input type="range">` in `#calc-form`. Defaults are ad spend $3,000, management
  $1,500 (set this to your real `[RETAINER]`), CPL $24, booking 40%, close 24%, ticket
  $9,400, margin 35%. They're chosen so the whole example resolves cleanly to $90 per
  booked estimate and 8.8× — if you change one, sanity-check the hero scorecard
  (`.card-score`, which carries matching `data-target` values) so the two agree.

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
| `--hivis` | `#E9B949` | Safety amber, used once — the guarantee block |
| `--muted` | `#98A0AB` | Secondary text |

Type is Archivo (display, matching the logo's heavy grotesque), IBM Plex Sans (body) and
IBM Plex Mono (labels and figures). The page is committed to the dark brand palette in
both light and dark browsers — that's deliberate, not an oversight.

The logo is drawn in HTML and CSS (`.mark` / `.mark-dot`), so it stays sharp at any size
and needs no image file. If you have a proper SVG of the mark, swap it in and keep the
same class names.
