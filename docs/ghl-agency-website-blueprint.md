# GoHighLevel Agency Website Blueprint

A reusable, fill-in-the-blank plan for building your own agency's website inside GoHighLevel (GHL). It covers page structure and copy, click-by-click build steps, the automations behind the site, and design specs.

Placeholders look like `{{AGENCY_NAME}}`. Do a find-and-replace for each one before you build.

| Placeholder | Example |
|---|---|
| `{{AGENCY_NAME}}` | Summit Growth Co. |
| `{{NICHE}}` | home service contractors (roofers, HVAC, remodelers) |
| `{{CORE_OUTCOME}}` | booked estimates on autopilot |
| `{{CITY_OR_REGION}}` | Denver, CO / "across the U.S." |
| `{{PHONE}}` / `{{EMAIL}}` | (555) 555-0100 / hello@yourdomain.com |
| `{{DOMAIN}}` | yourdomain.com |
| `{{OFFER}}` | Free 20-minute Growth Audit |
| `{{GUARANTEE}}` | 20 qualified leads in 30 days or next month is free |
| `{{FOUNDER_NAME}}` | Your name |

---

## Part 0: Before you build (pre-flight checklist)

Gather these first so the build doesn't stall halfway:

- [ ] **Domain** bought (GoDaddy, Namecheap, Cloudflare, etc.) and you can log in to its DNS settings
- [ ] **Logo** as a transparent PNG/SVG (horizontal and square versions), plus a 32×32 or 512×512 favicon
- [ ] **Brand colors** (see Part 4) and **fonts**
- [ ] **Founder headshot** and 3–6 real photos (you working, calls, team). Use stock only where you have to.
- [ ] **Proof:** 3+ testimonials (with names, photos, or video), results screenshots, case-study numbers
- [ ] **Your offer and guarantee**, written out in one sentence each
- [ ] **Business info:** legal business name, address (or service area), EIN for A2P registration
- [ ] **Privacy Policy and Terms**, including SMS consent language (needed for A2P approval; see Part 3.6)
- [ ] **Google Business Profile** set up (for reviews and local SEO)

---

## Part 1: Site map

```
Home  (/)
├── Services  (/services)
│   ├── Paid Ads Management       (/services/ads)
│   ├── Websites & Funnels        (/services/websites)
│   ├── CRM & Automation          (/services/automation)
│   └── Reputation & Reviews      (/services/reviews)
├── Results / Case Studies        (/results)
├── About                         (/about)
├── Pricing  (optional)           (/pricing)
├── Blog  (optional, for SEO)     (/blog)
├── Book a Call                   (/book)            ← main conversion page
│   └── Thank You / Confirmed     (/booked)
├── Contact                       (/contact)
├── Privacy Policy                (/privacy)
├── Terms & Conditions            (/terms)
└── 404                           (custom)
```

**Global navigation:** Logo · Services ▾ · Results · About · Contact · **[Book a Call]** button (high-contrast color, always visible, sticky on scroll).

**Global footer:** Logo + one-line positioning · nav links · `{{PHONE}}` · `{{EMAIL}}` · service area · social icons · Privacy · Terms · © year `{{AGENCY_NAME}}`.

**Conversion rule:** every page ends with the same CTA block that links to `/book`. One primary action across the whole site.

---

## Part 2: Page-by-page structure and copy

### 2.1 Home (`/`)

| # | Section | Content / copy |
|---|---|---|
| 1 | **Hero** | **H1:** "We help `{{NICHE}}` get `{{CORE_OUTCOME}}`." **Sub:** "Ads, funnels, and follow-up automation in one system. You do the work, we fill the calendar." **CTA:** [Book Your `{{OFFER}}`] · secondary link: "See results →". Visual: founder photo or dashboard mockup. |
| 2 | **Trust bar** | Client logos, or stats like "$X ad spend managed · X leads generated · X★ Google rating" |
| 3 | **Problem** | **H2:** "Sound familiar?" 3 pain cards: "Leads go cold because nobody follows up fast enough" · "Agencies sold you clicks, not booked jobs" · "You're stuck relying on referrals and the slow season" |
| 4 | **Solution / system** | **H2:** "The `{{AGENCY_NAME}}` Growth System." 3–4 steps with icons: **1. Attract** (targeted ads) → **2. Capture** (high-converting funnel) → **3. Convert** (instant SMS/email follow-up + AI booking) → **4. Grow** (automated review requests) |
| 5 | **Services grid** | 4 cards (Ads, Websites/Funnels, Automation, Reviews). Each has an icon, a 1-line benefit, and "Learn more →" |
| 6 | **Results** | 2–3 case-study cards: client type · before → after number · 1-sentence quote. "See all results →" |
| 7 | **Testimonials** | Video testimonial (best) or 3 written quotes with name, company, and photo |
| 8 | **Guarantee** | **H2:** "Our promise." `{{GUARANTEE}}`, shown with a badge icon |
| 9 | **How we work** | 3 steps: "Book a call → Get your custom plan → Launch in 14 days" |
| 10 | **FAQ** | 5–7 questions: contracts, cost, timeline, "Do I need a website already?", "What if I've been burned by an agency before?", "Which areas do you serve?" |
| 11 | **Final CTA** | **H2:** "Ready for a calendar that fills itself?" [Book Your `{{OFFER}}`] |

