# Family Coordination App — Product Specification

**Status:** Draft v1.0
**Document type:** Product & technical specification
**Last updated:** 2026-09-20

---

## 1. Overview

A coordination app for families whose children move between two households. It replaces the constant verbal-reminder loop — *who paid for cleats, when is the diorama due, whose turn is the carpool, where is the lacrosse stick* — with a single shared source of truth that both households can see and neither household owns.

### 1.1 The problem

Separated and co-parenting families run on memory and text messages. Four failure modes recur:

1. **Money leaks.** One parent buys the gear, the other never sees the receipt, the balance drifts, and the conversation turns adversarial six months later.
2. **School projects surprise everyone.** A multi-week project is a single line on a calendar until the night before it is due — usually at the house without the poster board.
3. **Responsibility is ambiguous.** "I thought you were taking her" is a scheduling failure, not a character failure, and it is fixable with software.
4. **Objects go missing across households.** Not lost — just at the other house. The cost is not the object; it is the fifteen text messages required to locate it.

### 1.2 Confirmed parameters

| Parameter | Decision |
|---|---|
| Household model | **Two households (co-parenting).** Household-aware from the schema up. |
| Platform | **Responsive web app / PWA.** One codebase, installable to home screen, no app-store dependency, no OS assumption. |
| Equipment approach | **Manual check-in/out + generated handoff checklists.** No Bluetooth tags, no QR scanning in v1. |
| Visual direction | **Calm & neutral.** Muted, spacious, low-chrome. Reads as infrastructure, not as a toy. |
| Monetization | Subscription or one-time. **No advertising. No third-party data sale. Ever.** |
| Budget | *[PLACEHOLDER — see §9.1 for phased scoping against three budget tiers]* |
| Reference apps | *[PLACEHOLDER — none supplied]* |

### 1.3 Explicit non-goals for v1

- Not a legal-evidence product. No recorded calls, no court-export message archive, no tamper-proof communication log. That is OurFamilyWizard's market and it demands a different, heavier design.
- Not a payment processor. The app records who owes whom; it does not move money. See §8.4 for why this is a privacy decision, not a laziness decision.
- Not a location tracker for **people**. Only for objects, and only when a human deliberately reports one.
- Not a messaging app. There is a comment thread on shared records; there is no general chat. General chat invites conflict and creates a discovery liability.

---

## 2. Design principles

These resolve the brief's stated conflicts. Per the conflict-resolution rule, **constraints beat features.**

**P1 — Neutrality over advocacy.** Both households see identical data. There is no "primary" parent, no admin who can overrule, no feature that lets one parent silently edit shared history. Where the app must record a disagreement, it records both positions rather than adjudicating.

**P2 — Simplicity beats completeness.** Maximum five primary navigation destinations. No nested tab bars, no drag-and-drop-only interactions, no gesture-only actions, no custom controls where a native one exists. Any feature that cannot be explained in one sentence on its own screen does not ship.

**P3 — Honest uncertainty.** The app never displays stale data as if it were current. An item whose location has not been confirmed in seven days reads *"Last seen at Dad's, 9 days ago"* — never *"At Dad's."* A system that lies once is never trusted again, and this system's entire value is trust.

**P4 — Minimum viable data.** Every stored field must justify itself against a specific user-facing feature. No field is collected "in case it is useful later." See §8.2 for the field-by-field justification table.

**P5 — Degradation, not failure.** The app is a PWA used in parking lots and school pickup lines. Every read view works offline from cache; every write queues and syncs. A dead connection reduces capability, it does not block the user.

---

## 3. Feature list

### 3.1 Money — shared bills

| Feature | Description |
|---|---|
| **Expense capture** | Add an expense in under 15 seconds: amount, category, which child, optional photo of receipt. Everything else defaults. |
| **Split rules** | Four modes per expense: **even** (50/50), **percentage** (e.g. 70/30 per a support order), **fixed amount** (one parent covers $40, rest splits), **custody-proportional** (computed from actual overnight counts in the period). Default rule is set once per family and inherited by every new expense. |
| **Running balance** | One number on the Money screen: *"Alex owes Sam $142.50."* Not a ledger to interpret — a single figure with a tap-through to its components. |
| **Approval flow** | Expenses above a family-set threshold require the other household to acknowledge before entering the balance. Below the threshold they post automatically. Prevents both surprise charges and death-by-approval on $6 school lunches. |
| **Disputes** | Either party can flag an expense. A flagged expense moves to a *Disputed* state, leaves the running balance, and holds both parties' written positions side by side. The app does not resolve it. |
| **Settlement recording** | Mark a balance settled with amount, date, and method (as free text — Venmo, cash, bank transfer). Resets the running balance and archives the period. **No payment rails, no bank credentials.** |
| **Recurring bills** | Templates for predictable costs (activity fees, tuition, insurance) that auto-generate on schedule with the family's default split rule. |
| **Category budgets** | *Optional.* Soft caps per category per child per term, with an advisory indicator only. No enforcement, no blocking. |
| **Period export** | CSV or PDF of any date range for tax prep, mediation, or a lawyer. Generated on demand, never pre-built. |

### 3.2 School — projects

