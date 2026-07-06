async function json(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try { message = (await res.json()).error || message } catch { /* keep default */ }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  report: (date) => fetch(`/api/report?date=${date}`).then(json),
  narrative: (date) =>
    fetch('/api/report/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }).then(json),
  sessions: () => fetch('/api/sessions').then(json),
  session: (id) => fetch(`/api/sessions/${id}`).then(json),
  projects: () => fetch('/api/projects').then(json),
  actions: (project) => fetch(`/api/actions?project=${encodeURIComponent(project || '')}`).then(json),
  runs: () => fetch('/api/runs').then(json),
  startRun: (body) =>
    fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(json),
}

// Subscribe to a run's live events. Returns an unsubscribe function.
export function subscribeRun(id, onEvent, onEnd) {
  const source = new EventSource(`/api/runs/${id}/events`)
  source.onmessage = (e) => onEvent(JSON.parse(e.data))
  source.addEventListener('end', () => { source.close(); onEnd?.() })
  source.onerror = () => { source.close(); onEnd?.() }
  return () => source.close()
}