### 2.2 Services overview (`/services`) and each service page

**Overview:** hero ("Everything you need to grow, under one roof") → 4 service blocks (each: what it is, what you get, link) → "Why bundled works better" → CTA.

**Template for each service page** (`/services/ads`, etc.):

1. **Hero:** "`{{SERVICE}}` for `{{NICHE}}` that actually books jobs" + CTA
2. **The problem** this service fixes (2–3 bullets)
3. **What's included:** a deliverables checklist (e.g., for Ads: campaign strategy, creative and copy, weekly optimization, lead tracking, monthly report)
4. **The process:** 3–5 numbered steps
5. **Results:** one relevant case study
6. **FAQ:** 3–4 service-specific questions
7. **CTA block**

**Suggested deliverables per service:**

- **Ads:** Meta + Google campaign setup, ad creative, copywriting, retargeting, call tracking, weekly optimization
- **Websites & Funnels:** custom GHL site, landing pages per service, mobile optimization, speed/SEO basics, form + calendar integration
- **CRM & Automation:** pipeline setup, speed-to-lead SMS/email, missed-call text-back, AI chat/booking, nurture sequences, mobile app setup
- **Reputation & Reviews:** automated review requests, Google Business Profile optimization, review widget on site, response templates

### 2.3 Results (`/results`)

- Hero: "Real numbers from real `{{NICHE}}`"
- Filterable grid of case studies (by service or industry)
- **Case-study template:** Client (or anonymized "Roofing company, Texas") · **Challenge** · **What we did** · **Results** (3 big numbers: leads, cost per lead, revenue/booked jobs) · quote · screenshot
- CTA

### 2.4 About (`/about`)

- Hero: "Built by `{{FOUNDER_NAME}}` for business owners who are tired of agency fluff"
- Founder story: why you started, and what you saw agencies doing wrong
- Mission and 3–4 values (e.g., "Transparency: you see every lead," "Speed: we launch in 14 days")
- Team photos (if any)
- Stats / milestones
- CTA

### 2.5 Pricing (`/pricing`, optional)

Either show tiers ("Starter / Growth / Scale" with "starting at" prices and a feature checklist) **or** skip pricing and send people to the call. If you show it, add "Ad spend billed separately" and a "Not sure? Book a call" CTA.

### 2.6 Book a Call (`/book`)

The most important page. Keep it distraction-free (**hide the main nav** on this page).

1. **H1:** "Book your `{{OFFER}}`"
2. 3 bullets: what they'll get on the call
3. **Embedded GHL Calendar** (or a short qualifying form, then the calendar)
4. Small testimonial + guarantee badge beside or under the calendar
5. "What happens next" in 3 steps

### 2.7 Thank-You / Booked (`/booked`)

- "You're booked! Check your texts and email for confirmation."
- Short video from `{{FOUNDER_NAME}}` (60–90 sec) setting expectations, to cut down no-shows
- "Before our call": a checklist (have ad account access, know monthly budget, etc.)
- Fire conversion tracking here (Meta Pixel `Schedule`/`Lead` event, Google Ads conversion)

### 2.8 Contact (`/contact`)

GHL form (Name, Email, Phone, Company, Message, SMS consent checkbox) · phone · email · service area / map · hours · "Prefer to talk now? Book a call →"

### 2.9 Legal pages and 404

- **Privacy Policy** and **Terms**: must include SMS-specific language (see 3.6)
- **404:** "This page went cold, unlike our leads." + buttons to Home and Book a Call

---

## Part 3: Build it in GHL (click-by-click)

> GHL renames menus occasionally. If a label differs, the location is usually close by. Paths below are from the **sub-account** you're building in.

### 3.1 Sub-account and business profile

