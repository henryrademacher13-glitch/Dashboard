// Stat tile: label · value · optional delta vs a named period.
export default function StatTile({ label, value, delta, deltaLabel, deltaGood = true }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
      {delta != null && (
        <span className={`stat-tile-delta ${deltaGood ? 'delta-good' : 'delta-bad'}`}>
          {delta} <span className="delta-period">{deltaLabel}</span>
        </span>
      )}
    </div>
  );
}
