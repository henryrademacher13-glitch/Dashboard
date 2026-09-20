// Pure domain logic for the family coordination app.
// Everything here is side-effect free so it can be reasoned about and tested
// independently of React. See docs/family-coordination-app-spec.md §5.

export const UNKNOWN = 'unknown';

/* ---------- dates ---------- */

export function dayKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function addDays(d, n) {
  const x = new Date(d instanceof Date ? d.getTime() : new Date(d).getTime());
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtDate(d, opts = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return new Date(d).toLocaleDateString('en-US', opts);
}

export function fmtShort(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysBetween(a, b) {
  const ms = new Date(dayKey(b)).getTime() - new Date(dayKey(a)).getTime();
  return Math.round(ms / 86400000);
}

export function relativeTime(iso, now = new Date()) {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/* ---------- money ---------- */

export function money(cents) {
  const sign = cents < 0 ? '-' : '';
  const v = Math.abs(cents);
  return `${sign}$${(v / 100).toFixed(2)}`;
}

/* ---------- custody ---------- */

// Which household has this child on a given day. Reads the materialized
// CustodyPeriod rows rather than recomputing the pattern, so a one-off
// override is a single row and not a special case. (§5.8)
export function custodyOn(state, childId, date) {
  const key = dayKey(date);
  const hit = state.custodyPeriods.find(
    (p) => p.childId === childId && key >= p.startsAt && key <= p.endsAt,
  );
  return hit ? hit.householdId : null;
}

export function currentCustody(state, childId, now = new Date()) {
  const key = dayKey(now);
  const period = state.custodyPeriods.find(
    (p) => p.childId === childId && key >= p.startsAt && key <= p.endsAt,
  );
  return period || null;
}

// Share of overnights each household holds across a window. Used by the
// custody-proportional split rule.
export function custodyProportion(state, childIds, fromKey, toKey) {
  const counts = {};
  state.households.forEach((h) => { counts[h.id] = 0; });
  let total = 0;
  state.custodyPeriods.forEach((p) => {
    if (childIds.length && !childIds.includes(p.childId)) return;
    const start = p.startsAt < fromKey ? fromKey : p.startsAt;
    const end = p.endsAt > toKey ? toKey : p.endsAt;
    if (start > end) return;
    const nights = daysBetween(start, end) + 1;
    counts[p.householdId] = (counts[p.householdId] || 0) + nights;
    total += nights;
  });
  if (!total) {
    const even = 1 / state.households.length;
    return Object.fromEntries(state.households.map((h) => [h.id, even]));
  }
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / total]));
}

/* ---------- expense splitting ---------- */

// Computes the per-household obligation. Called ONCE at post time; the result
// is frozen onto the expense as `shares`. Never recomputed on read, so that
// correcting a past custody entry cannot silently rewrite history. (§5.8)
export function computeShares(state, expense) {
  const { amountCents, splitRule, splitConfig = {}, paidByHouseholdId } = expense;
  const households = state.households;
  let weights;

  switch (splitRule) {
    case 'percentage': {
      weights = {};
      households.forEach((h) => {
        weights[h.id] = (splitConfig.percent?.[h.id] ?? 100 / households.length) / 100;
      });
      break;
    }
    case 'custody_proportional': {
      const to = expense.incurredOn;
      const from = dayKey(addDays(new Date(to), -30));
      weights = custodyProportion(state, expense.childIds || [], from, to);
      break;
    }
    case 'fixed': {
      // One household covers a fixed amount; the remainder splits evenly.
      const fixedFor = splitConfig.fixedHouseholdId;
      const fixedCents = Math.min(splitConfig.fixedCents || 0, amountCents);
      const rest = amountCents - fixedCents;
      return allocate(
        households.map((h) => ({
          householdId: h.id,
          exact: (h.id === fixedFor ? fixedCents : 0) + rest / households.length,
        })),
        amountCents,
        paidByHouseholdId,
      );
    }
    case 'even':
    default: {
      weights = {};
      households.forEach((h) => { weights[h.id] = 1 / households.length; });
    }
  }

  return allocate(
    households.map((h) => ({ householdId: h.id, exact: amountCents * (weights[h.id] || 0) })),
    amountCents,
    paidByHouseholdId,
  );
}

// Rounding must never invent or destroy money, and must never round a cent
// UP onto the household that did not pay. Every share floors first, then the
// leftover cents are handed to the payer before anyone else: the payer absorbs
// rounding, which is the only allocation that cannot disadvantage the other
// household.
function allocate(exact, total, paidByHouseholdId) {
  const shares = exact.map((e) => ({ householdId: e.householdId, owedCents: Math.floor(e.exact) }));
  if (!shares.length) return shares;

  // Same object references, payer first.
  const order = [...shares].sort((a, b) => {
    if (a.householdId === paidByHouseholdId) return -1;
    if (b.householdId === paidByHouseholdId) return 1;
    return 0;
  });

  let remainder = total - shares.reduce((a, s) => a + s.owedCents, 0);
  let i = 0;
  while (remainder > 0) { order[i % order.length].owedCents += 1; remainder -= 1; i += 1; }
  while (remainder < 0) { order[i % order.length].owedCents -= 1; remainder += 1; i += 1; }
  return shares;
}

