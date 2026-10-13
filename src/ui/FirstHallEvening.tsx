import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlySnapshots, hallEveningSnapshotKeys } from '../core/early-snapshots'
import { firstHallEveningBlock, submitFirstHallEvening } from '../core/first-hall-evening'
import { eveningRoute } from '../core/first-hall-evening-state'
import { firstHallEveningScenes } from '../content/first-hall-evening'
import { firstHallEveningSaveSummary } from '../core/save-preview'
import { walkKey } from './walk-key'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, Eyebrow, StatusParagraph, WalkControls } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import WalkDirectionButtons from './WalkDirectionButtons'
import MarketWalker from './MarketWalker'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import './early-walk.css'
export default function FirstHallEvening({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.firstHallEvening, route = eveningRoute(task.stage), scene = firstHallEveningScenes[task.stage]
  const [actor, setActor] = useState<'yan' | 'xuner'>('yan'), field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = firstHallEveningBlock(state), moving = route && task.walk < route.length
  const act = (operation: string) => {
    if (!document.hidden) submitFirstHallEvening(gameStore, task, task.location, { ...task, actor, operation, ...earlySnapshots(state, hallEveningSnapshotKeys) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  const room = task.location === 'room', second = task.scroll === 'table' ? { x: 320, y: 255 } : { x: task.x + 20, y: task.y - 5 }
  return <>
    <Eyebrow>天黑之后 / 回房与同一借卷</Eyebrow><h2>夜路走回房中，借卷放在身旁。</h2>
    <p>方向键/WASD逐步保存，E记当前动作；路线和短对白为原创。</p>
    {task.record === 'recalled' && <p>详细历史回顾，旧传技、保管与奖励保持。</p>}
    <WalkControls><SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>夜间本人操作</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'xuner'} onClick={() => setActor('xuner')}>观察薰儿分路</SecondaryButton>
      <WalkDirectionButtons prefix="夜间本人" onMove={direction => act(`move-${direction}`)} /></WalkControls>
    <EarlyMap ref={field} aria-label="夜间回房地图" viewBox="0 0 480 380" onKeyDown={event => {
      if (!event.repeat) walkKey(event, direction => act(`move-${direction}`), () => { if (!moving && scene) act(scene.operation) })
    }}>
      <MapBackground width="480" height="380" fill="#111e27" />
      {room ? <><path d="M160 120 H420 V300 H160Z" fill="#3b3931" stroke="#bfa46a" />
        <rect x="195" y="294" width="50" height="12" fill={task.door === 'closed' ? '#856644' : '#111e27'} aria-label={`本人房门${task.door}`} />
        <rect x="315" y="245" width="65" height="40" fill="#856644" /><MapText x="355" y="233">身旁桌</MapText>
        <circle cx="360" cy="268" r="7" fill="#bfa46a" aria-label={task.tea ? '茶已饮' : '桌边茶'} />
        <MapText x="220" y="335">薰儿已在院中分路</MapText></>
        : <><path d="M300 150 V230 H220 V310" fill="none" stroke="#756747" strokeWidth="22" />
          <path d="M180 300 H260" stroke="#bfa46a" /><MapText x="220" y="352">院中房门</MapText>
          <MapText x="345" y="100">夜山</MapText>
          {task.xuner === 'following' ? <g aria-label="夜间薰儿位置" transform={`translate(${task.xunerX} ${task.xunerY})`}><MarketWalker xuner /><MapText y="28">薰儿</MapText></g>
            : <g aria-label="薰儿已分路，院中离开处" transform="translate(245 280)"><circle r="8" fill="none" stroke="#ae8dbd" /><MapText y="-18">已分路</MapText></g>}</>}
      <g aria-label="夜间本人位置" transform={`translate(${task.x} ${task.y})`}><MarketWalker /><MapText y="28">{task.tired ? '本人 · 疲惫放松' : '本人'}</MapText></g>
      <rect aria-label={`夜间同一第二借卷 · ${task.scroll}`} {...second} width="9" height="15" fill="#415849" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>回房 {task.stage}/9 · 路步 {task.walk}/{route?.length ?? 0} · {firstHallEveningSaveSummary(state, state.settings)}</StatusParagraph>
    {moving ? <p>沿当前夜路向{({ up: '上', down: '下', left: '左', right: '右' })[route[task.walk]]}走。</p>
      : scene ? <BondSummary><SceneHeading title={scene.title} text={scene.text} /><PrimaryButton disabled={actor !== 'yan'} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton></BondSummary>
        : <p>夜间回房已归档。同卷留桌，老师来访另续。</p>}
    <SecondaryButton onClick={onBack}>暂离夜间回房 · 保留断点</SecondaryButton>
  </>
}
