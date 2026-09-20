import { AlertTriangle, ChevronRight, Check } from 'lucide-react';
import {
  occurrencesFor, currentCustody, nextHandoff, buildChecklist,
  balance, money, fmtDate, custodyOn, locationLabel, daysBetween,
} from '../model.js';
import { personName, householdName } from '../store.js';

export default function Today({ store, onNavigate, onOpenHandoff }) {
  const { state, me, myHousehold } = store;
  const now = new Date();

  const kids = state.people.filter((p) => p.role === 'child');
  const here = kids.filter((k) => custodyOn(state, k.id, now) === myHousehold);
  const period = here.length ? currentCustody(state, here[0].id, now) : null;

  const occ = occurrencesFor(state, now);
  const mine = occ.filter((o) => o.resolvedResponsibleId === me.id);
  const theirs = occ.filter((o) => o.resolvedResponsibleId && o.resolvedResponsibleId !== me.id);

  const handoff = nextHandoff(state, now);
  const checklist = handoff ? buildChecklist(state, handoff, now) : [];
  const packed = handoff?.checked ? checklist.filter((c) => handoff.checked[c.itemId]).length : 0;
  const remaining = checklist.length - packed;

  const bal = balance(state);
  const iOwe = bal.fromId === myHousehold;

  // Upcoming milestones with a warning worth surfacing before it becomes a crisis.
  const upcoming = [];
  state.projects.forEach((pr) => {
    if (pr.state === 'complete') return;
    pr.milestones.filter((m) => m.state === 'pending').slice(0, 1).forEach((m) => {
      const delta = daysBetween(now, m.dueOn);
      if (delta < 0 || delta > 7) return;
      const missing = pr.supplies
        .map((s) => state.items.find((i) => i.id === s.itemId))
        .filter((i) => i && i.currentLocation !== myHousehold);
      upcoming.push({ pr, m, delta, missing });
    });
  });

  return (
    <>
      {here.length > 0 ? (
        <div className="custody-card" data-hh="a">
          <div className="who">
            {here.map((k) => k.displayName).join(' and ')} {here.length > 1 ? 'are' : 'is'} with you
          </div>
          {period && (
            <div className="until">
              through {fmtDate(period.endsAt, { weekday: 'long' })} evening
            </div>
          )}
        </div>
      ) : (
        <div className="custody-card" data-hh="b">
          <div className="who">
            {kids.map((k) => k.displayName).join(' and ')} {kids.length > 1 ? 'are' : 'is'} at{' '}
            {householdName(state, custodyOn(state, kids[0]?.id, now))}
          </div>
          {kids[0] && (
            <div className="until">
              back {fmtDate(currentCustody(state, kids[0].id, now)?.endsAt, { weekday: 'long' })}
            </div>
          )}
        </div>
      )}

      {handoff && remaining > 0 && (
        <button className="banner" onClick={onOpenHandoff} style={{ width: '100%', textAlign: 'left' }}>
          <AlertTriangle size={18} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <div className="banner-text">
            <div className="banner-title">
              Handoff {fmtDate(handoff.scheduledAt, { weekday: 'long' })}{' '}
              {new Date(handoff.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="banner-sub">{remaining} thing{remaining === 1 ? '' : 's'} to pack</div>
          </div>
          <ChevronRight size={18} className="faint" />
        </button>
      )}

      <div className="section-label">Yours today</div>
      <div className="card">
        {mine.length === 0 && <div className="empty">Nothing on your list today.</div>}
        {mine.map((o) => (
          <TaskRow key={o.id} occ={o} store={store} />
        ))}
      </div>

      {theirs.length > 0 && (
        <>
          <div className="section-label">
            {personName(state, theirs[0].resolvedResponsibleId)}&rsquo;s today
          </div>
          <div className="card">
            {theirs.map((o) => (
              <div className="row" key={o.id}>
                <div className="check" aria-hidden="true" data-done={o.state === 'done'}>
                  {o.state === 'done' && <Check size={13} strokeWidth={3} />}
                </div>
                <div className="row-body">
                  <div className={`row-title ${o.state === 'done' ? 'done-text' : ''}`}>{o.task.title}</div>
                  {o.task.timeLabel && <div className="row-sub">{o.task.timeLabel}</div>}
                </div>
              </div>
            ))}
          </div>
          {/* No nudge affordance here, by design. (§8.3) */}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="section-label">Coming up</div>
          <div className="card">
            {upcoming.map(({ pr, m, delta, missing }) => (
              <button className="row" key={m.id} onClick={() => onNavigate('school')}>
                <div className="row-body">
                  <div className="row-title">{pr.title} &mdash; {m.title.toLowerCase()}</div>
                  {missing.length > 0 && (
                    <div className="row-sub stale">
                      {missing[0].name} is at {locationLabel(state, missing[0].currentLocation)}
                    </div>
                  )}
                </div>
                <div className="row-meta">
                  {delta === 0 ? 'today' : delta === 1 ? 'tomorrow' : `in ${delta} days`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-label">Balance</div>
      <button className="card row" onClick={() => onNavigate('money')} style={{ padding: '14px 16px' }}>
        <div className="row-body">
          <div className="row-title">
            {bal.amountCents === 0
              ? 'All settled up'
              : iOwe
                ? `You owe ${householdName(state, bal.toId)}`
                : `${householdName(state, bal.fromId)} owes you`}
          </div>
        </div>
        <div className="row-meta" style={{ fontSize: 'var(--fs-md)', color: 'var(--text)' }}>
          {money(bal.amountCents)}
        </div>
        <ChevronRight size={16} className="faint" />
      </button>

      <p className="privacy-note">
        No ads. No trackers. Nothing sold.<br />Data stays on this device.
      </p>
    </>
  );
}

function TaskRow({ occ, store }) {
  const done = occ.state === 'done';
  return (
    <div className="row">
      <button
        className="check"
        data-done={done}
        onClick={() => store.completeOccurrence(occ)}
        aria-label={done ? `Mark ${occ.task.title} not done` : `Mark ${occ.task.title} done`}
      >
        {done && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="row-body">
        <div className={`row-title ${done ? 'done-text' : ''}`}>{occ.task.title}</div>
        {occ.task.timeLabel && <div className="row-sub">{occ.task.timeLabel}</div>}
      </div>
    </div>
  );
}
