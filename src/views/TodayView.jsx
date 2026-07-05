import { useState } from 'react';
import { Plus, ArrowRight, Timer, CalendarDays, StickyNote, CheckSquare } from 'lucide-react';
import { useStore, todayStr, tasksDueOn, eventsOn, overdueTasks, focusMinutesOn, sessionsOn, formatTime } from '../store';
import TaskItem from '../components/TaskItem';

export default function TodayView({ navigate }) {
  const { state, dispatch } = useStore();
  const [quick, setQuick] = useState('');

  const today = todayStr();
  const dueToday = tasksDueOn(state, today);
  const overdue = overdueTasks(state);
  const todayList = [...overdue, ...dueToday.filter(t => !overdue.includes(t))];
  const events = eventsOn(state, today);
  const focusMin = focusMinutesOn(state, today);
  const sessions = sessionsOn(state, today);
  const recentNotes = [...state.notes].sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt)).slice(0, 4);
  const doneToday = dueToday.filter(t => t.done).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const quickAdd = (e) => {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    dispatch({ type: 'task/add', title, dueDate: today });
    setQuick('');
  };

  return (
    <div className="view today-view">
      <header className="view-header">
        <h1>{greeting}</h1>
        <p className="view-sub">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <div className="stat-row">
        <div className="stat-tile">
          <CheckSquare size={17} />
          <span className="stat-num" data-testid="stat-tasks">{doneToday}/{dueToday.length}</span>
          <span className="stat-label">tasks due today</span>
        </div>
        <div className="stat-tile">
          <CalendarDays size={17} />
          <span className="stat-num" data-testid="stat-events">{events.length}</span>
          <span className="stat-label">events today</span>
        </div>
        <div className="stat-tile">
          <Timer size={17} />
          <span className="stat-num" data-testid="stat-focus">{focusMin}m</span>
          <span className="stat-label">focused · {sessions.length} session{sessions.length === 1 ? '' : 's'}</span>
        </div>
        <div className="stat-tile">
          <StickyNote size={17} />
          <span className="stat-num" data-testid="stat-notes">{state.notes.length}</span>
          <span className="stat-label">notes</span>
        </div>
      </div>

      <div className="today-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Today's tasks {overdue.length > 0 && <span className="overdue-badge">{overdue.length} overdue</span>}</h2>
            <button className="ghost-btn sm" onClick={() => navigate('tasks')}>All tasks <ArrowRight size={13} /></button>
          </div>
          <form className="quick-add" onSubmit={quickAdd}>
            <input
              placeholder="Quick add for today…"
              value={quick}
              onChange={e => setQuick(e.target.value)}
              data-testid="quick-add-input"
            />
            <button className="primary-btn sm" type="submit" data-testid="quick-add-btn"><Plus size={14} /></button>
          </form>
          {todayList.length === 0 ? (
            <p className="muted">Nothing due today. Enjoy the calm — or plan ahead on the calendar.</p>
          ) : (
            <div className="task-list" data-testid="today-task-list">
              {todayList.map(t => <TaskItem key={t.id} task={t} navigate={navigate} />)}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Schedule</h2>
            <button className="ghost-btn sm" onClick={() => navigate('calendar')}>Calendar <ArrowRight size={13} /></button>
          </div>
          {events.length === 0 ? (
            <p className="muted">No events today.</p>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="event-row" style={{ '--c': ev.color }}>
                <span className="event-time">{ev.start ? formatTime(ev.start) : 'All day'}</span>
                <span className="event-title">{ev.title}</span>
              </div>
            ))
          )}

          <div className="panel-head" style={{ marginTop: '1.2rem' }}>
            <h2>Notes</h2>
            <button className="ghost-btn sm" onClick={() => navigate('notes')}>All notes <ArrowRight size={13} /></button>
          </div>
          {recentNotes.length === 0 ? (
            <p className="muted">No notes yet.</p>
          ) : (
            recentNotes.map(n => (
              <button key={n.id} className="note-row" onClick={() => navigate('notes', { noteId: n.id })}>
                <StickyNote size={14} />
                <span className="note-row-title">{n.title || 'Untitled'}</span>
                <span className="note-row-preview">{n.body.slice(0, 40)}</span>
              </button>
            ))
          )}

          <button className="focus-cta" onClick={() => navigate('focus')} data-testid="focus-cta">
            <Timer size={16} />
            {state.timer ? 'Timer running — jump back in' : 'Start a focus session'}
            <ArrowRight size={14} />
          </button>
        </section>
      </div>
    </div>
  );
}
