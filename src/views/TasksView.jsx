import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore, todayStr } from '../store';
import TaskItem from '../components/TaskItem';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
];

export default function TasksView({ navigate }) {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('active');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');

  const today = todayStr();

  const addTask = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    dispatch({ type: 'task/add', title: trimmed, dueDate: dueDate || null, priority });
    setTitle('');
    setDueDate('');
    setPriority('medium');
  };

  const filtered = state.tasks.filter(t => {
    switch (filter) {
      case 'active': return !t.done;
      case 'today': return t.dueDate && t.dueDate <= today && !t.done;
      case 'upcoming': return !t.done && t.dueDate && t.dueDate > today;
      case 'done': return t.done;
      default: return true;
    }
  });

  const order = { high: 0, medium: 1, low: 2 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ad = a.dueDate || '9999';
    const bd = b.dueDate || '9999';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="view">
      <header className="view-header">
        <h1>Tasks</h1>
        <p className="view-sub">{state.tasks.filter(t => !t.done).length} open · {state.tasks.filter(t => t.done).length} done</p>
      </header>

      <form className="add-task-form" onSubmit={addTask}>
        <input
          className="add-task-input"
          placeholder="Add a task…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          data-testid="task-input"
        />
        <input
          type="date"
          className="add-task-date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          title="Due date"
          data-testid="task-due"
        />
        <select
          className="add-task-priority"
          value={priority}
          onChange={e => setPriority(e.target.value)}
          title="Priority"
          data-testid="task-priority"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button className="primary-btn" type="submit" data-testid="task-add">
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={filter === f.id ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          {state.tasks.length === 0 ? 'No tasks yet — add your first one above.' : 'Nothing here.'}
        </div>
      ) : (
        <div className="task-list" data-testid="task-list">
          {sorted.map(t => (
            <TaskItem key={t.id} task={t} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
