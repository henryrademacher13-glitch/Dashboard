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
| `[BOOKING LINK]` | Your Calendly / GoHighLevel calendar URL | 4 |
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
- **The job math table (Sec. 04).** The figures are labeled as an example throughout.
  Swap in your real cost per lead, booking rate, close rate, ticket and margin. The
  disclaimer under the table stays either way.

## Before you send traffic

- [ ] Meta Pixel / Conversions API installed — paste the snippet before `</head>`
- [ ] Booking link tested on a phone
- [ ] `tel:` and `mailto:` links tested on a phone
- [ ] Privacy policy page linked in the footer (required for Meta lead forms)
- [ ] Open Graph image and tags added if you'll be sharing the URL in ads
- [ ] Real title/description checked in a link preview

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
