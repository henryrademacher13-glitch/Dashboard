import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'scalia_dashboard_v1';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      // Migrate pre-revenue-tracking state: monthlyBudget (ad spend) → monthlyFee (what the client pays us)
      state.clients = state.clients.map(({ monthlyBudget, ...c }) => ({
        monthlyFee: c.monthlyFee ?? monthlyBudget ?? 0,
        ...c,
      }));
      return state;
    }
  } catch {
    /* corrupted storage — fall back to seed data */
  }
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEFAULT_CLIENTS = [
  { id: 'c1', name: 'Meridian Wellness', contact: 'Dana Okafor', email: 'dana@meridianwellness.com', status: 'active', monthlyFee: 4500, addedAt: '2026-02-10' },
  { id: 'c2', name: 'Copperline Coffee Co.', contact: 'Marco Reyes', email: 'marco@copperlinecoffee.com', status: 'active', monthlyFee: 2800, addedAt: '2026-03-02' },
  { id: 'c3', name: 'Nimbus Skincare', contact: 'Priya Shah', email: 'priya@nimbusskin.com', status: 'paused', monthlyFee: 2400, addedAt: '2026-03-27' },
  { id: 'c4', name: 'Harbor Dental Group', contact: 'Tom Ellison', email: 'tom@harbordental.com', status: 'active', monthlyFee: 3200, addedAt: '2026-05-11' },
  { id: 'c5', name: 'Atlas Fitness Studios', contact: 'Jess Whitfield', email: 'jess@atlasfit.com', status: 'active', monthlyFee: 6000, addedAt: '2026-04-18' },
  { id: 'c6', name: 'Bloom & Vine Florals', contact: 'Sofia Marchetti', email: 'sofia@bloomandvine.com', status: 'onboarding', monthlyFee: 1800, addedAt: '2026-06-21' },
];

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultMeetings() {
  return [
    { id: 'm1', clientId: 'c6', title: 'Onboarding kickoff', type: 'kickoff', date: dateOffset(1), time: '10:00', duration: 60, done: false },
    { id: 'm2', clientId: 'c5', title: 'June performance review', type: 'review', date: dateOffset(1), time: '14:30', duration: 45, done: false },
    { id: 'm3', clientId: 'c1', title: 'Q3 creative strategy', type: 'strategy', date: dateOffset(2), time: '11:00', duration: 60, done: false },
    { id: 'm4', clientId: 'c2', title: 'Weekly check-in', type: 'check-in', date: dateOffset(4), time: '09:30', duration: 30, done: false },
    { id: 'm5', clientId: 'c4', title: 'New campaign launch review', type: 'review', date: dateOffset(7), time: '15:00', duration: 45, done: false },
    { id: 'm6', clientId: 'c1', title: 'Weekly check-in', type: 'check-in', date: dateOffset(-2), time: '09:30', duration: 30, done: true },
  ];
}

// ---------------------------------------------------------------------------
// Revenue helpers
// ---------------------------------------------------------------------------

// Paused clients aren't billed; active and onboarding clients are.
export function isPaying(client) {
  return client.status !== 'paused' && client.monthlyFee > 0;
}

// Whole months a client has been billed, counting the signup month.
export function monthsBilled(client) {
  const start = new Date(client.addedAt + 'T00:00');
  const now = new Date();
  return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export function useScaliaStore() {
  const [state, setState] = useState(() => {
    const saved = loadState();
    if (saved) return saved;
    return { clients: DEFAULT_CLIENTS, meetings: defaultMeetings() };
  });

  const addClient = useCallback((fields) => {
    const client = {
      id: 'c' + Date.now().toString(36),
      status: 'onboarding',
      monthlyFee: 0,
      ...fields,
      addedAt: todayISO(),
    };
    setState((s) => {
      const next = { ...s, clients: [...s.clients, client] };
      saveState(next);
      return next;
    });
    return client;
  }, []);

  const updateClientStatus = useCallback((id, status) => {
    setState((s) => {
      const next = { ...s, clients: s.clients.map((c) => (c.id === id ? { ...c, status } : c)) };
      saveState(next);
      return next;
    });
  }, []);

  const updateClientFee = useCallback((id, monthlyFee) => {
    setState((s) => {
      const next = { ...s, clients: s.clients.map((c) => (c.id === id ? { ...c, monthlyFee } : c)) };
      saveState(next);
      return next;
    });
  }, []);

  const deleteClient = useCallback((id) => {
    setState((s) => {
      const next = {
        ...s,
        clients: s.clients.filter((c) => c.id !== id),
        meetings: s.meetings.filter((m) => m.clientId !== id),
      };
      saveState(next);
      return next;
    });
  }, []);

  const addMeeting = useCallback((fields) => {
    const meeting = { id: 'm' + Date.now().toString(36), done: false, ...fields };
    setState((s) => {
      const next = { ...s, meetings: [...s.meetings, meeting] };
      saveState(next);
      return next;
    });
  }, []);

  const toggleMeetingDone = useCallback((id) => {
    setState((s) => {
      const next = { ...s, meetings: s.meetings.map((m) => (m.id === id ? { ...m, done: !m.done } : m)) };
      saveState(next);
      return next;
    });
  }, []);

  const deleteMeeting = useCallback((id) => {
    setState((s) => {
      const next = { ...s, meetings: s.meetings.filter((m) => m.id !== id) };
      saveState(next);
      return next;
    });
  }, []);

  // Cumulative client count by month, from the first signup through now.
  const clientGrowth = useMemo(() => {
    if (state.clients.length === 0) return [];
    const dates = state.clients.map((c) => c.addedAt).sort();
    const start = new Date(dates[0].slice(0, 7) + '-01');
    const now = new Date();
    const points = [];
    const d = new Date(start);
    while (d <= now) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      points.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: state.clients.filter((c) => c.addedAt <= monthEnd).length,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return points;
  }, [state.clients]);

  // Monthly recurring revenue by month, based on each client's current fee
  // and status, from the first signup through now.
  const mrrGrowth = useMemo(() => {
    const paying = state.clients.filter(isPaying);
    if (paying.length === 0) return [];
    const dates = paying.map((c) => c.addedAt).sort();
    const start = new Date(dates[0].slice(0, 7) + '-01');
    const now = new Date();
    const points = [];
    const d = new Date(start);
    while (d <= now) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      points.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        mrr: paying.filter((c) => c.addedAt <= monthEnd).reduce((a, c) => a + c.monthlyFee, 0),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return points;
  }, [state.clients]);

  return {
    clients: state.clients,
    meetings: state.meetings,
    clientGrowth,
    mrrGrowth,
    addClient,
    updateClientStatus,
    updateClientFee,
    deleteClient,
    addMeeting,
    toggleMeetingDone,
    deleteMeeting,
  };
}
