import { useState } from 'react';
import { Plus, LayoutGrid, Users, DollarSign, CalendarDays } from 'lucide-react';
import { useScaliaStore } from './store';
import OverviewView from './components/OverviewView';
import ClientsView from './components/ClientsView';
import RevenueView from './components/RevenueView';
import MeetingsView from './components/MeetingsView';
import AddClientModal from './components/AddClientModal';
import AddMeetingModal from './components/AddMeetingModal';
import './App.css';

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'clients', label: 'Clients', Icon: Users },
  { id: 'revenue', label: 'Revenue', Icon: DollarSign },
  { id: 'meetings', label: 'Meetings', Icon: CalendarDays },
];

export default function App() {
  const [view, setView] = useState('overview');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const store = useScaliaStore();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="brand">
            <span className="brand-mark">S</span>
            <div className="brand-text">
              <h1>Scalia</h1>
              <span className="brand-sub">Customer Dashboard</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <span className="today-label">{formatDate(new Date())}</span>
          <button className="ghost-btn" onClick={() => setShowAddMeeting(true)}>
            <CalendarDays size={16} /> Schedule meeting
          </button>
          <button className="primary-btn" onClick={() => setShowAddClient(true)}>
            <Plus size={16} /> Add client
          </button>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {view === 'overview' && <OverviewView store={store} onGoTo={setView} />}
        {view === 'clients' && <ClientsView store={store} onAddClient={() => setShowAddClient(true)} />}
        {view === 'revenue' && <RevenueView store={store} />}
        {view === 'meetings' && <MeetingsView store={store} onAddMeeting={() => setShowAddMeeting(true)} />}
      </main>

      {showAddClient && <AddClientModal onAdd={store.addClient} onClose={() => setShowAddClient(false)} />}
      {showAddMeeting && (
        <AddMeetingModal clients={store.clients} onAdd={store.addMeeting} onClose={() => setShowAddMeeting(false)} />
      )}
    </div>
  );
}
