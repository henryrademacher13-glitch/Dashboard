// Reads Claude Code's local data (~/.claude) and turns raw session JSONL
// files into friendly session summaries, transcripts, and daily reports.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

// ---------------------------------------------------------------------------
// JSONL parsing

const cache = new Map() // file -> { mtimeMs, size, parsed }

function readJsonl(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const out = []
  for (const line of lines) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* partial line while session is live */ }
  }
  return out
}

function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n')
  }
  return ''
}

// Prompts injected by the harness rather than typed by a person.
function isSyntheticPrompt(text) {
  const t = text.trimStart()
  return (
    t === '' ||
    t.startsWith('<system-reminder') ||
    t.startsWith('<command-') ||
    t.startsWith('<local-command') ||
    t.startsWith('Caveat:')
  )
}

function toolSummary(name, input = {}) {
  switch (name) {
    case 'Bash': return input.description || input.command || ''
    case 'Read': case 'Write': case 'Edit': case 'NotebookEdit':
      return input.file_path || ''
    case 'Glob': return input.pattern || ''
    case 'Grep': return input.pattern ? `"${input.pattern}"` : ''
    case 'WebFetch': return input.url || ''
    case 'WebSearch': return input.query || ''
    case 'Task': case 'Agent': return input.description || ''
    case 'Skill': return input.skill ? `/${input.skill} ${input.args || ''}`.trim() : ''
    case 'TodoWrite': case 'TaskCreate': case 'TaskUpdate': return ''
    default: {
      const s = JSON.stringify(input)
      return s.length > 120 ? s.slice(0, 117) + '…' : s
    }
  }
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])

function parseSessionFile(file) {
  const stat = fs.statSync(file)
  const hit = cache.get(file)
  if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) return hit.parsed

  const rows = readJsonl(file)
  const events = [] // transcript in order
  const toolsById = new Map()
  const meta = {
    id: path.basename(file, '.jsonl'),
    file,
    cwd: null,
    gitBranch: null,
    model: null,
    title: null,
    startedAt: null,
    endedAt: null,
    prompts: 0,
    replies: 0,
    toolRuns: 0,
    toolCounts: {},
    filesEdited: new Set(),
    bashCommands: 0,
  }
  let latestSummary = null
  let firstPrompt = null

  for (const row of rows) {
    if (row.type === 'summary' && row.summary) { latestSummary = row.summary; continue }
    if (row.isSidechain) continue // subagent traffic — keep the main thread readable
    if (row.cwd && !meta.cwd) meta.cwd = row.cwd
    if (row.gitBranch) meta.gitBranch = row.gitBranch
    if (row.timestamp) {
      if (!meta.startedAt) meta.startedAt = row.timestamp
      meta.endedAt = row.timestamp
    }

    if (row.type === 'user' && row.message) {
      const content = row.message.content
      const toolResults = Array.isArray(content) ? content.filter((b) => b.type === 'tool_result') : []
      if (toolResults.length > 0 || row.toolUseResult) {
        for (const tr of toolResults) {
          const tool = toolsById.get(tr.tool_use_id)
          if (tool) tool.status = tr.is_error ? 'error' : 'ok'
        }
        continue
      }
      if (row.isMeta || row.isCompactSummary) continue
      const text = extractText(content)
      if (isSyntheticPrompt(text)) continue
      meta.prompts++
      if (!firstPrompt) firstPrompt = text
      events.push({ kind: 'prompt', text, time: row.timestamp })
      continue
    }

    if (row.type === 'assistant' && row.message) {
      if (row.message.model) meta.model = row.message.model
      const blocks = Array.isArray(row.message.content) ? row.message.content : []
      for (const b of blocks) {
        if (b.type === 'text' && b.text && b.text.trim()) {
          meta.replies++
          const last = events[events.length - 1]
          // Consecutive text blocks from one turn read better merged.
          if (last && last.kind === 'reply' && last.uuid === row.parentUuid) {
            last.text += '\n\n' + b.text
          } else {
            events.push({ kind: 'reply', text: b.text, time: row.timestamp, uuid: row.uuid })
          }
        } else if (b.type === 'tool_use') {
          meta.toolRuns++
          meta.toolCounts[b.name] = (meta.toolCounts[b.name] || 0) + 1
          if (EDIT_TOOLS.has(b.name) && b.input?.file_path) meta.filesEdited.add(b.input.file_path)
          if (b.name === 'Bash') meta.bashCommands++
          const ev = { kind: 'tool', name: b.name, summary: toolSummary(b.name, b.input), time: row.timestamp, status: 'pending' }
          toolsById.set(b.id, ev)
          events.push(ev)
        }
      }
    }
  }

  if (latestSummary) {
    meta.title = latestSummary
  } else if (firstPrompt) {
    const flat = firstPrompt.replace(/\s+/g, ' ').trim()
    meta.title = flat.length > 100 ? flat.slice(0, 99) + '…' : flat
  } else {
    meta.title = 'Untitled session'
  }
  const parsed = { meta: { ...meta, filesEdited: [...meta.filesEdited] }, events }
  cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, parsed })
  return parsed
}