| Feature | Description |
|---|---|
| **Project records** | A school project is a first-class entity, not a calendar event: title, child, subject, final due date, and an ordered set of milestones. |
| **Milestone decomposition** | Break a project into steps with individual due dates ("choose topic," "buy supplies," "draft," "build," "present"). This is the feature no co-parenting app currently ships and it is the single biggest cause of night-before crises. |
| **Backward planning** | Enter a due date and the app proposes a milestone schedule working backwards, skipping transition days where the child would be mid-move. Proposals are always editable; nothing is auto-committed. |
| **Custody-aware warnings** | If a milestone lands on a handoff day, or if the supplies for a step are at the other household, the project shows a warning before it becomes a problem. |
| **Supply list** | Each project carries a materials list. Items on that list feed directly into handoff checklists (§3.4) and can be converted into an expense in one tap. |
| **Responsibility per milestone** | Each milestone names a responsible adult — fixed, rotating, or resolved from the custody schedule. |
| **Completion + evidence** | Mark a milestone done, optionally with a photo. The photo is for reassurance across households ("the volcano exists"), not for surveillance of the child. |

### 3.3 Turns — task responsibility

| Feature | Description |
|---|---|
| **Three assignment modes** | Every recurring task resolves its owner one of three ways: **Fixed** (always the same person), **Rotating** (alternates through an ordered list per occurrence), or **Custody-derived** (whoever has the child that day). This trio covers essentially every real family arrangement and is the architectural core of the product. |
| **The "Right now" answer** | The home screen's top element answers one question without any interaction: *what am I responsible for today, and what is the other household responsible for.* |
| **Rotation engine** | Rotations advance on completion, not on the calendar, so a skipped week does not silently reassign forever. Manual "swap this one" does not disturb the underlying order. |
| **Swap requests** | Request a one-time trade. The other party accepts or declines. Both outcomes are logged; neither generates a notification storm. |
| **Kid-assignable tasks** | Children can hold tasks (homework, packing their own bag, feeding the dog). Kid accounts see only their own tasks, in a stripped-down view. |
| **Gentle escalation** | Overdue tasks surface progressively: quiet indicator → one reminder to the owner → visible on the family view. **Never** a notification to the other parent about the first parent's lateness. That feature would be weaponized within a week. |
| **Completion history** | A plain record of what was done and by whom. Visible to both households, no scoring, no leaderboard, no streaks between adults. Streaks are available on **kid** tasks only, where motivation is the point. |

### 3.4 Gear — equipment location

| Feature | Description |
|---|---|
| **Item registry** | Each tracked object: name, optional photo, owning child, category (sports / instrument / school / medical / clothing), and a **home base** — the household or place it belongs by default. |
| **One-tap location update** | Update an item's location from a fixed, short list: *Mom's, Dad's, Car, School, Practice/venue, Unknown.* One tap from the item, two taps from anywhere in the app. |
| **Staleness indicator** | Per P3. Under 48 hours: shown as current. 2–7 days: shown with a timestamp. Over 7 days: shown as *"Last seen…"* in a muted state with a prompt to confirm. |
| **Bulk move** | "Everything moved to Dad's" in one action at a handoff. This is what makes manual tracking survive contact with reality — nobody updates fourteen items individually. |
| **Handoff checklist** | Auto-generated before a scheduled transition. Pulls in: items not at their home base, items required by any calendar event in the next N days, items on an active project's supply list, and anything on the family's standing pack list. Check items off as they go in the bag; checking off updates each item's location automatically. |
| **Activity pack lists** | Reusable named lists ("Saturday soccer," "Swim practice") that attach to recurring calendar events and generate a checklist ahead of each occurrence. |
| **Missing flag** | Mark an item genuinely lost. It moves to a *Missing* list with its last known location and the last person who confirmed it — a factual record, deliberately not an accusatory one. |

### 3.5 Foundation

| Feature | Description |
|---|---|
| **Custody schedule** | Templates for common patterns (alternating weeks, 2-2-3, 2-2-5-5, every other weekend) plus a custom builder. Drives custody-derived task assignment, custody-proportional splits, and handoff timing. |
| **Shared calendar** | A read-oriented unified view: custody periods, school events, activities, project milestones, handoffs. Deliberately thinner than a general calendar app — it can subscribe to external calendars read-only via ICS, and does not attempt to replace them. |
| **Record-scoped comments** | Comment threads live on a specific expense, project, or task. There is no general inbox. Context is always attached, which measurably reduces conflict compared with open-ended chat. |
| **Notification budget** | A hard cap on notifications per user per day, with a daily digest as the default delivery mode. Immediate push is reserved for a short, user-editable list of genuinely urgent events. |
| **Offline-first** | Full read access from cache; writes queue and sync. Conflicts resolve last-write-wins on scalar fields, with append-only semantics for logs and comments. |
| **Roles** | *Parent* (full access within their household, shared access to family records), *Child* (own tasks, own gear, own schedule), *Caregiver* (scoped, time-limited — grandparent, sitter, step-parent). |

---

## 4. User flows

Notation: `→` is a screen transition, `·` is an action on the current screen. Happy path first, then branches.

### 4.0 Onboarding — establishing two households

```
Sign up (email + password, or passkey)
  → Create family
     · Name the family
     · Name Household A  ← creator's household
     · Name Household B
  → Add children
     · First name + birth year only        [P4: no full legal name, no exact DOB]
  → Choose custody pattern
     · Pick template  →  preview two weeks  →  adjust  →  confirm
     · OR "Skip — I'll set this up later"  (custody-derived features stay disabled)
  → Set default split rule for expenses
     · Even / Percentage / Custody-proportional
  → Invite the other parent
     · Enter email → generates a single-use, 7-day invite link
     · Invitee lands in Household B with EQUAL permissions      [P1]
  → Home
```

