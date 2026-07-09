import { useState } from 'react';
import { X } from 'lucide-react';

export default function AddMeetingModal({ clients, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState('check-in');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    onAdd({ title: title.trim(), clientId, date, time, duration: Number(duration), type });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Schedule meeting" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Schedule meeting</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly performance review" autoFocus required />
          </label>
          <label className="field">
            <span>Client</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="field-pair">
            <label className="field">
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field">
              <span>Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </label>
          </div>
          <div className="field-pair">
            <label className="field">
              <span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="check-in">Check-in</option>
                <option value="kickoff">Kickoff</option>
                <option value="review">Performance review</option>
                <option value="strategy">Strategy</option>
              </select>
            </label>
            <label className="field">
              <span>Duration (min)</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </label>
          </div>
          <div className="modal-foot">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={clients.length === 0}>Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
}
