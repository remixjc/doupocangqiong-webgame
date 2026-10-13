import { TimingRange } from './NativeRegions'
import { TimingMeter } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlySupervisionBlock, submitEarlySupervision, type EarlySupervisionAction } from '../core/early-supervision'
import { gameStore } from '../core/store'
import { startSupervisionPointer } from './supervision-pointer'
import './early-walk.css'

export default function EarlySupervision({ state, position, onBack, onRecover }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onRecover?: () => void }) {
  const task = state.earlyTraining.supervision
  const [marker, setMarker] = useState(.5)
  const [paused, setPaused] = useState(false)
  const entry = useRef<HTMLButtonElement>(null)
  const blocked = earlySupervisionBlock(state, position)
  const steady = state.settings.reducedMotion
  useEffect(() => { if (!blocked) entry.current?.focus() }, [blocked, task.stage, task.attempts])
  useEffect(() => { if (steady) setPaused(false) }, [steady])
  useEffect(() => {
    setMarker(.5); setPaused(false)
  }, [task.stage, task.attempts])
  useEffect(() => {
    if (blocked || task.stage !== 1 || steady || paused) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) },
    setMarker, () => setPaused(true))
  }, [blocked, task.stage, task.attempts, steady, paused])
  function act(operation: EarlySupervisionAction['operation']) {
    if (operation === 'brace' && (paused || document.hidden)) return
    submitEarlySupervision(gameStore, position, { stage: task.stage, pulses: task.pulses, attempts: task.attempts,
      operation, marker: operation === 'brace' ? marker : undefined })
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>后山 / 药老监督训练</Eyebrow>
    <h2>承接斗气，也学会停下。</h2>
    <p>药老在后山指导萧炎打好身体基础。这一轮用四次抽象斗气脉冲表现姿态承接，绿色时机区为35%–65%；次数、负荷与节奏都是游戏折算。</p>
    <svg className="early-walk-map" viewBox="0 0 720 300" role="img" aria-label={task.stage === 2 ? state.earlyTraining.recovery.stage >= 5 ? '本轮督练结束，萧炎已经回房恢复' : '本轮督练结束，萧炎停下等待接续恢复' : '药老在后山监督萧炎承接斗气脉冲'}>
      <rect width="720" height="300" fill="#203934" /><path d="M0 120 L90 32 L200 105 L350 15 L480 110 L610 40 L720 116 V0 H0Z" fill="#496359" />
      <path d="M0 255 Q130 200 250 245 T720 230 V300 H0Z" fill="#606346" />
      <ellipse cx="205" cy="234" rx="60" ry="20" fill="#73786a" />
      <g transform="translate(205 125)" opacity=".85"><path d="M-22 80 Q-10 15 0 0 Q10 15 22 80Z" fill="#bdd4cb" /><circle cy="-10" r="12" fill="#e0e4d5" /><MapText x="0" y="107" fill="#ead9b6" fontSize="14">药老 · 督练</MapText></g>
      <g transform="translate(475 170)"><ellipse cy="65" rx="28" ry="8" fill="#0004" /><path d="M-20 55 L-10 0 H10 L20 55Z" fill="#cda46b" /><circle cy="-14" r="12" fill="#edc9a2" /><path d="M-13-21 Q0-35 13-21" fill="#24312c" />
        {task.stage === 1 && <path d="M-32-25 Q40-30 40 34 Q0 75-32 36" fill="none" stroke="#a8cbaa" strokeWidth="3" />}
      </g>
      {task.stage === 1 && <path d="M233 145 Q320 103 430 166" fill="none" stroke="#d99078" strokeWidth="4" strokeDasharray="7 10" />}
      <MapText x="360" y="286" fill="#d5ceb2" fontSize="13">{task.stage === 2 ? state.earlyTraining.recovery.stage > 0 ? '本轮已停下 · 恢复有独立记录' : '本轮已停下 · 待回房恢复' : '后山督练 · 留意负荷'}</MapText>
    </svg>
    <StatusParagraph>督练承接 {task.pulses}/4 · 本轮负荷 {task.pulses * 25}% · 重新开练 {task.attempts} 次</StatusParagraph>
    {task.stage === 0 && <><MutedParagraph>开始后可以随时免费停练。失误结束当前轮，不扣金币、材料或药液；再次开始后从第一道脉冲练起。</MutedParagraph>
      <PrimaryButton ref={entry} onClick={() => act('begin')}>开始本轮后山督练</PrimaryButton></>}
    {task.stage === 1 && <>
      <p>{task.pulses >= 3 ? '药老：负荷已接近本轮边界。最后一次承接后便停下，也可现在停练。' : '药老：先稳住姿态，看准脉冲再承接；不要为了次数忽略负荷。'}</p>
      {steady && <TimingRange label="督练承接时机" value={marker} onChange={event => setMarker(Number(event.target.value))}><small>减弱动态：用方向键调至35%–65%后承接。当前 {Math.round(marker * 100)}%。</small></TimingRange>}
      <TimingMeter label="督练时机指针" marker={marker} />
      {!steady && paused && <><StatusParagraph>督练时机已暂停，请确认后继续；后台时不推进。</StatusParagraph><SecondaryButton onClick={() => setPaused(false)}>继续本轮督练 · 恢复时机</SecondaryButton></>}
      <PrimaryButton ref={entry} disabled={paused} onClick={() => act('brace')}>承接第{task.pulses + 1}次斗气脉冲</PrimaryButton>
      <SecondaryButton onClick={() => act('stop')}>停练 · 免费重新准备</SecondaryButton>
    </>}
    {task.stage === 2 && <BondSummary><h3>这一轮督练已记下</h3><p>萧炎停下，药老提醒他回房使用修炼药液恢复。回房恢复、持续时段回顾与阶段结果分别记录。</p>
      {onRecover && <PrimaryButton onClick={onRecover}>接续回房 · 使用自用药液恢复</PrimaryButton>}</BondSummary>}
    <SecondaryButton onClick={onBack}>暂离后山督练 · 保留断点</SecondaryButton>
  </>
}
