import { earlyWalkDirections as directions } from '../core/early-walk-keys'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { earlyEighthTrainingBlock, eighthPlaces, eighthTrainingBeats, eighthTrainingOperation, moveEighthWalker,
  nearEighthPlace, submitEarlyEighthTraining, type EighthTrainingAction } from '../core/early-eighth-training'
import { eighthTrainingScenes } from '../content/early-eighth-training'
import { startSupervisionPointer } from './supervision-pointer'
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
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!target || !near || steady || paused || blocked) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) },
    setMarker, () => setPaused(true))
  }, [target, near, steady, paused, blocked, task.beats])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveEighthWalker(current, direction))
  function act(operation: EighthTrainingAction['operation']) {
    if (document.hidden || !scene || target && paused && operation !== 'stop') return
    submitEarlyEighthTraining(gameStore, entryPosition, position, { ...task, operation,
      marker: target && operation !== 'stop' ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const direction = directions[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (direction) { event.preventDefault(); move(direction) }
    if (event.key.toLowerCase() === 'e' && scene && !target) { event.preventDefault(); act(scene.operation) }
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">预测之后 / 同行与礼前训练</span>
    <h2>日复一日，灯下偶得突破。</h2>
    <p id="eighth-help">方向键或WASD行走，走近地点按E接续静态步骤；训练使用下方时机与动作按钮。地图把房间、城市和后山压缩为行程节点。重入从分路出发，训练断点保留。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="同行与礼前训练地图" aria-describedby="eighth-help" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill={task.stage >= 11 ? '#202f3c' : '#304d43'} />
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
      {task.stage >= 4 && task.stage <= 5 && <g transform={`translate(${task.stage === 4 ? 246 : 546} 104)`} role="img" aria-label="薰儿同行"><circle cy="-10" r="7" fill="#dfbca3" /><path d="M-11 14 L-6-3 H6 L11 14Z" fill="#73a98a" /></g>}
      {task.stage === 7 && <g role="img" aria-label={task.beats ? '吸掌已记，准备吹火掌' : '准备吸掌，再接吹火掌'}><path d={task.beats ? 'M500 135 Q535 115 566 140' : 'M566 140 Q535 160 500 135'} fill="none" stroke="#d5d4a1" strokeWidth="3" strokeDasharray="6 5" /><path d="M555 129 Q581 118 571 142 Q561 146 555 129" fill="#b9c480" /></g>}
      {Object.entries(eighthPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="44" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><text x={place.x} y={place.y + 57} textAnchor="middle" fill="#ead9b6" fontSize="12">{place.label}</text></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
    </svg>
    <div className="early-walk-controls" aria-label="礼前训练行走操作">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={['礼前向上走', '礼前向左走', '礼前向下走', '礼前向右走'][i]} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    <p role="status">礼前训练 {task.stage}/15 · {target ? `本轮 ${task.beats}/${target}` : '地点步骤'} · 重开 {task.attempts} 次 · {task.outing === 'none' ? '尚待回应' : task.outing === 'promised' ? '已约好，同行未完成' : '次日同行已记'} · {task.result === 'none' ? '故事八段尚未感知' : '故事八段已感知'}</p>
    {scene ? near ? <section className="bond-summary" aria-label="礼前训练步骤"><h3>{scene.title}</h3><p>{scene.text}</p>
      {target ? <>
        {steady && <label className="setting-row"><span>礼前训练时机<small>方向键调至35%–65%，当前{Math.round(marker * 100)}%。</small></span><input aria-label="礼前训练时机" type="range" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} /></label>}
        <div className="heat-meter" aria-label="礼前训练时机指针"><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
        {!steady && !paused && <button className="secondary" onClick={() => setPaused(true)}>暂停礼前训练时机</button>}
        {paused && <><p role="status">时机已暂停，需明确继续。</p><button className="secondary" onClick={() => { setMarker(.5); setPaused(false) }}>继续礼前训练 · 恢复时机</button></>}
        <div className="early-walk-controls"><button className="primary" disabled={paused} onClick={() => act(eighthTrainingOperation(task))}>{task.stage === 7 ? task.beats === 0 ? '吸掌 · 收定风痕' : '吹火掌 · 将风痕推出' : scene.action}</button>
          {task.stage === 7 && <button className="secondary" disabled={paused} onClick={() => act(task.beats === 0 ? 'push' : 'pull')}>{task.beats === 0 ? '尝试先推 · 重新调整次序' : '继续吸掌 · 重新调整次序'}</button>}</div>
      </> : <button className="primary" onClick={() => act(scene.operation)}>{scene.action}</button>}
    </section> : <p className="muted">下一步请走近{eighthPlaces[scene.place].label}：{scene.title}。</p>
      : <section className="bond-summary"><h3>同行与礼前八段已归档。</h3><p>正式礼两天前夜里的故事结果已经保留；正式仪式、石碑复测与萧宁挑战继续接续。</p>{onGuests && <button className="primary" onClick={onGuests}>前往正式礼宾客 · 观察收剑中止</button>}</section>}
    {target > 0 && <button className="secondary" onClick={() => act('stop')}>停下本轮礼前训练 · 免费重新开始</button>}
    <p className="muted">时段是压缩回顾，练技与调息为代表性操作。药液只呈现本章既有木盆的定性药力；早先耗尽自用液、老师一滴记录与父亲原封瓶独立保留，不重复领材料或成长奖励。</p>
    <button className="secondary" onClick={onBack}>暂离礼前训练 · 保留同行与练习断点</button>
  </>
}
