import { useState } from 'react';
import { Home, Wallet, GraduationCap, CircleCheck, Package } from 'lucide-react';
import { useStore } from './store.js';
import { fmtDate, nextHandoff } from './model.js';
import Today from './screens/Today.jsx';
import Money from './screens/Money.jsx';
import School from './screens/School.jsx';
import Tasks from './screens/Tasks.jsx';
import Gear from './screens/Gear.jsx';
import Handoff from './screens/Handoff.jsx';
import Sheet from './components/Sheet.jsx';
import './styles.css';

// Exactly five destinations, fixed. There is no sixth and no "More" menu. (§6.0)
const TABS = [
  { id: 'today', label: 'Today', icon: Home, title: 'Today' },
  { id: 'money', label: 'Money', icon: Wallet, title: 'Money' },
  { id: 'school', label: 'School', icon: GraduationCap, title: 'School' },
  { id: 'tasks', label: 'Tasks', icon: CircleCheck, title: 'Tasks' },
  { id: 'gear', label: 'Gear', icon: Package, title: 'Gear' },
];

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState('today');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [settings, setSettings] = useState(false);

  const { state, me } = store;
  const handoff = nextHandoff(state);
  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>{active.title}</h1>
            {tab === 'today' && <p className="date">{fmtDate(new Date())}</p>}
          </div>
          <button className="avatar" data-hh={me?.avatarColor} onClick={() => setSettings(true)}
            aria-label="Settings">
            {me?.displayName === 'You' ? 'Y' : me?.displayName?.[0]}
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'today' && (
          <Today store={store} onNavigate={setTab} onOpenHandoff={() => setHandoffOpen(true)} />
        )}
        {tab === 'money' && <Money store={store} />}
        {tab === 'school' && <School store={store} />}
        {tab === 'tasks' && <Tasks store={store} />}
        {tab === 'gear' && <Gear store={store} />}
      </main>

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} data-active={tab === t.id} onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}>
                <Icon size={20} strokeWidth={tab === t.id ? 2.2 : 1.7} />
                <span>{t.label}</span>
                <span className="dot" />
              </button>
            );
          })}
        </div>
      </nav>

      {handoffOpen && handoff && (
        <Handoff store={store} handoff={handoff} onClose={() => setHandoffOpen(false)} />
      )}

      {settings && <Settings store={store} onClose={() => setSettings(false)} />}
    </div>
  );
}

function Settings({ store, onClose }) {
  const { state, me } = store;
  const parents = state.people.filter((p) => p.role === 'parent');

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="section-label" style={{ marginTop: 0 }}>Viewing as</div>
      <p className="sm muted" style={{ marginTop: -4 }}>
        Demo control. Switch households to see that both sides hold identical
        permissions &mdash; neither parent can overrule the other.
      </p>
      <div className="radio-list">
        {parents.map((p) => (
          <button key={p.id} className="radio-item" data-active={me?.id === p.id}
            style={{ background: 'none', width: '100%', textAlign: 'left' }}
            onClick={() => store.switchUser(p.id)}>
            <span className="avatar" data-hh={p.avatarColor} style={{ width: 28, height: 28, fontSize: 12 }}>
              {p.displayName[0]}
            </span>
            <span style={{ flex: 1 }}>{p.displayName}</span>
            <span className="sm faint">{state.households.find((h) => h.id === p.householdIds[0])?.name}</span>
          </button>
        ))}
      </div>

      <div className="section-label">Family</div>
      <div className="card">
        <div className="row">
          <div className="row-body"><div className="row-title">Households</div></div>
          <div className="row-meta">{state.households.map((h) => h.name).join(' · ')}</div>
        </div>
        <div className="row">
          <div className="row-body"><div className="row-title">Children</div></div>
          <div className="row-meta">
            {state.people.filter((p) => p.role === 'child').map((c) => c.displayName).join(' · ')}
          </div>
        </div>
        <div className="row">
          <div className="row-body"><div className="row-title">Approval threshold</div></div>
          <div className="row-meta">${(state.family.approvalThresholdCents / 100).toFixed(0)}</div>
        </div>
        <div className="row">
          <div className="row-body"><div className="row-title">Custody pattern</div></div>
          <div className="row-meta">Alternating weeks</div>
        </div>
      </div>

      <div className="section-label">Privacy</div>
      <div className="card">
        <p className="sm" style={{ margin: 0, lineHeight: 1.7 }}>
          This prototype stores everything in your browser only. Nothing is sent
          anywhere. There are no ads, no analytics, and no third-party scripts.
          <br /><br />
          Not collected: home addresses, children&rsquo;s legal names, dates of birth,
          phone numbers, bank details, or anyone&rsquo;s device location.
        </p>
      </div>

      <button className="btn btn-full" style={{ marginTop: 20 }}
        onClick={() => { if (confirm('Reset all demo data?')) { store.reset(); onClose(); } }}>
        Reset demo data
      </button>
    </Sheet>
  );
}
