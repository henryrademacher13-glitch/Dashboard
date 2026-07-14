import { useMemo, useState } from 'react'
import CampusMap from './components/CampusMap'
import BuildingList from './components/BuildingList'
import DetailPanel from './components/DetailPanel'
import { BUILDINGS, CATEGORIES } from './data/campus'
import './App.css'

export default function App() {
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [activeCategories, setActiveCategories] = useState(new Set())

  const toggleCategory = (key) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BUILDINGS
      .filter((b) => activeCategories.size === 0 || activeCategories.has(b.category))
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q))
      .sort((a, b) => a.minutes - b.minutes)
  }, [query, activeCategories])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="paw" aria-hidden="true">🐾</span>
          <div>
            <h1>Husky Navigator</h1>
            <p>Northeastern campus, from East Village (291 St. Botolph St)</p>
          </div>
        </div>
        <input
          type="search"
          className="search"
          placeholder="Search buildings & landmarks…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          aria-label="Search buildings and landmarks"
        />
      </header>

      <div className="filters" role="group" aria-label="Filter by category">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            className={`filter-chip ${activeCategories.has(key) ? 'on' : ''}`}
            style={{ '--cat': cat.color }}
            onClick={() => toggleCategory(key)}
          >
            {cat.label}
          </button>
        ))}
        {activeCategories.size > 0 && (
          <button className="filter-clear" onClick={() => setActiveCategories(new Set())}>
            Clear
          </button>
        )}
      </div>

      <div className="layout">
        <aside className="sidebar">
          {selected ? (
            <DetailPanel building={selected} onClose={() => setSelected(null)} />
          ) : (
            <>
              <h2 className="sidebar-title">Places · sorted by walk time</h2>
              <BuildingList buildings={visible} selected={selected} onSelect={setSelected} />
            </>
          )}
        </aside>

        <main className="map-area">
          <CampusMap selected={selected} onSelect={setSelected} activeCategories={activeCategories} />
          {!selected && (
            <div className="hint">
              <strong>Pick a destination</strong> on the map or in the list to see the walking
              route and turn-by-turn directions from East Village. Scroll to zoom, drag to pan.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