function sessionFiles() {
  if (!fs.existsSync(PROJECTS_DIR)) return []
  const files = []
  for (const dir of fs.readdirSync(PROJECTS_DIR)) {
    const full = path.join(PROJECTS_DIR, dir)
    let entries
    try { entries = fs.readdirSync(full) } catch { continue }
    for (const f of entries) {
      if (f.endsWith('.jsonl')) files.push(path.join(full, f))
    }
  }
  return files
}

function projectLabel(cwd) {
  return cwd ? path.basename(cwd) : 'unknown'
}

// ---------------------------------------------------------------------------
// Public API

export function listSessions() {
  const sessions = []
  for (const file of sessionFiles()) {
    try {
      const { meta } = parseSessionFile(file)
      if (!meta.startedAt) continue // bookkeeping-only files
      sessions.push({
        id: meta.id,
        title: meta.title,
        project: projectLabel(meta.cwd),
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        startedAt: meta.startedAt,
        endedAt: meta.endedAt,
        prompts: meta.prompts,
        toolRuns: meta.toolRuns,
        filesEdited: meta.filesEdited.length,
      })
    } catch { /* unreadable file — skip */ }
  }
  sessions.sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1))
  return sessions
}

export function getSession(id) {
  for (const file of sessionFiles()) {
    if (path.basename(file, '.jsonl') !== id) continue
    const { meta, events } = parseSessionFile(file)
    return {
      ...meta,
      project: projectLabel(meta.cwd),
      events,
    }
  }
  return null
}

export function knownProjects() {
  const seen = new Map()
  for (const file of sessionFiles()) {
    try {
      const { meta } = parseSessionFile(file)
      if (meta.cwd && fs.existsSync(meta.cwd) && !seen.has(meta.cwd)) {
        seen.set(meta.cwd, { cwd: meta.cwd, name: projectLabel(meta.cwd) })
      }
    } catch { /* skip */ }
  }
  if (seen.size === 0) {
    const cwd = process.cwd()
    seen.set(cwd, { cwd, name: projectLabel(cwd) })
  }
  return [...seen.values()]
}

function localDateOf(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function buildReport(date) {
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  const toolCounts = {}
  const filesEdited = new Set()
  const projects = new Set()
  const sessionCards = []
  let prompts = 0
  let toolRuns = 0
  let bashCommands = 0

  for (const file of sessionFiles()) {
    let parsed
    try { parsed = parseSessionFile(file) } catch { continue }
    const { meta, events } = parsed
    const dayEvents = events.filter((e) => e.time && localDateOf(e.time) === date)
    if (dayEvents.length === 0) continue

    projects.add(projectLabel(meta.cwd))
    let sPrompts = 0
    let sTools = 0
    for (const e of dayEvents) {
      byHour[new Date(e.time).getHours()].count++
      if (e.kind === 'prompt') { prompts++; sPrompts++ }
      if (e.kind === 'tool') {
        toolRuns++
        sTools++
        toolCounts[e.name] = (toolCounts[e.name] || 0) + 1
        if (e.name === 'Bash') bashCommands++
        if (EDIT_TOOLS.has(e.name) && e.summary) filesEdited.add(e.summary)
      }
    }
    sessionCards.push({
      id: meta.id,
      title: meta.title,
      project: projectLabel(meta.cwd),
      firstTime: dayEvents[0].time,
      lastTime: dayEvents[dayEvents.length - 1].time,
      prompts: sPrompts,
      toolRuns: sTools,
    })
  }

  sessionCards.sort((a, b) => (a.firstTime < b.firstTime ? -1 : 1))
  const topTools = Object.entries(toolCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    date,
    sessions: sessionCards.length,
    prompts,
    toolRuns,
    bashCommands,
    filesEdited: filesEdited.size,
    filesEditedList: [...filesEdited].slice(0, 30),
    projects: [...projects],
    byHour,
    topTools,
    sessionCards,
  }
}
