// Smoke tests for the family coordination domain logic.
// Run with: npm test
import assert from 'node:assert/strict';
import { buildSeed } from '../src/family/seed.js';
import {
  balance, computeShares, custodyOn, resolveResponsible, staleness,
  buildChecklist, occurrencesFor, money, dayKey, addDays,
} from '../src/family/model.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

const now = new Date();
const s = buildSeed(now);

console.log('\nsplitting');
test('even split never invents or loses a cent', () => {
  const e = { amountCents: 6499, splitRule: 'even', paidByHouseholdId: 'hh_a', childIds: [], incurredOn: dayKey(now) };
  const shares = computeShares(s, e);
  assert.equal(shares.reduce((a, x) => a + x.owedCents, 0), 6499);
});

test('odd-cent residual lands on the household that paid', () => {
  const e = { amountCents: 101, splitRule: 'even', paidByHouseholdId: 'hh_b', childIds: [], incurredOn: dayKey(now) };
  const shares = computeShares(s, e);
  assert.equal(shares.find((x) => x.householdId === 'hh_b').owedCents, 51);
  assert.equal(shares.reduce((a, x) => a + x.owedCents, 0), 101);
});

test('custody-proportional split sums to the total', () => {
  const e = { amountCents: 33333, splitRule: 'custody_proportional', paidByHouseholdId: 'hh_a', childIds: ['c_maya'], incurredOn: dayKey(now) };
  assert.equal(computeShares(s, e).reduce((a, x) => a + x.owedCents, 0), 33333);
});

test('fixed split covers the fixed portion then splits the rest', () => {
  const e = {
    amountCents: 10000, splitRule: 'fixed', paidByHouseholdId: 'hh_a', childIds: [], incurredOn: dayKey(now),
    splitConfig: { fixedHouseholdId: 'hh_b', fixedCents: 4000 },
  };
  const shares = computeShares(s, e);
  assert.equal(shares.find((x) => x.householdId === 'hh_b').owedCents, 7000);
  assert.equal(shares.reduce((a, x) => a + x.owedCents, 0), 10000);
});

console.log('\nbalance');
test('disputed and pending expenses stay out of the balance', () => {
  const withOnlyPosted = { ...s, expenses: s.expenses.filter((e) => e.state === 'posted') };
  assert.equal(balance(s).amountCents, balance(withOnlyPosted).amountCents);
});

test('balance names a direction', () => {
  const b = balance(s);
  assert.ok(b.fromId && b.toId && b.fromId !== b.toId, 'balance should identify both sides');
  assert.match(money(b.amountCents), /^\$\d/);
});

console.log('\nresponsibility');
test('fixed mode returns the named person', () => {
  assert.equal(resolveResponsible(s, { responsibilityMode: 'fixed', responsiblePersonId: 'p_co' }, now), 'p_co');
});

test('rotating mode alternates across occurrences', () => {
  const def = { responsibilityMode: 'rotating', rotationOrder: ['p_me', 'p_co'], rotationCursor: 0 };
  assert.equal(resolveResponsible(s, def, now, 0), 'p_me');
  assert.equal(resolveResponsible(s, def, now, 1), 'p_co');
  assert.equal(resolveResponsible(s, def, now, 2), 'p_me');
});

test('custody-derived mode follows the schedule', () => {
  const def = { responsibilityMode: 'custody_derived', childId: 'c_maya' };
  const hhNow = custodyOn(s, 'c_maya', now);
  const owner = resolveResponsible(s, def, now);
  const parent = s.people.find((p) => p.id === owner);
  assert.ok(parent.householdIds.includes(hhNow), 'owner must live in the custodial household');
});

test('custody-derived owner flips with the schedule a week later', () => {
  const def = { responsibilityMode: 'custody_derived', childId: 'c_maya' };
  const a = resolveResponsible(s, def, now);
  const b = resolveResponsible(s, def, addDays(now, 7));
  assert.notEqual(a, b, 'alternating weeks should hand over');
});

test('occurrences freeze their resolved owner', () => {
  const occ = occurrencesFor(s, now);
  assert.ok(occ.length > 0);
  occ.forEach((o) => assert.ok('resolvedResponsibleId' in o));
});

console.log('\nequipment');
test('staleness buckets on confirmation age, not edit time', () => {
  const t = (h) => staleness({ locationConfirmedAt: new Date(now.getTime() - h * 3600000).toISOString() }, now);
  assert.equal(t(4), 'fresh');
  assert.equal(t(72), 'aging');
  assert.equal(t(24 * 9), 'stale');
  assert.equal(staleness({ locationConfirmedAt: null }, now), 'stale');
});

test('checklist only lists things not already at the destination', () => {
  const h = s.handoffs[0];
  const list = buildChecklist(s, h, now);
  list.forEach((c) => {
    const item = s.items.find((i) => i.id === c.itemId);
    assert.notEqual(item.currentLocation, h.toHouseholdId, `${item.name} is already there`);
  });
});

test('every checklist row carries a reason', () => {
  buildChecklist(s, s.handoffs[0], now).forEach((c) => {
    assert.ok(c.reason && c.reason.length > 0, `${c.label} has no reason`);
  });
});

test('checklist deduplicates items reachable from several sources', () => {
  const list = buildChecklist(s, s.handoffs[0], now);
  assert.equal(new Set(list.map((c) => c.itemId)).size, list.length);
});

console.log(`\n${passed} passed${process.exitCode ? ' — with failures' : ''}\n`);
