import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'productivity_app_v1';

// ---------- date helpers (local timezone, not UTC) ----------

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayStr();
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: y !== new Date().getFullYear() ? 'numeric' : undefined });
}

export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------- state ----------

const initialState = {
  tasks: [],     // {id, title, dueDate, priority, done, createdAt, completedAt}
  events: [],    // {id, title, date, start, end, taskId, color}
  notes: [],     // {id, title, body, taskId, pinned, createdAt, updatedAt}
  sessions: [],  // {id, taskId, minutes, startedAt, endedAt}
  timer: null,   // {taskId, mode:'focus'|'break', duration(sec), startedAt(ms), pausedAt(ms)|null}
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState, ...JSON.parse(raw) };
  } catch { /* corrupted storage — start fresh */ }
  return initialState;
}

export function reducer(state, action) {
  switch (action.type) {
    // ----- tasks -----
    case 'task/add': {
      const { title, dueDate = null, priority = 'medium' } = action;
      const task = { id: uid(), title, dueDate, priority, done: false, createdAt: Date.now(), completedAt: null };
      return { ...state, tasks: [task, ...state.tasks] };
    }
    case 'task/toggle':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.id ? { ...t, done: !t.done, completedAt: t.done ? null : Date.now() } : t
        ),
      };
    case 'task/update':
      return {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case 'task/delete':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.id),
        // unlink rather than cascade-delete: notes and sessions keep their own value
        notes: state.notes.map(n => (n.taskId === action.id ? { ...n, taskId: null } : n)),
        events: state.events.map(e => (e.taskId === action.id ? { ...e, taskId: null } : e)),
        sessions: state.sessions.map(s => (s.taskId === action.id ? { ...s, taskId: null } : s)),
        timer: state.timer?.taskId === action.id ? { ...state.timer, taskId: null } : state.timer,
      };

    // ----- events -----
    case 'event/add': {
      const { title, date, start = null, end = null, taskId = null, color = '#6366f1' } = action;
      const event = { id: uid(), title, date, start, end, taskId, color };
      return { ...state, events: [...state.events, event] };
    }
    case 'event/update':
      return {
        ...state,
        events: state.events.map(e => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };
    case 'event/delete':
      return { ...state, events: state.events.filter(e => e.id !== action.id) };

    // ----- notes -----
    case 'note/add': {
      const { title = 'Untitled note', body = '', taskId = null } = action;
      const note = { id: action.id || uid(), title, body, taskId, pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
      return { ...state, notes: [note, ...state.notes] };
    }
    case 'note/update':
      return {
        ...state,
        notes: state.notes.map(n => (n.id === action.id ? { ...n, ...action.patch, updatedAt: Date.now() } : n)),
      };
    case 'note/delete':
      return { ...state, notes: state.notes.filter(n => n.id !== action.id) };

    // ----- focus timer -----
    case 'timer/start':
      return {
        ...state,
        timer: {
          taskId: action.taskId ?? null,
          mode: action.mode || 'focus',
          duration: action.duration,
          startedAt: Date.now(),
          pausedAt: null,
        },
      };
    case 'timer/pause':
      if (!state.timer || state.timer.pausedAt) return state;
      return { ...state, timer: { ...state.timer, pausedAt: Date.now() } };
    case 'timer/resume': {
      if (!state.timer || !state.timer.pausedAt) return state;
      const pausedFor = Date.now() - state.timer.pausedAt;
      return { ...state, timer: { ...state.timer, startedAt: state.timer.startedAt + pausedFor, pausedAt: null } };
    }
    case 'timer/cancel':
      return { ...state, timer: null };
    case 'timer/complete': {
      // logs the session (focus mode only) and clears the timer
      if (!state.timer) return state;
      const { timer } = state;
      const elapsedMs = (timer.pausedAt ?? Date.now()) - timer.startedAt;
      const minutes = Math.max(1, Math.round(Math.min(elapsedMs / 60000, timer.duration / 60)));
      const sessions =
        timer.mode === 'focus'
          ? [...state.sessions, { id: uid(), taskId: timer.taskId, minutes, startedAt: timer.startedAt, endedAt: Date.now() }]
          : state.sessions;
      return { ...state, sessions, timer: null };
    }

    default:
      return state;
  }
}

// ---------- selectors ----------

export function timerRemaining(timer, now = Date.now()) {
  if (!timer) return 0;
  const elapsed = ((timer.pausedAt ?? now) - timer.startedAt) / 1000;
  return Math.max(0, Math.round(timer.duration - elapsed));
}

export function tasksDueOn(state, dateStr) {
  return state.tasks.filter(t => t.dueDate === dateStr);
}

export function eventsOn(state, dateStr) {
  return state.events
    .filter(e => e.date === dateStr)
    .sort((a, b) => (a.start || '99') < (b.start || '99') ? -1 : 1);
}

export function sessionsOn(state, dateStr) {
  return state.sessions.filter(s => toDateStr(new Date(s.startedAt)) === dateStr);
}

export function focusMinutesOn(state, dateStr) {
  return sessionsOn(state, dateStr).reduce((sum, s) => sum + s.minutes, 0);
}

export function taskFocusMinutes(state, taskId) {
  return state.sessions.filter(s => s.taskId === taskId).reduce((sum, s) => sum + s.minutes, 0);
}

export function noteForTask(state, taskId) {
  return state.notes.find(n => n.taskId === taskId) || null;
}

export function taskById(state, id) {
  return state.tasks.find(t => t.id === id) || null;
}

export function overdueTasks(state) {
  const today = todayStr();
  return state.tasks.filter(t => !t.done && t.dueDate && t.dueDate < today);
}

// ---------- context ----------

export const StoreContext = createContext(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
