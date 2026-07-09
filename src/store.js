import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'scalia_dashboard_v1';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
// Seeded PRNG — ad metrics are generated deterministically per client so the
// demo data is stable across reloads without storing thousands of rows.
// ---------------------------------------------------------------------------

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEFAULT_CLIENTS = [
  { id: 'c1', name: 'Meridian Wellness', contact: 'Dana Okafor', email: 'dana@meridianwellness.com', status: 'active', monthlyBudget: 4500, addedAt: '2026-02-10' },
  { id: 'c2', name: 'Copperline Coffee Co.', contact: 'Marco Reyes', email: 'marco@copperlinecoffee.com', status: 'active', monthlyBudget: 2800, addedAt: '2026-03-02' },
  { id: 'c3', name: 'Nimbus Skincare', contact: 'Priya Shah', email: 'priya@nimbusskin.com', status: 'paused', monthlyBudget: 2400, addedAt: '2026-03-27' },
  { id: 'c4', name: 'Harbor Dental Group', contact: 'Tom Ellison', email: 'tom@harbordental.com', status: 'active', monthlyBudget: 3200, addedAt: '2026-05-11' },
  { id: 'c5', name: 'Atlas Fitness Studios', contact: 'Jess Whitfield', email: 'jess@atlasfit.com', status: 'active', monthlyBudget: 6000, addedAt: '2026-04-18' },
  { id: 'c6', name: 'Bloom & Vine Florals', contact: 'Sofia Marchetti', email: 'sofia@bloomandvine.com', status: 'onboarding', monthlyBudget: 1800, addedAt: '2026-06-21' },
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
// Generated Meta ads metrics
// ---------------------------------------------------------------------------

const CAMPAIGN_NAMES = [
  'Prospecting — Broad',
  'Retargeting — Site Visitors',
  'Lookalike 1% — Purchasers',
  'Advantage+ Shopping',
];

// Daily metrics for the past `days` days. Paused clients flatline after a cutoff.
export function getDailyAdMetrics(client, days = 30) {
  const rand = mulberry32(hashCode(client.id + client.name));
  const cpm = 8 + rand() * 10; // $ per 1000 impressions
  const ctr = 0.009 + rand() * 0.012; // click-through rate
  const cvr = 0.02 + rand() * 0.04; // conversion rate
  const aov = 45 + rand() * 120; // average order value
  const baseDaily = client.monthlyBudget / 30;

  const rows = [];
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const dow = d.getDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.75 : 1;
    const paused = client.status === 'paused' && i > days * 0.4;
    const noise = 0.7 + rand() * 0.6;
    const spend = paused ? 0 : baseDaily * weekendDip * noise;
    const impressions = Math.round((spend / cpm) * 1000);
    const clicks = Math.round(impressions * ctr * (0.85 + rand() * 0.3));
    const conversions = Math.round(clicks * cvr * (0.8 + rand() * 0.4));
    const revenue = conversions * aov * (0.85 + rand() * 0.3);
    rows.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      conversions,
      revenue: Math.round(revenue * 100) / 100,
    });
    d.setDate(d.getDate() + 1);
  }
  return rows;
}

// Campaign-level breakdown consistent with the daily totals for the same window.
export function getCampaignBreakdown(client, days = 30) {
  const rand = mulberry32(hashCode(client.id + 'campaigns'));
  const count = 3 + Math.floor(rand() * 2);
  const shares = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const s = 0.5 + rand();
    shares.push(s);
    total += s;
  }
  const daily = getDailyAdMetrics(client, days);
  const sum = (key) => daily.reduce((a, r) => a + r[key], 0);
  const totals = {
    spend: sum('spend'),
    impressions: sum('impressions'),
    clicks: sum('clicks'),
    conversions: sum('conversions'),
    revenue: sum('revenue'),
  };
  // Campaigns earn clicks and conversions at different rates; weights are
  // normalized so the breakdown reconciles with the period totals above it.
  const weighted = shares.map((s, i) => ({
    name: CAMPAIGN_NAMES[i],
    share: s / total,
    clickW: (s / total) * (0.75 + rand() * 0.5),
    convW: (s / total) * (0.75 + rand() * 0.5) * (0.8 + rand() * 0.4),
  }));
  const clickSum = weighted.reduce((a, w) => a + w.clickW, 0);
  const convSum = weighted.reduce((a, w) => a + w.convW, 0);
  return weighted.map((w) => ({
    name: w.name,
    spend: totals.spend * w.share,
    impressions: Math.round(totals.impressions * w.share),
    clicks: Math.round(totals.clicks * (w.clickW / clickSum)),
    conversions: Math.round(totals.conversions * (w.convW / convSum)),
    revenue: totals.revenue * (w.convW / convSum),
  }));
}

export function sumMetrics(rows) {
  const t = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
  rows.forEach((r) => {
    t.spend += r.spend;
    t.impressions += r.impressions;
    t.clicks += r.clicks;
    t.conversions += r.conversions;
    t.revenue += r.revenue;
  });
  t.ctr = t.impressions ? (t.clicks / t.impressions) * 100 : 0;
  t.cpc = t.clicks ? t.spend / t.clicks : 0;
  t.roas = t.spend ? t.revenue / t.spend : 0;
  return t;
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
      monthlyBudget: 0,
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

  return {
    clients: state.clients,
    meetings: state.meetings,
    clientGrowth,
    addClient,
    updateClientStatus,
    deleteClient,
    addMeeting,
    toggleMeetingDone,
    deleteMeeting,
  };
}
