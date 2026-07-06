import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { timeAgo } from '../format.js'
import { PlayIcon, SparkleIcon } from '../icons.jsx'
import RunDrawer from './RunDrawer.jsx'

function ActionCard({ action, onRun }) {
  return (
    <div className="card action-card">
      <div className="action-card-head">
        <div className="action-name">/{action.name}</div>
        <span className="chip neutral">{action.scope}</span>
      </div>
      <div className="action-desc">{action.description}</div>
      <div>
        <button className="btn primary small" onClick={() => onRun(action)}>
          <PlayIcon /> Run
        </button>
      </div>
    </div>
  )
}

export default function ActionsView() {
  const [projects, setProjects] = useState([])
  const [project, setProject] = useState('')
  const [actions, setActions] = useState(null)
  const [runs, setRuns] = useState([])
  const [access, setAccess] = useState('safe')
  const [prompt, setPrompt] = useState('')
  const [activeRun, setActiveRun] = useState(null)
  const [error, setError] = useState(null)

  const refreshRuns = () => api.runs().then(setRuns).catch(() => {})

  useEffect(() => {
    api.projects().then((list) => {
      setProjects(list)
      if (list.length > 0) setProject(list[0].cwd)
    }).catch((e) => setError(e.message))
    api.runs().then(setRuns).catch(() => {})
  }, [])

  useEffect(() => {
    api.actions(project).then(setActions).catch((e) => setError(e.message))
  }, [project])

  const start = async (body) => {
    setError(null)
    try {
      const run = await api.startRun({ ...body, cwd: project, access })
      setActiveRun(run)
      refreshRuns()
    } catch (e) {
      setError(e.message)
    }
  }

  const runAction = (action) => start({ kind: action.kind, name: action.name })
  const runPrompt = () => {
    if (!prompt.trim()) return
    start({ kind: 'prompt', prompt: prompt.trim() })
  }

  const closeDrawer = () => { setActiveRun(null); refreshRuns() }

  return (
    <div>
      <div className="page-head">
        <h1>Actions</h1>
      </div>
      <p className="page-sub">
        Run your skills and commands with one click — no terminal needed. Each run happens in the project you pick below.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="action-toolbar">
        <label className="small muted">Project</label>
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          {projects.map((p) => <option key={p.cwd} value={p.cwd}>{p.name}</option>)}
        </select>
        <label className="small muted" style={{ marginLeft: 8 }}>Permissions</label>
        <div className="seg">
          <button className={access === 'safe' ? 'on' : ''} onClick={() => setAccess('safe')}>
            Safe
          </button>
          <button className={access === 'full' ? 'on' : ''} onClick={() => setAccess('full')}>
            Full access
          </button>
        </div>
        <span className="small muted">
          {access === 'safe'
            ? 'Claude can read and edit files; anything else is blocked.'
            : 'Claude can also run commands without asking. Use with care.'}
        </span>
      </div>

      <div className="card">
        <h2 className="section" style={{ marginTop: 0 }}>Ask Claude to do something</h2>
        <textarea
          rows={3}
          placeholder={'Describe what you want in plain English, e.g. "Update the README with setup instructions" or "Find and fix any typos in the docs".'}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={runPrompt} disabled={!prompt.trim()}>
            <SparkleIcon /> Run it
          </button>
        </div>
      </div>

      {!actions && <div className="empty">Loading actions…</div>}

      {actions && (
        <>
          <h2 className="section">Skills</h2>
          {actions.skills.length === 0 ? (
            <div className="card empty">
              No skills installed yet. Skills live in <code>~/.claude/skills</code> or a project's <code>.claude/skills</code> folder.
            </div>
          ) : (
            <div className="action-grid">
              {actions.skills.map((a) => (
                <ActionCard key={`${a.scope}:${a.name}`} action={a} onRun={runAction} />
              ))}
            </div>
          )}

          <h2 className="section">Slash commands</h2>
          {actions.commands.length === 0 ? (
            <div className="card empty">
              No custom commands found. Commands live in <code>~/.claude/commands</code> or a project's <code>.claude/commands</code> folder.
            </div>
          ) : (
            <div className="action-grid">
              {actions.commands.map((a) => (
                <ActionCard key={`${a.scope}:${a.name}`} action={a} onRun={runAction} />
              ))}
            </div>
          )}

          <h2 className="section">Automations (hooks)</h2>
          <div className="card">
            {actions.hooks.length === 0 ? (
              <div className="muted small">
                No hooks configured. Hooks run automatically at moments like session start or before a tool call — they're set up in Claude Code's settings.
              </div>
            ) : (
              actions.hooks.map((h, i) => (
                <div key={i} className="hook-row">
                  <span className="chip">{h.event}</span>
                  <span className="hook-cmd">{h.command}</span>
                  <span className="chip neutral" style={{ marginLeft: 'auto' }}>{h.scope}</span>
                </div>
              ))
            )}
            <p className="muted small" style={{ margin: '10px 0 0' }}>
              These run on their own inside Claude Code — nothing to click here.
            </p>
          </div>
        </>
      )}

      <h2 className="section">Recent runs</h2>
      <div className="card">
        {runs.length === 0 ? (
          <div className="muted small">Nothing has been run from the dashboard yet.</div>
        ) : (
          runs.map((r) => (
            <div key={r.id} className="run-row" onClick={() => setActiveRun(r)}>
              {r.status === 'running' && <span className="spinner" />}
              <span className="run-label">{r.label}</span>
              <span className="small muted">{timeAgo(r.startedAt)}</span>
              {r.status === 'done' && <span className="chip good">Finished</span>}
              {r.status === 'error' && <span className="chip bad">Failed</span>}
              {r.status === 'running' && <span className="chip">Running</span>}
            </div>
          ))
        )}
        <p className="muted small" style={{ margin: '10px 0 0' }}>
          Click a run to see what Claude did and said.
        </p>
      </div>

      {activeRun && <RunDrawer key={activeRun.id} run={activeRun} onClose={closeDrawer} />}
    </div>
  )
}
