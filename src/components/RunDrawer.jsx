import { useEffect, useRef, useState } from 'react'
import { subscribeRun } from '../api.js'
import { XIcon } from '../icons.jsx'

export default function RunDrawer({ run, onClose }) {
  const [events, setEvents] = useState([])
  const [live, setLive] = useState(true)
  const bodyRef = useRef(null)

  // The drawer is always mounted with key={run.id}, so state starts fresh per run.
  useEffect(() => {
    const unsubscribe = subscribeRun(
      run.id,
      (event) => setEvents((prev) => [...prev, event]),
      () => setLive(false),
    )
    return unsubscribe
  }, [run.id])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events])

  const finished = events.find((e) => e.type === 'finished')
  const status = finished ? finished.status : live ? 'running' : 'done'

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Run progress">
        <div className="drawer-head">
          {status === 'running' && <span className="spinner" />}
          <div className="drawer-title">{run.label}</div>
          {status === 'done' && <span className="chip good">Finished</span>}
          {status === 'error' && <span className="chip bad">Failed</span>}
          <button className="btn small" onClick={onClose} aria-label="Close"><XIcon /></button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          {events.length === 0 && (
            <div className="run-event status">Starting Claude…</div>
          )}
          {events.map((e, i) => {
            if (e.type === 'text') return <div key={i} className="run-event text">{e.text}</div>
            if (e.type === 'tool') {
              return (
                <div key={i} className="run-event tool">
                  <span className="tool-name">{e.name}</span>
                  {e.text && <span className="tool-detail">{e.text}</span>}
                </div>
              )
            }
            if (e.type === 'status') return <div key={i} className="run-event status">{e.text}</div>
            if (e.type === 'error') return <div key={i} className="run-event error">{e.text}</div>
            if (e.type === 'finished') {
              return (
                <div key={i} className="run-event status">
                  {e.status === 'done' ? 'All done.' : 'The run stopped with an error.'}
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    </>
  )
}
