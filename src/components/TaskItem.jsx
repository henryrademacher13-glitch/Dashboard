import { Timer, StickyNote, Trash2, CalendarDays } from 'lucide-react';
import { useStore, formatDateLabel, todayStr, noteForTask, taskFocusMinutes, uid } from '../store';

const PRIORITY_LABEL = { high: 'High', medium: 'Med', low: 'Low' };

export default function TaskItem({ task, navigate, showDue = true }) {
  const { state, dispatch } = useStore();
  const linkedNote = noteForTask(state, task.id);
  const focusMin = taskFocusMinutes(state, task.id);
  const overdue = !task.done && task.dueDate && task.dueDate < todayStr();

  const openNote = () => {
    if (linkedNote) {
      navigate('notes', { noteId: linkedNote.id });
    } else {
      const id = uid();
      dispatch({ type: 'note/add', id, title: task.title, body: '', taskId: task.id });
      navigate('notes', { noteId: id });
    }
  };

  return (
    <div className={`task-item ${task.done ? 'done' : ''}`} data-testid="task-item">
      <label className="task-check">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => dispatch({ type: 'task/toggle', id: task.id })}
        />
        <span className="checkmark" />
      </label>
      <div className="task-body">
        <span className="task-title">{task.title}</span>
        <div className="task-meta">
          <span className={`priority-dot p-${task.priority}`} title={`${PRIORITY_LABEL[task.priority]} priority`} />
          {showDue && task.dueDate && (
            <button
              className={`due-chip ${overdue ? 'overdue' : ''}`}
              onClick={() => navigate('calendar', { date: task.dueDate })}
              title="Show on calendar"
            >
              <CalendarDays size={12} /> {formatDateLabel(task.dueDate)}
            </button>
          )}
          {focusMin > 0 && <span className="focus-chip"><Timer size={12} /> {focusMin}m focused</span>}
          {linkedNote && (
            <button className="note-chip" onClick={openNote} title="Open linked note">
              <StickyNote size={12} /> note
            </button>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button
          className="icon-btn"
          title="Start focus session"
          onClick={() => navigate('focus', { taskId: task.id })}
        >
          <Timer size={16} />
        </button>
        <button className="icon-btn" title={linkedNote ? 'Open note' : 'Add note'} onClick={openNote}>
          <StickyNote size={16} />
        </button>
        <button
          className="icon-btn danger"
          title="Delete task"
          onClick={() => dispatch({ type: 'task/delete', id: task.id })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
