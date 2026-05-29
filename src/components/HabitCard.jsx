import { Check, Flame, Trash2 } from 'lucide-react';

export default function HabitCard({ habit, isComplete, streak, rate, onToggle, onDelete }) {
  return (
    <div className="habit-card" style={{ '--accent': habit.color }}>
      <div className="habit-card-header">
        <span className="habit-emoji">{habit.emoji}</span>
        <div className="habit-info">
          <span className="habit-name">{habit.name}</span>
          <div className="habit-meta">
            <span className="streak">
              <Flame size={13} />
              {streak}d streak
            </span>
            <span className="rate">{rate}%</span>
          </div>
        </div>
        <div className="habit-actions">
          <button
            className={`check-btn ${isComplete ? 'checked' : ''}`}
            onClick={() => onToggle(habit.id)}
            aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
          >
            <Check size={18} />
          </button>
          <button className="delete-btn" onClick={() => onDelete(habit.id)} aria-label="Delete habit">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
