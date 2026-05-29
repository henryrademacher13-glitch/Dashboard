import { useState } from 'react';
import { X } from 'lucide-react';

const EMOJIS = ['🏃','📚','🧘','💧','🍎','😴','✍️','🎯','💪','🌿','🎵','🧹','💊','🚴','🧠'];
const COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

export default function AddHabitModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#6366f1');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), emoji, color);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Habit</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <label>Name
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning walk"
              maxLength={40}
            />
          </label>
          <label>Icon
            <div className="emoji-grid">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-btn ${emoji === e ? 'selected' : ''}`}
                  onClick={() => setEmoji(e)}
                >{e}</button>
              ))}
            </div>
          </label>
          <label>Color
            <div className="color-grid">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-btn ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </label>
          <button type="submit" className="primary-btn" disabled={!name.trim()}>
            Add Habit
          </button>
        </form>
      </div>
    </div>
  );
}
