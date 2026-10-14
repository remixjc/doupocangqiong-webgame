import { robeFigureGroup } from './NativeRegions'
import { marketWalkerGroup } from './MarketWalker'
import { returnButton } from './Buttons'
import { sceneButton } from './Buttons'
import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstHallScrollReviewBlock, submitFirstHallScrollReview, type FirstHallScrollReviewAction } from '../core/first-hall-scroll-review'
import { firstHallScrollReviewScenes } from '../content/first-hall-scroll-review'
import { firstHallTransmissionScenes } from '../content/first-hall-transmission'
import { firstHallTransmissionBlock, submitFirstHallTransmission } from '../core/first-hall-transmission'
import { transmissionRoute } from '../core/first-hall-transmission-state'
import { scrollReviewRoute } from '../core/first-hall-scroll-review-state'
import { earlySnapshots, hallScrollReviewSnapshotKeys, hallTransmissionSnapshotKeys } from '../core/early-snapshots'
import { firstHallScrollReviewSaveSummary, firstHallTransmissionSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { walkKey } from './walk-key'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, Eyebrow, StatusParagraph, WalkControls } from './NativeRegions'
import { actorButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import NightRoomFixtures from './NightRoomFixtures'
import WalkDirectionButtons from './WalkDirectionButtons'
import './early-walk.css'
export default function FirstHallScrollReview({ state, onBack, transmission = false }: { state: GameState; onBack: () => void; transmission?: boolean }) {
  const t = transmission ? { ...state.earlyTraining.firstHallScrollReview, ...state.earlyTraining.firstHallTransmission } : state.earlyTraining.firstHallScrollReview
  const scene = (transmission ? firstHallTransmissionScenes : firstHallScrollReviewScenes)[t.stage], moving = transmission ? t.stage === 1 && t.walk < 2 : t.stage === 0 && t.walk < 3
  const [actor, setActor] = useState<FirstHallScrollReviewAction['actor']>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = (transmission ? firstHallTransmissionBlock : firstHallScrollReviewBlock)(state)
  const act = (operation: string) => {
    if (document.hidden) return
    if (transmission) submitFirstHallTransmission(gameStore, actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, t.location,
      { ...state.earlyTraining.firstHallTransmission, ...earlySnapshots(state, hallTransmissionSnapshotKeys), actor, operation })
    else submitFirstHallScrollReview(gameStore, actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, t.location,
      { ...t, ...earlySnapshots(state, hallScrollReviewSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>{transmission ? '房中 / 额前实际传授' : '房中 / 翻同一借卷与求技'}</Eyebrow><h2>{transmission ? '先凝神，再逐步接收技法知识。' : '老师走向桌边，本人说出眼前所需。'}</h2>
    <p>{transmission ? '本人先在原位闭眼，老师再沿左、下两步走近额前；按E或动作按钮分别记录点触、信息进入、恢复与读说明。位置、路线与短对白为原创。' : '先选择老师，方向键/WASD或方向按钮逐步走到桌边，再按E或动作按钮。位置、路线与短对白为原创。'}</p>
    {!transmission && state.earlyTraining.firstHallTransmission.record !== 'none' && <p>此图回顾当时桌边求技，老师后续额前位置另存。</p>}
    {t.record === 'recalled' && <p>详细历史回顾，原教学、身体记录与保管保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', transmission ? '原位本人操作' : '疲惫本人操作')}{actorButton(actor, setActor, 'teacher', transmission ? '额前老师操作' : '桌边老师操作')}
      <WalkDirectionButtons prefix={transmission ? '额前老师' : '桌边老师'} onMove={direction => act(`move-${direction}`)} /></WalkControls>
    <EarlyMap ref={field} aria-label={transmission ? '额前实际传授地图' : '同卷翻看与求技地图'} viewBox="0 0 480 380" onKeyDown={event => {
      if (!event.repeat) walkKey(event, direction => act(`move-${direction}`), () => { if (!moving && scene) act(scene.operation) })
    }}>
      <MapBackground width="480" height="380" fill="#111e27" /><NightRoomFixtures door="closed" tea={state.earlyTraining.firstHallEvening.tea} />
      <path d={transmission ? 'M340 230 H300 V250' : 'M260 190 H340 V230'} fill="none" stroke="#bfa46a" strokeDasharray="5 4" />
      {robeFigureGroup({ "aria-label": transmission ? '额前老师独立位置' : '翻卷老师独立位置', "transform": `translate(${t.teacherX} ${t.teacherY})`, "opacity": ".65" }, { "skin": "#dfded2", "robe": "#98b0b4" }, <MapText y="-24">药老 · {transmission ? t.stage >= 2 || t.stage === 1 && t.walk === 2 ? '额前' : '走近额前' : t.approached ? '桌边' : '走近桌边'}</MapText>)}
      {marketWalkerGroup({ "aria-label": transmission ? '接受传授本人固定位置' : '求技本人固定位置', "transform": `translate(${t.x} ${t.y})` }, {  }, <MapText y="28">本人 · {transmission ? state.earlyTraining.firstHallTransmission.eyesClosed ? '闭眼凝神' : '原位睁眼' : '疲惫原位'}</MapText>)}
      <rect aria-label={transmission ? '传授时同一第二借卷留桌' : '翻看的同一第二借卷仍在桌上'} x="320" y="255" width="9" height="15" fill="#415849" stroke="#bfa46a" />
      {!transmission && t.opened && <MapText x="330" y="290">同卷已翻看</MapText>}
    </EarlyMap>
    <StatusParagraph>{transmission ? '额前传授' : '同卷求技'} {t.stage}/{transmission ? 6 : 9} · 路步 {t.walk}/{transmission ? t.stage === 1 ? 2 : 0 : t.stage ? 0 : 3} · {(transmission ? firstHallTransmissionSaveSummary : firstHallScrollReviewSaveSummary)(state, state.settings)}</StatusParagraph>
    {moving ? <p>老师沿{transmission ? '额前' : '桌边'}路线向{({ right: '右', down: '下', up: '上', left: '左' })[(transmission ? transmissionRoute : scrollReviewRoute)[t.walk]]}走；本人原位。</p>
      : scene ? <BondSummary>{sceneHeading(scene)}<p>{actor === scene.actor ? '当前人物正确。' : '请明确选择本步人物。'}</p>
        {sceneButton(scene, actor !== scene.actor, act)}</BondSummary>
        : <p>{transmission ? '知识传授已归档。技法描述不代表当前熟练或身体合格，使用与训练仍需继续。' : '翻同卷与请求已归档。未来赠技只是条件；尚未正式传技或改变身体境界。'}</p>}
    {returnButton(onBack, transmission ? '暂离额前传授 · 保留断点' : "暂离同卷求技 · 保留断点")}
  </>
}