> **Branch — invitation declined or never accepted.** The app remains fully functional single-household. All shared-state features (balance, approvals, swap requests) show a persistent but quiet "Not yet shared" state rather than being hidden. Nothing about the product is held hostage to the other parent's cooperation.

### 4.1 Bill entry and settlement

```
Home  →  Money  →  [+ Add expense]
  · Amount                          ← numeric keypad focused on open
  · Category                        ← chips: Activities / School / Medical / Clothing / Other
  · Which child                     ← defaults to "All" if more than one
  · Photo of receipt                ← optional, camera or file
  · Split                           ← pre-filled from family default; tap to override
  · [Save]
     ↓
  Below approval threshold  →  posts immediately  →  balance updates  →  other household sees it in digest
  Above approval threshold  →  state = Pending  →  other household notified
                                   ├─ Approve  →  posts  →  balance updates
                                   ├─ Comment  →  thread opens on the expense, state unchanged
                                   └─ Dispute  →  state = Disputed  →  excluded from balance
                                                   · Both parties record a written position
                                                   · Resolve later by mutual Approve, or Withdraw
```

```
Settling up:
Money  →  balance card  →  [Settle up]
  · Confirm amount (pre-filled with full balance, editable for partial)
  · Date
  · Method                          ← free text; NO payment integration  [§8.4]
  · [Record settlement]
     →  Balance resets to $0
     →  Period archived, remains viewable and exportable
     →  Other household notified once
```

### 4.2 School project scheduling

```
Home  →  Projects  →  [+ New project]
  · Title, child, subject
  · Final due date
  · [Plan backwards]  ← optional
       →  App proposes milestones spaced across available days,
          avoiding transition days and flagging weekends
       →  Every proposed date is editable; nothing commits until confirmed
  · Add supply list items
  · Assign responsibility per milestone
       ├─ Fixed        →  choose person
       ├─ Rotating     →  order the participants
       └─ From custody →  resolved per date from the schedule
  · [Create]
     ↓
  Project detail
     · Milestones in a vertical timeline, each with date + owner + state
     · Warnings surface inline:
          ⚠ "Build model" falls on a transition day
          ⚠ Poster board is at Mom's; this milestone is at Dad's
     · Supply item  →  [Convert to expense]  →  pre-filled expense form  →  §4.1
     · Milestone  →  [Mark done]  →  optional photo  →  rotation advances if rotating
```

### 4.3 Task assignment and "whose turn"

```
Home (the answer, with zero interaction)
  ┌────────────────────────────────────┐
  │ TODAY — Tuesday                    │
  │ Maya is with you                   │
  │                                    │
  │ Yours:   Soccer pickup 5:30        │
  │          Sign permission slip      │
  │ Sam's:   Order team photos         │
  └────────────────────────────────────┘

Creating a recurring task:
Tasks  →  [+ New task]
  · Title
  · Repeat                       ← none / daily / weekly / per occurrence of an event
  · Who is responsible?
       ├─ Always me
       ├─ Always Sam
       ├─ Alternate         →  drag to order participants
       └─ Whoever has Maya  →  resolved nightly from the custody schedule
  · [Create]

Swapping:
Task  →  [Request swap]  →  optional note  →  sent
   ├─ Accepted  →  this occurrence reassigns; the underlying rotation order is untouched
   └─ Declined  →  original owner retains it; logged, no escalation, no notification to anyone else
```

### 4.4 Equipment lookup and handoff

```
Fast path — the whole point of the feature:
Any screen  →  Gear  →  type "cleat"  →
    ┌──────────────────────────────────┐
    │ Soccer cleats · Maya             │
    │ At Dad's                         │
    │ Updated 4 hours ago by Sam       │
    └──────────────────────────────────┘
Two taps and a search. No message sent to anyone.

Updating one item:
Gear  →  item  →  [Update location]  →  pick from six options  →  saved, logged

Bulk move at handoff:
Gear  →  [Moving to Dad's]  →  checklist of everything currently at Mom's
  · Uncheck anything staying behind
  · [Confirm]  →  all checked items relocate in one write

Handoff mode (the pre-transition flow):
Home banner: "Handoff to Dad's in 2 hours — 6 things to pack"  →  [Open checklist]
  →  Full-screen, large-type, one item per row, generated from:
       · items whose home base is the destination household
       · items required by calendar events in the next 3 days
       · supply list items for active project milestones
       · the family's standing pack list
  · Check each item as it goes in the bag  →  its location updates automatically
  · [Done]  →  summary; anything left unchecked stays flagged as still here
```

---

## 5. Data model

### 5.1 Entity relationships

```
Family (1) ──< Household (exactly 2 in the co-parenting configuration)
   │
   ├──< Person ──< Membership >── Household        [a person belongs to 1+ households]
   │       │
   │       └── role: parent | child | caregiver
   │
   ├──< CustodyPeriod  ── child_id, household_id, starts_at, ends_at
   │
   ├──< Expense ──< ExpenseShare >── Household
   │       └──< Comment
   │
   ├──< Settlement
   │
   ├──< Project ──< Milestone
   │       │            └── responsibility (embedded)
   │       └──< SupplyItem ── may reference Item, may generate Expense
   │
   ├──< Task ──< TaskOccurrence
   │       └── responsibility (embedded)
   │
   ├──< Item ──< ItemEvent            [append-only location log]
   │
   ├──< Handoff ──< HandoffChecklistEntry >── Item
   │
   ├──< PackList ──< PackListEntry >── Item
   │
   └──< CalendarEvent
```

