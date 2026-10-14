import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { firstExternalTrainingBlock, submitFirstExternalTraining } from '../core/first-external-training'
import { firstExternalTrainingScenes } from '../content/first-external-training'
import { earlySnapshots, externalTrainingSnapshotKeys } from '../core/early-snapshots'
import { firstExternalTrainingSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { actorButton, returnButton, sceneButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, TimingRange, WalkControls, robeFigureGroup } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import './early-walk.css'
export default function FirstExternalTraining({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.firstExternalTraining, scene = firstExternalTrainingScenes[task.stage]
  const [actor, setActor] = useState<'yan' | 'teacher'>('yan'), [marker, setMarker] = useState(.5)
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstExternalTrainingBlock(state)
  const act = (operation: string) => {
    if (document.hidden) return
    submitFirstExternalTraining(gameStore, actor === 'teacher' ? { x: task.teacherX, y: task.teacherY } : task,
      task.location, { ...task, ...earlySnapshots(state, externalTrainingSnapshotKeys), actor, operation,
        marker: operation === 'steady' ? marker : undefined })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>山后 / 清晨受击现场</Eyebrow><h2>先站稳，再分别记下受击与反应。</h2>
    <p>从已经训练半月的清晨现场接续，不自动补半月输入。人物位置、手动标记与短对白为原创；同一借卷仍属房中历史，本图没有取走或复制。</p>
    {task.record === 'recalled' && <p>详细历史回顾，旧督练、恢复、药液消耗和奖励保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', '受击现场本人操作')}{actorButton(actor, setActor, 'teacher', '受击现场老师操作')}</WalkControls>
    <EarlyMap ref={field} aria-label="山后受击与身体反应地图" viewBox="0 0 480 380" onKeyDown={event => {
      if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
      event.preventDefault(); if (scene && actor === scene.actor) act(scene.operation)
    }}>
      <MapBackground width="480" height="380" fill="#203934" />
      <path d="M0 100L95 30 190 100 305 20 480 115V0H0Z" fill="#46635d" />
      <path d="M0 290Q170 245 480 290V380H0Z" fill="#626446" />
      <ellipse aria-label="老师后方大石" cx="240" cy="197" rx="42" ry="20" fill="#747b70" />
      {task.teacher === 'seated-on-rock' && robeFigureGroup({ transform: `translate(${task.teacherX} ${task.teacherY})`, 'aria-label': '山后老师独立位置', opacity: '.65' },
        { robe: '#bcd4cb', skin: '#dedfd6' }, <MapText y="-28">药老 · 坐在大石</MapText>)}
      <g transform={`translate(${task.x} ${task.y})`} aria-label="山后本人独立位置">
        <RobeFigure robe="#ae895e" skin="#edc79f" /><path d="M-10 17L-13 30M10 17L13 30" stroke="#e3bf9c" strokeWidth="4" />
        <MapText y="50">{task.reaction === 'pain-near-stumble' ? task.eased ? '本人 · 痛感渐缓' : '本人 · 疼痛险失稳' : task.stance === 'feet-grounded' ? '本人 · 双足踏土' : '本人 · 待站定'}</MapText>
      </g>
      {task.shoulderHit && <path aria-label="红色斗气肩击已记录" d="M252 175Q282 208 294 257" fill="none" stroke="#d77562" strokeWidth="3" />}
      {task.qi === 'flow-cool' && <circle aria-label="斗气流动凉意已记录" cx="300" cy="270" r="24" fill="none" stroke="#a9cebf" />}
    </EarlyMap>
    <StatusParagraph>受击现场 {task.stage}/10 · 免费重试 {task.attempts} 次 · {firstExternalTrainingSaveSummary(state, state.settings)}</StatusParagraph>
    {task.stage === 3 && <TimingRange label="原创站稳标记" value={marker} onChange={event => setMarker(Number(event.target.value))}>用方向键调至35%–65%；标记不等于原著击打次数。</TimingRange>}
    {scene ? <BondSummary>{sceneHeading(scene)}<p>{actor === scene.actor ? '当前人物正确。' : '请明确选择本步人物。'}</p>{sceneButton(scene, actor !== scene.actor, act)}</BondSummary>
      : <p>本次受击与反应已归档；整轮限度、离林、同液恢复和五段仍待接续。</p>}
    {returnButton(onBack, '暂离受击现场 · 保留断点')}
  </>
}
