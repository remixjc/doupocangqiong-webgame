import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyIronBlock, ironNear, ironPlaces, ironStart, submitEarlyIron, type IronAction } from '../core/early-iron'
import { marketTradeLedger } from '../core/early-market-trade'
import { moveCityWalker } from '../core/early-city-pharmacy'
import { ironScenes } from '../content/early-iron'
import { earlyIronSaveSummary } from '../core/save-preview'
import type { EarlyWalkDirection } from '../core/early-walk'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import './early-walk.css'
export default function EarlyIron({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.iron, scene = ironScenes[task.stage], blocked = earlyIronBlock(state)
  const [yan, setYan] = useState({ ...ironStart(task.stage) }), [actor, setActor] = useState<'yan' | 'teacher'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const near = ironNear(yan, task.stage), selected = !!scene && actor === scene.actor
  const move = (direction: EarlyWalkDirection) => {
    if (scene && actor === 'yan' && !document.hidden) {
      const next = moveCityWalker(yan, direction)
      if (ironNear(next, 0)) setYan(next)
    }
  }
  const act = (operation: IronAction['operation']) => {
    if (scene && !document.hidden) submitEarlyIron(gameStore, yan, { ...task, expectedLedger: marketTradeLedger(state),
      expectedReturn: { ...state.earlyTraining.marketReturn }, actor, teacherPosition: { ...ironPlaces.teacher }, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && selected && near) act(scene.operation) })
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">房中 / 铁片辨认与限制</span><h2>先辨明来历，再认识自己的限度。</h2>
    <p id="iron-help">选择本人可用方向/WASD行走，近老师交接、近桌拾回。老师步骤需明确选择旁观老师；旁观不移动本人。刷新保留历史并重新选择人物，名称与意愿不授技能。</p>
    <div className="early-walk-controls">
      <button className="secondary" aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人行走与操作</button>
      <button className="secondary" aria-pressed={actor === 'teacher'} onClick={() => setActor('teacher')}>旁观房中的老师</button>
    </div>
    <svg ref={field} role="group" aria-label="房中铁片交接地图" aria-describedby="iron-help" tabIndex={0} viewBox="80 290 245 125" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" /><rect x="95" y="325" width="220" height="82" fill="#937954" opacity=".3" />
      <g aria-label="老师固定房中位置" transform="translate(220 370)"><MarketWalker /><text y="-52" textAnchor="middle" fill="#eed7ad">老师</text></g>
      <rect x="250" y="346" width="35" height="15" fill="#937954" /><text x="250" y="338" fill="#eed7ad">桌面</text>
      <g aria-label="萧炎本人行走位置" transform={`translate(${yan.x} ${yan.y})`}><MarketWalker /><text y="26" textAnchor="middle" fill="#eed7ad">本人</text></g>
      {task.owner !== 'bag' && <rect aria-label={`铁片历史持有：${task.owner}`} x={(task.owner === 'yan' ? yan.x : task.owner === 'teacher' ? 220 : 260) - 5} y={task.owner === 'table' ? 350 : 340} width="12" height="8" fill="#222" stroke="#c2a679" />}
    </svg>
    {scene && actor === 'yan' && <div className="early-walk-controls"><WalkDirectionButtons prefix="铁片" onMove={move} /></div>}
    <p role="status">铁片辨认 {task.stage}/18 · {earlyIronSaveSummary(state, state.settings)}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{scene.text}</p>
      <p>{!selected ? '先明确选择本步人物。' : !near ? task.stage === 4 ? '先切回本人，把铁片带到老师身边。' : '先由本人走近桌面或回到房中。' : `当前人物：${actor === 'yan' ? '萧炎本人' : '房中的老师'}`}</p>
      <button className="primary" disabled={!near || !selected} onClick={() => act(scene.operation)}>{scene.action}</button>
      {(task.stage === 8 || task.stage === 13) && <button className="secondary" onClick={() => act('learn')}>知道名称或想研究就学会斗技</button>}
      {task.stage === 12 && <button className="secondary" onClick={() => act('duplicate')}>拾回就再发一片并补材料</button>}
      {task.stage === 16 && <button className="secondary" onClick={() => act('refine')}>收好铁片就完成药液炼化</button>}
    </section> : <section className="bond-summary"><h3>铁片辨认与限制已归档。</h3><p>原黑铁片已收好；名称、原理、反制风险与当时能力限制已分存，详细调制待续。</p></section>}
    <button className="secondary" onClick={onBack}>暂离铁片辨认 · 保留断点</button>
  </>
}
