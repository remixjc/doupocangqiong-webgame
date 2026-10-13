import { useSceneFocus } from './use-scene-focus'
import { HallWalker, TimingRange } from './NativeRegions'
import { TimingMeter } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import WalkDirectionButtons from './WalkDirectionButtons'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlyQiAidBlock, qiAidPlaces, moveQiAidWalker, nearQiAidPlace, qiAidOperation, submitEarlyQiAid, type QiAidAction } from '../core/early-qi-aid'
import type { EarlyWalkPosition, EarlyWalkDirection } from '../core/early-walk'
import { qiAidScenes } from '../content/early-qi-aid'
import { startBrowserSupervisionPointer } from './supervision-pointer'
import './early-walk.css'

export default function EarlyQiAid({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.qiPavilionAid, scene = qiAidScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...qiAidPlaces.fire })
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null), blocked = earlyQiAidBlock(state)
  const training = task.stage === 6, steady = state.settings.reducedMotion
  const near = scene && nearQiAidPlace(position, scene.place)
  const motionActive = training && near && !steady && !paused
  useSceneFocus(field, !blocked, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!motionActive || blocked) return
    return startBrowserSupervisionPointer(
    setMarker, () => setPaused(true))
  }, [motionActive, blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveQiAidWalker(current, direction))
  function act(operation: QiAidAction['operation']) {
    if (!scene || document.hidden || training && operation !== 'stop' && paused) return
    const timed = training && (operation === 'settle' || operation === 'solo-kick')
    submitEarlyQiAid(gameStore, position, { ...task, actor: scene.actor, operation, marker: timed ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene && near ? () => act(qiAidOperation(task)) : undefined)
  }
  if (blocked) return <><p>{blocked}</p><SecondaryButton onClick={onBack}>返回重修准备</SecondaryButton></>
  return <>
    <Eyebrow>功法阁 / 同行与独自援助</Eyebrow><h2>先走过，再独自走回。</h2>
    <p id="qi-aid-help">方向键或WASD移动，靠近目标按E。取卷、看时间、经过、回返、踢破、回应与会合按顺序保存。</p>
    <EarlyMap ref={field} aria-label="功法阁同行与风属性门障地图" aria-describedby="qi-aid-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#2c4036" />
      <path d="M100 320 V140 H540 V320 L640 360" fill="none" stroke="#726349" strokeWidth="38" />
      <rect x="260" y="220" width="180" height="100" rx="12" fill="#535d4c" />
      <MapText x="350" y="270" fill="#dcc89f" fontSize="15">阁内陈设 · 不可穿行</MapText>
      <rect x="573" y="278" width="9" height="65" fill={task.door === 'broken' ? '#8bb78a' : '#bf6559'} />
      {Object.entries(qiAidPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="28" stroke={scene?.place === id ? '#f8dba4' : '#9ca487'} fill="none" strokeDasharray="4 5" /><MapText x={place.x} y={place.y + 44} fill="#edcea0" fontSize="11">{place.label}</MapText></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><HallWalker /></g>
    </EarlyMap>
    <WalkControls aria-label="同行援助行走操作"><WalkDirectionButtons prefix="援助" onMove={move} /></WalkControls>
    <StatusParagraph>援助 {task.stage}/10 · 薰儿自选卷{task.xunerScroll === 'xuner' ? '已由她保管' : '未取'} · 风房门障{task.door === 'broken' ? '已破' : task.door === 'intact' ? '完整' : '待观察'} · {task.returned ? '已回返' : '未回返'} · 动作{task.beats}/2 · 免费重试{task.attempts}</StatusParagraph>
    {scene ? near ? <BondSummary>{sceneHeading(scene)}
      {training ? <>
        {steady && <TimingRange label="援助出手时机" value={marker} onChange={event => setMarker(Number(event.target.value))}><small>减弱动态：键盘调至35%–65%，当前{Math.round(marker * 100)}%。</small></TimingRange>}
        <TimingMeter label="援助时机指针" marker={marker} />
        {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停援助时机</SecondaryButton>}
        {paused && <><StatusParagraph>时机已暂停，请明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续援助练习</SecondaryButton></>}
        <PrimaryButton disabled={paused} onClick={() => act(qiAidOperation(task))}>{task.beats ? '独自踢击 · 门障才破' : '独自站定 · 第一动作'}</PrimaryButton>
        <SecondaryButton onClick={() => act('group-attack')}>尝试多人同攻</SecondaryButton>
      </> : <PrimaryButton onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>}
      {task.stage >= 3 && <SecondaryButton onClick={() => act('take-scroll')}>尝试收取第二卷</SecondaryButton>}
    </BondSummary> : <MutedParagraph>先走近{qiAidPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>同行与独自援助已归档。</h3><p>萧媚门障已破；家族卷归萧炎，薰儿自选卷归她。正式登记与实际离阁仍待续。</p></BondSummary>}
    {training && <SecondaryButton onClick={() => act('stop')}>停下本轮 · 免费重新站定</SecondaryButton>}
    <MutedParagraph>地图、陈设、20步长与出手时机为原创操作；时限采用回顾，未实现现实两小时或超时离阁。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离同行与援助 · 保留断点</SecondaryButton>
  </>
}
