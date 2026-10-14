import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstExternalLimitBlock, submitFirstExternalLimit } from '../core/first-external-limit'
import { firstExternalLimitScenes } from '../content/first-external-limit'
import { earlySnapshots, externalLimitSnapshotKeys } from '../core/early-snapshots'
import { firstExternalLimitSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { actorButton, returnButton, sceneButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, WalkControls, robeFigureGroup } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import './early-walk.css'
export default function FirstExternalLimit({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.firstExternalLimit, scene = firstExternalLimitScenes[task.stage]
  const [actor, setActor] = useState<'yan' | 'teacher'>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstExternalLimitBlock(state)
  const act = (operation: string) => {
    if (document.hidden) return
    submitFirstExternalLimit(gameStore, actor === 'teacher' ? { x: task.teacherX, y: task.teacherY } : task,
      task.location, { ...task, ...earlySnapshots(state, externalLimitSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>山后 / 限度说明与离林</Eyebrow><h2>记下限度，再把同一古戒带回房间。</h2>
    <p>这是本轮受击的后续断点。次数只作短对白，不把原著报数当作按钮或伤害；房中同一药液恢复与五段感知另续。</p>
    {task.record === 'recalled' && <p>详细历史回顾，旧督练、恢复、药液消耗和奖励保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', '限度现场本人操作')}{actorButton(actor, setActor, 'teacher', '限度现场老师操作')}</WalkControls>
    <EarlyMap ref={field} aria-label="山后限度说明与离林地图" viewBox="0 0 480 380">
      <MapBackground width="480" height="380" fill="#203934" /><path d="M0 100L95 30 190 100 305 20 480 115V0H0Z" fill="#46635d" /><path d="M0 290Q170 245 480 290V380H0Z" fill="#626446" />
      <ellipse aria-label="老师后方大石" cx="240" cy="197" rx="42" ry="20" fill="#747b70" />
      {task.teacherY && robeFigureGroup({ transform: `translate(${task.teacherX} ${task.teacherY})`, 'aria-label': '山后老师独立位置', opacity: '.65' }, { robe: '#bcd4cb', skin: '#dedfd6' }, <MapText y="-28">药老 · 坐在大石</MapText>)}
      <g transform={`translate(${task.x} ${task.y})`} aria-label="山后本人独立位置"><RobeFigure robe="#ae895e" skin="#edc79f" /><MapText y="50">{task.left ? '本人 · 已离林' : task.fallen ? task.dressed ? '本人 · 穿回衣物' : '本人 · 取衣与恢复' : '本人 · 站在现场'}</MapText></g>
    </EarlyMap>
    <StatusParagraph>限度说明 {task.stage}/8 · {firstExternalLimitSaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}<p>{actor === scene.actor ? '当前人物正确。' : '请明确选择本步人物。'}</p>{sceneButton(scene, actor !== scene.actor, act)}</BondSummary>
      : <p>限度、报数与离林已归档，回房同液恢复另续。</p>}
    {returnButton(onBack, '暂离限度说明 · 保留断点')}
  </>
}
