import { useState } from 'react';
import { Play, Pause, Square, Check, Coffee } from 'lucide-react';
import { useStore, timerRemaining, todayStr, sessionsOn, taskById } from '../store';

const PRESETS = [15, 25, 50];

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FocusView({ initialTaskId }) {
  const { state, dispatch } = useStore();
  const [minutes, setMinutes] = useState(25);
  const [taskId, setTaskId] = useState(initialTaskId || '');

  const timer = state.timer;
  const remaining = timerRemaining(timer);
  const openTasks = state.tasks.filter(t => !t.done);
  const activeTask = timer?.taskId ? taskById(state, timer.taskId) : null;
  const todaySessions = sessionsOn(state, todayStr()).slice().reverse();
  const todayMinutes = todaySessions.reduce((s, x) => s + x.minutes, 0);

  const progress = timer ? 1 - remaining / timer.duration : 0;
  const R = 118;
  const CIRC = 2 * Math.PI * R;

  const start = (mode = 'focus', mins = minutes) => {
    dispatch({ type: 'timer/start', taskId: mode === 'focus' ? (taskId || null) : null, mode, duration: mins * 60 });
  };

  return (
    <div className="view focus-view">
      <header className="view-header">
        <h1>Focus</h1>
        <p className="view-sub" data-testid="focus-today-total">
          {todaySessions.length} session{todaySessions.length === 1 ? '' : 's'} today · {todayMinutes} min focused
        </p>
      </header>

      <div className="focus-layout">
        <div className="focus-main">
          <div className={`timer-ring ${timer ? (timer.mode === 'break' ? 'break' : 'running') : ''}`}>
            <svg viewBox="0 0 260 260" width="260" height="260">
              <circle cx="130" cy="130" r={R} className="ring-track" />
              <circle
                cx="130" cy="130" r={R}
                className="ring-fill"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * progress}
                transform="rotate(-90 130 130)"
              />
            </svg>
            <div className="timer-center">
              <span className="timer-clock" data-testid="timer-clock">
                {timer ? fmtClock(remaining) : fmtClock(minutes * 60)}
              </span>
              <span className="timer-state">
                {!timer ? 'ready' : timer.pausedAt ? 'paused' : timer.mode === 'break' ? 'break' : 'focusing'}
              </span>
              {activeTask && <span className="timer-task" data-testid="timer-task">{activeTask.title}</span>}
            </div>
          </div>

          {!timer ? (
            <>
              <div className="preset-row">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    className={minutes === p ? 'preset active' : 'preset'}
                    onClick={() => setMinutes(p)}
                  >
                    {p} min
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="180"
                  className="preset-custom"
                  value={minutes}
                  onChange={e => setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                  data-testid="focus-minutes"
                  title="Custom minutes"
                />
              </div>
              <div className="focus-task-pick">
                <label>Working on</label>
                <select value={taskId} onChange={e => setTaskId(e.target.value)} data-testid="focus-task-select">
                  <option value="">Nothing specific</option>
                  {openTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div className="focus-controls">
                <button className="primary-btn lg" onClick={() => start('focus')} data-testid="focus-start">
                  <Play size={18} /> Start focus
                </button>
                <button className="ghost-btn" onClick={() => start('break', 5)} data-testid="break-start">
                  <Coffee size={16} /> 5 min break
                </button>
              </div>
            </>
          ) : (
            <div className="focus-controls">
              {timer.pausedAt ? (
                <button className="primary-btn lg" onClick={() => dispatch({ type: 'timer/resume' })} data-testid="focus-resume">
                  <Play size={18} /> Resume
                </button>
              ) : (
                <button className="primary-btn lg" onClick={() => dispatch({ type: 'timer/pause' })} data-testid="focus-pause">
                  <Pause size={18} /> Pause
                </button>
              )}
              {timer.mode === 'focus' && (
                <button className="ghost-btn" onClick={() => dispatch({ type: 'timer/complete' })} data-testid="focus-finish" title="Log the time so far and stop">
                  <Check size={16} /> Finish early
                </button>
              )}
              <button className="ghost-btn danger" onClick={() => dispatch({ type: 'timer/cancel' })} data-testid="focus-cancel" title="Stop without logging">
                <Square size={15} /> Cancel
              </button>
            </div>
          )}
        </div>

        <aside className="focus-side">
          <h3>Today's sessions</h3>
          {todaySessions.length === 0 && <p className="muted">No sessions yet today. Start one!</p>}
          <div className="session-list" data-testid="session-list">
            {todaySessions.map(s => {
              const t = s.taskId ? taskById(state, s.taskId) : null;
              return (
                <div key={s.id} className="session-row" data-testid="session-row">
                  <span className="session-min">{s.minutes}m</span>
                  <span className="session-task">{t ? t.title : 'Unassigned'}</span>
                  <span className="session-time">
                    {new Date(s.endedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
