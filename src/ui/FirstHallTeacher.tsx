import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstHallTeacherBlock, submitFirstHallTeacher, type FirstHallTeacherAction } from '../core/first-hall-teacher'
import { firstHallTeacherScenes } from '../content/first-hall-teacher'
import { earlySnapshots, hallTeacherSnapshotKeys } from '../core/early-snapshots'
import { firstHallTeacherSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, Eyebrow, StatusParagraph, WalkControls, RobeFigure } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import MarketWalker from './MarketWalker'
import NightRoomFixtures from './NightRoomFixtures'
import './early-walk.css'
export default function FirstHallTeacher({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.firstHallTeacher, scene = firstHallTeacherScenes[task.stage]
  const [actor, setActor] = useState<FirstHallTeacherAction['actor']>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstHallTeacherBlock(state)
  const act = (operation: string) => {
    if (!document.hidden) submitFirstHallTeacher(gameStore, task, task.location, { ...task, ...earlySnapshots(state, hallTeacherSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>房中 / 老声与有限背景</Eyebrow><h2>抬头辨认老师，再问眼前的一点。</h2>
    <p>明确选择本步人物，按E或动作按钮逐步保存。本人疲惫留在椅边，同一借卷留桌。短对白与位置为原创。</p>
    {task.record === 'recalled' && <p>详细历史回顾，旧教学、保管与奖励保持。</p>}
    <WalkControls><SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>房中本人操作</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'teacher'} onClick={() => setActor('teacher')}>观察房中老师</SecondaryButton></WalkControls>
    <EarlyMap ref={field} aria-label="老师现身与有限背景地图" viewBox="0 0 480 380" onKeyDown={event => {
      if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
      event.preventDefault(); if (scene && actor === scene.actor) act(scene.operation)
    }}>
      <MapBackground width="480" height="380" fill="#111e27" /><NightRoomFixtures door={task.door} tea={state.earlyTraining.firstHallEvening.tea} />
      {task.teacher === 'voice' && <MapText x="260" y="160">房中老声 · 尚未抬眼</MapText>}
      {task.teacher === 'appeared' && <g aria-label="老师房中独立位置" transform={`translate(${task.teacherX} ${task.teacherY})`} opacity=".65">
        <RobeFigure skin="#dfded2" robe="#98b0b4" /><MapText y="28">{task.recognized ? '药老 · 虚幻身影' : '待辨认身影'}</MapText></g>}
      <g aria-label="房中本人独立位置" transform={`translate(${task.x} ${task.y})`}><MarketWalker /><MapText y="28">本人 · {task.looked ? '疲惫抬头' : '疲惫放松'}</MapText></g>
      <rect aria-label="房中同一第二借卷仍在桌上" x="320" y="255" width="9" height="15" fill="#415849" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>房中问答 {task.stage}/7 · {firstHallTeacherSaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      <p>{actor === scene.actor ? '当前人物正确。' : '请明确选择本步人物。'}</p>
      <PrimaryButton disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton></BondSummary>
      : <p>有限背景已归档。老师未走向桌面、未翻卷、未传新技。</p>}
    <SecondaryButton onClick={onBack}>暂离房中问答 · 保留断点</SecondaryButton>
  </>
}
