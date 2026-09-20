import { useState, useCallback, useMemo } from 'react';
import { buildSeed } from './seed.js';
import { computeShares, dayKey } from './model.js';

const STORAGE_KEY = 'family_coord_v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch { /* fall through to a fresh seed */ }
  return buildSeed(new Date());
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage unavailable; app still works in memory */ }
}

const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function useStore() {
  const [state, setState] = useState(load);

  const update = useCallback((fn) => {
    setState((prev) => {
      const next = fn(structuredClone(prev));
      persist(next);
      return next;
    });
  }, []);

  const me = useMemo(
    () => state.people.find((p) => p.id === state.currentUserId),
    [state.people, state.currentUserId],
  );
  const myHousehold = me?.householdIds[0];

  const actions = useMemo(() => ({
    /* ---- money ---- */
    addExpense(draft) {
      update((s) => {
        const expense = {
          id: uid('e'),
          createdBy: s.currentUserId,
          paidByHouseholdId: draft.paidByHouseholdId || myHousehold,
          amountCents: draft.amountCents,
          category: draft.category,
          description: draft.description,
          incurredOn: draft.incurredOn || dayKey(new Date()),
          childIds: draft.childIds || [],
          splitRule: draft.splitRule || s.family.defaultSplitRule,
          splitConfig: draft.splitConfig || {},
          state: 'posted',
        };
        // Shares are computed once, here, and frozen onto the record. (§5.8)
        expense.shares = computeShares(s, expense);
        if (expense.amountCents > s.family.approvalThresholdCents) {
          expense.state = 'pending_approval';
        }
        s.expenses.unshift(expense);
        return s;
      });
    },
    approveExpense(id) {
      update((s) => {
        const e = s.expenses.find((x) => x.id === id);
        if (e) e.state = 'posted';
        return s;
      });
    },
    disputeExpense(id, note) {
      update((s) => {
        const e = s.expenses.find((x) => x.id === id);
        if (e) { e.state = 'disputed'; e.disputeNote = note; }
        return s;
      });
    },
    resolveDispute(id) {
      update((s) => {
        const e = s.expenses.find((x) => x.id === id);
        if (e) { e.state = 'posted'; delete e.disputeNote; }
        return s;
      });
    },
    settleUp(amountCents, methodNote, fromId, toId) {
      update((s) => {
        s.settlements.unshift({
          id: uid('s'),
          fromHouseholdId: fromId,
          toHouseholdId: toId,
          amountCents,
          settledOn: dayKey(new Date()),
          methodNote,
          recordedBy: s.currentUserId,
        });
        return s;
      });
    },

    /* ---- school ---- */
    addProject(draft) {
      update((s) => {
        s.projects.unshift({
          id: uid('pr'),
          childId: draft.childId,
          title: draft.title,
          subject: draft.subject,
          dueOn: draft.dueOn,
          state: 'active',
          milestones: draft.milestones || [],
          supplies: [],
        });
        return s;
      });
    },
    toggleMilestone(projectId, milestoneId) {
      update((s) => {
        const pr = s.projects.find((p) => p.id === projectId);
        const m = pr?.milestones.find((x) => x.id === milestoneId);
        if (!m) return s;
        if (m.state === 'done') {
          m.state = 'pending';
          delete m.completedAt;
          delete m.completedBy;
        } else {
          m.state = 'done';
          m.completedAt = new Date().toISOString();
          m.completedBy = s.currentUserId;
        }
        if (pr.milestones.every((x) => x.state === 'done')) pr.state = 'complete';
        else if (pr.state === 'complete') pr.state = 'active';
        return s;
      });
    },
    toggleSupply(projectId, supplyId) {
      update((s) => {
        const sp = s.projects.find((p) => p.id === projectId)?.supplies.find((x) => x.id === supplyId);
        if (sp) sp.acquired = !sp.acquired;
        return s;
      });
    },

    /* ---- tasks ---- */
    // Materializes a virtual occurrence on first interaction, freezing its
    // resolved owner so history cannot be rewritten by later schedule edits.
    completeOccurrence(occ) {
      update((s) => {
        const existing = s.occurrences.find((o) => o.taskId === occ.taskId && o.dueOn === occ.dueOn);
        if (existing) {
          existing.state = existing.state === 'done' ? 'pending' : 'done';
          existing.completedAt = existing.state === 'done' ? new Date().toISOString() : null;
        } else {
          s.occurrences.push({
            id: uid('o'),
            taskId: occ.taskId,
            dueOn: occ.dueOn,
            resolvedResponsibleId: occ.resolvedResponsibleId,
            state: 'done',
            completedAt: new Date().toISOString(),
            completedBy: s.currentUserId,
          });
          // Rotations advance on completion, not on the calendar, so a skipped
          // week does not silently reassign forever. (§3.3)
          const t = s.tasks.find((x) => x.id === occ.taskId);
          if (t?.responsibilityMode === 'rotating') {
            t.rotationCursor = ((t.rotationCursor || 0) + 1) % (t.rotationOrder?.length || 1);
          }
        }
        return s;
      });
    },
    addTask(draft) {
      update((s) => {
        s.tasks.push({
          id: uid('t'),
          title: draft.title,
          childId: draft.childId || null,
          repeatRule: draft.repeatRule || 'none',
          weekdays: draft.weekdays || [],
          dueOn: draft.dueOn || dayKey(new Date()),
          responsibilityMode: draft.responsibilityMode || 'fixed',
          responsiblePersonId: draft.responsiblePersonId || s.currentUserId,
          rotationOrder: draft.rotationOrder || [],
          rotationCursor: 0,
          anchorDate: dayKey(new Date()),
          active: true,
        });
        return s;
      });
    },
    requestSwap(occ) {
      update((s) => {
        s.swaps.push({
          id: uid('sw'),
          taskId: occ.taskId,
          dueOn: occ.dueOn,
          requestedBy: s.currentUserId,
          state: 'pending',
        });
        return s;
      });
    },

    /* ---- gear ---- */
    moveItem(itemId, location) {
      update((s) => {
        const it = s.items.find((i) => i.id === itemId);
        if (!it) return s;
        s.itemEvents.push({
          id: uid('ie'),
          itemId,
          fromLocation: it.currentLocation,
          toLocation: location,
          changedBy: s.currentUserId,
          source: 'manual',
          occurredAt: new Date().toISOString(),
        });
        it.currentLocation = location;
        it.locationConfirmedAt = new Date().toISOString();
        it.locationConfirmedBy = s.currentUserId;
        it.state = 'tracked';
        return s;
      });
    },
    confirmItem(itemId) {
      update((s) => {
        const it = s.items.find((i) => i.id === itemId);
        if (it) {
          it.locationConfirmedAt = new Date().toISOString();
          it.locationConfirmedBy = s.currentUserId;
        }
        return s;
      });
    },
    markMissing(itemId) {
      update((s) => {
        const it = s.items.find((i) => i.id === itemId);
        if (it) it.state = it.state === 'missing' ? 'tracked' : 'missing';
        return s;
      });
    },
    addItem(draft) {
      update((s) => {
        s.items.push({
          id: uid('i'),
          name: draft.name,
          emoji: draft.emoji || '📦',
          ownerChildId: draft.ownerChildId || null,
          category: draft.category || 'other',
          homeBase: draft.homeBase || myHousehold,
          currentLocation: draft.currentLocation || myHousehold,
          locationConfirmedAt: new Date().toISOString(),
          locationConfirmedBy: s.currentUserId,
          state: 'tracked',
        });
        return s;
      });
    },
    bulkMove(itemIds, location) {
      update((s) => {
        const at = new Date().toISOString();
        itemIds.forEach((id) => {
          const it = s.items.find((i) => i.id === id);
          if (!it) return;
          s.itemEvents.push({
            id: uid('ie'), itemId: id, fromLocation: it.currentLocation,
            toLocation: location, changedBy: s.currentUserId, source: 'bulk_move', occurredAt: at,
          });
          it.currentLocation = location;
          it.locationConfirmedAt = at;
          it.locationConfirmedBy = s.currentUserId;
        });
        return s;
      });
    },

    /* ---- handoff ---- */
    toggleChecklistItem(handoffId, itemId, location) {
      update((s) => {
        const h = s.handoffs.find((x) => x.id === handoffId);
        if (!h) return s;
        h.checked = h.checked || {};
        const nowChecked = !h.checked[itemId];
        h.checked[itemId] = nowChecked;
        // Checking an item off physically moves it. (§3.4)
        const it = s.items.find((i) => i.id === itemId);
        if (it && nowChecked) {
          s.itemEvents.push({
            id: uid('ie'), itemId, fromLocation: it.currentLocation, toLocation: location,
            changedBy: s.currentUserId, source: 'handoff_checklist', occurredAt: new Date().toISOString(),
          });
          it.currentLocation = location;
          it.locationConfirmedAt = new Date().toISOString();
          it.locationConfirmedBy = s.currentUserId;
        }
        return s;
      });
    },
    completeHandoff(handoffId) {
      update((s) => {
        const h = s.handoffs.find((x) => x.id === handoffId);
        if (h) h.state = 'complete';
        return s;
      });
    },

    /* ---- misc ---- */
    switchUser(personId) {
      update((s) => { s.currentUserId = personId; return s; });
    },
    reset() {
      const fresh = buildSeed(new Date());
      persist(fresh);
      setState(fresh);
    },
  }), [update, myHousehold]);

  return { state, me, myHousehold, ...actions };
}

export function personName(state, id) {
  if (!id) return 'Unassigned';
  const p = state.people.find((x) => x.id === id);
  if (!p) return 'Unassigned';
  return p.id === state.currentUserId ? 'You' : p.displayName;
}

export function householdName(state, id) {
  return state.households.find((h) => h.id === id)?.name || 'Unknown';
}
