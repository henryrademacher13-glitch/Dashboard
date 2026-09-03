# Contractor.Ads — website

Three self-contained pages. No build step, no dependencies, no shared asset files: each
`.html` file holds its own markup, CSS and (on the landing page only) JS. Fonts load from
Google Fonts; everything else ships inside the files.

Every page carries the same top nav — the landing page's five sections, then About and
Privacy — so you can click between all three from any of them.

| File | What it is |
| --- | --- |
| `index.html` | The landing page — hero, what we do, how it works, pricing, live job-math calculator, FAQ, booking CTA |
| `about.html` | Who we are, why one channel, how we work |
| `privacy.html` | Privacy policy, 15 numbered clauses |

**The `:root` token block is duplicated in all three files.** That's the cost of keeping
each page independently droppable — change `--rust` and you change it three times. If that
becomes annoying, pull the shared block into a `brand.css` and link it from each page.

## Live

**https://contractor-ads.vercel.app**

Hosted on Vercel (team `scaliagrowth-7855s-projects`, project `contractor-ads`), deployed
as static files to production. The project answers on two addresses:

| URL | Use it? |
| --- | --- |
| `contractor-ads.vercel.app` | **Yes** — short, no team name in it, and indexable |
| `contractor-ads-scaliagrowth-7855s-projects.vercel.app` | No — Vercel's auto-generated deployment URL. Long, and it sends `x-robots-tag: noindex`, so Google ignores it |

Both serve the same files. Only the long one is de-indexed, so always hand out the short
one.

Vercel Authentication (SSO protection) was on by default for this team, which meant the
site asked visitors to log in to Vercel. It is now **off** for this project so the site is
publicly reachable.

A real domain (`contractor-ads.com` was $11.25/yr when checked) is still worth buying when
you're ready — add it under Project → Settings → Domains. But it's an upgrade now, not a
fix: the short vercel.app URL works and gets indexed.

**This deploy was a direct file upload, not a git connection**, so pushing to GitHub does
not update the live site. To redeploy after changing the files, either connect the repo in
Vercel (Project → Settings → Git) or upload the folder again.

## Deploy it elsewhere

Upload the whole `site/` folder, not just one file — the pages link to each other by
relative path.

| Host | How |
| --- | --- |
| Netlify | Drag the `site/` folder onto app.netlify.com/drop |
| Vercel | `vercel deploy site --prod` |
| Cloudflare Pages | New project → upload `site/` |
| GoDaddy / cPanel / any FTP | Upload all three `.html` files to the web root |
| GitHub Pages | Push, then set Pages source to `/site` on this branch |

Point your domain at it and you're live at `/`, `/about.html` and `/privacy.html`.

**Until you deploy, the page-to-page links only work where all three files sit side by
side.** They're relative (`href="privacy.html"`), which is what a real host needs — but it
means a single page opened on its own, or previewed in isolation, has nothing to resolve
them against and will say "not found". To try the links before deploying, open the files
from the folder (`open site/index.html`) or serve it locally:

```bash
cd site && python3 -m http.server 8000   # then visit http://localhost:8000
```

## Fill in your details

Nothing is left to fill in. Contact details, pricing, the booking calendar and the year
are all real. The only numbers that are still illustrative are the job-math calculator's
slider defaults (ad spend $3,000, CPL $24, booking 40%, close 24%, ticket $9,400, margin
35%) — swap those for your own once you have real campaign data, and re-check the hero
scorecard so the two agree.

## Booking

Every "Book a call" button opens the Calendly scheduler in a popup over the page, using
Calendly's link widget:

```html
<link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">
<script src="https://assets.calendly.com/assets/external/widget.js" async></script>
<a href="https://calendly.com/contractor-adsagency/30min"
   onclick="Calendly.initPopupWidget({url: 'https://calendly.com/contractor-adsagency/30min'});return false;">Book a call</a>
```

`widget.css` sits in the head and `widget.js` before `</body>` on **all three pages**, since
every page has booking buttons. There are 10 of them in total — 5 on the landing page
(nav, hero, the Pick a time button, footer, mobile dock), 3 on About, 2 on Privacy.

**Each button carries a real `href` to the Calendly URL, not `href=""`.** That matters: if
`widget.js` is blocked or still loading, `onclick` throws, `return false` never runs, and
the browser follows the href to Calendly instead. With `href=""` the same failure would
reload the page and the visitor could never book. Keep the href.

To change the event, update both the `href` and the URL inside `initPopupWidget` on every
button — a find-and-replace on `contractor-adsagency/30min` across the three files does it.
Appending `?primary_color=c5563b` to those URLs makes the scheduler match the site's
accent; it currently runs on Calendly's default colour.

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
| Live calculator | Seven sliders drive the KPI tiles and the funnel bars |
| Mobile dock | Booking bar slides up after the hero, hides again over the real CTA |
| Nav menu | Below 1010px the nav collapses into a hamburger panel — on all three pages. Closes on link click, Escape, an outside click, or a resize back to desktop |

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
