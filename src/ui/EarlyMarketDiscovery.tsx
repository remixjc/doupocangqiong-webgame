import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { moveCityWalker } from '../core/early-city-pharmacy'
import { earlyMarketDiscoveryBlock, discoveryNear, marketDiscoveryPlace, submitEarlyMarketDiscovery, type MarketDiscoveryAction } from '../core/early-market-discovery'
import { marketDiscoveryScenes } from '../content/early-market-discovery'
import { earlyMarketDiscoverySaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketDiscovery({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.marketDiscovery, scene = marketDiscoveryScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...(task.stage ? marketDiscoveryPlace : { x: 540, y: 310 }) })
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = earlyMarketDiscoveryBlock(state), near = discoveryNear(position)
  const move = (direction: EarlyWalkDirection) => { if (scene && !document.hidden) setPosition(moveCityWalker(position, direction)) }
  const act = (operation: MarketDiscoveryAction['operation']) => {
    if (scene && near && !document.hidden) submitEarlyMarketDiscovery(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (document.hidden || event.ctrlKey || event.altKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e') { event.preventDefault(); if (scene) act(scene.operation) }
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">坊市 / 发现与心中购买建议</span><h2>一枚绿核，一片尚未辨明的黑铁。</h2>
    <p id="market-discovery-help">由本人带薰儿走近前方摊位。方向/WASD行走，近摊按E；街坊不可穿过。历史逐步保存，行走位置不保存。老师的声音只在本人心中。</p>
    <svg ref={field} role="group" aria-label="发现魔核与黑铁片地图" aria-describedby="market-discovery-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" /><path d="M500 310 H620 V230" fill="none" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <rect x="300" y="50" width="160" height="150" rx="5" fill="#59664a" /><text x="380" y="120" fill="#e1d1a7" textAnchor="middle">街坊房屋 · 不可穿行</text>
      <circle cx="620" cy="230" r="28" fill="none" stroke="#f7d699" strokeDasharray="4 5" /><text x="620" y="180" textAnchor="middle" fill="#eed7ad">前方摊位</text>
      {task.core === 'seen' && <circle aria-label="绿核仍属摊主，未成交" cx="615" cy="213" r="7" fill="#75bd7e" />}
      {task.iron !== 'unseen' && <rect aria-label="古旧黑铁片仍属摊主，未成交" x="630" y="208" width="14" height="9" fill="#292a29" stroke="#9f886b" />}
      <g aria-label="萧炎本人行走位置" transform={`translate(${position.x} ${position.y})`}><path d="M-11 14 L-6-5 H6 L11 14Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
      <g aria-label="薰儿同行位置" transform={`translate(${position.x + 25} ${position.y})`}><path d="M-11 14 L-6-5 H6 L11 14Z" fill="#9dbca4" /><circle cy="-13" r="8" fill="#edcfbd" /></g>
    </svg>
    {scene && <div className="early-walk-controls">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={`发现向${['上', '左', '下', '右'][i]}走`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>}
    <p role="status">摊位发现 {task.stage}/10 · {earlyMarketDiscoverySaveSummary(state, state.settings)}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : '先由本人带薰儿走近前方摊位。'}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 2 && <button className="secondary" disabled={!near} onClick={() => act('claim-core')}>看见绿核就算已经买到</button>}
      {task.stage === 6 && <button className="secondary" disabled={!near} onClick={() => act('claim-iron')}>看见铁片就将附物再发一份</button>}
      {task.stage === 8 && <button className="secondary" disabled={!near} onClick={() => act('learn')}>听见购买建议就学会铁片斗技</button>}
      {task.stage === 9 && <button className="secondary" disabled={!near} onClick={() => act('pay')}>未经卖家同意先追加付款</button>}
    </section> : <section className="bond-summary"><h3>发现与心中购买建议已归档。</h3><p>此刻魔核与黑铁片仍在摊上，未询价或成交。原有唯一采购、附物和已耗药液记录保留。</p></section>}
    {state.earlyTraining.receipts.woodCore && <p className="muted">后来的已购或已耗材料记录保留；这一段回看的是发现时刻，不重新发放木核、黑铁片或药液。</p>}
    <button className="secondary" onClick={onBack}>暂离摊位发现 · 保留断点</button>
  </>
}
