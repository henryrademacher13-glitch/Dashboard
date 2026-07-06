import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { fmtDateShort, fmtTime, fmtDuration, localDateOf } from '../format.js'
import { ChevronLeftIcon, ChevronDownIcon, ChevronRightIcon } from '../icons.jsx'

// Group consecutive tool events into one collapsible "worked on it" block so
// transcripts stay readable for non-engineers.
function groupEvents(events) {
  const groups = []
  for (const e of events) {
    const last = groups[groups.length - 1]
    if (e.kind === 'tool') {
      if (last?.kind === 'work') last.steps.push(e)
      else groups.push({ kind: 'work', steps: [e] })
    } else {
      groups.push(e)
    }
  }
  return groups
}

function WorkBlock({ steps }) {
  const [open, setOpen] = useState(false)
  const errors = steps.filter((s) => s.status === 'error').length
  return (
    <div className="work-block">
      <div className="work-summary" onClick={() => setOpen(!open)}>
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        Worked on it — {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        {errors > 0 && <span className="chip bad">{errors} hit a snag</span>}
      </div>
      {open && (
        <div className="work-steps">
          {steps.map((s, i) => (
            <div key={i} className={`work-step ${s.status === 'error' ? 'error' : ''}`}>
              <span className="tool-name">{s.name}</span>
              {s.summary && <span className="tool-detail">{s.summary}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionDetail({ id, onBack }) {
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.session(id).then(setSession).catch((e) => setError(e.message))
  }, [id])

  if (error) return (
    <div>
      <button className="back-link" onClick={onBack}><ChevronLeftIcon /> All sessions</button>
      <div className="error-banner">{error}</div>
    </div>
  )
  if (!session) return <div className="empty">Loading session…</div>

  const groups = groupEvents(session.events)

  return (
    <div>
      <button className="back-link" onClick={onBack}><ChevronLeftIcon /> All sessions</button>
      <div className="detail-head">
        <h1>{session.title}</h1>
        <div className="detail-meta">
          <span className="chip">{session.project}</span>
          {session.gitBranch && <span className="chip neutral">branch: {session.gitBranch}</span>}
          <span className="chip neutral">
            {fmtDateShort(localDateOf(session.startedAt))}, {fmtTime(session.startedAt)} · {fmtDuration(session.startedAt, session.endedAt)}
          </span>
          <span className="chip neutral">{session.prompts} requests</span>
          <span className="chip neutral">{session.toolRuns} work steps</span>
          {session.filesEdited.length > 0 && (
            <span className="chip neutral">{session.filesEdited.length} files changed</span>
          )}
        </div>
      </div>

      {session.filesEdited.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h2 className="section" style={{ marginTop: 0 }}>Files changed</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {session.filesEdited.map((f) => (
              <span key={f} className="hook-cmd">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="transcript">
        {groups.map((g, i) => {
          if (g.kind === 'work') return <WorkBlock key={i} steps={g.steps} />
          if (g.kind === 'prompt') {
            return (
              <div key={i} className="turn prompt">
                <div className="turn-label">You · {fmtTime(g.time)}</div>
                <div className="bubble">{g.text}</div>
              </div>
            )
          }
          return (
            <div key={i} className="turn reply">
              <div className="turn-label">Claude</div>
              <div className="bubble">{g.text}</div>
            </div>
          )
        })}
        {groups.length === 0 && <div className="empty">This session has no messages yet.</div>}
      </div>
    </div>
  )
}

export default function SessionsView({ sessionId, openSession }) {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.sessions().then(setSessions).catch((e) => setError(e.message))
  }, [sessionId]) // refresh the list when coming back from a detail view

  const grouped = useMemo(() => {
    if (!sessions) return []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? sessions.filter((s) =>
          [s.title, s.project, s.gitBranch].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
      : sessions
    const byDay = new Map()
    for (const s of filtered) {
      const day = localDateOf(s.endedAt)
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day).push(s)
    }
    return [...byDay.entries()]
  }, [sessions, query])

  if (sessionId) return <SessionDetail key={sessionId} id={sessionId} onBack={() => openSession('')} />

  return (
    <div>
      <div className="page-head">
        <h1>Sessions</h1>
        <input
          type="text"
          className="search-input"
          placeholder="Search sessions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="page-sub">Every Claude Code conversation on this machine, newest first. Click one to read it.</p>

      {error && <div className="error-banner">{error}</div>}
      {!sessions && !error && <div className="empty">Loading sessions…</div>}
      {sessions && grouped.length === 0 && (
        <div className="card empty">
          {query ? 'No sessions match that search.' : 'No sessions yet — start a conversation with Claude Code and it will show up here.'}
        </div>
      )}

      {grouped.map(([day, list]) => (
        <div key={day}>
          <div className="session-day-head">{fmtDateShort(day)}</div>
          {list.map((s) => (
            <div key={s.id} className="session-row" onClick={() => openSession(s.id)}>
              <div className="session-row-main">
                <div className="session-row-title">{s.title}</div>
                <div className="session-row-meta">
                  <span>{s.project}</span>
                  {s.gitBranch && <span>{s.gitBranch}</span>}
                  <span>{fmtTime(s.startedAt)} · {fmtDuration(s.startedAt, s.endedAt)}</span>
                </div>
              </div>
              <div className="session-row-stats">
                <span className="chip neutral">{s.prompts} requests</span>
                <span className="chip neutral">{s.toolRuns} steps</span>
                {s.filesEdited > 0 && <span className="chip">{s.filesEdited} files</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
