import { sceneButton } from './Buttons'
import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstHallScrollReviewBlock, submitFirstHallScrollReview, type FirstHallScrollReviewAction } from '../core/first-hall-scroll-review'
import { firstHallScrollReviewScenes } from '../content/first-hall-scroll-review'
import { scrollReviewRoute } from '../core/first-hall-scroll-review-state'
import { earlySnapshots, hallScrollReviewSnapshotKeys } from '../core/early-snapshots'
import { firstHallScrollReviewSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { walkKey } from './walk-key'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, Eyebrow, StatusParagraph, WalkControls, RobeFigure } from './NativeRegions'
import { SecondaryButton, actorButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import MarketWalker from './MarketWalker'
import NightRoomFixtures from './NightRoomFixtures'
import WalkDirectionButtons from './WalkDirectionButtons'
import './early-walk.css'
export default function FirstHallScrollReview({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining.firstHallScrollReview, scene = firstHallScrollReviewScenes[t.stage], moving = t.stage === 0 && t.walk < 3
  const [actor, setActor] = useState<FirstHallScrollReviewAction['actor']>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstHallScrollReviewBlock(state)
  const act = (operation: string) => {
    if (!document.hidden) submitFirstHallScrollReview(gameStore, actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, t.location,
      { ...t, ...earlySnapshots(state, hallScrollReviewSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>房中 / 翻同一借卷与求技</Eyebrow><h2>老师走向桌边，本人说出眼前所需。</h2>
    <p>先选择老师，方向键/WASD或方向按钮逐步走到桌边，再按E或动作按钮。位置、路线与短对白为原创。</p>
    {t.record === 'recalled' && <p>详细历史回顾，原教学、身体记录与保管保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', '疲惫本人操作')}{actorButton(actor, setActor, 'teacher', '桌边老师操作')}
      <WalkDirectionButtons prefix="桌边老师" onMove={direction => act(`move-${direction}`)} /></WalkControls>
    <EarlyMap ref={field} aria-label="同卷翻看与求技地图" viewBox="0 0 480 380" onKeyDown={event => {
      if (!event.repeat) walkKey(event, direction => act(`move-${direction}`), () => { if (!moving && scene) act(scene.operation) })
    }}>
      <MapBackground width="480" height="380" fill="#111e27" /><NightRoomFixtures door="closed" tea={state.earlyTraining.firstHallEvening.tea} />
      <path d="M260 190 H340 V230" fill="none" stroke="#bfa46a" strokeDasharray="5 4" />
      <g aria-label="翻卷老师独立位置" transform={`translate(${t.teacherX} ${t.teacherY})`} opacity=".65"><RobeFigure skin="#dfded2" robe="#98b0b4" /><MapText y="-24">药老 · {t.approached ? '桌边' : '走近桌边'}</MapText></g>
      <g aria-label="求技本人固定位置" transform={`translate(${t.x} ${t.y})`}><MarketWalker /><MapText y="28">本人 · 疲惫原位</MapText></g>
      <rect aria-label="翻看的同一第二借卷仍在桌上" x="320" y="255" width="9" height="15" fill="#415849" stroke="#bfa46a" />
      {t.opened && <MapText x="330" y="290">同卷已翻看</MapText>}
    </EarlyMap>
    <StatusParagraph>同卷求技 {t.stage}/9 · 路步 {t.walk}/{t.stage ? 0 : 3} · {firstHallScrollReviewSaveSummary(state, state.settings)}</StatusParagraph>
    {moving ? <p>老师沿桌边路线向{({ right: '右', down: '下', up: '上', left: '左' })[scrollReviewRoute[t.walk]]}走；本人原位。</p>
      : scene ? <BondSummary>{sceneHeading(scene)}<p>{actor === scene.actor ? '当前人物正确。' : '请明确选择本步人物。'}</p>
        {sceneButton(scene, actor !== scene.actor, act)}</BondSummary>
        : <p>翻同卷与请求已归档。未来赠技只是条件；尚未正式传技或改变身体境界。</p>}
    <SecondaryButton onClick={onBack}>暂离同卷求技 · 保留断点</SecondaryButton>
  </>
}
