import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { familyVisitPlaces, familyVisitWalls } from '../core/early-family-visit'
import './early-walk.css'

export default function FamilyHallMap({ label, helpId, prefix, position, place, box, near, onMove, onInteract }: {
  label: string; helpId: string; prefix: string; position: EarlyWalkPosition; place?: keyof typeof familyVisitPlaces; box: boolean; near: boolean
  onMove: (direction: EarlyWalkDirection) => void; onInteract: () => void
}) {
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden || event.altKey || event.ctrlKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); onMove(directions[value]) }
    else if (value === 'e' && near) { event.preventDefault(); onInteract() }
  }
  return <>
    <svg ref={field} role="group" aria-label={label} aria-describedby={helpId} tabIndex={0}
      className="early-walk-map" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#22352f" />
      <rect x="35" y="255" width="180" height="140" rx="8" fill="#3d4839" />
      <rect x="255" y="30" width="425" height="315" rx="8" fill="#4b4335" />
      <path d="M100 330 H210 V270 H270 H400 V100 H550 M350 170 V310 H610 V270" fill="none" stroke="#9c8960" strokeWidth="18" opacity=".3" />
      {familyVisitWalls.map((wall, index) => <rect key={index} {...wall} rx="3" fill="#17251f" />)}
      <text x="125" y="285" textAnchor="middle" fill="#dfc9a0" fontSize="12">清晨 · 拜师之前</text>
      <text x="465" y="58" textAnchor="middle" fill="#dfc9a0" fontSize="15">萧家接待厅</text>
      <text x="480" y="230" textAnchor="middle" fill="#c8ac7b" fontSize="11">厅中陈设</text>
      {Object.entries(familyVisitPlaces).map(([id, target]) => <g key={id}>
        <circle cx={target.x} cy={target.y} r="24" fill="none" stroke={place === id ? '#f7d699' : '#b09b71'} strokeDasharray="4 5" />
        <text x={target.x} y={target.y + 37} textAnchor="middle" fill="#edcea0" fontSize="11">{target.label}</text>
      </g>)}
      {box && <g aria-label="仍在来客席的玉匣"><rect x="580" y="242" width="28" height="16" rx="3" fill="#9da778" /><circle cx="595" cy="248" r="4" fill="#d5cf91" /></g>}
      <g aria-label="萧炎行走位置" transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
      </g>
    </svg>
    <div className="early-walk-controls" aria-label={`${prefix}行走操作`}>{(['up', 'left', 'down', 'right'] as const).map((direction, index) =>
      <button key={direction} className="secondary" aria-label={`${prefix}${['向上走', '向左走', '向下走', '向右走'][index]}`} onClick={() => onMove(direction)}>{['↑', '←', '↓', '→'][index]}</button>)}</div>
  </>
}
