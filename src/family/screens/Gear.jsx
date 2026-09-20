import { useState, useMemo } from 'react';
import { Plus, Search, ArrowRight } from 'lucide-react';
import { staleness, locationLabel, relativeTime, UNKNOWN } from '../model.js';
import { personName, householdName } from '../store.js';
import Sheet from '../components/Sheet.jsx';

export default function Gear({ store }) {
  const { state, myHousehold } = store;
  const [q, setQ] = useState('');
  const [kid, setKid] = useState('all');
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);

  const kids = state.people.filter((p) => p.role === 'child');
  const other = state.households.find((h) => h.id !== myHousehold);

  const visible = useMemo(() => state.items.filter((i) => {
    if (kid !== 'all' && i.ownerChildId !== kid) return false;
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [state.items, kid, q]);

  // Grouped by location, because the question is always either "where is X"
  // or "what is here". Stale items break out into their own group so the app
  // never asserts a location it cannot vouch for. (P3)
  const groups = useMemo(() => {
    const fresh = visible.filter((i) => i.state === 'tracked' && staleness(i) !== 'stale');
    const stale = visible.filter((i) => i.state === 'tracked' && staleness(i) === 'stale');
    const missing = visible.filter((i) => i.state === 'missing');
    const byLoc = {};
    fresh.forEach((i) => {
      byLoc[i.currentLocation] = byLoc[i.currentLocation] || [];
      byLoc[i.currentLocation].push(i);
    });
    return { byLoc, stale, missing };
  }, [visible]);

  const order = [myHousehold, other?.id, 'car', 'school', 'venue', UNKNOWN].filter(Boolean);

  return (
    <>
      <div className="field" style={{ marginBottom: 12, position: 'relative' }}>
        <Search size={16} className="faint" style={{ position: 'absolute', left: 13, top: 14, pointerEvents: 'none' }} />
        <input className="search" style={{ paddingLeft: 38 }} placeholder="Search gear"
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search gear" />
      </div>

      <div className="chips">
        <button className="chip" data-active={kid === 'all'} onClick={() => setKid('all')}>All</button>
        {kids.map((k) => (
          <button key={k.id} className="chip" data-active={kid === k.id} onClick={() => setKid(k.id)}>{k.displayName}</button>
        ))}
      </div>

      {order.map((loc) => {
        const list = groups.byLoc[loc];
        if (!list?.length) return null;
        return (
          <div key={loc}>
            <div className="section-label">
              {loc === myHousehold ? 'At your place' : locationLabel(state, loc)}
              <span className="faint" style={{ float: 'right', fontWeight: 400 }}>{list.length}</span>
            </div>
            <div className="card">
              {list.map((it) => <ItemRow key={it.id} item={it} state={state} onOpen={() => setDetail(it)} />)}
            </div>
          </div>
        );
      })}

      {groups.stale.length > 0 && (
        <>
          <div className="section-label">
            Needs confirming
            <span className="faint" style={{ float: 'right', fontWeight: 400 }}>{groups.stale.length}</span>
          </div>
          <div className="card">
            {groups.stale.map((it) => (
              <div className="row" key={it.id}>
                <span className="row-emoji">{it.emoji}</span>
                <div className="row-body">
                  <div className="row-title">{it.name}</div>
                  <div className="row-sub stale">
                    Last seen at {locationLabel(state, it.currentLocation)} &middot; {relativeTime(it.locationConfirmedAt)}
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => store.confirmItem(it.id)}>Confirm</button>
              </div>
            ))}
          </div>
          <p className="sm faint" style={{ marginTop: 8 }}>
            These have not been confirmed in over a week, so they are shown as last known rather than current.
          </p>
        </>
      )}

      {groups.missing.length > 0 && (
        <>
          <div className="section-label">Missing</div>
          <div className="card">
            {groups.missing.map((it) => (
              <button className="row" key={it.id} onClick={() => setDetail(it)}>
                <span className="row-emoji">{it.emoji}</span>
                <div className="row-body">
                  <div className="row-title">{it.name}</div>
                  <div className="row-sub">
                    Last confirmed at {locationLabel(state, it.currentLocation)} by {personName(state, it.locationConfirmedBy)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {visible.length === 0 && <div className="empty">Nothing matches &ldquo;{q}&rdquo;.</div>}

      <div className="fab-row btn-row">
        <button className="btn" onClick={() => setBulk(true)}>
          Moving to {other?.name}
        </button>
        <button className="btn" onClick={() => setAdding(true)}><Plus size={16} /> Add item</button>
      </div>

      <p className="privacy-note">
        Objects have locations. People do not.<br />
        This app never asks for or stores anyone&rsquo;s location.
      </p>

      {detail && <ItemDetail item={detail} store={store} onClose={() => setDetail(null)} />}
      {adding && <AddItem store={store} onClose={() => setAdding(false)} />}
      {bulk && <BulkMove store={store} destination={other} onClose={() => setBulk(false)} />}
    </>
  );
}

function ItemRow({ item, state, onOpen }) {
  const s = staleness(item);
  return (
    <button className="row" onClick={onOpen}>
      <span className="row-emoji">{item.emoji}</span>
      <div className="row-body">
        <div className="row-title">{item.name}</div>
        <div className="row-sub">
          {state.people.find((p) => p.id === item.ownerChildId)?.displayName}
          {s !== 'fresh' && ` · ${relativeTime(item.locationConfirmedAt)}`}
        </div>
      </div>
      {s === 'fresh' && <div className="row-meta">{relativeTime(item.locationConfirmedAt)}</div>}
    </button>
  );
}

function ItemDetail({ item, store, onClose }) {
  const { state } = store;
  const options = [
    ...state.households.map((h) => ({ id: h.id, label: h.name })),
    { id: 'car', label: 'In the car' },
    { id: 'school', label: 'At school' },
    { id: 'venue', label: 'At practice' },
    { id: UNKNOWN, label: 'Unknown' },
  ];
  const events = state.itemEvents.filter((e) => e.itemId === item.id).slice(-4).reverse();

  return (
    <Sheet title={`${item.emoji} ${item.name}`} onClose={onClose}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="sm muted">Currently</div>
        <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: '4px 0 2px' }}>
          {locationLabel(state, item.currentLocation)}
        </div>
        <div className="sm faint">
          confirmed {relativeTime(item.locationConfirmedAt)} by {personName(state, item.locationConfirmedBy)}
        </div>
      </div>

      <div className="section-label">Move it to</div>
      <div className="radio-list">
        {options.map((o) => (
          <button key={o.id} className="radio-item" data-active={item.currentLocation === o.id}
            style={{ background: 'none', width: '100%', textAlign: 'left' }}
            onClick={() => { store.moveItem(item.id, o.id); onClose(); }}>
            <span style={{ flex: 1 }}>{o.label}</span>
            {item.currentLocation === o.id && <span className="sm faint">now</span>}
          </button>
        ))}
      </div>

      <div className="section-label">Belongs at</div>
      <p className="sm muted" style={{ marginTop: -4 }}>
        {householdName(state, item.homeBase)} &mdash; used to build handoff checklists.
      </p>

      {events.length > 0 && (
        <>
          <div className="section-label">Recent moves</div>
          <div className="card">
            {events.map((e) => (
              <div className="row" key={e.id}>
                <div className="row-body">
                  <div className="row-title sm">
                    {locationLabel(state, e.fromLocation)} <ArrowRight size={12} style={{ verticalAlign: -1 }} /> {locationLabel(state, e.toLocation)}
                  </div>
                  <div className="row-sub">{personName(state, e.changedBy)} &middot; {relativeTime(e.occurredAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn btn-full" style={{ marginTop: 20 }} onClick={() => { store.markMissing(item.id); onClose(); }}>
        {item.state === 'missing' ? 'Found it' : 'Mark as missing'}
      </button>
    </Sheet>
  );
}

function AddItem({ store, onClose }) {
  const { state, myHousehold } = store;
  const kids = state.people.filter((p) => p.role === 'child');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [ownerChildId, setOwner] = useState(kids[0]?.id);
  const [homeBase, setHomeBase] = useState(myHousehold);

  const EMOJI = ['📦', '⚽', '🎒', '🎺', '🥽', '🏀', '👟', '📓', '🩰', '🎾'];

  return (
    <Sheet title="Add item" onClose={onClose}>
      <div className="field">
        <label htmlFor="inm">Name</label>
        <input id="inm" value={name} autoFocus placeholder="Soccer cleats" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Icon</label>
        <div className="chips">
          {EMOJI.map((e) => (
            <button key={e} className="chip" data-active={emoji === e} onClick={() => setEmoji(e)}
              style={{ fontSize: 18, padding: '4px 12px' }}>{e}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Whose is it?</label>
        <div className="chips">
          {kids.map((k) => (
            <button key={k.id} className="chip" data-active={ownerChildId === k.id} onClick={() => setOwner(k.id)}>
              {k.displayName}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Which house does it live at?</label>
        <div className="chips">
          {state.households.map((h) => (
            <button key={h.id} className="chip" data-active={homeBase === h.id} onClick={() => setHomeBase(h.id)}>
              {h.name}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-full" disabled={!name.trim()}
        onClick={() => { store.addItem({ name: name.trim(), emoji, ownerChildId, homeBase }); onClose(); }}>
        Add item
      </button>
    </Sheet>
  );
}

function BulkMove({ store, destination, onClose }) {
  const { state, myHousehold } = store;
  const here = state.items.filter((i) => i.currentLocation === myHousehold && i.state === 'tracked');
  const [selected, setSelected] = useState(() => new Set(here.map((i) => i.id)));

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <Sheet title={`Moving to ${destination?.name}`} onClose={onClose}>
      <p className="sm muted" style={{ marginTop: -8 }}>
        Everything here is selected. Uncheck anything staying behind.
      </p>
      <div className="card">
        {here.length === 0 && <div className="empty">Nothing is at your place right now.</div>}
        {here.map((it) => (
          <button className="row" key={it.id} onClick={() => toggle(it.id)}>
            <span className="check" data-done={selected.has(it.id)}>
              {selected.has(it.id) && <span style={{ fontSize: 11, lineHeight: 1 }}>&#10003;</span>}
            </span>
            <span className="row-emoji">{it.emoji}</span>
            <div className="row-body"><div className="row-title">{it.name}</div></div>
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} disabled={selected.size === 0}
        onClick={() => { store.bulkMove([...selected], destination.id); onClose(); }}>
        Move {selected.size} item{selected.size === 1 ? '' : 's'}
      </button>
    </Sheet>
  );
}
