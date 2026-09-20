import { useState } from 'react';
import { AlertTriangle, Plus, Check } from 'lucide-react';
import {
  fmtShort, daysBetween, dayKey, custodyOn, resolveResponsible,
  locationLabel, addDays,
} from '../model.js';
import { personName } from '../store.js';
import Sheet from '../components/Sheet.jsx';

export default function School({ store }) {
  const { state } = store;
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const project = state.projects.find((p) => p.id === openId);

  if (project) {
    return <ProjectDetail project={project} store={store} onBack={() => setOpenId(null)} />;
  }

  const kids = state.people.filter((p) => p.role === 'child');

  return (
    <>
      {kids.map((kid) => {
        const list = state.projects.filter((p) => p.childId === kid.id);
        if (!list.length) return null;
        return (
          <div key={kid.id}>
            <div className="section-label">{kid.displayName}</div>
            {list.map((pr) => {
              const done = pr.milestones.filter((m) => m.state === 'done').length;
              const delta = daysBetween(new Date(), pr.dueOn);
              const warn = warningsFor(state, pr, store.myHousehold);
              return (
                <button className="card" key={pr.id} onClick={() => setOpenId(pr.id)} style={{ width: '100%', textAlign: 'left', display: 'block' }}>
                  <div className="spread">
                    <div className="stack">
                      <div className="row-title" style={{ fontWeight: 500 }}>{pr.title}</div>
                      <div className="row-sub">{pr.subject} &middot; due {fmtShort(pr.dueOn)}</div>
                    </div>
                    <div className="row-meta">
                      {pr.state === 'complete' ? 'done' : delta < 0 ? 'overdue' : `${delta}d`}
                    </div>
                  </div>
                  <div className="progress-track">
                    {pr.milestones.map((m) => (
                      <div className="progress-seg" key={m.id} data-done={m.state === 'done'} />
                    ))}
                  </div>
                  <div className="sm muted" style={{ marginTop: 8 }}>
                    {done} of {pr.milestones.length} steps done
                  </div>
                  {warn.length > 0 && (
                    <div className="ms-warn" style={{ marginTop: 8 }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{warn[0]}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      <div className="fab-row">
        <button className="btn btn-full" onClick={() => setAdding(true)}>
          <Plus size={16} /> New project
        </button>
      </div>

      {adding && <AddProject store={store} onClose={() => setAdding(false)} />}
    </>
  );
}

// Surfaces the two problems that actually cause night-before crises: a step
// landing on a transition day, and supplies sitting at the wrong house. (§3.2)
function warningsFor(state, pr, myHousehold) {
  const out = [];
  pr.milestones.filter((m) => m.state === 'pending').forEach((m) => {
    const hhToday = custodyOn(state, pr.childId, m.dueOn);
    const hhPrev = custodyOn(state, pr.childId, dayKey(addDays(new Date(m.dueOn), -1)));
    if (hhToday && hhPrev && hhToday !== hhPrev) {
      out.push(`"${m.title}" falls on a handoff day`);
    }
  });
  pr.supplies.forEach((s) => {
    const it = state.items.find((i) => i.id === s.itemId);
    if (it && it.currentLocation !== myHousehold) {
      out.push(`${it.name} is at ${locationLabel(state, it.currentLocation)}`);
    }
  });
  return out;
}

function ProjectDetail({ project, store, onBack }) {
  const { state, myHousehold } = store;
  const child = state.people.find((p) => p.id === project.childId);

  return (
    <>
      <button className="btn btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>&larr; All projects</button>

      <div className="card">
        <div className="spread">
          <div className="stack">
            <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{project.title}</div>
            <div className="row-sub">{child?.displayName} &middot; {project.subject}</div>
          </div>
        </div>
        <div className="sm muted" style={{ marginTop: 8 }}>
          Due {fmtShort(project.dueOn)}
        </div>
      </div>

      <div className="section-label">Steps</div>
      <div className="card">
        <div className="timeline">
          {project.milestones.map((m) => {
            const done = m.state === 'done';
            const owner = done
              ? m.completedBy
              : resolveResponsible(state, { ...m, childId: project.childId }, m.dueOn);
            const hhToday = custodyOn(state, project.childId, m.dueOn);
            const hhPrev = custodyOn(state, project.childId, dayKey(addDays(new Date(m.dueOn), -1)));
            const onHandoff = !done && hhToday && hhPrev && hhToday !== hhPrev;
            const missing = !done
              ? project.supplies
                  .map((s) => state.items.find((i) => i.id === s.itemId))
                  .filter((i) => i && i.currentLocation !== myHousehold)
              : [];

            return (
              <div className="ms" key={m.id} data-done={done}>
                <div className="ms-head">
                  <div className="stack" style={{ flex: 1 }}>
                    <span className={`ms-title ${done ? 'done-text' : ''}`}>{m.title}</span>
                    <span className="ms-owner">
                      {personName(state, owner)}
                      {m.responsibilityMode === 'custody_derived' && !done && ' · whoever has ' + child?.displayName}
                      {m.responsibilityMode === 'rotating' && !done && ' · alternating'}
                    </span>
                  </div>
                  <span className="row-meta">{fmtShort(m.dueOn)}</span>
                </div>

                {onHandoff && (
                  <div className="ms-warn">
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>This falls on a handoff day</span>
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="ms-warn">
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{missing[0].name} is at {locationLabel(state, missing[0].currentLocation)}</span>
                  </div>
                )}

                <button
                  className="btn btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => store.toggleMilestone(project.id, m.id)}
                >
                  {done ? 'Undo' : 'Mark done'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {project.supplies.length > 0 && (
        <>
          <div className="section-label">Supplies</div>
          <div className="card">
            {project.supplies.map((s) => (
              <div className="row" key={s.id}>
                <button
                  className="check"
                  data-done={s.acquired}
                  onClick={() => store.toggleSupply(project.id, s.id)}
                  aria-label={`Toggle ${s.label}`}
                >
                  {s.acquired && <Check size={13} strokeWidth={3} />}
                </button>
                <div className="row-body">
                  <div className={`row-title ${s.acquired ? 'done-text' : ''}`}>{s.label}</div>
                  {s.itemId && (
                    <div className="row-sub">
                      tracked in Gear &middot; {locationLabel(state, state.items.find((i) => i.id === s.itemId)?.currentLocation)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function AddProject({ store, onClose }) {
  const { state } = store;
  const kids = state.people.filter((p) => p.role === 'child');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [childId, setChildId] = useState(kids[0]?.id);
  const [dueOn, setDueOn] = useState(dayKey(addDays(new Date(), 14)));
  const [steps, setSteps] = useState(4);

  // Backward planning: spread steps evenly between today and the due date,
  // proposing rather than committing. (§3.2)
  const proposed = () => {
    const total = Math.max(1, daysBetween(new Date(), dueOn));
    const gap = total / steps;
    const labels = ['Choose topic', 'Gather materials', 'Draft', 'Build', 'Review', 'Practice'];
    return Array.from({ length: steps }, (_, i) => ({
      id: `m_${Math.random().toString(36).slice(2, 8)}`,
      title: i === steps - 1 ? 'Final check' : labels[i % labels.length],
      dueOn: dayKey(addDays(new Date(), Math.round(gap * (i + 1)))),
      sortOrder: i,
      responsibilityMode: 'custody_derived',
      childId,
      state: 'pending',
    }));
  };

  return (
    <Sheet title="New project" onClose={onClose}>
      <div className="field">
        <label htmlFor="pt">Title</label>
        <input id="pt" value={title} autoFocus placeholder="Volcano model" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ps">Subject</label>
        <input id="ps" value={subject} placeholder="Science" onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label>Child</label>
        <div className="chips">
          {kids.map((k) => (
            <button key={k.id} className="chip" data-active={childId === k.id} onClick={() => setChildId(k.id)}>
              {k.displayName}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="pd">Due date</label>
        <input id="pd" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
      </div>
      <div className="field">
        <label>Plan backwards into how many steps?</label>
        <div className="chips">
          {[3, 4, 5, 6].map((n) => (
            <button key={n} className="chip" data-active={steps === n} onClick={() => setSteps(n)}>{n}</button>
          ))}
        </div>
        <p className="sm faint" style={{ marginTop: 8 }}>
          Steps are spaced across the time available. Every date stays editable.
        </p>
      </div>
      <button
        className="btn btn-primary btn-full"
        disabled={!title.trim()}
        onClick={() => {
          store.addProject({ title: title.trim(), subject: subject.trim() || 'General', childId, dueOn, milestones: proposed() });
          onClose();
        }}
      >
        Create project
      </button>
    </Sheet>
  );
}
