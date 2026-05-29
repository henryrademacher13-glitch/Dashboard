import { Check } from 'lucide-react';

function getWeekDates(offsetWeeks = 0) {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const todayStr = new Date().toISOString().slice(0, 10);

export default function WeekView({ habits, completions, onToggle, weekOffset = 0 }) {
  const days = getWeekDates(weekOffset);

  return (
    <div className="week-view">
      <div className="week-grid" style={{ gridTemplateColumns: `140px repeat(7, 1fr)` }}>
        <div className="week-cell header-cell" />
        {days.map((d, i) => {
          const ds = d.toISOString().slice(0, 10);
          return (
            <div key={i} className={`week-cell header-cell ${ds === todayStr ? 'today' : ''}`}>
              <span className="day-label">{DAY_LABELS[i]}</span>
              <span className="day-num">{d.getDate()}</span>
            </div>
          );
        })}
        {habits.map(habit => (
          <>
            <div key={habit.id + '_label'} className="week-cell habit-label-cell">
              <span>{habit.emoji}</span>
              <span className="habit-label-text">{habit.name}</span>
            </div>
            {days.map((d, i) => {
              const ds = d.toISOString().slice(0, 10);
              const done = !!completions[`${habit.id}_${ds}`];
              const isFuture = ds > todayStr;
              return (
                <div key={habit.id + '_' + i} className="week-cell check-cell">
                  <button
                    className={`week-check ${done ? 'done' : ''} ${isFuture ? 'future' : ''}`}
                    style={{ '--accent': habit.color }}
                    onClick={() => !isFuture && onToggle(habit.id, ds)}
                    disabled={isFuture}
                    aria-label={`${habit.name} ${ds}`}
                  >
                    {done && <Check size={14} />}
                  </button>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
