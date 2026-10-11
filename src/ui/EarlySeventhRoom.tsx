import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlySeventhRoomBlock, submitEarlySeventhRoom, type SeventhStation } from '../core/early-seventh-room'
import { seventhRoomScenes, seventhEnergyLabels } from '../content/early-seventh-room'
import { startSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'

const stations = { window: '窗边 · 时序与回顾', basin: '木盆 · 调息与药色', ring: '古戒 · 老师补液' } as const
export default function EarlySeventhRoom({ state, position, onBack }: { state: GameState; position: EarlyWalkPosition; onBack: () => void }) {
  const task = state.earlyTraining.seventhRoom, scene = seventhRoomScenes[task.stage]
  const [station, setStation] = useState<SeventhStation>('window')
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null), blocked = earlySeventhRoomBlock(state, position)
  const training = (task.stage === 1 || task.stage === 4) && station === 'basin'
  const steady = state.settings.reducedMotion
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.attempts, steady])
  useEffect(() => {
    if (blocked || !training || steady || paused) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) },
    setMarker, () => setPaused(true))
  }, [blocked, training, steady, paused])
  function act() {
    if (!scene || document.hidden || training && paused) return
    submitEarlySeventhRoom(gameStore, position, station, { ...task, operation: scene.operation, marker: training ? marker : undefined })
  }
  if (blocked) return <p>{blocked}</p>
  const color = task.energy === 'clear' ? '#93b3af' : task.energy === 'restored' ? '#30614b' : task.energy === 'active' ? '#578967' : '#739b7d'
  return <>
    <span className="eyebrow">萧家房中 / 冲向七段</span>
    <h2 ref={heading} tabIndex={-1}>一滴补液，接住这一轮。</h2>
    <p>林中成功之后，房中继续修炼。本次木盆与早先耗尽的自用记录分开；古戒补液由药老完成，父亲赠回的原瓶仍收好。</p>
    <svg className="early-walk-map" viewBox="0 0 720 300" role="img" aria-label={`七段房中独立木盆：${seventhEnergyLabels[task.energy]}；药老从古戒补液${task.drops}滴；${task.result === 'none' ? '七段尚未成立' : '故事七段已成立'}`}>
      <rect width="720" height="300" fill="#283a35" /><path d="M25 25 H695 V275 H25Z" fill="#504a3b" stroke="#bea073" strokeWidth="3" />
      <rect x="70" y="60" width="115" height="95" fill="#b1b295" stroke="#beab7f" /><path d="M128 60 V155 M70 108 H185" stroke="#5c6049" strokeWidth="5" />
      <path d="M90 260 L220 148 L166 70 L280 260Z" fill="#d9c68f" opacity=".13" />
      <path d="M261 199 H456 L446 263 H271Z" fill="#816745" stroke="#c4a675" strokeWidth="3" />
      <ellipse cx="359" cy="199" rx="98" ry="30" fill={color} stroke="#b7bb93" strokeWidth="3" />
      {task.stage > 0 && <g transform="translate(356 156)"><circle cy="-26" r="14" fill="#e4c59e" /><path d="M-31 46 L-13-8 H13 L31 46Z" fill="#d1a56d" /><path d="M-24 16 L0 28 L24 16" fill="none" stroke="#8e744f" strokeWidth="5" /></g>}
      <g transform="translate(573 160)"><ellipse rx="26" ry="17" fill="none" stroke="#171f23" strokeWidth="10" /><text y="46" textAnchor="middle" fill="#e5d5b7" fontSize="14">古戒 · 药老补液</text></g>
      {task.drops === 1 && <g><path d="M524 177 Q511 196 524 200 Q537 196 524 177Z" fill="#88bda1" /><path d="M503 197 L465 200" stroke="#9dcead" strokeDasharray="4 5" /><text x="558" y="250" textAnchor="middle" fill="#e5d5b7" fontSize="13">一滴已入水 · 不重复补入</text></g>}
      <text x="360" y="291" textAnchor="middle" fill="#e5d5b7" fontSize="13">{seventhEnergyLabels[task.energy]} · {task.result === 'none' ? '尚待合法感知结果' : '本轮故事七段'}</text>
    </svg>
    <div className="early-walk-controls" aria-label="七段房中位置">
      {(Object.keys(stations) as SeventhStation[]).map(id => <button key={id} className="secondary" aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</button>)}
    </div>
    <p role="status">房中七段 {task.stage}/8 · 调息 {task.beats}/{task.stage <= 3 ? 2 : 3} · 补液 {task.drops}/1 滴 · 重试 {task.attempts} 次 · {task.result === 'none' ? '故事七段未成立' : '故事七段已成立'}</p>
    {scene ? station === scene.station ? <section className="bond-summary" aria-label="七段房中步骤"><h3>{scene.title}</h3><p>{scene.text}</p>
      {training && <>
        {steady && <label className="setting-row"><span>房中调息时机<small>减弱动态：方向键调到35%–65%，当前{Math.round(marker * 100)}%。</small></span><input aria-label="房中调息时机" type="range" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} /></label>}
        <div className="heat-meter" aria-label="房中调息时机指针"><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
        {!steady && !paused && <button className="secondary" onClick={() => setPaused(true)}>暂停房中时机</button>}
        {paused && <><p role="status">房中时机已暂停，返回前台后需明确继续。</p><button className="secondary" onClick={() => { setMarker(.5); setPaused(false) }}>继续房中调息 · 恢复时机</button></>}
      </>}
      <button className="primary" disabled={training && paused} onClick={act}>{scene.action}</button>
    </section> : <p className="muted">下一步请到{stations[scene.station]}：{scene.title}。</p>
      : <section className="bond-summary"><h3>房中七段已归档。</h3><p>本轮木盆保留补液后渐淡状态，老师的一滴只补了一次。吸掌与推风组合练习将在后续接续。</p></section>}
    <p className="muted">两次与三次调息及35%–65%窗口为原创操作，一小时只作故事时段回顾。七段结果独立记录；既有自用药液仍耗尽，父亲原瓶、房柜原包、主线境界和已结算奖励保留。</p>
    <button className="secondary" onClick={onBack}>暂离七段房中 · 保留补液断点</button>
  </>
}
