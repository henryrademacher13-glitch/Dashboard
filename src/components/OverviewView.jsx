import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDays, ArrowRight } from 'lucide-react';
import StatTile from './StatTile';
import ChartTooltip from './ChartTooltip';
import StatusPill from './StatusPill';
import { useChartTheme, fmt } from '../theme';
import { isPaying } from '../store';

function formatMeetingDay(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function OverviewView({ store, onGoTo }) {
  const theme = useChartTheme();
  const { clients, meetings, clientGrowth } = store;

  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const addedThisMonth = clients.filter((c) => c.addedAt >= monthStart).length;
  const activeClients = clients.filter((c) => c.status === 'active');

  const mrr = clients.filter(isPaying).reduce((total, c) => total + c.monthlyFee, 0);

  const today = new Date().toISOString().slice(0, 10);
  const weekEndDate = new Date(today + 'T00:00');
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);
  const upcoming = meetings
    .filter((m) => !m.done && m.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const meetingsThisWeek = upcoming.filter((m) => m.date <= weekEnd).length;

  const clientName = (id) => clients.find((c) => c.id === id)?.name ?? 'Unknown client';

  return (
    <div className="overview">
      <div className="kpi-row">
        <StatTile
          label="Total clients"
          value={clients.length}
          delta={addedThisMonth > 0 ? `+${addedThisMonth}` : '±0'}
          deltaLabel="this month"
          deltaGood={addedThisMonth >= 0}
        />
        <StatTile label="Active clients" value={activeClients.length} />
        <StatTile label="Monthly recurring revenue" value={fmt.money(mrr)} />
        <StatTile label="Meetings this week" value={meetingsThisWeek} />
      </div>

      <div className="overview-grid">
        <div className="card">
          <h2 className="card-title">Client growth</h2>
          <p className="card-subtitle">Total clients by month</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={clientGrowth} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 12 }} stroke={theme.baseline} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: theme.muted, fontSize: 12 }} stroke="none" tickLine={false} />
                <Tooltip content={<ChartTooltip format={(v) => fmt.int(v)} />} cursor={{ stroke: theme.baseline, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Clients"
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
          <div className="card-head">
            <div>
              <h2 className="card-title">Upcoming meetings</h2>
              <p className="card-subtitle">Next on the calendar</p>
            </div>
            <button className="link-btn" onClick={() => onGoTo('meetings')}>
              All meetings <ArrowRight size={14} />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state small">
              <CalendarDays size={20} />
              <span>Nothing scheduled.</span>
            </div>
          ) : (
            <ul className="mini-meeting-list">
              {upcoming.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <div className="mini-meeting-when">
                    <span className="mini-meeting-day">{formatMeetingDay(m.date)}</span>
                    <span className="mini-meeting-time">{m.time}</span>
                  </div>
                  <div className="mini-meeting-what">
                    <span className="mini-meeting-title">{m.title}</span>
                    <span className="mini-meeting-client">{clientName(m.clientId)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Newest clients</h2>
            <p className="card-subtitle">Most recently added</p>
          </div>
          <button className="link-btn" onClick={() => onGoTo('clients')}>
            All clients <ArrowRight size={14} />
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Status</th>
              <th className="num">Monthly fee</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {[...clients]
              .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
              .slice(0, 5)
              .map((c) => (
                <tr key={c.id}>
                  <td className="cell-strong">{c.name}</td>
                  <td>{c.contact}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td className="num">{c.monthlyFee > 0 ? fmt.money(c.monthlyFee) : '—'}</td>
                  <td>{new Date(c.addedAt + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
