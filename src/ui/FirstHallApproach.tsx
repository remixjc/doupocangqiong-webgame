import { HallBackground, HallEastShelf, HallWestField, XunerReadingScroll } from './HallShelves'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallReadingPlaces } from '../core/first-hall-reading'
import { earlySnapshots } from '../core/early-snapshots'
import { firstHallApproachBlock, submitFirstHallApproach, type FirstHallApproachAction } from '../core/first-hall-approach'
import { firstHallApproachScenes } from '../content/first-hall-approach'
import { firstHallApproachSaveSummary } from '../core/save-preview'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { HallText } from './MapPrimitives'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import './early-walk.css'

export default function FirstHallApproach({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScenes[task.stage]
  const [actor, setActor] = useState<FirstHallApproachAction['actor']>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = firstHallApproachBlock(state)
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallApproach(gameStore, hallReadingPlaces.shelf, 'hall', { ...task,
      expectedTalk: { ...t.firstHallTalk }, expectedReading: { ...t.firstHallReading }, expectedMatch: { ...t.firstHallMatch },
      ...earlySnapshots(state, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']), actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
    event.preventDefault()
    if (scene && actor === scene.actor) act(scene.operation)
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">斗技堂 / 整衣与靠近</span><h2>他走近东架，本人收起同一卷。</h2>
    <p id="hall-approach-help">选人物后按E记录本步。刷新默认关注本人，三人位置独立；收卷尚未归架。</p>
    <div className="early-walk-controls">
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人读卷与察觉</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'ning'} onClick={() => setActor('ning')}>旁观萧宁整衣与行走</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'bystander'} onClick={() => setActor('bystander')}>旁观堂中人群</SecondaryButton>
    </div>
    <svg ref={field} role="group" aria-label="整衣靠近地图" aria-describedby="hall-approach-help" tabIndex={0}
      viewBox="100 190 390 120" className="early-walk-map" onKeyDown={key}>
      <HallBackground height={120} />
      <HallWestField />
      <HallEastShelf />
      <g aria-label="萧宁独立位置" transform={task.ning === 'east' ? 'translate(450 280)' : task.ning === 'aisle' ? 'translate(320 244)' : 'translate(235 244)'}>
        <circle r="7" fill={task.clothes ? '#ceae83' : '#bd8d6b'} />
        {[2, 4].includes(task.stage) && <path aria-label="萧宁握拳" d="M-11 0 h3 M8 0 h3" stroke="#dcc6ae" strokeWidth="4" />}
        <HallText y="21" fontSize="9">萧宁{task.clothes ? ' · 已整衣' : ''}</HallText>
      </g>
      <g aria-label="薰儿仍坐东架" transform="translate(380 250)"><circle cy="5" r="7" fill="#ae8dbd" /><HallText y="-13" fontSize="9">薰儿</HallText></g>
      <XunerReadingScroll />
      <g aria-label="萧炎本人仍在东架" transform="translate(400 250)"><MarketWalker /><HallText y="26" fontSize="9">本人 · {task.first === 'rolled' ? '已收卷' : '读第一卷'}</HallText></g>
      <rect aria-label={task.first === 'rolled' ? '同一第一卷已卷起尚未归架' : '同一第一卷仍展开'} x="420" y="245" width={task.first === 'rolled' ? 8 : 28} height="15" fill="#161e20" stroke="#bfa46a" />
    </svg>
    <p role="status">整衣靠近 {task.stage}/14 · {firstHallApproachSaveSummary(state, state.settings)}</p>
    <p>{t.firstHallReading.record === 'recalled' || t.hall.stage >= 6 ? '明确回顾当时第一卷，当前更高保管保持。' : '本人仍持同一第一卷，尚未归架。'}薰儿仍持她自己的临时卷。旧卷账 {t.hall.stage}/9。</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor === scene.actor ? '当前人物正确。' : '请切换到本步人物。'}</p>
      <PrimaryButton disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('return')}>把收卷当成第一卷已归架</SecondaryButton>
      <SecondaryButton onClick={() => act('second')}>提前取本人第二卷</SecondaryButton>
    </section> : <section className="bond-summary"><h3>整衣靠近与收卷已归档。</h3><p>萧宁已到东架前，第一卷仅卷起。提议与实际归架待续。</p></section>}
    <SecondaryButton onClick={onBack}>暂离整衣靠近 · 保留断点</SecondaryButton>
  </>
}
