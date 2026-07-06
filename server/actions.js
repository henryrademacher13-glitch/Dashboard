// Discovers runnable skills/commands and configured automations, and runs
// them headlessly through `claude -p`, streaming progress to the browser.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { CLAUDE_DIR } from './claude-data.js'

// ---------------------------------------------------------------------------
// Discovery

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const fm = {}
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
      if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '')
    }
  }
  return fm
}

function scanSkills(dir, scope) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const skillMd = path.join(dir, name, 'SKILL.md')
    if (!fs.existsSync(skillMd)) continue
    try {
      const fm = parseFrontmatter(fs.readFileSync(skillMd, 'utf8'))
      out.push({
        kind: 'skill',
        name: fm.name || name,
        description: fm.description || 'No description provided.',
        scope,
      })
    } catch { /* skip unreadable skill */ }
  }
  return out
}

function scanCommands(dir, scope, prefix = '') {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...scanCommands(path.join(dir, entry.name), scope, `${prefix}${entry.name}:`))
    } else if (entry.name.endsWith('.md')) {
      const name = prefix + entry.name.replace(/\.md$/, '')
      try {
        const text = fs.readFileSync(path.join(dir, entry.name), 'utf8')
        const fm = parseFrontmatter(text)
        const body = text.replace(/^---[\s\S]*?---\s*/, '').trim()
        out.push({
          kind: 'command',
          name,
          description: fm.description || body.split('\n')[0].slice(0, 140) || 'Custom slash command.',
          scope,
        })
      } catch { /* skip */ }
    }
  }
  return out
}

function readHooks(settingsFile, scope) {
  const out = []
  if (!fs.existsSync(settingsFile)) return out
  try {
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
    for (const [event, matchers] of Object.entries(settings.hooks || {})) {
      for (const matcher of matchers) {
        for (const hook of matcher.hooks || []) {
          out.push({
            event,
            matcher: matcher.matcher || '',
            command: hook.command || hook.type,
            scope,
          })
        }
      }
    }
  } catch { /* unreadable settings */ }
  return out
}

export function discoverActions(projectDir) {
  const skills = [
    ...scanSkills(path.join(CLAUDE_DIR, 'skills'), 'personal'),
    ...(projectDir ? scanSkills(path.join(projectDir, '.claude', 'skills'), 'project') : []),
  ]
  const commands = [
    ...scanCommands(path.join(CLAUDE_DIR, 'commands'), 'personal'),
    ...(projectDir ? scanCommands(path.join(projectDir, '.claude', 'commands'), 'project') : []),
  ]
  const hooks = [
    ...readHooks(path.join(CLAUDE_DIR, 'settings.json'), 'personal'),
    ...(projectDir ? readHooks(path.join(projectDir, '.claude', 'settings.json'), 'project') : []),
  ]
  return { skills, commands, hooks }
}

// ---------------------------------------------------------------------------
// Running actions through `claude -p`

const runs = new Map() // id -> run record
const RUNS_FILE = path.join(CLAUDE_DIR, 'dashboard-runs.json')

// Run history survives dashboard restarts via a small JSON file in ~/.claude.
try {
  for (const saved of JSON.parse(fs.readFileSync(RUNS_FILE, 'utf8'))) {
    runs.set(saved.id, { ...saved, listeners: new Set() })
  }
} catch { /* no history yet */ }

function persistRuns() {
  const finished = [...runs.values()]
    .filter((r) => r.status !== 'running')
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 200)
    .map(publicRun)
  try { fs.writeFileSync(RUNS_FILE, JSON.stringify(finished)) } catch { /* read-only disk */ }
}

function pushEvent(run, event) {
  event.time = new Date().toISOString()
  run.events.push(event)
  for (const listener of run.listeners) listener(event)
}

