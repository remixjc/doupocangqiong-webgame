import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { HallWalker, TimingRange } from './NativeRegions'
import { TimingMeter } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { earlyEighthTrainingBlock, eighthPlaces, eighthTrainingBeats, eighthTrainingOperation, moveEighthWalker,
  nearEighthPlace, submitEarlyEighthTraining, type EighthTrainingAction } from '../core/early-eighth-training'
import { eighthTrainingScenes } from '../content/early-eighth-training'
import { startBrowserSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyEighthTraining({ state, position: entryPosition, onBack, onGuests }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onGuests?: () => void
}) {
  const task = state.earlyTraining.eighthTraining, scene = eighthTrainingScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...eighthPlaces.fork })
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null), blocked = earlyEighthTrainingBlock(state, entryPosition)
  const target = eighthTrainingBeats(task.stage), near = scene && nearEighthPlace(position, scene.place)
  const steady = state.settings.reducedMotion
  useSceneFocus(field, !blocked, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!target || !near || steady || paused || blocked) return
    return startBrowserSupervisionPointer(
    setMarker, () => setPaused(true))
  }, [target, near, steady, paused, blocked, task.beats])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveEighthWalker(current, direction))
  function act(operation: EighthTrainingAction['operation']) {
    if (document.hidden || !scene || target && paused && operation !== 'stop') return
    submitEarlyEighthTraining(gameStore, entryPosition, position, { ...task, operation,
      marker: target && operation !== 'stop' ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene && !target ? () => act(scene.operation) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>预测之后 / 同行与礼前训练</Eyebrow>
    <h2>日复一日，灯下偶得突破。</h2>
    <p id="eighth-help">方向键或WASD行走，走近地点按E接续静态步骤；训练使用下方时机与动作按钮。地图把房间、城市和后山压缩为行程节点。重入从分路出发，训练断点保留。</p>
    <EarlyMap ref={field} aria-label="同行与礼前训练地图" aria-describedby="eighth-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill={task.stage >= 11 ? '#202f3c' : '#304d43'} />
      <path d="M100 300 H540 M220 300 V120 H520 V300" fill="none" stroke="#78836c" strokeWidth="28" strokeLinejoin="round" />
      <path d="M430 90 L500 26 L558 92 L614 43 L687 113Z" fill="#51645a" />
      <path d="M174 100 V61 H266 V100 M167 64 L220 31 L273 64" fill="#987a57" stroke="#b69e72" strokeWidth="5" />
      <rect x="190" y="249" width="395" height="93" rx="10" fill="#6f594655" stroke="#b49b72" />
      <ellipse cx="380" cy="300" rx="40" ry="23" fill="#5d4437" stroke="#a28156" strokeWidth="7" />
      <ellipse cx="380" cy="294" rx="34" ry="15" fill={task.energy === 'little' ? '#879e79' : '#4f8b68'} />
      <g role="img" aria-label={task.energy === 'unobserved' ? '房中木盆，尚未观察药液' : task.energy === 'active' ? '本次房中既有药液' : '本次木盆药力已少，夜间调息'}>
        <path d="M356 295 Q380 286 404 295 M363 302 Q380 297 397 302" fill="none" stroke="#bccf9d" strokeWidth="2" />
      </g>
      <rect x="516" y="277" width="53" height="24" rx="4" fill="#8c7666" />
      <path d="M580 285 V250" stroke="#b59457" strokeWidth="4" /><circle cx="580" cy="250" r="9" fill="#f1c270" />
      {task.stage >= 4 && task.stage <= 5 && <g transform={`translate(${task.stage === 4 ? 246 : 546} 104)`} role="img" aria-label="薰儿同行"><RobeFigure cy="-10" r="7" skin="#dfbca3" cut="M-11 14 L-6-3 H6 L11 14Z" /></g>}
      {task.stage === 7 && <g role="img" aria-label={task.beats ? '吸掌已记，准备吹火掌' : '准备吸掌，再接吹火掌'}><path d={task.beats ? 'M500 135 Q535 115 566 140' : 'M566 140 Q535 160 500 135'} fill="none" stroke="#d5d4a1" strokeWidth="3" strokeDasharray="6 5" /><path d="M555 129 Q581 118 571 142 Q561 146 555 129" fill="#b9c480" /></g>}
      {Object.entries(eighthPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="44" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><MapText x={place.x} y={place.y + 57} fill="#ead9b6">{place.label}</MapText></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><HallWalker /></g>
    </EarlyMap>
    <WalkControls aria-label="礼前训练行走操作">{<WalkDirectionButtons prefix="礼前" onMove={move} />}</WalkControls>
    <StatusParagraph>礼前训练 {task.stage}/15 · {target ? `本轮 ${task.beats}/${target}` : '地点步骤'} · 重开 {task.attempts} 次 · {task.outing === 'none' ? '尚待回应' : task.outing === 'promised' ? '已约好，同行未完成' : '次日同行已记'} · {task.result === 'none' ? '故事八段尚未感知' : '故事八段已感知'}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="礼前训练步骤">{sceneHeading(scene)}
      {target ? <>
        {steady && <TimingRange label="礼前训练时机" value={marker} onChange={event => setMarker(Number(event.target.value))}><small>方向键调至35%–65%，当前{Math.round(marker * 100)}%。</small></TimingRange>}
        <TimingMeter label="礼前训练时机指针" marker={marker} />
        {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停礼前训练时机</SecondaryButton>}
        {paused && <><StatusParagraph>时机已暂停，需明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续礼前训练 · 恢复时机</SecondaryButton></>}
        <WalkControls><PrimaryButton disabled={paused} onClick={() => act(eighthTrainingOperation(task))}>{task.stage === 7 ? task.beats === 0 ? '吸掌 · 收定风痕' : '吹火掌 · 将风痕推出' : scene.action}</PrimaryButton>
          {task.stage === 7 && <SecondaryButton disabled={paused} onClick={() => act(task.beats === 0 ? 'push' : 'pull')}>{task.beats === 0 ? '尝试先推 · 重新调整次序' : '继续吸掌 · 重新调整次序'}</SecondaryButton>}</WalkControls>
      </> : <PrimaryButton onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>}
    </BondSummary> : <MutedParagraph>下一步请走近{eighthPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>同行与礼前八段已归档。</h3><p>正式礼两天前夜里的故事结果已经保留；正式仪式、石碑复测与萧宁挑战继续接续。</p>{onGuests && <PrimaryButton onClick={onGuests}>前往正式礼宾客 · 观察收剑中止</PrimaryButton>}</BondSummary>}
    {target > 0 && <SecondaryButton onClick={() => act('stop')}>停下本轮礼前训练 · 免费重新开始</SecondaryButton>}
    <MutedParagraph>时段是压缩回顾，练技与调息为代表性操作。药液只呈现本章既有木盆的定性药力；早先耗尽自用液、老师一滴记录与父亲原封瓶独立保留，不重复领材料或成长奖励。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离礼前训练 · 保留同行与练习断点</SecondaryButton>
  </>
}
