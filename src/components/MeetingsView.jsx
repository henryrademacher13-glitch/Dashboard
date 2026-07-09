import { CalendarDays, Check, Trash2, Plus } from 'lucide-react';

const TYPE_LABELS = {
  kickoff: 'Kickoff',
  review: 'Performance review',
  strategy: 'Strategy',
  'check-in': 'Check-in',
};

function dayHeading(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const formatted = new Date(dateStr + 'T00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  if (dateStr === today) return `Today — ${formatted}`;
  if (dateStr === tomorrow) return `Tomorrow — ${formatted}`;
  return formatted;
}

export default function MeetingsView({ store, onAddMeeting }) {
  const { meetings, clients } = store;
  const clientName = (id) => clients.find((c) => c.id === id)?.name ?? 'Unknown client';
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = meetings
    .filter((m) => m.date >= today && !m.done)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = meetings
    .filter((m) => m.date < today || m.done)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const byDay = upcoming.reduce((acc, m) => {
    (acc[m.date] = acc[m.date] || []).push(m);
    return acc;
  }, {});

  const row = (m, isPast) => (
    <li key={m.id} className={`meeting-row ${isPast ? 'past' : ''}`}>
      <span className="meeting-time">{m.time}</span>
      <div className="meeting-body">
        <span className="meeting-title">{m.title}</span>
        <span className="meeting-sub">
          {clientName(m.clientId)} · {TYPE_LABELS[m.type] ?? m.type} · {m.duration} min
        </span>
      </div>
      <div className="meeting-actions">
        <button
          className={`icon-btn ${m.done ? 'done' : ''}`}
          aria-label={m.done ? 'Mark as not done' : 'Mark as done'}
          title={m.done ? 'Mark as not done' : 'Mark as done'}
          onClick={() => store.toggleMeetingDone(m.id)}
        >
          <Check size={15} />
        </button>
        <button
          className="icon-btn danger"
          aria-label="Delete meeting"
          title="Delete meeting"
          onClick={() => store.deleteMeeting(m.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );

  return (
    <div className="meetings-view">
      {upcoming.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={22} />
          <span>No upcoming meetings.</span>
          <button className="primary-btn" onClick={onAddMeeting}>
            <Plus size={16} /> Schedule a meeting
          </button>
        </div>
      ) : (
        Object.entries(byDay).map(([date, list]) => (
          <div key={date} className="card meeting-day">
            <h2 className="card-title">{dayHeading(date)}</h2>
            <ul className="meeting-list">{list.map((m) => row(m, false))}</ul>
          </div>
        ))
      )}

      {past.length > 0 && (
        <details className="card past-meetings">
          <summary>Past &amp; completed ({past.length})</summary>
          <ul className="meeting-list">{past.slice(0, 12).map((m) => row(m, true))}</ul>
        </details>
      )}
    </div>
  );
}
