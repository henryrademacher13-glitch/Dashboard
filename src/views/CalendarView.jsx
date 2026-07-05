import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Timer } from 'lucide-react';
import { useStore, toDateStr, todayStr, tasksDueOn, eventsOn, sessionsOn, formatTime, formatDateLabel } from '../store';
import TaskItem from '../components/TaskItem';

const EVENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

function monthGrid(year, month) {
  // weeks starting Monday
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const weeks = [];
  const d = new Date(start);
  do {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  } while (d.getMonth() === month);
  return weeks;
}

export default function CalendarView({ navigate, initialDate }) {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState(initialDate || todayStr());
  const [cursor, setCursor] = useState(() => {
    const [y, m] = (initialDate || todayStr()).split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [evTitle, setEvTitle] = useState('');
  const [evStart, setEvStart] = useState('');
  const [evEnd, setEvEnd] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  const today = todayStr();
  const weeks = monthGrid(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const move = (delta) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const addEvent = (e) => {
    e.preventDefault();
    const title = evTitle.trim();
    if (!title) return;
    const color = EVENT_COLORS[state.events.length % EVENT_COLORS.length];
    dispatch({ type: 'event/add', title, date: selected, start: evStart || null, end: evEnd || null, color });
    setEvTitle('');
    setEvStart('');
    setEvEnd('');
  };

  const addTask = (e) => {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    dispatch({ type: 'task/add', title, dueDate: selected });
    setTaskTitle('');
  };

  const dayEvents = eventsOn(state, selected);
  const dayTasks = tasksDueOn(state, selected);
  const daySessions = sessionsOn(state, selected);
  const dayFocusMin = daySessions.reduce((s, x) => s + x.minutes, 0);

  return (
    <div className="view calendar-view">
      <header className="view-header">
        <h1>Calendar</h1>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <span className="cal-month" data-testid="cal-month">{monthLabel}</span>
          <button className="icon-btn" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          <button className="ghost-btn" onClick={() => { setSelected(today); const [y, m] = today.split('-').map(Number); setCursor({ year: y, month: m - 1 }); }}>
            Today
          </button>
        </div>
      </header>

      <div className="calendar-layout">
        <div className="cal-grid-wrap">
          <div className="cal-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="cal-grid" data-testid="cal-grid">
            {weeks.flat().map(d => {
              const ds = toDateStr(d);
              const inMonth = d.getMonth() === cursor.month;
              const evs = eventsOn(state, ds);
              const tasks = tasksDueOn(state, ds);
              const openTasks = tasks.filter(t => !t.done);
              const focusMin = sessionsOn(state, ds).reduce((s, x) => s + x.minutes, 0);
              return (
                <button
                  key={ds}
                  data-date={ds}
                  className={[
                    'cal-cell',
                    inMonth ? '' : 'out',
                    ds === today ? 'is-today' : '',
                    ds === selected ? 'is-selected' : '',
                  ].join(' ')}
                  onClick={() => setSelected(ds)}
                >
                  <span className="cal-daynum">{d.getDate()}</span>
                  <span className="cal-cell-items">
                    {evs.slice(0, 2).map(ev => (
                      <span key={ev.id} className="cal-ev" style={{ '--c': ev.color }}>{ev.title}</span>
                    ))}
                    {openTasks.length > 0 && (
                      <span className="cal-task-count">☐ {openTasks.length} task{openTasks.length > 1 ? 's' : ''}</span>
                    )}
                    {evs.length > 2 && <span className="cal-more">+{evs.length - 2} more</span>}
                  </span>
                  {focusMin > 0 && <span className="cal-focus-dot" title={`${focusMin}m focused`} />}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="day-panel" data-testid="day-panel">
          <h2>{formatDateLabel(selected)}</h2>
          <p className="day-panel-date">{new Date(selected + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          <section>
            <h3>Events</h3>
            {dayEvents.length === 0 && <p className="muted">No events.</p>}
            {dayEvents.map(ev => (
              <div key={ev.id} className="event-row" style={{ '--c': ev.color }} data-testid="event-row">
                <span className="event-time">
                  {ev.start ? formatTime(ev.start) : 'All day'}{ev.end ? ` – ${formatTime(ev.end)}` : ''}
                </span>
                <span className="event-title">{ev.title}</span>
                <button className="icon-btn danger" onClick={() => dispatch({ type: 'event/delete', id: ev.id })} title="Delete event">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <form className="mini-form" onSubmit={addEvent}>
              <input placeholder="New event…" value={evTitle} onChange={e => setEvTitle(e.target.value)} data-testid="event-input" />
              <div className="mini-form-row">
                <input type="time" value={evStart} onChange={e => setEvStart(e.target.value)} data-testid="event-start" />
                <input type="time" value={evEnd} onChange={e => setEvEnd(e.target.value)} data-testid="event-end" />
                <button className="primary-btn sm" type="submit" data-testid="event-add"><Plus size={14} /> Add</button>
              </div>
            </form>
          </section>

          <section>
            <h3>Tasks due</h3>
            {dayTasks.length === 0 && <p className="muted">No tasks due.</p>}
            <div className="task-list compact">
              {dayTasks.map(t => <TaskItem key={t.id} task={t} navigate={navigate} showDue={false} />)}
            </div>
            <form className="mini-form" onSubmit={addTask}>
              <div className="mini-form-row">
                <input placeholder="Add task for this day…" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} data-testid="day-task-input" />
                <button className="primary-btn sm" type="submit" data-testid="day-task-add"><Plus size={14} /></button>
              </div>
            </form>
          </section>

          {daySessions.length > 0 && (
            <section>
              <h3><Timer size={14} /> Focus</h3>
              <p className="muted">{daySessions.length} session{daySessions.length > 1 ? 's' : ''} · {dayFocusMin} min</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