### 5.2 Core entities

**Family** — the shared container. One per co-parenting arrangement.
`id` · `name` · `default_split_rule` · `approval_threshold_cents` · `currency` · `timezone` · `created_at`

**Household** — a physical home. Exactly two in the standard configuration; the schema permits more without change.
`id` · `family_id` → Family · `name` · `color_token` · `created_at`

> No street address field. The app has no feature requiring one, and in separated families a stored address is a genuine safety liability. [P4, §8.2]

**Person**
`id` · `family_id` → Family · `display_name` · `role` (`parent` | `child` | `caregiver`) · `birth_year` (nullable, children only) · `email` (nullable — children and caregivers may have none) · `auth_id` (nullable) · `avatar_color_token` · `caregiver_access_expires_at` (nullable) · `created_at`

> `display_name` is a first name or nickname, not a legal name. `birth_year` not full date of birth — sufficient for age-appropriate defaults, insufficient for identity theft.

**Membership** — join table. A child in a co-parenting family has two rows.
`id` · `person_id` → Person · `household_id` → Household · `is_primary_residence` (bool, nullable)

**CustodyPeriod** — the materialized schedule. Generated from a pattern, editable per instance.
`id` · `family_id` · `child_id` → Person · `household_id` → Household · `starts_at` · `ends_at` · `source` (`pattern` | `manual_override`) · `pattern_id` (nullable)

> Materialized rather than computed on read, so that a one-off deviation ("she stays through Tuesday this week") is a single row edit and not a special case threaded through every consuming feature.

**CustodyPattern**
`id` · `family_id` · `child_id` → Person · `template` (`alternating_weeks` | `2_2_3` | `2_2_5_5` | `every_other_weekend` | `custom`) · `rule_json` · `anchor_date` · `active_from` · `active_to` (nullable)

### 5.3 Money entities

**Expense**
`id` · `family_id` · `created_by` → Person · `paid_by_household_id` → Household · `amount_cents` (integer) · `currency` · `category` · `description` · `incurred_on` (date) · `child_ids` (array → Person) · `receipt_media_id` (nullable) · `split_rule` (`even` | `percentage` | `fixed` | `custody_proportional`) · `split_config_json` · `state` (`posted` | `pending_approval` | `disputed` | `void`) · `recurring_template_id` (nullable) · `created_at` · `updated_at`

> Money is **integer cents**, never float. `child_ids` as an array rather than a join table: expenses are read far more than they are queried by child, and the array keeps the hot path to one row.

**ExpenseShare** — the computed obligation, one row per household per expense.
`id` · `expense_id` → Expense · `household_id` → Household · `owed_cents` (integer)

> Shares are **written at post time, not recomputed on read.** A custody-proportional split must reflect the custody schedule as it stood when the expense posted; recomputing later would silently rewrite financial history every time someone corrected a past custody entry. Immutable once posted.

**Settlement**
`id` · `family_id` · `from_household_id` · `to_household_id` · `amount_cents` · `settled_on` (date) · `method_note` (free text) · `recorded_by` → Person · `covers_through` (timestamp) · `created_at`

**RecurringExpenseTemplate**
`id` · `family_id` · `description` · `amount_cents` · `category` · `child_ids` · `split_rule` · `split_config_json` · `cadence` (`monthly` | `weekly` | `termly` | `annual`) · `next_run_on` · `active` (bool)

### 5.4 School entities

**Project**
`id` · `family_id` · `child_id` → Person · `title` · `subject` · `due_on` (date) · `state` (`planned` | `active` | `complete` | `abandoned`) · `created_by` → Person · `created_at`

**Milestone**
`id` · `project_id` → Project · `title` · `due_on` (date) · `sort_order` (int) · `responsibility_mode` (`fixed` | `rotating` | `custody_derived`) · `responsible_person_id` (nullable → Person) · `rotation_order` (nullable, array → Person) · `state` (`pending` | `done` | `skipped`) · `completed_at` · `completed_by` · `evidence_media_id` (nullable)

**SupplyItem**
`id` · `project_id` → Project · `label` · `item_id` (nullable → Item) · `acquired` (bool) · `expense_id` (nullable → Expense)

> The optional `item_id` is the join that makes handoff checklists project-aware: a supply that is also a tracked object flows into the packing flow automatically.

### 5.5 Task entities

**Task** — the recurring definition.
`id` · `family_id` · `title` · `child_id` (nullable → Person) · `repeat_rule` (`none` | `daily` | `weekly` | `event_linked`) · `repeat_config_json` · `linked_event_id` (nullable → CalendarEvent) · `responsibility_mode` (`fixed` | `rotating` | `custody_derived`) · `responsible_person_id` (nullable) · `rotation_order` (nullable, array → Person) · `rotation_cursor` (int, default 0) · `active` (bool) · `created_at`

**TaskOccurrence** — one materialized instance.
`id` · `task_id` → Task · `due_on` (date) · `resolved_responsible_id` → Person · `state` (`pending` | `done` | `skipped` | `swapped`) · `completed_at` · `completed_by` → Person · `swap_id` (nullable → SwapRequest)

