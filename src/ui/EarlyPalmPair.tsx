import { RobeFigure } from './NativeRegions'
import { TimingRange } from './NativeRegions'
import { TimingMeter } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyPalmPairBlock, submitEarlyPalmPair, type PalmPairStation } from '../core/early-palm-pair'
import { palmPairScenes } from '../content/early-palm-pair'
import { startSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'
const stations = { door: '门边 · 准备与归档', table: '练习桌 · 两只花瓶', teacher: '药老 · 讲解与初练' } as const
const bottleLabels = { intact: '完好', pulled: '已拉近', fragments: '碎片', dust: '细末' } as const
const teachingLabels = { unlearned: '尚未学习', explained: '已讲解，尚待初练', basic: '初步掌握' } as const
export default function EarlyPalmPair({ state, position, onBack, onPreliminary }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onPreliminary?: () => void }) {
  const task = state.earlyTraining.palmPair, scene = palmPairScenes[task.stage]
  const [station, setStation] = useState<PalmPairStation>('door')
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null), blocked = earlyPalmPairBlock(state, position)
  const training = (task.stage === 5 || task.stage === 8) && station === scene?.station, steady = state.settings.reducedMotion
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.attempts, steady])
  useEffect(() => {
    if (blocked || !training || steady || paused) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) }, setMarker, () => setPaused(true))
  }, [blocked, training, steady, paused])
  function act() {
    if (!scene || document.hidden || training && paused) return
    submitEarlyPalmPair(gameStore, position, station, { ...task, operation: scene.operation, marker: training ? marker : undefined })
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>萧家房中 / 吸掌与吹火掌</Eyebrow>
    <h2 ref={heading} tabIndex={-1}>先吸近，再接上推力。</h2>
    <p>两只练习花瓶分别记录。第一只用于吸掌加直接推风，求教后第二只用于吸掌与吹火掌；父亲赠回的售品原瓶收好。</p>
    <svg className="early-walk-map" role="img" aria-label={`练习瓶一：${bottleLabels[task.first]}；练习瓶二：${bottleLabels[task.second]}；吹火掌：${teachingLabels[task.teaching]}`} viewBox="0 0 720 280">
      <rect width="720" height="280" fill="#293a35" /><path d="M25 25 H695 V255 H25Z" fill="#514a3b" stroke="#bea073" strokeWidth="3" />
      <path d="M350 183 H635 V200 H350Z M370 200 V249 M615 200 V249" fill="#947750" stroke="#c4a577" strokeWidth="3" />
      <g transform="translate(232 155)"><RobeFigure cy="-25" r="13" skin="#e5c59f" cut="M-26 63 L-13-9 H13 L26 63Z" robe="#c99d69" /><path d="M16 10 L49 15" stroke="#e5c59f" strokeWidth="6" /></g>
      {[task.first, task.second].map((status, index) => <g key={index} transform={`translate(${status === 'pulled' ? 303 : index ? 575 : 408} 177)`}>
        {status === 'fragments' ? <path d="M-24 0 L-11-13 L-2 0Z M1 0 L14-16 L20 0Z M24 0 L30-9 L39 0Z" fill="#b9c9c6" />
          : status === 'dust' ? <ellipse rx="32" ry="6" fill="#dfe3d4" />
          : <path d="M-11-47 H11 V-30 Q28-16 20 0 H-20 Q-28-16-11-30Z" fill="#aac5bf" stroke="#d5d7ba" />}
        <MapText y="38" fill="#e4d4b6" fontSize="13">{index ? '第二只' : '第一只'} · {status === 'intact' ? '完好' : status === 'pulled' ? '已拉近' : status === 'dust' ? '细末' : '碎片'}</MapText>
      </g>)}
      {task.stage === 2 && <path d="M285 155 Q325 148 356 157" fill="none" stroke="#b9c6ac" strokeWidth="2" />}
      {(task.stage === 3 || task.stage === 8) && <path d="M342 128 L286 128 M291 122 L282 128 L291 134" fill="none" stroke="#93c6bf" strokeWidth="3" />}
      {task.stage >= 5 && <g transform="translate(104 145)" opacity=".8"><RobeFigure cy="-21" r="11" skin="#d7e4db" cut="M-20 62 L-9-3 H9 L20 62Z" robe="#b3cabe" /><MapText y="84" fill="#e4d4b6" fontSize="13">药老</MapText></g>}
      <MapText x="360" y="269" fill="#e4d4b6" fontSize="13">{task.teaching === 'basic' ? '吹火掌初步掌握 · 仍需练习' : task.teaching === 'explained' ? '吹火掌已讲解 · 尚待初练' : '尚未学习吹火掌 · 直接推风仅是初次试验'}</MapText>
    </svg>
    <WalkControls aria-label="吸推房中位置">{(Object.keys(stations) as PalmPairStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}</WalkControls>
    <StatusParagraph>吸推练习 {task.stage}/10 · 基础 {task.beats}/2 · 重试 {task.attempts} 次 · 第一只{task.first === 'fragments' ? '已碎' : task.first === 'pulled' ? '已拉近' : '完好'} · 第二只{task.second === 'dust' ? '已成细末' : task.second === 'pulled' ? '已拉近' : '完好'}</StatusParagraph>
    {scene ? station === scene.station ? <BondSummary aria-label="吸推组合步骤"><SceneHeading title={scene.title} text={scene.text} />
      {training && <>
        {steady && <TimingRange label="吸推切换时机" value={marker} onChange={event => setMarker(Number(event.target.value))}><small>减弱动态：方向键调至35%–65%，当前{Math.round(marker * 100)}%。</small></TimingRange>}
        <TimingMeter label="吸推时机指针" marker={marker} />
        {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停吸推时机</SecondaryButton>}
        {paused && <><StatusParagraph>吸推时机已暂停，需要明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续吸推练习 · 恢复时机</SecondaryButton></>}
      </>}
      <PrimaryButton disabled={training && paused} onClick={act}>{scene.action}</PrimaryButton>
    </BondSummary> : <MutedParagraph>下一步请到{stations[scene.station]}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>两瓶试验与老师初练已归档。</h3><p>第一只碎片和第二只细末分开保留。接下来仍需长期练习，族中预测另行接续。</p>
        {onPreliminary && <PrimaryButton onClick={onPreliminary}>接续一月前预测 · 同行入场</PrimaryButton>}</BondSummary>}
    <MutedParagraph>站位、两步初练与切换窗口为原创压缩操作，约两小时仅作故事回顾。不会给予大斗师外放能力或重复解锁主线斗技；七段、自用耗尽、老师一滴、父亲原瓶与钱账保留。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离吸推练习 · 保留两瓶断点</SecondaryButton>
  </>
}
