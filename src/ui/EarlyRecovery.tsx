import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyRecoveryBlock, submitEarlyRecovery, type EarlyRecoveryStation } from '../core/early-recovery'
import { earlyRecoveryScenes, recoveryEnergyLabels } from '../content/early-recovery'
import { gameStore } from '../core/store'
import './early-walk.css'

const stations = { door: '门边', container: '盛水容器', window: '晨光窗边' } as const
export default function EarlyRecovery({ state, position, onBack, onConsign }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onConsign?: () => void }) {
  const task = state.earlyTraining.recovery, scene = earlyRecoveryScenes[task.stage]
  const [station, setStation] = useState<EarlyRecoveryStation>('door')
  const [marker, setMarker] = useState(.5)
  const entry = useRef<HTMLHeadingElement>(null)
  const blocked = earlyRecoveryBlock(state, position)
  useEffect(() => { if (!blocked) entry.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5) }, [task.stage])
  if (blocked) return <p>{blocked}</p>
  const inContainer = task.stage >= 2 && task.stage <= 4
  const waterColor = task.energy === 'spent' ? '#9badb0' : task.energy === 'fading' ? '#9faf94' : '#75ad87'
  const breathing = scene?.operation === 'breathe' || scene?.operation === 'rest'
  return <>
    <Eyebrow>往事回房 / 训练后的恢复</Eyebrow>
    <h2 ref={entry} tabIndex={-1}>药色淡去，晨光照来。</h2>
    <p>药老督练后，回房使用此前准备的同一份药液。选择房间位置，完成调息、离开容器，再分别记下持续时段回顾与故事结果。</p>
    <svg className="early-walk-map" viewBox="0 0 720 310" role="img"
      aria-label={`训练后的恢复房间：${recoveryEnergyLabels[task.energy]}；萧炎${inContainer ? '在容器中恢复' : '站在房中'}。`}>
      <rect width="720" height="310" fill="#283c35" />
      <path d="M20 20 H700 V275 H20Z" fill="#45463a" stroke="#b6a079" strokeWidth="3" />
      <rect x="80" y="95" width="80" height="180" fill="#625443" stroke="#b6a079" />
      <rect x="525" y="40" width="110" height="90" fill={task.stage >= 5 ? '#dbc794' : '#708a7b'} stroke="#b6a079" />
      <path d="M580 40 V130 M525 85 H635" stroke="#b6a079" strokeWidth="3" />
      {task.stage >= 5 && <path d="M525 130 L390 275 H655 L635 130Z" fill="#f0d8a620" />}
      <g transform={`translate(${inContainer ? 355 : 205} ${inContainer ? 180 : 207})`}>
        <path d="M-22 48 L-12 0 H12 L22 48Z" fill="#c9a06b" /><circle cy="-13" r="13" fill="#e8c69f" /><path d="M-13-20 Q0-35 13-20" fill="#28342d" />
        {inContainer && <path d="M-16 9 Q0 19 16 9" stroke="#d3e4bb" fill="none" strokeWidth="2" />}
      </g>
      <g transform="translate(355 245)">
        <path d="M-86-10 L-74 28 Q0 50 74 28 L86-10Z" fill="#806747" stroke="#c6aa79" strokeWidth="3" />
        <ellipse rx="86" ry="24" cy="-10" fill={waterColor} stroke="#c6aa79" strokeWidth="3" />
        <path d="M-58-10 Q-28-20 0-10 T58-10" stroke="#d6e3d1" fill="none" strokeWidth="2" />
      </g>
      <MapText x="355" y="300" fill="#ebd6b1" fontSize="13">原有自用容器 · {recoveryEnergyLabels[task.energy]}</MapText>
    </svg>
    <WalkControls aria-label="恢复房间位置">
      {(Object.keys(stations) as EarlyRecoveryStation[]).map(id => <SecondaryButton key={id}
        aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </WalkControls>
    <StatusParagraph>回房恢复 {task.stage}/7 · {recoveryEnergyLabels[task.energy]} · {task.period === 'reviewed' ? '持续时段已回顾' : '持续时段待回顾'} · {task.result === 'fifth-duan' ? '五段故事结果已记下' : '故事结果尚未记录'}</StatusParagraph>
    {scene ? station === scene.station ? <BondSummary aria-label="回房恢复步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      {breathing && <>
        <label className="setting-row"><span>恢复调息时机<small>用方向键调至35%–65%；当前 {Math.round(marker * 100)}%。失误可免费再试，药力保留。</small></span>
          <input type="range" aria-label="恢复调息时机" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} />
        </label>
        <div className="heat-meter" aria-label="恢复时机指针"><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
      </>}
      {scene.operation === 'review' && <p className="muted">此处是压缩往事回顾：老师提及半月前的耐受变化，成长叙述另回顾四段后一个半月到五段。没有实际等待，也不把这一轮四次脉冲当成全部时日。调息次数与时机区间均为原创折算。</p>}
      <PrimaryButton onClick={() => submitEarlyRecovery(gameStore, position, station,
        { step: task.stage, energy: task.energy, operation: scene.operation, marker: breathing ? marker : undefined })}>{scene.action}</PrimaryButton>
    </BondSummary> : <p className="muted">下一步请到{stations[scene.station]}：{scene.title}。</p>
      : <BondSummary><h3>恢复与阶段结果已记下</h3><p>自用药液已经耗尽。萧炎记下故事中的斗之气五段，接下来需另筹材料。</p>
        <p className="muted">这是往事结果，主线人物境界、攻击和技能沿原旅程继续。容器与调制收据保留。</p>
        {onConsign && <PrimaryButton onClick={onConsign}>接续筹款 · 准备首次寄售</PrimaryButton>}</BondSummary>}
    <SecondaryButton onClick={onBack}>暂离恢复房间 · 保留断点</SecondaryButton>
  </>
}
