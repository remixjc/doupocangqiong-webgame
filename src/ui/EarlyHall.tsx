import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { earlyHallBlock, earlyHallStart, earlyHallPlaces, earlyHallObstacles, moveEarlyHall, nearbyEarlyHallPlace } from '../core/early-hall'
import type { EarlyWalkDirection } from '../core/early-walk'
import './early-walk.css'

export default function EarlyHall({ state, onBack }: { state: GameState; onBack: () => void }) {
  const [position, setPosition] = useState({ ...earlyHallStart })
  const [reading, setReading] = useState<string>()
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyHallBlock(state)
  const place = nearbyEarlyHallPlace(position)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => {
    setReading(undefined); setPosition(current => moveEarlyHall(current, direction))
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const input = event.key.length === 1 ? event.key.toLowerCase() : event.key
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right' } as Record<string, EarlyWalkDirection>)[input]
    if (direction) { event.preventDefault(); move(direction) }
    if (input === 'e') { event.preventDefault(); if (place) setReading(place.id) }
  }
  if (blocked || state.earlyTraining.hall.stage === 0) return <p>{blocked || '先从药老处接续前往斗技堂。'}</p>
  return <>
    <span className="eyebrow">重修往事 / 斗技堂到访</span>
    <h2>西侧藏卷，东侧习武。</h2>
    <p className="muted" id="early-hall-help">方向键或WASD行走，靠近路标按E查看；也可使用下方按钮。堂内位置在退出或刷新后回堂口，到访记录保留。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="斗技堂地图"
      aria-describedby="early-hall-help" viewBox="0 0 720 420" onKeyDown={key}>
      <title>斗技堂东西两区原创布局</title>
      <rect width="720" height="420" fill="#202d2c" />
      <rect x="24" y="24" width="672" height="372" rx="5" fill="#394139" stroke="#b59864" strokeWidth="3" />
      <path d="M360 45 V260 M300 390 H420" stroke="#c8b082" strokeWidth="3" strokeDasharray="9 9" />
      <rect x="420" y="70" width="185" height="200" fill="#78674b" stroke="#c2ac7d" />
      <circle cx="512" cy="167" r="60" fill="none" stroke="#c3b086" strokeDasharray="5 8" />
      {earlyHallObstacles.map((rect, index) => <g key={rect.x}>
        <rect {...rect} rx="3" fill="#5a4937" stroke="#c3a16d" />
        {index === 0 && Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${66 + i * 21} 52 v30`} stroke={i % 2 ? '#b8c3a0' : '#d0ad75'} strokeWidth="10" />)}
      </g>)}
      <rect x="320" y="285" width="80" height="15" fill="#79613e" stroke="#dac28f" />
      <text x="170" y="185" textAnchor="middle" fill="#dec99f" fontSize="17">藏 卷 区</text>
      <text x="540" y="240" textAnchor="middle" fill="#dec99f" fontSize="17">练 习 区</text>
      {earlyHallPlaces.map(item => <g key={item.id}>
        <circle cx={item.x} cy={item.y} r="27" fill={place?.id === item.id ? '#f0c57940' : '#f0c57912'} stroke="#dfc18a" />
        <text x={item.x} y={item.y - 35} textAnchor="middle" fill="#f3dfb7" fontSize="13">{item.label}</text>
      </g>)}
      <g aria-hidden="true" data-player-x={position.x} data-player-y={position.y} transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="14" rx="13" ry="5" fill="#0005" /><path d="M-10 12 L-6-2 H6 L11 12Z" fill="#d3a567" />
        <circle cy="-8" r="7" fill="#edc79f" /><path d="M-7-11 Q0-20 7-10" fill="#26322f" />
      </g>
      <text x="360" y="406" textAnchor="middle" fill="#dbc59e" fontSize="12">堂口 · 原创比例与陈设</text>
    </svg>
    <p role="status" className="early-walk-status">{place ? `附近：${place.label}` : '沿两区行走，靠近金色路标查看。'}</p>
    <div className="early-walk-controls" aria-label="斗技堂行走操作">
      {(['up', 'left', 'down', 'right'] as const).map((direction, index) => <button key={direction} className="secondary"
        aria-label={`堂内向${['上', '左', '下', '右'][index]}走`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][index]}</button>)}
      <button className="primary" disabled={!place} onClick={() => place && setReading(place.id)}>查看堂内地点</button>
    </div>
    {reading && place?.id === reading && <section className="bond-summary" aria-label="斗技堂地点说明"><h3>{place.label}</h3><p>{place.text}</p></section>}
    <p className="muted">已记录到访；卷册仍在堂内，人物交涉与正式传技尚未发生。本次查看不改变主线或发放技能。</p>
    <button className="secondary" onClick={onBack}>离开斗技堂 · 回准备路线</button>
  </>
}
