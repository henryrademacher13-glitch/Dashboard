import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { api } from '../api.js'
import { todayStr, shiftDate, fmtDateLong, fmtDateShort, fmtTime } from '../format.js'
import { ChevronLeftIcon, ChevronRightIcon, SparkleIcon, CopyIcon, CheckIcon } from '../icons.jsx'

function useCssVar(name) {
  return useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    [name],
  )
}

function HourChart({ byHour }) {
  const accent = useCssVar('--accent')
  const grid = useCssVar('--grid')
  const muted = useCssVar('--muted')
  const surface = useCssVar('--surface')
  const ink = useCssVar('--ink')
  const data = byHour.map((d) => ({
    ...d,
    label: new Date(2000, 0, 1, d.hour).toLocaleTimeString(undefined, { hour: 'numeric' }),
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid} strokeWidth={1} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={3}
          tick={{ fill: muted, fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: muted, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(137,135,129,0.12)' }}
          contentStyle={{
            background: surface, border: '1px solid ' + grid, borderRadius: 8,
            fontSize: 12.5, color: ink,
          }}
          labelStyle={{ color: ink, fontWeight: 600 }}
          formatter={(value) => [`${value} steps`, null]}
          separator=""
        />
        <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function StatTile({ value, label }) {
  return (
    <div className="card stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function TodayView({ openSession }) {
  const [date, setDate] = useState(todayStr())

  return (
    <div>
      <div className="page-head">
        <h1>{fmtDateShort(date) === 'Today' ? 'Today' : fmtDateShort(date)}</h1>
        <div className="date-nav">
          <button className="btn" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
            <ChevronLeftIcon />
          </button>
          <button className="btn" onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayStr()} aria-label="Next day">
            <ChevronRightIcon />
          </button>
          {date !== todayStr() && (
            <button className="btn" onClick={() => setDate(todayStr())}>Back to today</button>
          )}
        </div>
      </div>
      <p className="page-sub">{fmtDateLong(date)} — what Claude Code worked on.</p>
      {/* Keyed by date so state resets naturally when the day changes. */}
      <DayReport key={date} date={date} openSession={openSession} />
    </div>
  )
}

function DayReport({ date, openSession }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [narrative, setNarrative] = useState(null)
  const [writing, setWriting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.report(date).then(setReport).catch((e) => setError(e.message))
  }, [date])

  const writeNarrative = async () => {
    setWriting(true)
    setError(null)
    try {
      const res = await api.narrative(date)
      setNarrative(res.narrative)
    } catch (e) {
      setError(`Couldn't write the report: ${e.message}`)
    } finally {
      setWriting(false)
    }
  }

  const copyNarrative = async () => {
    await navigator.clipboard.writeText(narrative)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const maxTool = report?.topTools[0]?.count || 1

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      {!report && !error && <div className="empty">Loading…</div>}

      {report && (
        <>
          <div className="stat-row">
            <StatTile value={report.sessions} label="Sessions" />
            <StatTile value={report.prompts} label="Requests made" />
            <StatTile value={report.toolRuns} label="Work steps" />
            <StatTile value={report.filesEdited} label="Files changed" />
          </div>

          {report.sessions === 0 ? (
            <div className="card empty">No Claude Code activity on this day.</div>
          ) : (
            <>
              <div className="card">
                <h2 className="section" style={{ marginTop: 0 }}>Activity by hour</h2>
                <HourChart byHour={report.byHour} />
              </div>

              <div className="two-col" style={{ marginTop: 16 }}>
                <div className="card">
                  <h2 className="section" style={{ marginTop: 0 }}>Sessions this day</h2>
                  {report.sessionCards.map((s) => (
                    <div key={s.id} className="day-session" onClick={() => openSession(s.id)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="day-session-title">{s.title}</div>
                        <div className="small muted">
                          {s.project} · started {fmtTime(s.firstTime)}
                        </div>
                      </div>
                      <span className="chip neutral">{s.toolRuns} steps</span>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <h2 className="section" style={{ marginTop: 0 }}>Most used tools</h2>
                  {report.topTools.map((t) => (
                    <div key={t.name} className="hbar-row">
                      <div className="hbar-name">{t.name}</div>
                      <div className="hbar-track">
                        <div className="hbar-fill" style={{ width: `${(t.count / maxTool) * 100}%` }} />
                      </div>
                      <div className="hbar-count">{t.count}</div>
                    </div>
                  ))}
                  {report.projects.length > 0 && (
                    <>
                      <h2 className="section">Projects touched</h2>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {report.projects.map((p) => <span key={p} className="chip">{p}</span>)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <div className="page-head" style={{ marginBottom: narrative ? 12 : 0 }}>
              <h2 className="section" style={{ margin: 0 }}>Written daily report</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {narrative && (
                  <button className="btn small" onClick={copyNarrative}>
                    {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
                <button className="btn primary small" onClick={writeNarrative} disabled={writing}>
                  {writing ? <span className="spinner" /> : <SparkleIcon />}
                  {writing ? 'Writing…' : narrative ? 'Rewrite' : 'Write my daily report'}
                </button>
              </div>
            </div>
            {narrative ? (
              <p className="narrative" style={{ margin: 0 }}>{narrative}</p>
            ) : (
              !writing && (
                <p className="muted small" style={{ margin: '8px 0 0' }}>
                  Claude turns the day's activity into a short, plain-language summary you can paste into a standup or status update.
                </p>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
