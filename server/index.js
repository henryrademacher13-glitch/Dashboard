// Local dashboard server: serves the web app and a small JSON API over
// Claude Code's local data. One process for both dev (Vite middleware)
// and production (built files from dist/).
import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { listSessions, getSession, buildReport, knownProjects } from './claude-data.js'
import { discoverActions, startRun, listRuns, getRun, publicRun, askClaude } from './actions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const PORT = Number(process.env.PORT) || 5173
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod')

const app = express()
app.use(express.json())

// --- API -------------------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/projects', (_req, res) => res.json(knownProjects()))

app.get('/api/report', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  res.json(buildReport(date))
})

app.post('/api/report/narrative', async (req, res) => {
  const date = req.body?.date || new Date().toISOString().slice(0, 10)
  const report = buildReport(date)
  const prompt = [
    'You are writing a short daily report about work done with Claude Code, for a teammate who is not an engineer.',
    'Write 2-3 short paragraphs in plain, friendly language. No headers, no code, no jargon.',
    'Mention what was worked on, roughly how much activity there was, and anything notable. If there was no activity, say so briefly.',
    `Here is the day's activity data as JSON:\n${JSON.stringify(report)}`,
  ].join('\n\n')
  try {
    const text = await askClaude(prompt)
    res.json({ date, narrative: text })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/sessions', (_req, res) => res.json(listSessions()))

app.get('/api/sessions/:id', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

app.get('/api/actions', (req, res) => {
  res.json(discoverActions(req.query.project || null))
})

app.get('/api/runs', (_req, res) => res.json(listRuns()))

app.post('/api/runs', (req, res) => {
  const { kind, name, args, prompt, cwd, access } = req.body || {}
  if (kind === 'prompt' && !prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' })
  if (kind !== 'prompt' && !name) return res.status(400).json({ error: 'Action name is required' })
  res.json(startRun({ kind, name, args, prompt, cwd, access: access === 'full' ? 'full' : 'safe' }))
})

app.get('/api/runs/:id', (req, res) => {
  const run = getRun(req.params.id)
  if (!run) return res.status(404).json({ error: 'Run not found' })
  res.json(publicRun(run))
})

// Live progress for a run, as server-sent events.
app.get('/api/runs/:id/events', (req, res) => {
  const run = getRun(req.params.id)
  if (!run) return res.status(404).json({ error: 'Run not found' })
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  const send = (event) => {
    if (event === null) { res.write('event: end\ndata: {}\n\n'); res.end(); return }
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  for (const event of run.events) send(event)
  if (run.status !== 'running') { send(null); return }
  run.listeners.add(send)
  req.on('close', () => run.listeners.delete(send))
})

// --- Frontend ---------------------------------------------------------------

if (isProd) {
  const dist = path.join(root, 'dist')
  if (!fs.existsSync(dist)) {
    console.error('No dist/ folder found. Run "npm run build" first, or use "npm start".')
    process.exit(1)
  }
  app.use(express.static(dist))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  app.listen(PORT, () => console.log(`Claude Dashboard running at http://localhost:${PORT}`))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
  app.listen(PORT, () => console.log(`Claude Dashboard (dev) running at http://localhost:${PORT}`))
}
