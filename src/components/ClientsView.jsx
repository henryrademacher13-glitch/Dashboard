import { useState } from 'react';
import { Search, Trash2, Mail, CalendarDays, Plus } from 'lucide-react';
import StatusPill from './StatusPill';
import { fmt } from '../theme';
import { isPaying } from '../store';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'paused', label: 'Paused' },
];

export default function ClientsView({ store, onAddClient }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { clients, meetings } = store;

  const q = search.trim().toLowerCase();
  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (q && !(c.name + ' ' + c.contact + ' ' + c.email).toLowerCase().includes(q)) return false;
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = (clientId) => meetings.filter((m) => m.clientId === clientId && !m.done && m.date >= today).length;

  return (
    <div className="clients-view">
      <div className="filter-row">
        <div className="search-box">
          <Search size={15} />
          <input
            type="search"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="segmented">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={statusFilter === f.value ? 'active' : ''}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span>{clients.length === 0 ? 'No clients yet.' : 'No clients match your filters.'}</span>
          {clients.length === 0 && (
            <button className="primary-btn" onClick={onAddClient}>
              <Plus size={16} /> Add your first client
            </button>
          )}
        </div>
      ) : (
        <div className="client-grid">
          {filtered.map((c) => {
            const mrr = clients.filter(isPaying).reduce((a, cl) => a + cl.monthlyFee, 0);
            return (
              <div key={c.id} className="client-card">
                <div className="client-card-head">
                  <div>
                    <h3 className="client-name">{c.name}</h3>
                    <span className="client-contact">{c.contact}</span>
                  </div>
                  <StatusPill status={c.status} />
                </div>
                <div className="client-meta">
                  <span><Mail size={13} /> {c.email}</span>
                  <span><CalendarDays size={13} /> {upcomingCount(c.id)} upcoming meeting{upcomingCount(c.id) === 1 ? '' : 's'}</span>
                </div>
                <div className="client-stats">
                  <div>
                    <span className="client-stat-label">Monthly fee</span>
                    <span className="client-stat-value">{c.monthlyFee > 0 ? fmt.money(c.monthlyFee) : '—'}</span>
                  </div>
                  <div>
                    <span className="client-stat-label">Share of MRR</span>
                    <span className="client-stat-value">{isPaying(c) && mrr > 0 ? ((c.monthlyFee / mrr) * 100).toFixed(0) + '%' : '—'}</span>
                  </div>
                  <div>
                    <span className="client-stat-label">Client since</span>
                    <span className="client-stat-value">
                      {new Date(c.addedAt + 'T00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="client-card-foot">
                  <select
                    className="status-select"
                    value={c.status}
                    onChange={(e) => store.updateClientStatus(c.id, e.target.value)}
                    aria-label={`Status for ${c.name}`}
                  >
                    <option value="active">Active</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="paused">Paused</option>
                  </select>
                  <button
                    className="icon-btn danger"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => {
                      if (window.confirm(`Remove ${c.name} and their scheduled meetings?`)) store.deleteClient(c.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
