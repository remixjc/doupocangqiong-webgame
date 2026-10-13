import { sceneButton } from './Buttons'
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
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import {
  earlyQiBarrierBlock, moveQiBarrierWalker, nearQiBarrierPlace, nearQiPath, qiBarrierPlaces, qiBarrierOperation,
  qiPaths, submitEarlyQiBarrier, type QiBarrierAction,
} from '../core/early-qi-barrier'
import { qiBarrierScenes } from '../content/early-qi-barrier'
import { gameStore } from '../core/store'
import { startBrowserSupervisionPointer } from './supervision-pointer'
import './early-walk.css'

export default function EarlyQiBarrier({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.qiPavilionBarrier
  const scene = qiBarrierScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...qiBarrierPlaces.fire })
  const [marker, setMarker] = useState(.5)
  const [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyQiBarrierBlock(state), training = task.stage === 6
  const steady = state.settings.reducedMotion
  const nearPath = scene?.place === 'path'
    && qiPaths.some((_, index) => nearQiPath(position, index + 1, task.stage))
  const near = scene && (scene.place === 'path' ? nearPath : nearQiBarrierPlace(position, scene.place, task.stage))
  const motionActive = training && near && !steady && !paused
  useSceneFocus(field, !blocked, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!motionActive || blocked) return
    return startBrowserSupervisionPointer(
    setMarker, () => setPaused(true))
  }, [motionActive, blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveQiBarrierWalker(current, direction, task.stage))
  function act(operation: QiBarrierAction['operation'], chosenPath?: number) {
    if (document.hidden || (training && operation !== 'stop' && paused)) return
    submitEarlyQiBarrier(gameStore, position, {
      ...task, actor: scene?.actor ?? 'xiaoyan', operation, chosenPath,
      marker: training && operation !== 'stop' ? marker : undefined,
    })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene && near ? () => act(scene.place === 'path' ? 'path' : qiBarrierOperation(task), scene.place === 'path' ? 3 : undefined) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  const operation = qiBarrierOperation(task)
  const actionLabel = task.stage === 6 ? ['稳身 · 连接第一步', '运气 · 连接第二步', '八极崩 · 破幕出击'][task.beats] : scene?.action
  return <>
    <Eyebrow>功法阁 / 火通道与四十三号门障</Eyebrow>
    <h2>走到四十三号，再破开最后一道红幕。</h2>
    <p id="qi-barrier-help">沿火属性通道行走，按顺序核对第三路、三十七号与四十三号。门障前先触幕，再退步蓄势；练习失败只免费重开，不会取得卷轴。</p>
    <EarlyMap ref={field} aria-label="功法阁火通道与红幕地图" aria-describedby="qi-barrier-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#2e3934" />
      <path d="M80 350 H640 M100 350 V300 M220 350 V300 M360 350 V300 M500 350 V300 M620 350 V300 M360 300 V100" fill="none" stroke="#716a4c" strokeWidth="24" strokeLinejoin="round" />
      <path d="M360 100 H520 V180 H390" fill="none" stroke="#675141" strokeWidth="26" strokeLinejoin="round" />
      <rect x="392" y="104" width="10" height="76" fill={task.barrier === 'broken' ? '#4b6b52' : '#cc6257'} />
      <MapText x="360" y="58" fill="#e5c48e" fontSize="17">火通道 · 第三路 · 四十三号</MapText>
      {qiPaths.map((x, index) => <g key={x}><circle cx={x} cy="350" r="25" fill={task.path === 3 && index === 2 ? '#a18456' : '#465a4d'} /><MapText x={x} y="355" fill="#ead9b6">{index + 1}</MapText></g>)}
      <text x="335" y="285" fill="#e6d4ad" fontSize="11">37</text><text x="335" y="112" fill="#e6d4ad" fontSize="11">43</text>
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><HallWalker /></g>
      {Object.entries(qiBarrierPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="31" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><MapText x={place.x} y={place.y + 43} fill="#ead9b6" fontSize="10">{place.label}</MapText></g>)}
    </EarlyMap>
    <WalkControls aria-label="火通道行走操作"><WalkDirectionButtons prefix="火通道" onMove={move} /></WalkControls>
    <StatusParagraph>门障 {task.stage}/10 · {task.path === 3 ? '第三路' : '未选支路'} · {task.room37 ? '37已核' : '37待核'} · {task.room43 ? '43已到' : '43待到'} · {task.barrier === 'broken' ? '红幕已破' : task.barrier === 'touched' ? '红幕已探查' : '红幕完整'} · {task.entered ? '已入室' : '未入室'} · 免费重试 {task.attempts}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="火通道门障步骤">{sceneHeading(scene)}
      {task.stage === 1 ? <WalkControls>{[1, 2, 3, 4, 5].map(path => <SecondaryButton key={path} onClick={() => act('path', path)}>选择第{path}路</SecondaryButton>)}</WalkControls>
        : task.stage === 6 ? <>
          {steady && <TimingRange label="破幕时机" value={marker} onChange={event => setMarker(Number(event.target.value))}><small>减弱动态：方向键调至35%–65%。当前{Math.round(marker * 100)}%。</small></TimingRange>}
          <TimingMeter label="破幕时机指针" marker={marker} />
          {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停破幕时机</SecondaryButton>}
          {paused && <><StatusParagraph>破幕时机已暂停，需明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续破幕练习</SecondaryButton></>}
          <PrimaryButton disabled={paused} onClick={() => act(operation)}>{actionLabel}</PrimaryButton>
        </> : sceneButton(scene, undefined, act)}
      {task.stage >= 4 && <SecondaryButton onClick={() => act('take-scroll')}>尝试提前取卷 · 尚未择卷</SecondaryButton>}
    </BondSummary> : <MutedParagraph>下一步请走近{scene.place === 'path' ? '第三支路入口' : qiBarrierPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>火路、门障与入室已归档。</h3><p>{state.earlyTraining.qiPavilionScroll.family === 'held' ? '后续已取得家族卷，这里保留此前破幕与入室的记录。' : '四十三号室内卷轴仍待独立取得。'}破幕不增加功法、技能、境界或奖励。</p></BondSummary>}
    {task.stage === 6 && <SecondaryButton onClick={() => act('stop')}>停下这一轮 · 免费重新蓄势</SecondaryButton>}
    <MutedParagraph>五条支路、门牌与门障地图是原创压缩操作；八极崩沿已有主线技能使用，不重复解锁。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离火通道 · 保留门障断点</SecondaryButton>
  </>
}
