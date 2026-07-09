// Shared Recharts tooltip: surface card, text in ink tokens, a colored
// swatch beside each entry carries series identity.
export default function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ background: entry.color }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <span className="chart-tooltip-value">{format ? format(entry.value, entry.dataKey) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}
