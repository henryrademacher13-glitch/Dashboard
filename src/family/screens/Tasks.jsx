import { useState } from 'react';
import { Check, Plus, Repeat } from 'lucide-react';
import { occurrencesFor, dayKey, addDays, fmtDate } from '../model.js';
import { personName } from '../store.js';
import Sheet from '../components/Sheet.jsx';

const FILTERS = [
  { id: 'mine', label: 'Mine' },
  { id: 'all', label: 'Everyone' },
];

export default function Tasks({ store }) {
  const { state, me } = store;
  const [filter, setFilter] = useState('mine');
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState(null);

  const kids = state.people.filter((p) => p.role === 'child');
  const filters = [...FILTERS, ...kids.map((k) => ({ id: k.id, label: `${k.displayName}'s` }))];

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const match = (o) => {
    if (filter === 'all') return true;
    if (filter === 'mine') return o.resolvedResponsibleId === me.id;
    return o.task.childId === filter;
  };

  return (
    <>
      <div className="chips">
        {filters.map((f) => (
          <button key={f.id} className="chip" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {days.map((d, i) => {
        const occ = occurrencesFor(state, d).filter(match);
        if (!occ.length) return null;
        return (
          <div key={dayKey(d)}>
            <div className="section-label">
              {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div className="card">
              {occ.map((o) => {
                const done = o.state === 'done';
                const isMine = o.resolvedResponsibleId === me.id;
                return (
                  <div className="row" key={o.id}>
                    <button
                      className="check"
                      data-done={done}
                      disabled={!isMine}
                      style={!isMine ? { opacity: 0.4, cursor: 'default' } : undefined}
                      onClick={() => isMine && store.completeOccurrence(o)}
                      aria-label={`Mark ${o.task.title} ${done ? 'not done' : 'done'}`}
                    >
                      {done && <Check size={13} strokeWidth={3} />}
                    </button>
                    <button className="row-body" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}
                      onClick={() => setDetail(o)}>
                      <div className={`row-title ${done ? 'done-text' : ''}`}>{o.task.title}</div>
                      <div className="row-sub">
                        {personName(state, o.resolvedResponsibleId)}
                        {o.task.timeLabel && ` · ${o.task.timeLabel}`}
                      </div>
                    </button>
                    {o.task.responsibilityMode === 'rotating' && (
                      <Repeat size={14} className="faint" aria-label="Alternates" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="fab-row">
        <button className="btn btn-full" onClick={() => setAdding(true)}>
          <Plus size={16} /> New task
        </button>
      </div>

      <p className="privacy-note">
        No reminders are sent to the other household about your tasks,<br />
        and none are sent to you about theirs.
      </p>

      {adding && <AddTask store={store} onClose={() => setAdding(false)} />}
      {detail && <TaskDetail occ={detail} store={store} onClose={() => setDetail(null)} />}
    </>
  );
}

function AddTask({ store, onClose }) {
  const { state, me } = store;
  const kids = state.people.filter((p) => p.role === 'child');
  const other = state.people.find((p) => p.role === 'parent' && p.id !== me.id);

  const [title, setTitle] = useState('');
  const [childId, setChildId] = useState(kids[0]?.id);
  const [repeat, setRepeat] = useState('none');
  const [mode, setMode] = useState('fixed');

  // The three assignment modes in plain language. The word "rotation" never
  // appears in the UI. (§6.4)
  const modes = [
    { id: 'fixed', label: 'Always me', config: { responsiblePersonId: me.id } },
    { id: 'fixed_other', label: `Always ${other?.displayName}`, config: { responsiblePersonId: other?.id } },
    { id: 'rotating', label: 'Alternate between us', config: { rotationOrder: [me.id, other?.id].filter(Boolean) } },
    { id: 'custody_derived', label: `Whoever has ${kids.find((k) => k.id === childId)?.displayName || 'them'}`, config: {} },
  ];

  const submit = () => {
    const chosen = modes.find((m) => m.id === mode);
    store.addTask({
      title: title.trim(),
      childId,
      repeatRule: repeat,
      weekdays: repeat === 'weekly' ? [new Date().getDay()] : [],
      responsibilityMode: mode === 'fixed_other' ? 'fixed' : mode,
      ...chosen.config,
    });
    onClose();
  };

  return (
    <Sheet title="New task" onClose={onClose}>
      <div className="field">
        <label htmlFor="tt">What needs doing?</label>
        <input id="tt" value={title} autoFocus placeholder="Soccer pickup" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>For which child?</label>
        <div className="chips">
          {kids.map((k) => (
            <button key={k.id} className="chip" data-active={childId === k.id} onClick={() => setChildId(k.id)}>
              {k.displayName}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="rp">Repeat</label>
        <select id="rp" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
          <option value="none">Just once</option>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
        </select>
      </div>
      <div className="field">
        <label>Who is responsible?</label>
        <div className="radio-list">
          {modes.map((m) => (
            <button key={m.id} className="radio-item" data-active={mode === m.id} onClick={() => setMode(m.id)}
              style={{ background: 'none', width: '100%', textAlign: 'left' }}>
              <span style={{ flex: 1 }}>{m.label}</span>
              {mode === m.id && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-full" disabled={!title.trim()} onClick={submit}>
        Create task
      </button>
    </Sheet>
  );
}

function TaskDetail({ occ, store, onClose }) {
  const { state, me } = store;
  const t = occ.task;
  const history = state.occurrences
    .filter((o) => o.taskId === t.id && o.state === 'done')
    .sort((a, b) => b.dueOn.localeCompare(a.dueOn))
    .slice(0, 6);
  const swapped = state.swaps.find((s) => s.taskId === t.id && s.dueOn === occ.dueOn);

  const modeLabel = {
    fixed: 'Always the same person',
    rotating: 'Alternates each time',
    custody_derived: 'Whoever has the child that day',
  }[t.responsibilityMode];

  return (
    <Sheet title={t.title} onClose={onClose}>
      <div className="card">
        <div className="row">
          <div className="row-body"><div className="row-title">Responsible</div></div>
          <div className="row-meta" style={{ color: 'var(--text)' }}>{personName(state, occ.resolvedResponsibleId)}</div>
        </div>
        <div className="row">
          <div className="row-body"><div className="row-title">How it is assigned</div></div>
          <div className="row-meta">{modeLabel}</div>
        </div>
        <div className="row">
          <div className="row-body"><div className="row-title">Due</div></div>
          <div className="row-meta">{fmtDate(occ.dueOn, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>
      </div>

      {occ.resolvedResponsibleId === me.id && !swapped && (
        <button className="btn btn-full" style={{ marginTop: 16 }} onClick={() => { store.requestSwap(occ); onClose(); }}>
          Request a swap for this one
        </button>
      )}
      {swapped && (
        <p className="sm muted" style={{ marginTop: 16, textAlign: 'center' }}>
          Swap requested. Waiting on a response &mdash; the underlying order is unchanged.
        </p>
      )}

      {history.length > 0 && (
        <>
          <div className="section-label">History</div>
          <div className="card">
            {history.map((h) => (
              <div className="row" key={h.id}>
                <div className="row-body"><div className="row-title">{fmtDate(h.dueOn, { month: 'short', day: 'numeric' })}</div></div>
                <div className="row-meta">{personName(state, h.resolvedResponsibleId)}</div>
              </div>
            ))}
          </div>
          <p className="sm faint" style={{ marginTop: 8 }}>
            A record, not a score. There is no leaderboard between adults.
          </p>
        </>
      )}
    </Sheet>
  );
}
