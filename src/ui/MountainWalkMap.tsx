import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { mountainRingObstacles, mountainRingPlaces } from '../core/early-mountain-ring'
import './early-walk.css'

export default function MountainWalkMap({ label, helpId, prefix = '后山', position, place, ring, elderVisible,
  elderNamed = false, seated = false, bowed = false, purpleVisible = false, purpleNamed = false, purplePlace,
  purpleCardVisible = false, observerOnly = false, near, onMove, onInteract }: {
  label: string; helpId: string; prefix?: string; position: EarlyWalkPosition; place?: keyof typeof mountainRingPlaces
  ring: 'worn' | 'thrown' | 'floating'; elderVisible: boolean; elderNamed?: boolean; seated?: boolean; bowed?: boolean; purpleVisible?: boolean; near: boolean
  purpleNamed?: boolean; purplePlace?: keyof typeof mountainRingPlaces; purpleCardVisible?: boolean; observerOnly?: boolean
  onMove: (direction: EarlyWalkDirection) => void; onInteract: () => void
}) {
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden || event.altKey || event.ctrlKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value] && !observerOnly) { event.preventDefault(); onMove(directions[value]) }
    else if (value === 'e' && near) { event.preventDefault(); onInteract() }
  }
  const elderPoint = seated ? { x: 335, y: 75 } : { x: 585, y: 75 }
  const purplePoint = purplePlace ? { x: mountainRingPlaces[purplePlace].x + 40, y: mountainRingPlaces[purplePlace].y - 30 } : { x: 160, y: 300 }
  return <>
    <svg ref={field} role="group" aria-label={label} aria-describedby={helpId} tabIndex={0}
      className="early-walk-map" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#243b37" />
      <path d="M0 330 L180 80 L380 185 L600 35 L720 115 V0 H0Z" fill="#77998d" opacity=".25" />
      <path d="M80 330 H300 V110 H540" fill="none" stroke="#b6a178" strokeWidth="23" opacity=".35" />
      {mountainRingObstacles.map((rect, i) => <rect key={i} {...rect} rx="6" fill={i === 2 ? '#132824' : '#435649'} />)}
      <text x="675" y="220" textAnchor="middle" fill="#c9bc99" fontSize="12">崖外</text>
      <text x="675" y="240" textAnchor="middle" fill="#c9bc99" fontSize="11">不可通行</text>
      {Object.entries(mountainRingPlaces).map(([id, target]) => <g key={id}>
        <circle cx={target.x} cy={target.y} r="24" fill="none" stroke={place === id ? '#f7d699' : '#a69065'} strokeDasharray="4 5" />
        <text x={target.x} y={target.y + 37} textAnchor="middle" fill="#ead0a4" fontSize="12">{target.label}</text>
      </g>)}
      {elderVisible && <g aria-label={elderNamed ? '已报名字的药老' : '身份尚未公开的古戒老人'} transform={`translate(${elderPoint.x} ${elderPoint.y})`} opacity=".65">
        <path d={seated ? 'M-15 20 L-8-6 H8 L15 20Z' : 'M-15 20 L-9-6 H9 L15 20Z'} fill="#b2d6cb" /><circle cy="-13" r="9" fill="#cbded2" />
        <path d="M-7-8 L0 9 L7-8" fill="#e0e9df" />
      </g>}
      {ring === 'floating' && <g aria-label="老人处浮空的同一古戒"><ellipse cx={elderPoint.x} cy={elderPoint.y + 40} rx="9" ry="5" fill="none" stroke="#a7bdb2" strokeWidth="3" /></g>}
      {purpleVisible && <g aria-label={purpleNamed ? '已确认来访的薰儿' : '山径上的紫衣身影'} transform={`translate(${purplePoint.x} ${purplePoint.y})`}>
        <path d="M-12 15 L-6-7 H6 L12 15Z" fill="#b295cd" /><circle cy="-14" r="8" fill="#edcfbd" />
        {purpleCardVisible && <g aria-label="薰儿持有展示的五纹紫金卡">
          <rect x="12" y="-1" width="24" height="14" rx="2" fill="#684786" stroke="#d7b475" />
          {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${16 + i * 4} 2v8`} stroke="#e8c178" />)}
        </g>}
      </g>}
      {!observerOnly && <g aria-label="萧炎后山行走位置" transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
        {ring === 'worn' && <circle aria-label="右手佩戴的同一古戒" cx="12" cy="6" r="3" fill="#152621" stroke="#b5a27d" />}
      </g>}
      {bowed && <text x="300" y="180" textAnchor="middle" fill="#edcea0" fontSize="12">本人行礼已记录</text>}
    </svg>
    {!observerOnly && <div className="early-walk-controls" aria-label={`${prefix}行走操作`}>{(['up', 'left', 'down', 'right'] as const).map((direction, i) =>
      <button key={direction} className="secondary" aria-label={`${prefix}${['向上走', '向左走', '向下走', '向右走'][i]}`} onClick={() => onMove(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    }
  </>
}
