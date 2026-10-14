import { returnButton } from './Buttons'
import { sceneButton } from './Buttons'
import { actorButton } from './Buttons'
import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstHallTeacherBlock, submitFirstHallTeacher, type FirstHallTeacherAction } from '../core/first-hall-teacher'
import { firstHallTeacherScenes } from '../content/first-hall-teacher'
import { firstHallGrantBlock, submitFirstHallGrant } from '../core/first-hall-grant'
import { firstHallGrantScenes } from '../content/first-hall-grant'
import { earlySnapshots, hallTeacherSnapshotKeys, hallGrantSnapshotKeys } from '../core/early-snapshots'
import { firstHallTeacherSaveSummary, firstHallGrantSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, Eyebrow, StatusParagraph, WalkControls, RobeFigure } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import MarketWalker from './MarketWalker'
import NightRoomFixtures from './NightRoomFixtures'
import './early-walk.css'
export default function FirstHallTeacher({ state, onBack, agreement = false }: { state: GameState; onBack: () => void; agreement?: boolean }) {
  const task = agreement ? { ...state.earlyTraining.firstHallTeacher, ...state.earlyTraining.firstHallGrant } : state.earlyTraining.firstHallTeacher
  const scene = (agreement ? firstHallGrantScenes : firstHallTeacherScenes)[task.stage]
  const [actor, setActor] = useState<FirstHallTeacherAction['actor']>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = (agreement ? firstHallGrantBlock : firstHallTeacherBlock)(state)
  const act = (operation: string) => {
    if (document.hidden) return
    if (agreement) submitFirstHallGrant(gameStore, actor === 'teacher' ? { x: task.teacherX, y: task.teacherY } : task, task.location,
      { ...state.earlyTraining.firstHallGrant, ...earlySnapshots(state, hallGrantSnapshotKeys), actor, operation })
    else submitFirstHallTeacher(gameStore, task, task.location, { ...task, ...earlySnapshots(state, hallTeacherSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>{agreement ? '房中 / 认可与使用条件' : '房中 / 老声与有限背景'}</Eyebrow><h2>{agreement ? '先听认可与条件，再准备接受传授。' : '抬头辨认老师，再问眼前的一点。'}</h2>
    <p>明确选择本步人物，按E或动作按钮逐步保存。本人疲惫留在椅边，同一借卷留桌。短对白与位置为原创。</p>
    {task.record === 'recalled' && <p>详细历史回顾，旧教学、保管与奖励保持。</p>}
    {!agreement && state.earlyTraining.firstHallScrollReview.record !== 'none' && <p>此图回顾当时房中问答，老师后续桌边位置另存。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', "房中本人操作")}
      {actorButton(actor, setActor, 'teacher', "观察房中老师")}</WalkControls>
    <EarlyMap ref={field} aria-label={agreement ? '传技认可与条件地图' : '老师现身与有限背景地图'} viewBox="0 0 480 380" onKeyDown={event => {
      if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
      event.preventDefault(); if (scene && actor === scene.actor) act(scene.operation)
    }}>
      <MapBackground width="480" height="380" fill="#111e27" /><NightRoomFixtures door={task.door} tea={state.earlyTraining.firstHallEvening.tea} />
      {task.teacher === 'voice' && <MapText x="260" y="160">房中老声 · 尚未抬眼</MapText>}
      {task.teacher === 'appeared' && <g aria-label="老师房中独立位置" transform={`translate(${task.teacherX} ${task.teacherY})`} opacity=".65">
        <RobeFigure skin="#dfded2" robe="#98b0b4" /><MapText y="28">{task.recognized ? '药老 · 虚幻身影' : '待辨认身影'}</MapText></g>}
      <g aria-label="房中本人独立位置" transform={`translate(${task.x} ${task.y})`}><MarketWalker /><MapText y="28">本人 · {agreement && state.earlyTraining.firstHallGrant.curious ? '振作好奇' : task.looked ? '疲惫抬头' : '疲惫放松'}</MapText></g>
      <rect aria-label="房中同一第二借卷仍在桌上" x="320" y="255" width="9" height="15" fill="#415849" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>{agreement ? '认可条件' : '房中问答'} {task.stage}/7 · {(agreement ? firstHallGrantSaveSummary : firstHallTeacherSaveSummary)(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      <p>{actor === scene.actor ? '当前人物正确。' : '请明确选择本步人物。'}</p>
      {sceneButton(scene, actor !== scene.actor, act)}</BondSummary>
      : <p>{agreement ? '认可与条件已归档。五段仅为使用条件；额前传授、身体要求与训练另续。' : '有限背景已归档。老师未走向桌面、未翻卷、未传新技。'}</p>}
    {returnButton(onBack, agreement ? '暂离认可条件 · 保留断点' : "暂离房中问答 · 保留断点")}
  </>
}
