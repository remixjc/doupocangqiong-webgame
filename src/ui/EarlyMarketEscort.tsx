import { earlyWalkDirections as directions } from '../core/early-walk-keys'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { cityPharmacyStart, moveCityWalker } from '../core/early-city-pharmacy'
import { earlyMarketEscortBlock, marketEscortNear, marketEscortPlaces, submitEarlyMarketEscort, type MarketEscortAction, type MarketEscortView } from '../core/early-market-escort'
import { marketEscortObserver } from '../core/early-market-escort-state'
import { marketEscortScenes } from '../content/early-market-escort'
import { earlyMarketEscortSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketEscort({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.marketEscort, scene = marketEscortScenes[task.stage], observer = marketEscortObserver(task.stage)
  const [position, setPosition] = useState({ ...(task.stage >= 21 ? marketEscortPlaces.inner : task.stage >= 13 ? marketEscortPlaces.crowd : cityPharmacyStart) })
  const [focus, setFocus] = useState<keyof typeof marketEscortPlaces | null>(null)
  const [returned, setReturned] = useState(task.stage < 18)
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  useEffect(() => { setFocus(null); if (task.stage === 18) setReturned(false) }, [task.stage])
  const blocked = earlyMarketEscortBlock(state), canWalk = !observer && (task.stage < 18 || returned)
  const near = !!scene && (observer ? focus === scene.place : canWalk && marketEscortNear(position, scene.place))
  const move = (direction: EarlyWalkDirection) => { if (canWalk && !document.hidden) setPosition(p => moveCityWalker(p, direction)) }
  const act = (operation: MarketEscortAction['operation']) => {
    if (!scene || document.hidden || !near) return
    const view: MarketEscortView = observer ? { kind: 'observer', place: focus! } : { kind: 'yan', position }
    submitEarlyMarketEscort(gameStore, view, { ...task, actor: scene.actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (document.hidden || event.ctrlKey || event.altKey || event.metaKey) return
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e') { event.preventDefault(); if (scene) act(scene.operation) }
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">坊市 / 入坊与巡卫</span><h2>穿过南坊入口，听清护卫安排。</h2>
    <p id="market-escort-help">{observer ? '本人仍在人群中。选择护卫事件的旁观焦点，分别记录领命、跟随与巡逻。'
      : '方向或WASD行走，近当前地点按E。街坊不可穿过；返回本人视角后继续与薰儿同行。位置不保存。'}</p>
    <svg ref={field} role="group" aria-label="南坊入市与巡卫地图" aria-describedby="market-escort-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" /><path d="M70 310 H640 M260 230 H540 V130 H630" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <rect x="300" y="50" width="160" height="150" rx="5" fill="#59664a" /><text x="380" y="120" fill="#e1d1a7" textAnchor="middle">街坊房屋 · 不可穿行</text>
      {Object.entries(marketEscortPlaces).map(([id, p]) => <g key={id}><circle cx={p.x} cy={p.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#9d8b63'} strokeDasharray="4 5" />
        <text x={p.x} y={p.y + 40} textAnchor="middle" fill="#eed7ad" fontSize="11">{p.label}</text></g>)}
      {[240, 280].map(x => <g key={x} aria-label="门前家族护卫" transform={`translate(${x} 280)`}><path d="M-9 12 L-5-5 H5 L9 12Z" fill="#697a87" /><circle cy="-12" r="7" fill="#ddb894" /></g>)}
      <g aria-label={task.captain === 'introduced' ? '已自我介绍的巡卫队长' : '尚未自报身份的护卫'} transform={`translate(${task.patrol ? 260 : 540} ${task.patrol ? 210 : 290})`}>
        <path d="M-11 15 L-6-5 H6 L11 15Z" fill="#809298" /><circle cy="-13" r="8" fill="#d8b796" /></g>
      {task.following === 3 && [0, 1, 2].map(i => <g key={i} aria-label="人群中的跟随护卫" transform={`translate(${490 + i * 20} 205)`}><path d="M-7 10 L-4-5 H4 L7 10Z" fill="#7b8d86" /><circle cy="-10" r="6" fill="#dbb795" /></g>)}
      <g aria-label={observer ? '人群中同行的萧炎与薰儿 · 旁观时不移动' : '萧炎坊市行走位置'}
        transform={`translate(${observer ? 540 : position.x} ${observer ? 230 : position.y})`}>
        <path d="M-11 14 L-6-5 H6 L11 14Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
        <path d="M20 10 L25-12 H37 L42 10Z" fill="#9dbca4" /><circle cx="31" cy="-18" r="8" fill="#edcfbd" />
      </g>
    </svg>
    {canWalk && <div className="early-walk-controls">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary"
      aria-label={`入坊${['向上走', '向左走', '向下走', '向右走'][i]}`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>}
    {observer && scene && <button className="secondary" onClick={() => setFocus(scene.place)}>选择旁观焦点 · {marketEscortPlaces[scene.place].label}</button>}
    {!observer && task.stage >= 18 && !returned && <button className="secondary" onClick={() => { setReturned(true); field.current?.focus() }}>回到本人视角 · 与薰儿继续同行</button>}
    <p role="status">入坊巡卫 {task.stage}/24 · {earlyMarketEscortSaveSummary(state, state.settings)}</p>
    <p>三位跟随护卫：{task.following === 3 ? '已经进入人群' : task.stage >= 14 ? '已受命，实际跟随待续' : '尚未派出'} · 队长与其余护卫：{task.patrol ? '已接续巡逻' : '仍在原街口'}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : observer ? '先选择本步的旁观焦点。'
      : !canWalk ? '先明确回到本人视角，再接续两人的同行。' : `本人先走近${marketEscortPlaces[scene.place].label}。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 0 && <button className="secondary" disabled={!near} onClick={() => act('absorb-core')}>直接吸收魔核可行吗？</button>}
      {task.stage === 1 && <button className="secondary" disabled={!near} onClick={() => act('collect-tax')}>能把摊主税费用于本次采购吗？</button>}
      {task.stage === 16 && <button className="secondary" disabled={!near} onClick={() => act('recruit')}>请跟随护卫加入可用队伍</button>}
      {task.stage === 21 && <button className="secondary" disabled={!near} onClick={() => act('claim-rank')}>凭同行评价登记新的九段成就</button>}
      {task.stage === 23 && <button className="secondary" disabled={!near} onClick={() => act('claim-core')}>请护卫直接交付木核</button>}
    </section> : <section className="bond-summary"><h3>入坊与护卫安排已归档。</h3><p>两人继续寻找木核。三位护卫跟随，队长与其余人巡街；手链与实际交易另段继续。</p></section>}
    <button className="secondary" onClick={onBack}>暂离入坊巡卫 · 保留断点</button>
  </>
}