1. Agency view → **Sub-Accounts** → **Create Sub-Account** for `{{AGENCY_NAME}}` (your own agency should live in its own sub-account like any client).
2. **Settings → Business Profile:** business name, address, phone, email, website, logo, time zone. Accurate time zones matter for calendars and workflows.
3. **Settings → My Staff:** add team members and set their calendar availability.

### 3.2 Connect your domain

1. **Settings → Domains → + Add Domain** → enter `{{DOMAIN}}`.
2. GHL shows the DNS records to add. Typically:
   - **Root domain (`yourdomain.com`):** an **A record** pointing to the IP GHL shows
   - **`www`:** a **CNAME** pointing to the GHL target GHL shows
   - Copy the exact values from the GHL screen; don't use values from old tutorials.
3. Add those records at your domain registrar. Delete any conflicting A/CNAME records for the same host.
4. Back in GHL, click **Verify**. DNS can take minutes to a few hours. SSL is issued automatically.
5. Set `www` → root redirect (or the other way) so only one version is used.
6. After the site is built: **Domains → link domain to the website** and set the **Home page** path to `/`.

### 3.3 Build the website

1. **Sites → Websites → + New Website** → "From Blank" (or start from a template and restyle it).
2. **Website settings (gear icon):**
   - Domain: `{{DOMAIN}}`
   - Favicon
   - **Head tracking code:** Meta Pixel, Google Tag Manager / GA4 (paste once here so it's on every page)
   - **Body tracking code:** GTM noscript
3. **Create pages** to match the site map in Part 1. Set each page's **path** (e.g., `services/ads`).
4. **Build global sections first** (header + footer). Mark them as **Global Sections** so editing one updates every page.
5. **Set global styles** (colors and fonts from Part 4) in the builder's **Settings → Typography / Colors**, so every element pulls from them.
6. Build each page section by section using the outlines in Part 2. Builder tips:
   - Structure is **Section → Row → Column → Element**
   - Use the **mobile view toggle** on every section and hide or resize elements for mobile as needed
   - Use **Custom CSS** (page settings) only for small tweaks
   - Name sections ("Hero," "Testimonials") so they're easy to find later
7. **Per-page SEO (page settings → SEO Meta Data):**
   - Title: `Primary Keyword | {{AGENCY_NAME}}` (≤ 60 characters)
   - Description: benefit + CTA (≤ 155 characters)
   - Social image (1200×630)
   - Keywords field: optional, little SEO value
8. **Hide the nav** on `/book` and `/booked`.
9. Set up the **404 page** in website settings.
10. **Preview** on desktop and mobile → **Publish**.

### 3.4 Calendar (for `/book`)

1. **Calendars → Calendar Settings → + Create Calendar** → "Round Robin" (team) or "Personal Booking" (just you).
2. Name: "Growth Audit" · Duration: 20–30 min · **Buffer:** 10–15 min · **Minimum scheduling notice:** 4–12 hrs · **Date range:** 14–30 days out
3. **Location:** Zoom/Google Meet (connect under **Settings → Integrations**) or phone.
4. **Form:** add qualifying questions (Company name, Website, Monthly revenue range, Current marketing spend, Biggest challenge).
5. **Confirmation:** redirect to `https://{{DOMAIN}}/booked`.
6. **Connect Google/Outlook calendar** so busy times are blocked.
7. Copy the **embed code** and paste it into a Custom HTML/Calendar element on `/book`.

### 3.5 Forms

1. **Sites → Forms → Builder → + Add Form** → "Contact Form."
2. Fields: First Name, Last Name, Email, Phone, Company, Message, plus a **custom field** "Service Interested In" (dropdown).
3. Add **SMS consent checkbox** (required for A2P). Unchecked by default, with text like:
   > "By checking this box, I agree to receive SMS messages from `{{AGENCY_NAME}}` about my inquiry. Msg & data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help. See our Privacy Policy and Terms."
4. **Options:** on submit, redirect to a thank-you page or show a message. Turn on spam protection (captcha).
5. Embed the form on `/contact` and optionally in the footer.

### 3.6 Phone, SMS, and email deliverability (don't skip)

- **Phone:** **Settings → Phone Numbers** → buy a local number.
- **A2P 10DLC registration** (required for business texting to U.S. numbers): **Settings → Phone Numbers → Trust Center / A2P registration.** You'll need your legal name, EIN, website, and privacy policy/terms with SMS language. Your site must show:
  - The SMS consent checkbox language on forms
  - In the Privacy Policy, this exact idea: *"No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties."*
  - In the Terms, an SMS section covering program description, message frequency, "msg & data rates may apply," STOP/HELP instructions, and support contact
- **Email:** **Settings → Email Services** → set up a **dedicated sending domain** (e.g., `mail.{{DOMAIN}}`) and add the SPF, DKIM, and DMARC records GHL provides. Without this, emails land in spam.
- **Missed-call text-back:** **Settings → Phone Numbers → (number) → enable Missed Call Text Back** (or build it as a workflow; see 3.8).

### 3.7 Chat widget and Conversation AI (optional, recommended)

1. **Sites → Chat Widget → + New** → match brand color, add greeting ("Hey! Want to see how many leads you're missing?"), require name + phone + **SMS consent**.
2. Paste the widget code in **website settings → Body tracking code** (site-wide).
3. Optional: **Settings → Conversation AI / AI Agents** → train a bot on your FAQ to answer questions and **book onto your Growth Audit calendar**.

### 3.8 Pipeline (Opportunities)

**Opportunities → Pipelines → + Create Pipeline** named "Agency Sales":

`New Lead → Contacted → Call Booked → No-Show → Call Held → Proposal Sent → Won → Lost`

### 3.9 Reputation

**Reputation → Settings:** connect Google Business Profile, set up the review link, and add a **review widget** (Reputation → Widgets) to the Home/Results pages.

### 3.10 Custom fields and tags (set up before workflows)

- **Custom fields** (Settings → Custom Fields): Company, Website, Monthly Revenue, Marketing Budget, Service Interested In, Biggest Challenge
- **Tags:** `lead-website`, `lead-chat`, `lead-ads`, `call-booked`, `no-show`, `client-active`, `do-not-contact`

---

## Part 4: Design specs

### 4.1 Colors (fill in your own)

| Token | Use | Example |
|---|---|---|
| Primary | Headings, header/footer background | `#0F172A` (deep navy) |
| Accent / CTA | Buttons, links, highlights. Only use for actions. | `#F97316` (orange) or `#22C55E` (green) |
| Secondary | Section backgrounds, cards | `#F1F5F9` (light gray) |
| Text | Body copy | `#1E293B` |
| White | Alternating section backgrounds | `#FFFFFF` |

Rules: one accent color for every CTA. Keep contrast at WCAG AA (4.5:1 for body text). Alternate light and dark sections to break up the page.

### 4.2 Typography

- **Headings:** a bold sans-serif (Poppins, Montserrat, Inter, Plus Jakarta Sans), 600–800 weight
- **Body:** Inter / Open Sans / Lato, 400 weight
- **Sizes (desktop → mobile):** H1 48–56px → 32–36px · H2 36–40px → 26–28px · H3 24px → 20px · Body 18px → 16px · line height 1.5–1.7

### 4.3 Layout and components

- Max content width ~1140–1200px. Section padding 80–100px desktop, 48–60px mobile.
- **Buttons:** 16–18px bold text, 14–18px vertical padding, 6–10px radius, hover state. Action-oriented labels ("Book My Audit," not "Submit").
- Cards: subtle shadow or 1px border, 12px radius, consistent icon style (one icon set only).
- Hero: copy on the left, image on the right (desktop); stacked with CTA above the fold (mobile).
- Put a CTA every 2–3 sections.

### 4.4 Images and media

- Real photos beat stock. Founder face in the hero builds trust.
- Compress images (TinyPNG/Squoosh) to under ~200KB each. Use WebP where possible.
- Sizes: hero 1600–1920px wide · cards 600–800px · social share 1200×630 · logo SVG/PNG
- Add **alt text** to every image (for accessibility and SEO).
- Video: host on YouTube/Vimeo/Wistia and embed. Don't upload large files directly.

### 4.5 Mobile checklist

- [ ] CTA button visible without scrolling
- [ ] Tap targets ≥ 44px
- [ ] No horizontal scroll
- [ ] Click-to-call phone number in the header (mobile only)
- [ ] Calendar embed usable on a phone
- [ ] Test page speed with PageSpeed Insights (aim for 70+ on mobile)

---

## Part 5: Automations behind the site (Workflows)

Build these in **Automation → Workflows → + Create Workflow.** Each one lists its trigger, then its steps.

### WF1: New website lead (speed to lead)

**Trigger:** Form Submitted (Contact form) **or** Chat Widget submitted
1. Add tag `lead-website` · Create/Update Opportunity → "New Lead"
2. **Internal notification** (SMS + email to you): "New lead: {{contact.name}} – {{contact.phone}}"
3. **Wait 1 min** → **SMS** (only if consent given): "Hey {{contact.first_name}}, it's `{{FOUNDER_NAME}}` from `{{AGENCY_NAME}}`. Got your message! Want to grab a quick call? Book here: {{calendar link}}"
4. **Email:** same message + calendar link
5. **If/Else:** Has the appointment been booked? → Yes: end. No → continue
6. Wait 1 day → SMS follow-up #2 · Wait 2 days → Email with a case study · Wait 3 days → "Should I close your file?" SMS
7. **Goal event:** Appointment booked → exit workflow

### WF2: Call booked (confirmations and reminders)

**Trigger:** Customer Booked Appointment (Growth Audit calendar)
1. Tag `call-booked` · move Opportunity → "Call Booked" · remove from WF1
2. Instant SMS + email confirmation with date/time + `/booked` video link
3. Reminders: **24 hrs before** (email + SMS), **2 hrs before** (SMS), **10 min before** (SMS with meeting link)

### WF3: No-show recovery

**Trigger:** Appointment Status → No Show
1. Tag `no-show` · Opportunity → "No-Show"
2. Wait 10 min → SMS: "Looks like we missed each other. Want to reschedule? {{reschedule link}}"
3. Wait 1 day → email · Wait 2 days → final SMS

### WF4: Missed-call text-back

**Trigger:** Call Status → Missed/No Answer (inbound)
1. SMS: "Sorry we missed your call! This is `{{AGENCY_NAME}}`. How can we help? You can also book a time here: {{calendar link}}"
2. Internal notification to you

### WF5: Proposal follow-up

**Trigger:** Opportunity stage changed → "Proposal Sent"
1. Wait 2 days → "Any questions on the proposal?" email
2. Wait 3 days → SMS check-in · Wait 5 days → final email · then a task for you to call

### WF6: Client won (onboarding)

**Trigger:** Opportunity stage → "Won"
1. Tag `client-active` · welcome email with an onboarding form/checklist link
2. Create an internal task: "Kickoff call" · send the kickoff calendar link
3. Optional: Slack/email notification to your team

### WF7: Review request

**Trigger:** Tag added `client-active` + wait 30 days (or a manual trigger)
1. SMS + email: "Would you mind leaving us a quick Google review? {{review link}}"
2. Wait 3 days → one reminder if no review

**Global workflow settings:** set **Allow re-entry** carefully (usually off). Set **quiet hours** (no SMS 9pm–8am contact local time). Make sure every SMS step is filtered by consent/DND status.

---

## Part 6: Pre-launch QA checklist

- [ ] Domain resolves with HTTPS for both root and `www` (one redirects to the other)
- [ ] Every nav link and button works. No "#" placeholders left.
- [ ] Every `{{PLACEHOLDER}}` replaced (search the builder)
- [ ] Contact form submits → contact created → WF1 fires → you receive the internal notification
- [ ] Test booking → confirmation SMS/email arrive → redirects to `/booked` → reminders scheduled
- [ ] Mark the test appointment as a no-show → WF3 fires
- [ ] Call your number and don't answer → missed-call text arrives
- [ ] Chat widget captures name/phone and creates a contact
- [ ] Meta Pixel / GA4 fire (check with Meta Pixel Helper and GA4 DebugView)
- [ ] SEO title and description set on every page. Social share image shows correctly (test with a link preview).
- [ ] Mobile checklist (4.5) passes
- [ ] Privacy and Terms pages live and linked in the footer and on forms
- [ ] A2P registration approved and email sending domain verified
- [ ] Delete test contacts and opportunities

## Part 7: After launch

- Submit the sitemap to **Google Search Console** (`https://{{DOMAIN}}/sitemap.xml`) and verify the domain there
- Link the site from your Google Business Profile and social bios
- Publish 1–2 blog posts per month targeting "`{{NICHE}}` marketing" style keywords
- Review monthly: conversion rate on `/book`, lead → booked call %, show rate, close rate
- A/B test the hero headline and CTA text (GHL funnels support split tests; for the website, test by swapping versions)

---

## Make it repeatable

- **Save it as a Snapshot:** once your site, calendar, forms, pipeline, and workflows are built, go to agency view → **Account Snapshots → Create Snapshot.** You can then load a near-identical build into any client sub-account in minutes. This is the single biggest time-saver in GHL.
- **Turn this into a Claude Skill:** if you'll build GHL sites for clients often (e.g., `/ghlsite <client URL>`), this blueprint plus your existing `contractorads` and `contractorcreatives` skills could become one skill that outputs client-specific copy, page structure, and workflow text in one go.
