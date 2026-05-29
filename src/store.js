import { useState, useCallback } from 'react';

const STORAGE_KEY = 'habit_dashboard_v1';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const DEFAULT_HABITS = [
  { id: '1', name: 'Exercise', emoji: '🏃', color: '#6366f1', createdAt: '2026-05-01' },
  { id: '2', name: 'Read', emoji: '📚', color: '#10b981', createdAt: '2026-05-01' },
  { id: '3', name: 'Meditate', emoji: '🧘', color: '#f59e0b', createdAt: '2026-05-01' },
  { id: '4', name: 'Drink water', emoji: '💧', color: '#3b82f6', createdAt: '2026-05-01' },
];

// Pre-populate some sample completions for the demo
function generateSampleCompletions(habits) {
  const completions = {};
  const now = new Date();
  habits.forEach(h => {
    for (let d = 1; d <= 28; d++) {
      const date = new Date(2026, 4, d); // May 2026
      if (date <= now && Math.random() > 0.3) {
        const key = `${h.id}_${date.toISOString().slice(0, 10)}`;
        completions[key] = true;
      }
    }
  });
  return completions;
}

export function useHabitStore() {
  const [state, setState] = useState(() => {
    const saved = loadState();
    if (saved) return saved;
    const habits = DEFAULT_HABITS;
    return { habits, completions: generateSampleCompletions(habits) };
  });

  const persist = useCallback((next) => {
    setState(next);
    saveState(next);
  }, []);

  const toggleCompletion = useCallback((habitId, date = today()) => {
    setState(s => {
      const key = `${habitId}_${date}`;
      const next = {
        ...s,
        completions: { ...s.completions, [key]: !s.completions[key] },
      };
      if (!next.completions[key]) delete next.completions[key];
      saveState(next);
      return next;
    });
  }, []);

  const addHabit = useCallback((name, emoji, color) => {
    const habit = {
      id: Date.now().toString(),
      name,
      emoji,
      color,
      createdAt: today(),
    };
    setState(s => {
      const next = { ...s, habits: [...s.habits, habit] };
      saveState(next);
      return next;
    });
  }, []);

  const deleteHabit = useCallback((id) => {
    setState(s => {
      const completions = { ...s.completions };
      Object.keys(completions).forEach(k => {
        if (k.startsWith(id + '_')) delete completions[k];
      });
      const next = { ...s, habits: s.habits.filter(h => h.id !== id), completions };
      saveState(next);
      return next;
    });
  }, []);

  const isComplete = useCallback((habitId, date = today()) => {
    return !!state.completions[`${habitId}_${date}`];
  }, [state.completions]);

  const getStreak = useCallback((habitId) => {
    let streak = 0;
    const d = new Date();
    // If not done today, start counting from yesterday
    if (!state.completions[`${habitId}_${d.toISOString().slice(0, 10)}`]) {
      d.setDate(d.getDate() - 1);
    }
    while (state.completions[`${habitId}_${d.toISOString().slice(0, 10)}`]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [state.completions]);

  const getCompletionRate = useCallback((habitId, days = 30) => {
    let completed = 0;
    const d = new Date();
    const habit = state.habits.find(h => h.id === habitId);
    for (let i = 0; i < days; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      if (new Date(dateStr) >= new Date(habit?.createdAt || '2000-01-01')) {
        if (state.completions[`${habitId}_${dateStr}`]) completed++;
      }
      d.setDate(d.getDate() - 1);
    }
    return Math.round((completed / days) * 100);
  }, [state.completions, state.habits]);

  // Returns array of {date, count} for past N days
  const getDailyTotals = useCallback((days = 14) => {
    const result = [];
    const d = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - i);
      const dateStr = nd.toISOString().slice(0, 10);
      const count = state.habits.filter(h => state.completions[`${h.id}_${dateStr}`]).length;
      result.push({ date: dateStr, count, label: nd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return result;
  }, [state]);

  return {
    habits: state.habits,
    completions: state.completions,
    toggleCompletion,
    addHabit,
    deleteHabit,
    isComplete,
    getStreak,
    getCompletionRate,
    getDailyTotals,
  };
}
