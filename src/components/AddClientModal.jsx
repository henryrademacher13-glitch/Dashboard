import { useState } from 'react';
import { X } from 'lucide-react';

export default function AddClientModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('onboarding');
  const [monthlyFee, setMonthlyFee] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      contact: contact.trim(),
      email: email.trim(),
      status,
      monthlyFee: Number(monthlyFee) || 0,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Add client" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Add client</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>Business name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juniper Home Goods" autoFocus required />
          </label>
          <label className="field">
            <span>Contact person</span>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Alex Kim" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@juniperhome.com" />
          </label>
          <div className="field-pair">
            <label className="field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label className="field">
              <span>Monthly fee ($)</span>
              <input type="number" min="0" step="100" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="3000" />
            </label>
          </div>
          <div className="modal-foot">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Add client</button>
          </div>
        </form>
      </div>
    </div>
  );
}