// Net position across all posted expenses and recorded settlements.
// Disputed and pending expenses are excluded, so the number on screen is
// always the number actually owed. (§6.2)
export function balance(state) {
  const [a, b] = state.households;
  if (!a || !b) return { amountCents: 0, fromId: null, toId: null };
  let net = 0; // positive => b owes a

  state.expenses.forEach((e) => {
    if (e.state !== 'posted') return;
    e.shares.forEach((s) => {
      if (s.householdId === e.paidByHouseholdId) return;
      if (s.householdId === b.id && e.paidByHouseholdId === a.id) net += s.owedCents;
      if (s.householdId === a.id && e.paidByHouseholdId === b.id) net -= s.owedCents;
    });
  });

  state.settlements.forEach((s) => {
    if (s.fromHouseholdId === b.id) net -= s.amountCents;
    else net += s.amountCents;
  });

  if (net >= 0) return { amountCents: net, fromId: b.id, toId: a.id };
  return { amountCents: -net, fromId: a.id, toId: b.id };
}

/* ---------- responsibility ---------- */

// The architectural core: every recurring obligation resolves its owner one of
// three ways. This one function serves chores, carpool turns and project
// milestones alike. (§3.3)
export function resolveResponsible(state, def, date, occurrenceIndex = 0) {
  switch (def.responsibilityMode) {
    case 'fixed':
      return def.responsiblePersonId || null;
    case 'rotating': {
      const order = def.rotationOrder || [];
      if (!order.length) return null;
      const cursor = (def.rotationCursor || 0) + occurrenceIndex;
      return order[cursor % order.length];
    }
    case 'custody_derived': {
      const hh = custodyOn(state, def.childId, date);
      if (!hh) return null;
      const parent = state.people.find(
        (p) => p.role === 'parent' && p.householdIds.includes(hh),
      );
      return parent ? parent.id : null;
    }
    default:
      return def.responsiblePersonId || null;
  }
}

/* ---------- equipment ---------- */

// Honest uncertainty (P3): never render a location the app cannot vouch for.
export function staleness(item, now = new Date()) {
  if (!item.locationConfirmedAt) return 'stale';
  const hours = (now.getTime() - new Date(item.locationConfirmedAt).getTime()) / 3600000;
  if (hours < 48) return 'fresh';
  if (hours < 24 * 7) return 'aging';
  return 'stale';
}

export function locationLabel(state, location) {
  if (!location || location === UNKNOWN) return 'Unknown';
  const hh = state.households.find((h) => h.id === location);
  if (hh) return hh.name;
  return { car: 'In the car', school: 'At school', venue: 'At practice' }[location] || location;
}

/* ---------- handoff ---------- */

export function nextHandoff(state, now = new Date()) {
  return (
    state.handoffs
      .filter((h) => h.state !== 'complete' && new Date(h.scheduledAt) >= addDays(now, -1))
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null
  );
}

// Assembles the packing list from four sources, each of which carries a reason
// so the UI never makes the user tap to find out why something is listed. (§6.6)
export function buildChecklist(state, handoff, now = new Date()) {
  if (!handoff) return [];
  const out = new Map();
  const add = (item, source, reason) => {
    if (!item || out.has(item.id)) return;
    out.set(item.id, { itemId: item.id, label: item.name, emoji: item.emoji, source, reason });
  };

  // 1. Items whose home base is the destination but which are sitting here.
  state.items.forEach((it) => {
    if (it.state !== 'tracked') return;
    if (it.homeBase === handoff.toHouseholdId && it.currentLocation === handoff.fromHouseholdId) {
      add(it, 'home_base', `lives at ${locationLabel(state, handoff.toHouseholdId)}`);
    }
  });

  // 2. Items required by calendar events in the next few days.
  const horizon = dayKey(addDays(now, 4));
  state.events.forEach((ev) => {
    const k = dayKey(ev.startsAt);
    if (k < dayKey(now) || k > horizon) return;
    const list = state.packLists.find((p) => p.id === ev.packListId);
    if (!list) return;
    list.itemIds.forEach((id) => {
      const it = state.items.find((i) => i.id === id);
      if (it && it.currentLocation !== handoff.toHouseholdId) {
        add(it, 'calendar_event', `${ev.title} ${fmtShort(ev.startsAt)}`);
      }
    });
  });

  // 3. Supplies for project milestones that are still open.
  state.projects.forEach((pr) => {
    if (pr.state === 'complete') return;
    pr.supplies.forEach((s) => {
      if (!s.itemId || s.acquired === false) return;
      const it = state.items.find((i) => i.id === s.itemId);
      if (it && it.currentLocation !== handoff.toHouseholdId) {
        add(it, 'project_supply', `for ${pr.title}`);
      }
    });
  });

  return [...out.values()];
}

/* ---------- task materialization ---------- */

// Builds the visible occurrence list for a date range. Each occurrence freezes
// its resolved owner, so yesterday's answer to "whose turn was it" cannot
// change because someone edited the schedule this morning. (§5.5)
export function occurrencesFor(state, date) {
  const key = dayKey(date);
  const out = [];
  state.tasks.forEach((t) => {
    if (!t.active) return;
    const existing = state.occurrences.find((o) => o.taskId === t.id && o.dueOn === key);
    if (existing) {
      out.push({ ...existing, task: t });
      return;
    }
    if (!dueOnDay(t, date)) return;
    const idx = Math.max(0, daysBetween(t.anchorDate || key, key));
    out.push({
      id: `${t.id}:${key}`,
      taskId: t.id,
      dueOn: key,
      resolvedResponsibleId: resolveResponsible(state, t, date, t.repeatRule === 'weekly' ? Math.floor(idx / 7) : idx),
      state: 'pending',
      task: t,
      virtual: true,
    });
  });
  return out;
}

function dueOnDay(task, date) {
  if (task.repeatRule === 'daily') return true;
  if (task.repeatRule === 'weekly') return (task.weekdays || []).includes(new Date(date).getDay());
  if (task.repeatRule === 'none') return task.dueOn === dayKey(date);
  return false;
}
