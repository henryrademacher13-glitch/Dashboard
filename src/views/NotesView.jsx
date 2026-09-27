import { useState, useMemo } from 'react';
import { Plus, Pin, Trash2, Link2, CheckSquare } from 'lucide-react';
import { useStore, uid, taskById } from '../store';

function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotesView({ navigate, initialNoteId }) {
  const { state, dispatch } = useStore();
  const [selectedId, setSelectedId] = useState(initialNoteId || state.notes[0]?.id || null);
  const [search, setSearch] = useState('');

  const note = state.notes.find(n => n.id === selectedId) || null;
  const linkedTask = note?.taskId ? taskById(state, note.taskId) : null;

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.notes]
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  }, [state.notes, search]);

  const createNote = () => {
    const id = uid();
    dispatch({ type: 'note/add', id, title: 'Untitled note' });
    setSelectedId(id);
  };

  const deleteNote = (id) => {
    dispatch({ type: 'note/delete', id });
    if (selectedId === id) {
      const rest = state.notes.filter(n => n.id !== id);
      setSelectedId(rest[0]?.id || null);
    }
  };

  return (
    <div className="view notes-view">
      <aside className="notes-sidebar">
        <div className="notes-sidebar-head">
          <input
            className="notes-search"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="notes-search"
          />
          <button className="primary-btn sm" onClick={createNote} data-testid="note-new" title="New note">
            <Plus size={15} />
          </button>
        </div>
        <div className="notes-list" data-testid="notes-list">
          {sorted.length === 0 && <p className="muted pad">No notes{search ? ' match' : ' yet'}.</p>}
          {sorted.map(n => (
            <button
              key={n.id}
              className={n.id === selectedId ? 'note-card active' : 'note-card'}
              onClick={() => setSelectedId(n.id)}
            >
              <span className="note-card-title">
                {n.pinned && <Pin size={12} className="pin-icon" />}
                {n.title || 'Untitled'}
              </span>
              <span className="note-card-preview">{n.body.slice(0, 60) || 'Empty note'}</span>
              <span className="note-card-time">{relTime(n.updatedAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="note-editor">
        {!note ? (
          <div className="empty-state">
            <span>Select a note or create one.</span>
            <button className="primary-btn" onClick={createNote}><Plus size={16} /> New note</button>
          </div>
        ) : (
          <>
            <div className="note-editor-bar">
              <button
                className={note.pinned ? 'ghost-btn active' : 'ghost-btn'}
                onClick={() => dispatch({ type: 'note/update', id: note.id, patch: { pinned: !note.pinned } })}
                title={note.pinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={15} /> {note.pinned ? 'Pinned' : 'Pin'}
              </button>
              <div className="note-link">
                <Link2 size={15} />
                <select
                  value={note.taskId || ''}
                  onChange={e => dispatch({ type: 'note/update', id: note.id, patch: { taskId: e.target.value || null } })}
                  data-testid="note-task-link"
                  title="Link to a task"
                >
                  <option value="">No linked task</option>
                  {state.tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <button className="icon-btn danger" onClick={() => deleteNote(note.id)} title="Delete note" data-testid="note-delete">
                <Trash2 size={16} />
              </button>
            </div>

            {linkedTask && (
              <button className="linked-task-banner" onClick={() => navigate('tasks')} data-testid="linked-task-banner">
                <CheckSquare size={14} />
                Linked to task: <strong>{linkedTask.title}</strong> {linkedTask.done ? '· done ✓' : ''}
              </button>
            )}

            <input
              className="note-title-input"
              value={note.title}
              placeholder="Note title"
              onChange={e => dispatch({ type: 'note/update', id: note.id, patch: { title: e.target.value } })}
              data-testid="note-title"
            />
            <textarea
              className="note-body-input"
              value={note.body}
              placeholder="Start writing…"
              onChange={e => dispatch({ type: 'note/update', id: note.id, patch: { body: e.target.value } })}
              data-testid="note-body"
            />
            <span className="note-saved">Saved · {relTime(note.updatedAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}
