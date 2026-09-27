import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Calendar, StickyNote, Timer, LayoutDashboard, Play } from 'lucide-react';
import StoreProvider from './StoreProvider';
import { useStore, timerRemaining } from './store';
import TodayView from './views/TodayView';
import TasksView from './views/TasksView';
import CalendarView from './views/CalendarView';
import NotesView from './views/NotesView';
import FocusView from './views/FocusView';
import './App.css';

const NAV = [
  { id: 'today', label: 'Today', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'focus', label: 'Focus', icon: Timer },
];

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Shell() {
  const { state, dispatch } = useStore();
  const [route, setRoute] = useState({ view: 'today' });
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);

  const navigate = useCallback((view, params = {}) => setRoute({ view, ...params }), []);

  // Global timer heartbeat: ticks every second while a timer runs, completes it
  // from any view, and mirrors the countdown into the document title.
  const timer = state.timer;
  useEffect(() => {
    if (!timer) {
      document.title = 'Momentum';
      return;
    }
    const id = setInterval(() => {
      const remaining = timerRemaining(timer);
      setTick(t => t + 1);
      if (!timer.pausedAt) {
        document.title = `${fmtClock(remaining)} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} — Momentum`;
      }
      if (remaining <= 0 && !timer.pausedAt) {
        dispatch({ type: 'timer/complete' });
        setToast(timer.mode === 'focus' ? 'Focus session complete — nice work! 🎉' : 'Break over — ready for another round?');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timer, dispatch]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const remaining = timerRemaining(timer);
  const timerTask = timer?.taskId ? state.tasks.find(t => t.id === timer.taskId) : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <span className="brand-name">Momentum</span>
        </div>
        <nav className="side-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={route.view === id ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate(id)}
              data-nav={id}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === 'tasks' && state.tasks.filter(t => !t.done).length > 0 && (
                <span className="nav-badge">{state.tasks.filter(t => !t.done).length}</span>
              )}
            </button>
          ))}
        </nav>
        {timer && route.view !== 'focus' && (
          <button className="timer-pill" onClick={() => navigate('focus')} data-testid="timer-pill">
            <Play size={13} />
            <span className="timer-pill-time">{fmtClock(remaining)}</span>
            <span className="timer-pill-label">{timerTask ? timerTask.title : timer.mode === 'focus' ? 'Focusing' : 'Break'}</span>
          </button>
        )}
      </aside>

      <main className="content" data-tick={tick}>
        {route.view === 'today' && <TodayView navigate={navigate} />}
        {route.view === 'tasks' && <TasksView navigate={navigate} />}
        {route.view === 'calendar' && <CalendarView navigate={navigate} initialDate={route.date} />}
        {route.view === 'notes' && <NotesView navigate={navigate} initialNoteId={route.noteId} />}
        {route.view === 'focus' && <FocusView initialTaskId={route.taskId} />}
      </main>

      {toast && (
        <div className="toast" data-testid="toast" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
