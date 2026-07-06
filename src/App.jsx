import { useEffect, useState } from 'react'
import TodayView from './components/TodayView.jsx'
import ActionsView from './components/ActionsView.jsx'
import SessionsView from './components/SessionsView.jsx'
import { SunIcon, ZapIcon, ListIcon } from './icons.jsx'

const TABS = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'actions', label: 'Actions', icon: ZapIcon },
  { id: 'sessions', label: 'Sessions', icon: ListIcon },
]

// Tiny hash router: #/today, #/actions, #/sessions, #/sessions/<id>
function parseHash() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/')
  const tab = TABS.some((t) => t.id === parts[0]) ? parts[0] : 'today'
  return { tab, param: parts[1] || null }
}

function go(tab, param) {
  window.location.hash = param ? `#/${tab}/${param}` : `#/${tab}`
}

export default function App() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Claude Dashboard</span>
        </div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${route.tab === id ? 'active' : ''}`}
            onClick={() => go(id)}
          >
            <Icon />
            <span className="nav-label">{label}</span>
          </button>
        ))}
        <div className="sidebar-foot">
          Your local window into Claude Code — reports, one-click actions, and session history.
        </div>
      </nav>
      <main className="main">
        {route.tab === 'today' && <TodayView openSession={(id) => go('sessions', id)} />}
        {route.tab === 'actions' && <ActionsView />}
        {route.tab === 'sessions' && (
          <SessionsView sessionId={route.param} openSession={(id) => go('sessions', id)} />
        )}
      </main>
    </div>
  )
}
