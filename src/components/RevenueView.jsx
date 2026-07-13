import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import StatTile from './StatTile';
import ChartTooltip from './ChartTooltip';
import StatusPill from './StatusPill';
import { useChartTheme, fmt } from '../theme';
import { isPaying, monthsBilled } from '../store';

export default function RevenueView({ store }) {
  const theme = useChartTheme();
  const { clients, mrrGrowth } = store;

  const paying = clients.filter(isPaying);
  const mrr = paying.reduce((a, c) => a + c.monthlyFee, 0);
  const pausedFees = clients.filter((c) => c.status === 'paused').reduce((a, c) => a + c.monthlyFee, 0);

  const byFee = [...clients].sort((a, b) => b.monthlyFee - a.monthlyFee);
  const feeChartData = byFee
    .filter((c) => c.monthlyFee > 0)
    .map((c) => ({ name: c.name, fee: c.monthlyFee, paying: isPaying(c) }));

  if (clients.length === 0) {
    return (
      <div className="empty-state">
        <span>Add a client to start tracking revenue.</span>
      </div>
    );
  }

  return (
    <div className="revenue-view">
      <div className="kpi-row">
        <StatTile label="Monthly recurring revenue" value={fmt.money(mrr)} />
        <StatTile label="Paying clients" value={paying.length} />
        <StatTile label="Avg. fee per client" value={paying.length > 0 ? fmt.money(mrr / paying.length) : '—'} />
        <StatTile label="Projected annual" value={fmt.money(mrr * 12)} />
      </div>

      <div className="chart-pair">
        <div className="card">
          <h2 className="card-title">Monthly recurring revenue</h2>
          <p className="card-subtitle">Based on current fees and statuses</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={mrrGrowth} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 12 }} stroke={theme.baseline} tickLine={false} />
                <YAxis tick={{ fill: theme.muted, fontSize: 12 }} stroke="none" tickLine={false} tickFormatter={(v) => '$' + fmt.compact(v)} />
                <Tooltip content={<ChartTooltip format={(v) => fmt.money(v)} />} cursor={{ stroke: theme.baseline, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  name="MRR"
                  stroke={theme.series1}
                  strokeWidth={2}
                  fill={theme.series1}
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Monthly fee by client</h2>
          <p className="card-subtitle">Paused clients aren't billed</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={Math.max(200, feeChartData.length * 36 + 40)}>
              <BarChart data={feeChartData} layout="vertical" margin={{ top: 0, right: 12, left: 40, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} horizontal={false} />
                <XAxis type="number" tick={{ fill: theme.muted, fontSize: 12 }} stroke={theme.baseline} tickLine={false} tickFormatter={(v) => '$' + fmt.compact(v)} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: theme.muted, fontSize: 12 }} stroke="none" tickLine={false} />
                <Tooltip content={<ChartTooltip format={(v) => fmt.money(v)} />} cursor={{ fill: theme.grid, fillOpacity: 0.4 }} />
                <Bar dataKey="fee" name="Monthly fee" maxBarSize={18} radius={[0, 4, 4, 0]}>
                  {feeChartData.map((d) => (
                    <Cell key={d.name} fill={d.paying ? theme.series1 : theme.baseline} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Client fees</h2>
        <p className="card-subtitle">
          Edit a fee to update it everywhere{pausedFees > 0 ? ` · ${fmt.money(pausedFees)}/mo currently paused` : ''}
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th className="num">Monthly fee</th>
              <th className="num">Share of MRR</th>
              <th>Paying since</th>
              <th className="num">Months billed</th>
              <th className="num">Lifetime billed</th>
            </tr>
          </thead>
          <tbody>
            {byFee.map((c) => {
              const months = monthsBilled(c);
              return (
                <tr key={c.id}>
                  <td className="cell-strong">{c.name}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td className="num">
                    <span className="fee-edit">
                      $
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={c.monthlyFee}
                        aria-label={`Monthly fee for ${c.name}`}
                        onChange={(e) => store.updateClientFee(c.id, Math.max(0, Number(e.target.value) || 0))}
                      />
                    </span>
                  </td>
                  <td className="num">{isPaying(c) && mrr > 0 ? ((c.monthlyFee / mrr) * 100).toFixed(0) + '%' : '—'}</td>
                  <td>{new Date(c.addedAt + 'T00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                  <td className="num">{isPaying(c) ? months : '—'}</td>
                  <td className="num">{isPaying(c) ? fmt.money(c.monthlyFee * months) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
