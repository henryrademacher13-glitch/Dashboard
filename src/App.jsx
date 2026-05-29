import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, BarChart2 } from 'lucide-react';
import { useHabitStore } from './store';
import HabitCard from './components/HabitCard';
import WeekView from './components/WeekView';
import StatsPanel from './components/StatsPanel';
import AddHabitModal from './components/AddHabitModal';
import './App.css';

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function App() {
  const [view, setView] = useState('today');
  const [showAdd, setShowAdd] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const store = useHabitStore();

  const today = new Date();
  const completedToday = store.habits.filter(h => store.isComplete(h.id)).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Habit Tracker</h1>
          <span className="today-label">{formatDate(today)}</span>
        </div>
        <div className="header-right">
          <div className="progress-pill">
            {completedToday}/{store.habits.length} today
          </div>
          <button className="add-btn" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Add Habit
          </button>
        </div>
      </header>

      <nav className="tab-nav">
        <button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>
          <LayoutGrid size={15} /> Today
        </button>
        <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>
          <CalendarDays size={15} /> Week
        </button>
        <button className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>
          <BarChart2 size={15} /> Stats
        </button>
      </nav>

      <main className="app-main">
        {view === 'today' && (
          <section>
            {store.habits.length === 0 ? (
              <div className="empty-state">
                <span>No habits yet.</span>
                <button className="primary-btn" onClick={() => setShowAdd(true)}>Add your first habit</button>
              </div>
            ) : (
              <div className="habit-list">
                {store.habits.map(h => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    isComplete={store.isComplete(h.id)}
                    streak={store.getStreak(h.id)}
                    rate={store.getCompletionRate(h.id)}
                    onToggle={store.toggleCompletion}
                    onDelete={store.deleteHabit}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {view === 'week' && (
          <section>
            <div className="week-nav">
              <button className="icon-btn" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft size={18} />
              </button>
              <span>{weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}</span>
              <button className="icon-btn" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>
                <ChevronRight size={18} />
              </button>
            </div>
            <WeekView
              habits={store.habits}
              completions={store.completions}
              onToggle={store.toggleCompletion}
              weekOffset={weekOffset}
            />
          </section>
        )}

        {view === 'stats' && (
          <section>
            <StatsPanel habits={store.habits} getDailyTotals={store.getDailyTotals} />
            <div className="stats-cards">
              {store.habits.map(h => (
                <div key={h.id} className="stat-card" style={{ '--accent': h.color }}>
                  <span className="stat-emoji">{h.emoji}</span>
                  <span className="stat-name">{h.name}</span>
                  <div className="stat-row">
                    <span className="stat-label">30-day rate</span>
                    <span className="stat-value">{store.getCompletionRate(h.id)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${store.getCompletionRate(h.id)}%` }} />
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Streak</span>
                    <span className="stat-value">{store.getStreak(h.id)}d 🔥</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {showAdd && <AddHabitModal onAdd={store.addHabit} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