> `resolved_responsible_id` is **frozen at materialization**, not resolved at read time. Yesterday's answer to "whose turn was it" must not change because someone edited the custody schedule this morning. Rotation advances on `state = done`, which is why `rotation_cursor` lives on the parent and not in the occurrence.

**SwapRequest**
`id` · `occurrence_id` → TaskOccurrence · `requested_by` → Person · `requested_of` → Person · `note` (nullable) · `state` (`pending` | `accepted` | `declined` | `expired`) · `responded_at`

### 5.6 Equipment entities

**Item**
`id` · `family_id` · `owner_child_id` (nullable → Person) · `name` · `category` (`sports` | `instrument` | `school` | `medical` | `clothing` | `other`) · `photo_media_id` (nullable) · `home_base` (`household:<id>` | `school` | `venue`) · `current_location` (`household:<id>` | `car` | `school` | `venue` | `unknown`) · `location_confirmed_at` (timestamp) · `location_confirmed_by` → Person · `state` (`tracked` | `missing` | `retired`) · `created_at`

> `location_confirmed_at` drives the staleness rendering in P3. It is a distinct field from `updated_at` precisely so that editing an item's name does not make a stale location look fresh.

**ItemEvent** — append-only. Never updated, never deleted while the item lives.
`id` · `item_id` → Item · `from_location` · `to_location` · `changed_by` → Person · `source` (`manual` | `bulk_move` | `handoff_checklist`) · `occurred_at`

**Handoff**
`id` · `family_id` · `child_ids` (array → Person) · `from_household_id` · `to_household_id` · `scheduled_at` · `state` (`upcoming` | `in_progress` | `complete`) · `custody_period_id` (nullable → CustodyPeriod)

**HandoffChecklistEntry**
`id` · `handoff_id` → Handoff · `item_id` (nullable → Item) · `label` (free text, for non-tracked things) · `source` (`home_base` | `calendar_event` | `project_supply` | `pack_list` | `manual`) · `checked` (bool) · `checked_at` · `checked_by`

**PackList** / **PackListEntry** — reusable named lists attachable to recurring events.
`PackList`: `id` · `family_id` · `name` · `linked_event_series_id` (nullable)
`PackListEntry`: `id` · `pack_list_id` · `item_id` (nullable → Item) · `label`

### 5.7 Shared entities

**CalendarEvent**
`id` · `family_id` · `title` · `child_ids` (array) · `starts_at` · `ends_at` · `all_day` (bool) · `location_label` (free text, nullable) · `source` (`internal` | `ics_subscription`) · `external_uid` (nullable) · `pack_list_id` (nullable)

**Comment**
`id` · `family_id` · `subject_type` (`expense` | `project` | `milestone` | `task` | `item`) · `subject_id` · `author_id` → Person · `body` · `created_at` · `edited_at` (nullable)

> Polymorphic by design: comments always attach to a record. There is deliberately no `Conversation` entity, because a general inbox is the feature that turns a coordination tool into a conflict surface.

**Media**
`id` · `family_id` · `storage_key` · `content_type` · `byte_size` · `uploaded_by` · `uploaded_at` · `purpose` (`receipt` | `item_photo` | `milestone_evidence`)

**AuditEntry** — for shared financial and custody records only.
`id` · `family_id` · `actor_id` → Person · `action` · `subject_type` · `subject_id` · `diff_json` · `occurred_at`

> Scoped narrowly on purpose. Auditing everything would turn the product into a surveillance record of one parent by the other, which is exactly the dynamic it exists to defuse. Money and custody changes are auditable because the money and the schedule are genuinely shared; task completion and item moves are not.

### 5.8 Notable modeling decisions

