import { CATEGORIES, routeLengthMeters } from '../data/campus'

export default function DetailPanel({ building, onClose }) {
  const cat = CATEGORIES[building.category]
  const meters = routeLengthMeters(building)
  return (
    <section className="detail" aria-label={`Directions to ${building.name}`}>
      <div className="detail-head">
        <div>
          <span className="cat-chip" style={{ '--cat': cat.color }}>{cat.label}</span>
          <h2>{building.name}</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close details">×</button>
      </div>

      <div className="detail-stats">
        <div className="stat">
          <span className="stat-value">{building.minutes} min</span>
          <span className="stat-label">walk from East Village</span>
        </div>
        <div className="stat">
          <span className="stat-value">~{meters} m</span>
          <span className="stat-label">distance</span>
        </div>
      </div>

      <p className="detail-desc">{building.desc}</p>

      <h3>Directions from East Village</h3>
      <ol className="steps">
        {building.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="detail-foot">Times are a casual walking pace; shave a minute or two if you’re late for class.</p>
    </section>
  )
}
