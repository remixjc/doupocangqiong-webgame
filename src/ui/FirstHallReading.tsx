import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { moveHallEntryWalker } from '../core/first-hall-entry'
import { firstHallReadingBlock, hallReadingNear, hallReadingPlaces, submitFirstHallReading } from '../core/first-hall-reading'
import { firstHallReadingScenes } from '../content/first-hall-reading'
import { marketTradeLedger } from '../core/early-market-trade'
import { firstHallReadingSaveSummary } from '../core/save-preview'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import './early-walk.css'
export default function FirstHallReading({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallReading, scene = firstHallReadingScenes[task.stage]
  const [p, setP] = useState({ ...(task.shelf ? hallReadingPlaces.shelf : hallReadingPlaces.start) })
  const [actor, setActor] = useState<'yan' | 'bystander'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const near = hallReadingNear(p, 'hall'), blocked = firstHallReadingBlock(state)
  const move = (direction: EarlyWalkDirection) => {
    if (!scene || actor !== 'yan' || task.leaned || document.hidden) return
    setP(moveHallEntryWalker(p, direction))
  }
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallReading(gameStore, p, 'hall', { ...task, expectedEntry: { ...t.firstHallEntry },
      expectedMeeting: { ...t.firstRoadMeeting }, expectedDeparture: { ...t.firstDeparture },
      expectedTechnique: { ...t.firstTechnique }, expectedTraining: { ...t.firstTraining },
      expectedIron: { ...t.iron }, expectedLedger: marketTradeLedger(state), expectedPractice: { ...t.practice },
      expectedRecovery: { ...t.recovery }, expectedHall: { ...t.hall }, actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && near && actor === 'yan') act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">斗技堂 / 东侧同一第一卷</span><h2>走到书架，展开当时的黑卷。</h2>
    <p id="hall-reading-help">方向或WASD由本人实际行走，近东侧书架按E逐步阅读。靠架后保持阅读位置；刷新恢复断点，不代签学习与奖励。</p>
    <div className="early-walk-controls">
      <button className="secondary" aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人行走与阅读</button>
      <button className="secondary" aria-pressed={actor === 'bystander'} onClick={() => setActor('bystander')}>只关注西侧声音</button>
    </div>
    <svg ref={field} role="group" aria-label="东侧阅读地图" aria-describedby="hall-reading-help" tabIndex={0} viewBox="80 185 425 155" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" />
      <rect x="100" y="200" width="380" height="125" fill="#937954" opacity=".15" />
      <path d="M140 310 H400 V250" stroke="#bfa46a" strokeWidth="14" opacity=".25" fill="none" />
      <rect x="160" y="220" width="110" height="45" fill="none" stroke="#bfa46a" />
      <text x="215" y="211" textAnchor="middle" fill="#eed7ad" fontSize="10">西侧训练场 · 比赛待续</text>
      <circle cx="200" cy="244" r="7" fill="#ae8dbd" /><circle cx="235" cy="244" r="7" fill="#bd8d6b" />
      <rect x="345" y="210" width="110" height="20" fill="#937954" />
      <text x="400" y="201" textAnchor="middle" fill="#eed7ad" fontSize="10">东侧书架</text>
      <text x="140" y="290" textAnchor="middle" fill="#eed7ad" fontSize="10">堂内门口</text>
      {task.picked && <g aria-label={task.record === 'recalled' ? '回顾当时第一卷' : '同一第一黑卷'}><rect x="420" y="245" width={task.opened ? 28 : 8} height="15" fill="#161e20" stroke="#bfa46a" />
        {task.grade && <text x="434" y="255" textAnchor="middle" fill="#e9c877" fontSize="7">黄阶中级</text>}</g>}
      <g aria-label="萧炎本人阅读位置" transform={`translate(${p.x} ${p.y})`}><MarketWalker /><text y="26" textAnchor="middle" fill="#eed7ad" fontSize="10">{task.leaned ? '本人 · 靠架阅读' : '本人 · 堂内'}</text></g>
    </svg>
    {scene && actor === 'yan' && !task.leaned && <div className="early-walk-controls"><WalkDirectionButtons prefix="阅读" onMove={move} /></div>}
    <p role="status">东侧阅读 {task.stage}/8 · {firstHallReadingSaveSummary(state, state.settings)}</p>
    <p>当前卷轴保管：{{ none: '当前未持卷', 'reading-first': '正在阅读第一卷', 'selected-second': '已另选第二卷', 'borrowed-second': '借出的第二卷由本人保管' }[t.hall.scroll]}。{task.record === 'recalled' || !task.picked && t.hall.stage >= 6 ? '本段明确回顾当时第一卷阅读，当前已归架或第二卷保管保持。' : '同一第一卷沿原保管账衔接，不新增库存。'}</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor !== 'yan' ? '西侧声音不能替本人读卷。' : !near ? '本人先实际走到东侧书架前。' : '当前人物：萧炎本人'}</p>
      <button className="primary" disabled={!near || actor !== 'yan'} onClick={() => act(scene.operation)}>{scene.action}</button>
      <button className="secondary" onClick={() => act('learn')}>把阅读算作当场授技</button>
      <button className="secondary" onClick={() => act('second')}>提前取得第二卷</button>
    </section> : <section className="bond-summary"><h3>东侧第一卷阅读已归档。</h3><p>本人仍在东侧读卷。西侧切磋与后续交涉待接续，旧技能与奖励保持。</p></section>}
    <button className="secondary" onClick={onBack}>暂离东侧阅读 · 保留断点</button>
  </>
}