1. **Frozen resolution.** `ExpenseShare.owed_cents` and `TaskOccurrence.resolved_responsible_id` are written once and never recomputed. History is a record, not a projection. This single rule prevents the entire class of bug where correcting today's data silently rewrites last month's answers.
2. **Append-only where trust matters.** `ItemEvent`, `Comment`, and `AuditEntry` never accept destructive edits. If someone is wrong about where the cleats are, the correction is a new row.
3. **No person-location entity anywhere.** Objects have locations. People do not. This is a deliberate structural guarantee, not a policy that could be reversed by a future feature flag.
4. **Two households is a data fact, not a code fact.** Nothing in the schema hardcodes the number two. A third household (a grandparent's, a boarding arrangement) requires configuration, not migration.

---

## 6. UI descriptions

### 6.0 Design system

**Layout.** Single column, maximum content width ~560px, centered on wide screens. Mobile-first; the desktop view is the mobile view with breathing room and an optional persistent sidebar replacing the bottom bar. No multi-column dashboards, no drag-and-drop as a sole interaction, no data tables on mobile.

**Type.** One family, system stack. Four sizes only: 28 / 20 / 16 / 13. Body never below 16px. Numbers in a tabular figure variant so money columns align.

**Color.** Near-neutral base (warm off-white; near-black surface in dark mode). Exactly two household accent tokens, chosen to be distinguishable under the common forms of color blindness and never used as the *only* carrier of meaning. One semantic warning tone. **No third colour.** Household color is the only decorative use of hue in the entire product.

**Controls.** Native inputs wherever they exist. Minimum 44×44px targets. Every destructive action confirms. Every async action shows its state. Every list has a designed empty state that explains what will appear there.

**Motion.** Transitions under 200ms, opacity and small translations only. Nothing bounces, nothing celebrates. Respects `prefers-reduced-motion` absolutely.

**Navigation.** Five destinations, fixed: **Today · Money · School · Tasks · Gear.** Settings lives behind the avatar. There is no sixth destination and no "More" menu.

---

### 6.1 Today (home)

The most important screen. Answers "what do I need to know right now" with no interaction at all.

```
┌──────────────────────────────────────────┐
│  Tuesday, 22 September          ( avatar )│
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │  Maya is with you                   │ │
│  │  through Thursday evening           │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ⚠  Handoff Thursday 6:00pm               │
│     6 things to pack     [ Open list ]    │
│                                           │
│  YOURS TODAY                              │
│  ○  Soccer pickup · 5:30pm                │
│  ○  Sign permission slip                  │
│                                           │
│  SAM'S TODAY                               │
│  ○  Order team photos                     │
│                                           │
│  COMING UP                                │
│  Volcano model — build stage   in 2 days  │
│  ⚠ Poster board is at Sam's               │
│                                           │
│  ─────────────────────────────────────    │
│  Balance      Sam owes you $142.50   →    │
└──────────────────────────────────────────┘
```

**Notes.** The custody card is the first element because it is the question most often asked. "Sam's today" exists for coordination, not oversight — it lists items but offers no nudge, no reminder, no poke affordance. The balance sits at the bottom as a quiet single line; money is never the first thing you see when you open the app.

### 6.2 Money

```
┌──────────────────────────────────────────┐
│  ←  Money                                 │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │        Sam owes you                 │ │
│  │          $142.50                    │ │
│  │   since last settled 12 Aug         │ │
│  │                                     │ │
│  │   [ Settle up ]   [ See breakdown ] │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ⚠  1 expense needs your approval    →    │
│                                           │
│  RECENT                                   │
│  18 Sep  Soccer registration     $180.00  │
│          Sam paid · split evenly          │
│  15 Sep  Winter coat — Maya       $64.99  │
│          You paid · split evenly          │
│  12 Sep  Field trip fee           $25.00  │
│          ⚠ Disputed                       │
│                                           │
│              [  + Add expense  ]          │
└──────────────────────────────────────────┘
```

**Notes.** One number, large, in plain language — never a debit/credit ledger. Direction is stated in words ("Sam owes you"), never conveyed by red/green alone. Disputed items appear in the list but are visually set back and excluded from the total, so the number on screen is always the number that is actually owed.

**Add expense sheet.** Opens as a bottom sheet with the numeric keypad already up and the amount field focused. Category chips, child selector, a camera button for the receipt, and a single collapsed line reading *"Split evenly · tap to change."* One primary button. Target: fifteen seconds, standing in a parking lot.

### 6.3 School

**Project list** — cards grouped by child, each showing title, due date, a segmented progress indicator of milestones, and any active warning.

**Project detail:**

```
┌──────────────────────────────────────────┐
│  ←  Volcano model            Maya · Sci   │
│     Due Friday 3 October                  │
│                                           │
│  ●  Choose topic            done  12 Sep  │
│  │                                        │
│  ●  Buy supplies            done  16 Sep  │
│  │                                        │
│  ○  Build model             due  24 Sep   │
│  │  You  ·  ⚠ handoff day                 │
│  │  ⚠ Poster board is at Sam's            │
│  │                       [ Mark done ]    │
│  │                                        │
│  ○  Practice presentation   due  1 Oct    │
│  │  Sam                                   │
│  │                                        │
│  ○  Present                 due  3 Oct    │
│                                           │
│  SUPPLIES                                 │
│  ✓ Baking soda        ✓ Poster board      │
│  ○ Modelling clay     [ + Add expense ]   │
│                                           │
│              [  Add milestone  ]          │
└──────────────────────────────────────────┘
```

**Notes.** A vertical timeline rather than a checklist, because sequence and remaining runway are the information that matters. Warnings render inline at the milestone they affect — never as a separate alerts screen, which nobody visits. Each milestone shows its owner as a plain name; the three assignment modes are an authoring concept and are invisible at read time.

### 6.4 Tasks

Two sections: **Today** and **This week**, with a segmented control for *Mine · Everyone · Maya's*. Each row is a circle, a title, a time, and an owner's name. Tapping the circle completes. Tapping the row opens detail with the swap request and the completion history.

The task editor is a single scrolling form. The responsibility control is three radio options in plain language — *Always me · Alternate between us · Whoever has Maya* — with the fourth (assign to a specific other person) appearing only in families with a caregiver. The word "rotation" never appears in the UI.

### 6.5 Gear

```
┌──────────────────────────────────────────┐
│  ←  Gear                                  │
│  🔍  Search                                │
│                                           │
│  [ All ]  [ Maya ]  [ Eli ]               │
│                                           │
│  AT YOUR PLACE                       8    │
│  ⚽ Soccer cleats     Maya   · 4h ago     │
│  🎒 School backpack   Maya   · today      │
│  🎺 Trumpet           Eli    · 2d ago     │
│                                           │
│  AT SAM'S                            5    │
│  🥅 Shin guards       Maya   · 3d ago     │
│  📐 Poster board      Maya   · 6d ago     │
│                                           │
│  NEEDS CONFIRMING                    2    │
│  🥽 Swim goggles      Maya                │
│     Last seen at Sam's · 11 days ago      │
│                             [ Confirm ]   │
│                                           │
│     [ Moving to Sam's ]      [ + Item ]   │
└──────────────────────────────────────────┘
```

**Notes.** Grouped by location, because the question is always either *where is X* or *what is here.* The **Needs confirming** group is P3 rendered literally — the app declines to assert a location it cannot vouch for, and asks rather than guesses. Search is the primary path and sits above the fold.

### 6.6 Handoff mode

Full-screen, modal, deliberately spare. Large type, single column, one item per row with a generous tap target across the entire row. A progress count at the top ("3 of 9 packed"). No navigation chrome — the only exits are **Done** and **Close**. Designed to be used one-handed, in a hallway, while a child is putting shoes on.

```
┌──────────────────────────────────────────┐
│  ✕                        Packing for Sam's│
│                                  3 of 9   │
│                                           │
│   ✓   Soccer cleats                       │
│   ✓   Shin guards                         │
│   ✓   Water bottle                        │
│                                           │
│   ○   Poster board                        │
│       for Volcano model                   │
│                                           │
│   ○   Reading log                         │
│       due Monday                          │
│                                           │
│   ○   Trumpet                             │
│       lesson Wednesday                    │
│                                           │
│            [      Done      ]             │
└──────────────────────────────────────────┘
```

Each row carries a one-line reason. "Why is this on the list" should never require a tap.

### 6.7 Child view

A child account opens to a single screen: their tasks today, their gear, and what is coming up. No money anywhere in the interface. No custody schedule presented as a legal arrangement — just "you're at Mom's until Thursday." Larger type, fewer words, streaks permitted here because motivation is the actual goal. A child can update an item's location, which makes them a genuine participant in the system that most affects them.

### 6.8 Settings

A plain grouped list: Family, Households, Children, Custody schedule, Default split rule, Approval threshold, Notifications, Privacy & data, Export, Account. No dashboard, no onboarding checklist, no upsell surfaces.

---

## 7. Technical outline

*Sketched rather than specified, pending the budget placeholder.*

| Layer | Approach |
|---|---|
| Client | React SPA, PWA-installable. Service worker caches the app shell and last-known state. IndexedDB holds the offline queue. This repository's existing Vite + React 19 setup is a viable starting point. |
| State | Server state through a query cache with optimistic updates; minimal global client state. |
| API | REST over HTTPS, JSON. Family-scoped resources. Every endpoint authorizes on family membership before anything else. |
| Data | PostgreSQL. Row-level security keyed on family membership — authorization enforced in the database, not only in application code. |
| Media | Object storage, private buckets, short-lived signed URLs. Never publicly addressable. |
| Auth | Email + passkey preferred, password fallback. Invite links single-use and short-lived. Sessions independently revocable per device. |
| Jobs | Nightly materialization of custody periods and task occurrences; handoff checklist generation N hours ahead; digest assembly. |
| Notifications | Web Push where supported, email fallback. Digest by default. Hard per-user daily cap. |

---

## 8. Privacy and security

This section is a constraint, not a feature list. Where §3 and §8 conflict, §8 wins.

### 8.1 Commitments

1. **No advertising.** No ad SDKs, no ad network scripts, no sponsored placements anywhere in the product.
2. **No data sale, no data sharing for others' purposes.** Family data is never sold, licensed, brokered, or shared with third parties for their own use — including anonymized or aggregated forms, which are reliably re-identifiable in small-household datasets.
3. **No third-party analytics SDKs.** Product analytics are first-party, self-hosted, aggregate-only, and contain no record identifiers. No Google Analytics, no session-replay tooling, no behavioral trackers of any kind.
4. **No model training on family data.** If AI features are ever added, they run on explicitly submitted content only and never contribute to training corpora.

### 8.2 Data minimization

Per P4, every field justifies itself. Fields deliberately **not** collected:

| Not collected | Why |
|---|---|
| Home addresses | No feature requires one. In separated families, a stored address is a safety risk. Handoffs use a free-text label ("school lot"), not a geocoded location. |
| Full legal names of children | Display name plus birth year serves every feature. Legal names raise the breach stakes for nothing. |
| Exact dates of birth | Birth year covers age-appropriate defaults. Full DOB is an identity-theft primitive. |
| Bank details, card numbers, payment credentials | See §8.4. |
| Phone numbers | Notifications go over Web Push and email. No SMS, therefore no phone numbers. |
| Device location / GPS, ever | Items have locations. People do not. There is no location permission request in this product. |
| Contact lists | Invitations are typed by hand. |
| School names and teacher contacts | Projects carry a subject, not an institution. |

### 8.3 The two-household trust model

The hardest privacy problem in this product is not the operator — it is the other parent. Structural protections:

- **Symmetry.** Neither parent has elevated permissions over the other. There is no owner who can remove the other from the family; dissolution requires either mutual action or a support process.
- **No surveillance surfaces.** No read receipts, no last-seen timestamps on people, no "nudge" or "remind them" buttons, no completion-rate comparisons between adults, no notification to parent A when parent B is late. Each of these would be used as a weapon within a month of launch.
- **Bounded shared visibility.** Shared records (expenses, projects, shared tasks, gear, custody) are visible to both. A parent's own private notes, their personal calendar, and their private task list are not.
- **Append-only shared history.** Financial and custody records cannot be silently rewritten. Corrections are new entries with attribution.
- **Clean separation.** Either parent can export their full data and leave. Departure does not delete the other household's records, and does not grant the remaining parent retroactive access to anything that was private.
- **Safety-aware invitations.** Invite links are single-use and expire in seven days. No feature reveals a household's location, IP, or device information to the other household.

### 8.4 Why there is no payment processing

Recording settlements rather than moving money is a deliberate privacy decision with three consequences: no bank or card credentials are ever stored; the product stays entirely out of PCI-DSS scope; and no money-transmission licensing or KYC obligation attaches, which would otherwise require collecting government identification from every user. Families settle through whatever they already use. The app records that it happened.

### 8.5 Children's data

- Child accounts are created by a parent, hold the minimum viable profile, and have no email requirement.
- Children never see financial data.
- No behavioral profiling of children, no engagement optimization on child accounts, no third-party content.
- Designed to sit comfortably inside COPPA and GDPR-K expectations: parental consent by construction, minimal collection, no advertising, full parental access and deletion rights. *[PLACEHOLDER — formal counsel review required before launch in any jurisdiction.]*

### 8.6 Technical security

| Control | Approach |
|---|---|
| Transit | TLS 1.3 minimum, HSTS, secure cookie flags. |
| At rest | Full-disk and column-level encryption for sensitive fields; encrypted object storage for media. |
| Authorization | Row-level security in PostgreSQL keyed on family membership, in addition to application checks. A bug in the API layer alone cannot leak another family's data. |
| Media access | Time-limited signed URLs only. No guessable or permanent public paths. |
| Auth | Passkey-first, password fallback with a modern KDF. Per-device session revocation. Rate limiting on every auth path. |
| Invitations | Single-use, 7-day expiry, revocable, non-enumerable tokens. |
| Backups | Encrypted, tested for restore, retention matched to the deletion policy — a deleted account must not survive in backups beyond the stated window. |
| Dependencies | Automated vulnerability scanning; a deliberately small dependency surface on the client. |
| Logging | Application logs exclude record contents, amounts, names, and media keys. |

### 8.7 Retention, export, deletion

- **Export.** Full family data export as JSON plus CSV, on demand, self-service, no support ticket.
- **Deletion.** Self-service account deletion. Personal data purged within 30 days including backups. Shared financial records retain the fact of a transaction with the departed user's identifiers redacted, because the other household has a legitimate interest in their own settlement history.
- **Retention defaults.** Media auto-expires after a family-configurable window (default 24 months). Comments and logs persist for the life of the family record. Nothing is retained "indefinitely" by default.
- **Breach.** Notification within 72 hours of confirmation, to every affected user, describing what was exposed in plain language.

### 8.8 Transparency

A single Privacy page inside Settings, written at an eighth-grade reading level, stating: what is stored, who can see it, what the other household can see, what is never collected, and how to export or delete. One screen. No layered policy, no legalese as the primary surface.

---

## 9. Open items

### 9.1 Budget-dependent scoping *[PLACEHOLDER]*

Scope guidance, pending the budget input:

- **Lean.** Money + Gear only, two households, no custody engine. Custody-derived assignment and backward planning drop out. The gear and handoff features alone address the stated pain and are the market's clearest gap.
- **Standard.** All four pillars, custody templates, handoff checklists, digest notifications. This is the specification as written.
- **Full.** Adds ICS calendar subscription, caregiver roles, recurring expense templates, budgets, and native wrappers for reliable push.

### 9.2 Decisions still needed

1. Whether a parent can create a project or expense that the other cannot edit, or whether all shared records are mutually editable. (Recommendation: mutually editable, fully audited — asymmetric edit rights recreate the power imbalance the product exists to neutralize.)
2. Whether custody-proportional splitting should use scheduled or actual overnights. (Recommendation: scheduled, with a manual override — actual requires attendance tracking, which is surveillance.)
3. Whether comment threads need an edit window or should be immutable on post.
4. Subscription model: per family or per parent. Per-parent risks one household refusing to pay and degrading shared features for both.
5. Whether v1 ships a single-household mode at all, or holds the line on the co-parenting focus.

### 9.3 Reference applications *[PLACEHOLDER — none supplied]*

---

## 10. Execution checklist

| Requirement | Status |
|---|---|
| All four core functionalities addressed | ✅ §3.1 Money, §3.2 School, §3.3 Turns, §3.4 Gear |
| Feature list complete and concise | ✅ §3, five tables |
| Flow covers bill entry | ✅ §4.1 |
| Flow covers project scheduling | ✅ §4.2 |
| Flow covers task assignment | ✅ §4.3 |
| Flow covers equipment lookup | ✅ §4.4 |
| Data model: users, families, bills, projects, tasks, equipment | ✅ §5 — Person, Family/Household, Expense, Project, Task, Item, plus custody, handoff, and shared entities |
| UI descriptions align with simplicity constraint | ✅ §6 — 5 nav items, single column, 4 type sizes, native controls, no complex interactions |
| Privacy considerations clearly outlined | ✅ §8 |
| No OS or device assumption | ✅ PWA, §1.2 |
| No advertising, no data sale | ✅ §8.1 |
| No complex UI elements | ✅ §6.0 |
| Unnecessary personal data avoided | ✅ §8.2 |
