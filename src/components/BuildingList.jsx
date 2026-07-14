import { CATEGORIES } from '../data/campus'

export default function BuildingList({ buildings, selected, onSelect }) {
  if (buildings.length === 0) {
    return <p className="empty-note">No places match — try a different search or filter.</p>
  }
  return (
    <ul className="bldg-list">
      {buildings.map((b) => {
        const cat = CATEGORIES[b.category]
        return (
          <li key={b.id}>
            <button
              className={`bldg-row ${selected?.id === b.id ? 'active' : ''}`}
              onClick={() => onSelect(selected?.id === b.id ? null : b)}
            >
              <span className="cat-dot" style={{ background: cat.color }} />
              <span className="bldg-row-name">{b.name}</span>
              <span className="bldg-row-time">{b.minutes} min</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