export function startRun({ kind, name, args, prompt, cwd, access }) {
  const id = crypto.randomUUID()
  let promptText
  let label
  if (kind === 'prompt') {
    promptText = prompt
    label = prompt.replace(/\s+/g, ' ').slice(0, 80)
  } else {
    promptText = `/${name}${args ? ' ' + args : ''}`
    label = promptText
  }

  const cliArgs = ['-p', promptText, '--output-format', 'stream-json', '--verbose']
  if (access === 'full') cliArgs.push('--dangerously-skip-permissions')
  else cliArgs.push('--permission-mode', 'acceptEdits')

  const run = {
    id, kind, label, cwd, access,
    status: 'running',
    startedAt: new Date().toISOString(),
    endedAt: null,
    sessionId: null,
    events: [],
    listeners: new Set(),
  }
  runs.set(id, run)

  const child = spawn('claude', cliArgs, {
    cwd: cwd || process.cwd(),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdoutBuf = ''
  let stderrBuf = ''

  child.stdout.on('data', (chunk) => {
    stdoutBuf += chunk
    let nl
    while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
      const line = stdoutBuf.slice(0, nl).trim()
      stdoutBuf = stdoutBuf.slice(nl + 1)
      if (!line) continue
      let msg
      try { msg = JSON.parse(line) } catch { continue }
      handleStreamMessage(run, msg)
    }
  })
  child.stderr.on('data', (chunk) => { stderrBuf += chunk })

  child.on('error', (err) => {
    pushEvent(run, { type: 'error', text: `Could not start claude: ${err.message}` })
    finishRun(run, 'error')
  })
  child.on('close', (code) => {
    if (run.status !== 'running') return
    if (code !== 0) {
      const detail = stderrBuf.trim().split('\n').slice(-3).join('\n')
      pushEvent(run, { type: 'error', text: detail || `claude exited with code ${code}` })
      finishRun(run, 'error')
    } else {
      finishRun(run, 'done')
    }
  })

  return publicRun(run)
}

function handleStreamMessage(run, msg) {
  if (msg.type === 'system' && msg.subtype === 'init') {
    run.sessionId = msg.session_id
    pushEvent(run, { type: 'status', text: `Claude started (model: ${msg.model || 'default'})` })
  } else if (msg.type === 'assistant' && msg.message?.content) {
    for (const block of msg.message.content) {
      if (block.type === 'text' && block.text?.trim()) {
        pushEvent(run, { type: 'text', text: block.text })
      } else if (block.type === 'tool_use') {
        const detail = block.input?.description || block.input?.command || block.input?.file_path || ''
        pushEvent(run, { type: 'tool', name: block.name, text: detail })
      }
    }
  } else if (msg.type === 'result') {
    run.result = msg.result || ''
    if (msg.is_error) {
      pushEvent(run, { type: 'error', text: msg.result || msg.subtype || 'Run failed' })
      finishRun(run, 'error')
    }
  }
}

function finishRun(run, status) {
  run.status = status
  run.endedAt = new Date().toISOString()
  pushEvent(run, { type: 'finished', status })
  for (const listener of run.listeners) listener(null) // signal end of stream
  run.listeners.clear()
  persistRuns()
}

export function publicRun(run) {
  const rest = { ...run }
  delete rest.listeners
  return rest
}

export function listRuns() {
  return [...runs.values()].map(publicRun).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
}

export function getRun(id) {
  return runs.get(id) || null
}

// One-shot helper: ask Claude a question with no tools, get plain text back.
export function askClaude(prompt, { cwd, timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt, '--output-format', 'json'], {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('Claude took too long to answer.'))
    }, timeoutMs)
    child.stdout.on('data', (c) => { out += c })
    child.stderr.on('data', (c) => { err += c })
    child.on('error', (e) => { clearTimeout(timer); reject(e) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(err.trim() || `claude exited with code ${code}`))
      try {
        const parsed = JSON.parse(out)
        resolve(parsed.result || '')
      } catch {
        resolve(out.trim())
      }
    })
  })
}
