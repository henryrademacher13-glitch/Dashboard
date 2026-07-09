import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import StatTile from './StatTile';
import ChartTooltip from './ChartTooltip';
import { useChartTheme, fmt } from '../theme';
import { getDailyAdMetrics, getCampaignBreakdown, sumMetrics } from '../store';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

export default function AnalyticsView({ store }) {
  const theme = useChartTheme();
  const { clients } = store;
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [days, setDays] = useState(30);

  const client = clients.find((c) => c.id === clientId) ?? clients[0];

  const daily = useMemo(() => (client ? getDailyAdMetrics(client, days) : []), [client, days]);
  const campaigns = useMemo(() => (client ? getCampaignBreakdown(client, days) : []), [client, days]);
  const totals = useMemo(() => sumMetrics(daily), [daily]);

  if (!client) {
    return (
      <div className="empty-state">
        <span>Add a client to see their Meta ads analytics.</span>
      </div>
    );
  }

  return (
    <div className="analytics-view">
      <div className="filter-row">
        <select
          className="client-select"
          value={client.id}
          onChange={(e) => setClientId(e.target.value)}
          aria-label="Select client"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r.days} className={days === r.days ? 'active' : ''} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
        {client.status === 'paused' && <span className="filter-note">Campaigns paused — spend has stopped.</span>}
      </div>

      <div className="kpi-row six">
        <StatTile label="Spend" value={fmt.money(totals.spend)} />
        <StatTile label="Impressions" value={fmt.compact(totals.impressions)} />
        <StatTile label="Clicks" value={fmt.compact(totals.clicks)} />
        <StatTile label="CTR" value={totals.ctr.toFixed(2) + '%'} />
        <StatTile label="Avg. CPC" value={totals.cpc > 0 ? '$' + totals.cpc.toFixed(2) : '—'} />
        <StatTile label="ROAS" value={totals.spend > 0 ? totals.roas.toFixed(1) + 'x' : '—'} />
      </div>

      <div className="chart-pair">
        <div className="card">
          <h2 className="card-title">Daily spend</h2>
          <p className="card-subtitle">Meta ads spend, last {days} days</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={daily} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 12 }} stroke={theme.baseline} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: theme.muted, fontSize: 12 }} stroke="none" tickLine={false} tickFormatter={(v) => '$' + fmt.compact(v)} />
                <Tooltip content={<ChartTooltip format={(v) => fmt.moneyExact(v)} />} cursor={{ stroke: theme.baseline, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="Spend"
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
          <h2 className="card-title">Daily conversions</h2>
          <p className="card-subtitle">Purchases attributed to Meta ads</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={daily} margin={{ top: 8, right: 12, left: -18, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 12 }} stroke={theme.baseline} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: theme.muted, fontSize: 12 }} stroke="none" tickLine={false} />
                <Tooltip content={<ChartTooltip format={(v) => fmt.int(v)} />} cursor={{ fill: theme.grid, fillOpacity: 0.4 }} />
                <Bar dataKey="conversions" name="Conversions" fill={theme.series2} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Campaign breakdown</h2>
        <p className="card-subtitle">{client.name} · last {days} days</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th className="num">Spend</th>
              <th className="num">Impressions</th>
              <th className="num">Clicks</th>
              <th className="num">CTR</th>
              <th className="num">Conversions</th>
              <th className="num">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((cp) => (
              <tr key={cp.name}>
                <td className="cell-strong">{cp.name}</td>
                <td className="num">{fmt.moneyExact(cp.spend)}</td>
                <td className="num">{fmt.int(cp.impressions)}</td>
                <td className="num">{fmt.int(cp.clicks)}</td>
                <td className="num">{cp.impressions > 0 ? ((cp.clicks / cp.impressions) * 100).toFixed(2) + '%' : '—'}</td>
                <td className="num">{fmt.int(cp.conversions)}</td>
                <td className="num">{cp.spend > 0 ? (cp.revenue / cp.spend).toFixed(1) + 'x' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
