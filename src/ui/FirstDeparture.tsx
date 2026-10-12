import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { departureNear, departurePlaces, firstDepartureBlock, moveDepartureWalker, submitFirstDeparture, type DepartureSpace } from '../core/first-departure'
import { firstDepartureScenes } from '../content/first-departure'
import { earlySnapshots } from '../core/early-snapshots'
import { fieldsMatch } from '../core/state-guards'
import { firstDepartureSaveSummary } from '../core/save-preview'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import { walkKey } from './walk-key'
import './early-walk.css'

export default function FirstDeparture({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstDeparture, scene = firstDepartureScenes[task.stage]
  const [space, setSpace] = useState<DepartureSpace>(task.outside ? 'outside' : 'room')
  const [room, setRoom] = useState({ ...(task.stage >= 3 ? departurePlaces.door : departurePlaces.bed) })
  const [yard, setYard] = useState({ ...(task.path ? departurePlaces.path : departurePlaces.yardDoor) })
  const [actor, setActor] = useState<'yan' | 'ring'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  useEffect(() => { if (task.stage === 4) setSpace('outside') }, [task.stage])
  const p = space === 'room' ? room : yard, near = departureNear(p, space, task.stage), blocked = firstDepartureBlock(state)
  const move = (direction: EarlyWalkDirection) => {
    if (!scene || actor !== 'yan' || document.hidden || !task.risen) return
    const next = moveDepartureWalker(p, space, direction)
    if (space === 'room') setRoom(next); else setYard(next)
  }
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    const committed = submitFirstDeparture(gameStore, p, space, { ...task, ...earlySnapshots(state, ['Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery']), actor, operation })
    if (committed && task.stage === 3) setSpace('outside')
  }
  const changeSpace = () => {
    if (document.hidden || actor !== 'yan' || task.closed || !task.outside || !scene) return
    if (space === 'room' && fieldsMatch(room, departurePlaces.door)) setSpace('outside')
    else if (space === 'outside' && fieldsMatch(yard, departurePlaces.yardDoor)) setSpace('room')
    field.current?.focus()
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && near && actor === 'yan') act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">房门 / 出门与石路</span><h2>起身、跨门，再走上石路。</h2>
    <p id="departure-help">方向或WASD实际行走，近当前地点按E。房内和室外位置分开；首次跨门保存历史，关门前可正常往返，往返不追加历史。刷新恢复本段断点。</p>
    <div className="early-walk-controls">
      <button className="secondary" aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人行走与操作</button>
      <button className="secondary" aria-pressed={actor === 'ring'} onClick={() => setActor('ring')}>只看静止古戒</button>
    </div>
    <svg ref={field} role="group" aria-label="出门与石路地图" aria-describedby="departure-help" tabIndex={0} viewBox={space === 'room' ? '80 290 245 125' : '80 215 280 125'} className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" />
      {space === 'room' ? <>
        <rect x="95" y="325" width="220" height="82" fill="#937954" opacity=".3" />
        <rect x="115" y="345" width="55" height="15" fill="#937954" />
        <text x="140" y="332" textAnchor="middle" fill="#eed7ad" fontSize="10">床边</text>
        <circle aria-label="静止古戒" cx="175" cy="350" r="5" fill="none" stroke="#222" strokeWidth="3" />
        <rect x="292" y="345" width="15" height="40" fill="#937954" />
        <text x="300" y="334" textAnchor="middle" fill="#eed7ad" fontSize="10">房门</text>
      </> : <>
        <path d="M300 310 H140" stroke="#bfa46a" strokeWidth="20" opacity=".4" />
        <rect x="280" y="245" width="42" height="42" fill="#59664a" />
        <rect aria-label={task.closed ? '同一房门已关' : '同一房门仍开'} x="295" y="263" width="12" height="24" fill={task.closed ? '#937954' : '#293e36'} />
        <text x="300" y="238" textAnchor="middle" fill="#eed7ad" fontSize="10">门外</text>
        <text x="140" y="293" textAnchor="middle" fill="#eed7ad" fontSize="10">石路</text>
        {[140, 195, 245].map(x => <g key={x} aria-label="石路旁绿柳"><path d={`M${x} 280 V247`} stroke="#a39c6b" strokeWidth="3" /><path d={`M${x - 13} 276 Q${x} 235 ${x + 13} 276`} stroke="#75bd7e" strokeWidth="6" fill="none" /></g>)}
      </>}
      <g aria-label="萧炎本人行走位置" transform={`translate(${p.x} ${p.y})`}><MarketWalker /><text y="26" textAnchor="middle" fill="#eed7ad" fontSize="10">{space === 'room' ? '本人 · 房内' : '本人 · 室外'}</text></g>
    </svg>
    {scene && task.risen && actor === 'yan' && <div className="early-walk-controls"><WalkDirectionButtons prefix="出门" onMove={move} /></div>}
    {scene && task.outside && !task.closed && <button className="secondary" disabled={actor !== 'yan' || !fieldsMatch(p, space === 'room' ? departurePlaces.door : departurePlaces.yardDoor)} onClick={changeSpace}>{space === 'room' ? '再从房门到室外' : '从门外返回房内'} · 不追加历史</button>}
    <p role="status">出门石路 {task.stage}/9 · 当前{space === 'room' ? '房内' : '室外'} · {firstDepartureSaveSummary(state, state.settings)}</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor !== 'yan' ? '静止古戒不能替本人行动。' : !near ? '本人先走到当前房内或室外地点。' : '当前人物：萧炎本人'}</p>
      <button className="primary" disabled={!near || actor !== 'yan'} onClick={() => act(scene.operation)}>{scene.action}</button>
      <button className="secondary" onClick={() => act('finish')}>用一句回顾代签全部出门</button>
      <button className="secondary" onClick={() => act('meet')}>未转路就签人物会面</button>
    </section> : <section className="bond-summary"><h3>出门与石路已归档。</h3><p>已真实跨门、室外关门并进入石路。转向另一条路与会面由下一段继续，旧材料与奖励保持。</p></section>}
    <button className="secondary" onClick={onBack}>暂离出门石路 · 保留断点</button>
  </>
}
