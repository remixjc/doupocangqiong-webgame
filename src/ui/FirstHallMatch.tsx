import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallBackground, HallEastShelf, HallWestField } from './HallShelves'
import { HallText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallReadingPlaces } from '../core/first-hall-reading'
import { firstHallMatchBlock, submitFirstHallMatch } from '../core/first-hall-match'
import { firstHallMatchScene } from '../content/first-hall-match'
import { hallSnapshotKeys, earlySnapshots } from '../core/early-snapshots'
import { firstHallMatchSaveSummary } from '../core/save-preview'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import './early-walk.css'
export default function FirstHallMatch({ state, onBack, continuation = false }: { state: GameState; onBack: () => void; continuation?: boolean }) {
  const t = state.earlyTraining, task = t.firstHallMatch, scene = firstHallMatchScene(task.stage, continuation)
  const prefix = continuation ? '赛后走向东架' : '东架旁观'
  const [actor, setActor] = useState<'yan' | 'spectator'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = firstHallMatchBlock(state, continuation), p = hallReadingPlaces.shelf
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallMatch(gameStore, p, 'hall', { ...t.firstHallReading, expectedMatch: { ...task },
      ...earlySnapshots(state, hallSnapshotKeys), actor, operation, continuation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
    event.preventDefault()
    if (scene && actor === scene.actor) act(scene.operation)
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>斗技堂 / {prefix}</Eyebrow><h2>读卷的位置，始终在东侧。</h2>
    <p id="hall-match-help">选择本人目光或西场旁观焦点，按E记录现场。重新进入后须重新选择旁观；本人没有进入训练场。</p>
    <WalkControls>
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人目光与读卷</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'spectator'} onClick={() => setActor('spectator')}>{continuation ? '旁观赛后人物' : '旁观西场人物'}</SecondaryButton>
    </WalkControls>
    <EarlyMap ref={field} aria-label="东架旁观地图" aria-describedby="hall-match-help" viewBox="100 190 390 115" onKeyDown={key}>
      <HallBackground />
      <HallWestField />
      <g aria-label="薰儿堂内位置" transform={`translate(${task.stage >= 17 ? 380 : task.stage >= 16 ? 320 : task.stage >= 8 ? 190 : 200} ${task.stage >= 17 ? 250 : 244})`}>
        <circle r="7" fill="#ae8dbd" />{task.palm && task.stage < 13 && <path d="M7 0 H33" stroke="#e9c877" strokeWidth="4" />}
        <HallText y={task.stage >= 17 ? -12 : 21} fontSize="9">薰儿</HallText>
      </g>
      <g aria-label="萧宁场中位置" transform={`translate(${task.outside && task.stage < 13 ? 295 : 235} 244)`}>
        <circle r="7" fill="#bd8d6b" /><HallText y="21" fontSize="9">{task.identified ? '萧宁' : '场中对手'}</HallText>
      </g>
      <HallEastShelf />
      <g aria-label="萧炎本人阅读位置" transform="translate(400 250)"><MarketWalker /><HallText y="26" fontSize="9">本人 · 靠架阅读</HallText></g>
      <rect x="420" y="245" width="28" height="15" fill="#161e20" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>{prefix} {continuation ? task.stage : Math.min(task.stage, 12)}/{continuation ? 20 : 12} · {firstHallMatchSaveSummary(state, state.settings)}</StatusParagraph>
    <p>{t.firstHallReading.record === 'recalled' ? '明确回顾当时第一卷，当前已归架或第二卷保管保持。' : '本人仍持同一第一卷。'}旧卷账 {t.hall.stage}/9；没有新技能或奖励。</p>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor === scene.actor ? '当前焦点正确。' : '请明确切换到本步所需焦点。'}</p>
      <PrimaryButton disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('win')}>本人入西场参赛</SecondaryButton>
      <SecondaryButton onClick={() => act('second')}>提前取第二卷</SecondaryButton>
    </BondSummary> : <BondSummary><h3>{prefix}已归档。</h3><p>{task.stage >= 20 ? '薰儿已到东架，本人仍读卷。招呼与问答待续。' : '薰儿取胜；赛后走向东架由独立入口接续。'}</p></BondSummary>}
    <SecondaryButton onClick={onBack}>{continuation ? '暂离赛后东架 · 保留断点' : '暂离西赛旁观 · 保留断点'}</SecondaryButton>
  </>
}
