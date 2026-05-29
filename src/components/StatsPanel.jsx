import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StatsPanel({ habits, getDailyTotals }) {
  const data = getDailyTotals(14);
  const total = habits.length;

  return (
    <div className="stats-panel">
      <h3>Last 14 days</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
          <YAxis domain={[0, total || 1]} allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v) => [`${v} / ${total}`, 'Completed']}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.count === total && total > 0 ? '#10b981' : '#6366f1'} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
