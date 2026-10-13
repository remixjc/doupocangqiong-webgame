import { actorButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallText, MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { moveHallEntryWalker } from '../core/first-hall-entry'
import { firstHallReadingBlock, hallReadingNear, hallReadingPlaces, submitFirstHallReading } from '../core/first-hall-reading'
import { firstHallReadingScenes } from '../content/first-hall-reading'
import { hallSnapshotKeys, earlySnapshots } from '../core/early-snapshots'
import { firstHallReadingSaveSummary } from '../core/save-preview'
import HistoryBlocked from './HistoryBlocked'
import { sceneHeading } from './SceneHeading'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import './early-walk.css'
export default function FirstHallReading({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallReading, scene = firstHallReadingScenes[task.stage]
  const [p, setP] = useState({ ...(task.shelf ? hallReadingPlaces.shelf : hallReadingPlaces.start) })
  const [actor, setActor] = useState<'yan' | 'bystander'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const near = hallReadingNear(p, 'hall'), blocked = firstHallReadingBlock(state)
  const move = (direction: EarlyWalkDirection) => {
    if (!scene || actor !== 'yan' || task.leaned || document.hidden) return
    setP(moveHallEntryWalker(p, direction))
  }
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallReading(gameStore, p, 'hall', { ...task, ...earlySnapshots(state, hallSnapshotKeys), actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && near && actor === 'yan') act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>斗技堂 / 东侧同一第一卷</Eyebrow><h2>走到书架，展开当时的黑卷。</h2>
    <p id="hall-reading-help">方向或WASD由本人实际行走，近东侧书架按E逐步阅读。靠架后保持阅读位置；刷新恢复断点，不代签学习与奖励。</p>
    <WalkControls>
      {actorButton(actor, setActor, 'yan', "本人行走与阅读")}
      {actorButton(actor, setActor, 'bystander', "只关注西侧声音")}
    </WalkControls>
    <EarlyMap ref={field} aria-label="东侧阅读地图" aria-describedby="hall-reading-help" viewBox="80 185 425 155" onKeyDown={key}>
      <MapBackground />
      <rect x="100" y="200" width="380" height="125" fill="#937954" opacity=".15" />
      <path d="M140 310 H400 V250" stroke="#bfa46a" strokeWidth="14" opacity=".25" fill="none" />
      <rect x="160" y="220" width="110" height="45" fill="none" stroke="#bfa46a" />
      <HallText x="215" y="211">西侧训练场 · 比赛待续</HallText>
      <circle cx="200" cy="244" r="7" fill="#ae8dbd" /><circle cx="235" cy="244" r="7" fill="#bd8d6b" />
      <rect x="345" y="210" width="110" height="20" fill="#937954" />
      <HallText x="400" y="201">东侧书架</HallText>
      <HallText x="140" y="290">堂内门口</HallText>
      {task.picked && <g aria-label={task.record === 'recalled' ? '回顾当时第一卷' : '同一第一黑卷'}><rect x="420" y="245" width={task.opened ? 28 : 8} height="15" fill="#161e20" stroke="#bfa46a" />
        {task.grade && <MapText x="434" y="255" fill="#e9c877" fontSize="7">黄阶中级</MapText>}</g>}
      <g aria-label="萧炎本人阅读位置" transform={`translate(${p.x} ${p.y})`}><MarketWalker /><HallText y="26">{task.leaned ? '本人 · 靠架阅读' : '本人 · 堂内'}</HallText></g>
    </EarlyMap>
    {scene && actor === 'yan' && !task.leaned && <WalkControls><WalkDirectionButtons prefix="阅读" onMove={move} /></WalkControls>}
    <StatusParagraph>东侧阅读 {task.stage}/8 · {firstHallReadingSaveSummary(state, state.settings)}</StatusParagraph>
    <p>当前卷轴保管：{{ none: '当前未持卷', 'reading-first': '正在阅读第一卷', 'selected-second': '已另选第二卷', 'borrowed-second': '借出的第二卷由本人保管' }[t.hall.scroll]}。{task.record === 'recalled' || !task.picked && t.hall.stage >= 6 ? '本段明确回顾当时第一卷阅读，当前已归架或第二卷保管保持。' : '同一第一卷沿原保管账衔接，不新增库存。'}</p>
    {scene ? <BondSummary>{sceneHeading(scene)}
      <p>{actor !== 'yan' ? '西侧声音不能替本人读卷。' : !near ? '本人先实际走到东侧书架前。' : '当前人物：萧炎本人'}</p>
      <PrimaryButton disabled={!near || actor !== 'yan'} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('learn')}>把阅读算作当场授技</SecondaryButton>
      <SecondaryButton onClick={() => act('second')}>提前取得第二卷</SecondaryButton>
    </BondSummary> : <BondSummary><h3>东侧第一卷阅读已归档。</h3><p>本人仍在东侧读卷。西侧切磋与后续交涉待接续，旧技能与奖励保持。</p></BondSummary>}
    <SecondaryButton onClick={onBack}>暂离东侧阅读 · 保留断点</SecondaryButton>
  </>
}
