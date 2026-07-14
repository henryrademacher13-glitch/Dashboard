import { useRef, useState } from 'react'
import {
  MAP_W, MAP_H, CATEGORIES, START, STREETS, WALKWAYS, PARKS, CORRIDOR,
  CONTEXT_BUILDINGS, BUILDINGS, T_STOPS, routeToPath,
} from '../data/campus'

function BuildingLabel({ b, dark }) {
  const lines = b.label.split('\n')
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2 - (lines.length - 1) * 5.5
  return (
    <text
      x={cx} y={cy}
      className={dark ? 'bldg-label bldg-label-dark' : 'bldg-label'}
      textAnchor="middle" dominantBaseline="middle"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? 0 : 11}>{line}</tspan>
      ))}
    </text>
  )
}

export default function CampusMap({ selected, onSelect, activeCategories }) {
  const svgRef = useRef(null)
  const [view, setView] = useState({ x: 0, y: 0, w: MAP_W })
  const drag = useRef(null)
  const justDragged = useRef(false)

  const viewH = view.w * (MAP_H / MAP_W)

  const clampView = (v) => {
    const w = Math.min(Math.max(v.w, 280), MAP_W)
    const h = w * (MAP_H / MAP_W)
    return {
      w,
      x: Math.min(Math.max(v.x, 0), MAP_W - w),
      y: Math.min(Math.max(v.y, 0), MAP_H - h),
    }
  }

  const zoom = (factor, cx = view.x + view.w / 2, cy = view.y + viewH / 2) => {
    setView((v) => {
      const w = v.w * factor
      const h = w * (MAP_H / MAP_W)
      const vh = v.w * (MAP_H / MAP_W)
      return clampView({
        w,
        x: cx - ((cx - v.x) / v.w) * w,
        y: cy - ((cy - v.y) / vh) * h,
      })
    })
  }

  const toMapCoords = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    return [
      view.x + ((e.clientX - rect.left) / rect.width) * view.w,
      view.y + ((e.clientY - rect.top) / rect.height) * viewH,
    ]
  }

  const onWheel = (e) => {
    const [cx, cy] = toMapCoords(e)
    zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy)
  }

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false }
    justDragged.current = false
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = ((e.clientX - drag.current.x) / rect.width) * view.w
    const dy = ((e.clientY - drag.current.y) / rect.height) * viewH
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 4) {
      // Capture only once a real drag starts, so plain clicks still
      // reach the building elements underneath.
      if (!drag.current.moved) svgRef.current.setPointerCapture(e.pointerId)
      drag.current.moved = true
      justDragged.current = true
    }
    setView(clampView({
      w: drag.current.view.w,
      x: drag.current.view.x - dx,
      y: drag.current.view.y - dy,
    }))
  }
  const onPointerUp = () => { drag.current = null }

  const clickBuilding = (b) => {
    if (justDragged.current) return
    onSelect(b.id === selected?.id ? null : b)
  }

  const dimmed = (b) => activeCategories.size > 0 && !activeCategories.has(b.category)

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        className="campus-map"
        viewBox={`${view.x} ${view.y} ${view.w} ${viewH}`}
        role="img"
        aria-label="Stylized map of the Northeastern University campus"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <rect x="0" y="0" width={MAP_W} height={MAP_H} className="map-bg" />

        {PARKS.map((p) => (
          <g key={p.name}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="10" className="park" />
            <text x={p.x + 12} y={p.y + 20} className="park-label">{p.name}</text>
          </g>
        ))}

        <rect x={CORRIDOR.x} y={CORRIDOR.y} width={CORRIDOR.w} height={CORRIDOR.h} className="park corridor" />
        <text x={14} y={CORRIDOR.y + 22} className="park-label">Southwest Corridor Park</text>
        <line x1="0" y1={CORRIDOR.y + CORRIDOR.h / 2} x2="1000" y2={CORRIDOR.y + CORRIDOR.h / 2} className="orange-line" />

        {STREETS.map((s) => (
          <g key={s.name}>
            <line x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]} className="street" strokeWidth={s.width} />
            <text
              x={s.labelAt[0]} y={s.labelAt[1]}
              className="street-label"
              transform={s.vertical ? `rotate(90 ${s.labelAt[0]} ${s.labelAt[1]})` : undefined}
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* Green Line E running down Huntington Ave */}
        <line x1="0" y1="222" x2="1000" y2="222" className="green-line" />
        {T_STOPS.map((t) => (
          <g key={t.name}>
            <circle cx={t.at[0]} cy={t.at[1]} r="6" className="t-stop" />
            <text x={t.at[0]} y={t.at[1] + 2.6} textAnchor="middle" className="t-stop-label">T</text>
          </g>
        ))}

        {WALKWAYS.map((w, i) => (
          <polyline key={i} points={w.map((p) => p.join(',')).join(' ')} className="walkway" />
        ))}

        {CONTEXT_BUILDINGS.map((b) => (
          <g key={b.name} className="ctx-bldg">
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
            <title>{b.name}</title>
            <BuildingLabel b={b} />
          </g>
        ))}

        {BUILDINGS.map((b) => {
          const color = CATEGORIES[b.category].color
          const isSel = selected?.id === b.id
          return (
            <g
              key={b.id}
              className={`bldg ${isSel ? 'selected' : ''} ${dimmed(b) ? 'dimmed' : ''}`}
              onClick={() => clickBuilding(b)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && clickBuilding(b)}
            >
              <title>{`${b.name} — ${b.minutes} min walk from East Village`}</title>
              {b.marker ? (
                <circle cx={b.x + b.w / 2} cy={b.y + b.h / 2} r="9" fill={color} className="marker" />
              ) : (
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={color} fillOpacity="0.28" stroke={color} />
              )}
              {b.marker ? (
                <text x={b.x + b.w / 2} y={b.y + b.h + 14} textAnchor="middle" className="bldg-label">
                  {b.label}
                </text>
              ) : (
                <BuildingLabel b={b} />
              )}
            </g>
          )
        })}

        {/* Route from East Village to the selected destination */}
        {selected && (
          <g className="route">
            <path d={routeToPath(selected.route)} className="route-casing" />
            <path d={routeToPath(selected.route)} className="route-line" />
            <circle r="6" className="route-walker">
              <animateMotion dur={`${Math.max(selected.minutes * 0.6, 3)}s`} repeatCount="indefinite" path={routeToPath(selected.route)} />
            </circle>
            {(() => {
              const [ex, ey] = selected.route[selected.route.length - 1]
              return (
                <g className="route-pin" transform={`translate(${ex} ${ey})`}>
                  <path d="M0 0 C -8 -12, -8 -22, 0 -22 C 8 -22, 8 -12, 0 0 Z" />
                  <circle cx="0" cy="-15" r="3.5" />
                </g>
              )
            })()}
          </g>
        )}

        {/* East Village — you are here */}
        <g className="start-bldg" onClick={() => onSelect(null)}>
          <title>East Village — 291 St. Botolph St (your residence hall)</title>
          <rect x={START.x} y={START.y} width={START.w} height={START.h} rx="6" />
          <BuildingLabel b={START} dark />
          <g transform={`translate(${START.x + START.w / 2} ${START.y - 8})`} className="start-flag">
            <circle cx="0" cy="-8" r="10" />
            <path d="M0 -13 L1.6 -9.6 L5.3 -9.4 L2.5 -7 L3.4 -3.4 L0 -5.4 L-3.4 -3.4 L-2.5 -7 L-5.3 -9.4 L-1.6 -9.6 Z" className="start-star" />
          </g>
        </g>

        <text x={MAP_W - 12} y={MAP_H - 12} textAnchor="end" className="map-note">
          Stylized map — not to scale
        </text>
      </svg>

      <div className="zoom-controls">
        <button onClick={() => zoom(1 / 1.3)} aria-label="Zoom in">+</button>
        <button onClick={() => zoom(1.3)} aria-label="Zoom out">−</button>
        <button onClick={() => setView({ x: 0, y: 0, w: MAP_W })} aria-label="Reset view">⤢</button>
      </div>
    </div>
  )
}
