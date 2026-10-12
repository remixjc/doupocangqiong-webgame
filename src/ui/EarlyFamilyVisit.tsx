import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { earlyFamilyVisitBlock, familyVisitPlaces, familyVisitWalls, moveFamilyVisitWalker, nearFamilyVisitPlace, submitEarlyFamilyVisit, type FamilyVisitAction } from '../core/early-family-visit'
import { familyVisitScenes } from '../content/early-family-visit'
import './early-walk.css'

export default function EarlyFamilyVisit({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.familyVisit, scene = familyVisitScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...familyVisitPlaces.room })
  const field = useRef<SVGSVGElement>(null), blocked = earlyFamilyVisitBlock(state)
  const near = !!scene && nearFamilyVisitPlace(position, scene.place)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveFamilyVisitWalker(current, direction))
  const act = (operation: FamilyVisitAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyFamilyVisit(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e' && near && scene) { event.preventDefault(); act(scene.operation) }
  }
  if (blocked) return <><p className="muted">{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">拜师之前 / 家族来访</span><h2>这一场来访，从入席说起。</h2>
    <p id="family-visit-help">方向键或WASD行走，靠近当前人物或地点后按E。每次交谈与观察独立保存，可暂离后继续。</p>
    <svg ref={field} role="group" aria-label="家族来访行走地图" aria-describedby="family-visit-help" tabIndex={0}
      className="early-walk-map" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#22352f" />
      <rect x="35" y="255" width="180" height="140" rx="8" fill="#3d4839" />
      <rect x="255" y="30" width="425" height="315" rx="8" fill="#4b4335" />
      <path d="M100 330 H210 V270 H270 H400 V100 H550 M350 170 V310 H610 V270" fill="none" stroke="#9c8960" strokeWidth="18" opacity=".3" />
      {familyVisitWalls.map((wall, index) => <rect key={index} {...wall} rx="3" fill="#17251f" />)}
      <text x="125" y="285" textAnchor="middle" fill="#dfc9a0" fontSize="12">清晨 · 拜师之前</text>
      <text x="465" y="58" textAnchor="middle" fill="#dfc9a0" fontSize="15">萧家接待厅</text>
      <text x="480" y="230" textAnchor="middle" fill="#c8ac7b" fontSize="11">厅中陈设</text>
      {Object.entries(familyVisitPlaces).map(([id, place]) => <g key={id}>
        <circle cx={place.x} cy={place.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#b09b71'} strokeDasharray="4 5" />
        <text x={place.x} y={place.y + 37} textAnchor="middle" fill="#edcea0" fontSize="11">{place.label}</text>
      </g>)}
      {task.box === 'presented' && <g aria-label="仍在来客席的玉匣"><rect x="580" y="242" width="28" height="16" rx="3" fill="#9da778" /><circle cx="595" cy="248" r="4" fill="#d5cf91" /></g>}
      <g aria-label="萧炎行走位置" transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
      </g>
    </svg>
    <div className="early-walk-controls" aria-label="家族来访行走操作">{(['up', 'left', 'down', 'right'] as const).map((direction, index) =>
      <button key={direction} className="secondary" aria-label={['来访向上走', '来访向左走', '来访向下走', '来访向右走'][index]} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][index]}</button>)}</div>
    <p role="status">来访 {task.stage}/17 · {task.seat === 'shared' ? '已在薰儿身旁落座' : task.seat === 'missing' ? '自己的座位遗漏' : '尚未察看座位'} · {task.request === 'spoken' ? '退婚请求已公开' : '来意尚未说出'} · {task.pressure === 'raised' ? '双方戒备、尚未交手' : task.pressure === 'withdrawn' ? '父亲已收势' : '尚未起冲突'}</p>
    {scene ? <section className="bond-summary">
      <h3>{scene.title}</h3><p>{near ? scene.text : `请先走近${familyVisitPlaces[scene.place].label}，继续这一段。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {near && task.stage === 12 && <button className="secondary" onClick={() => act('accept-for-father')}>尝试替父亲直接应允</button>}
      {near && task.stage === 15 && <button className="secondary" onClick={() => act('take-box')}>尝试直接收取玉匣</button>}
    </section> : <section className="bond-summary"><h3>来访前半程已归档。</h3><p>玉匣仍属来客，补偿尚未答复；文书、三年约定与实际离厅需要接续。现有第二章奖励和拜师记录保留。</p></section>}
    <p className="muted">厅院布局与20步长为游戏改编。这里回到拜师前的故事，不重发丹药、功法、金币、境界或主线奖励；暂离会保留事件，行走位置不保存。</p>
    <button className="secondary" onClick={onBack}>暂离家族来访 · 保留断点</button>
  </>
}
