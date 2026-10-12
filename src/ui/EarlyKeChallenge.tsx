import { earlyWalkDirections as directions } from '../core/early-walk-keys'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { preliminaryObstacles, movePreliminaryWalker } from '../core/early-preliminary'
import { earlyKeChallengeBlock, keChallengePlaces, nearKeChallengePlace, submitEarlyKeChallenge, type KeChallengeAction } from '../core/early-ke-challenge'
import { keChallengeScenes } from '../content/early-ke-challenge'
import { startSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyKeChallenge({ state, position: entryPosition, onBack, onTraining }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onTraining?: () => void
}) {
  const task = state.earlyTraining.keChallenge, scene = keChallengeScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...keChallengePlaces.waiting })
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyKeChallengeBlock(state, entryPosition), near = scene && nearKeChallengePlace(position, scene.place)
  const training = task.stage === 3, steady = state.settings.reducedMotion
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!training || !near || steady || paused || blocked) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) },
    setMarker, () => setPaused(true))
  }, [training, near, steady, paused, blocked, task.beats])
  const move = (direction: EarlyWalkDirection) => setPosition(current => movePreliminaryWalker(current, direction))
  function act(operation: KeChallengeAction['operation']) {
    if (document.hidden || !scene || training && paused && operation !== 'stop') return
    submitEarlyKeChallenge(gameStore, entryPosition, position, { ...task, operation,
      marker: training && operation !== 'stop' ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const direction = directions[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (direction) { event.preventDefault(); move(direction) }
    if (event.key.toLowerCase() === 'e' && scene && !training) { event.preventDefault(); act(scene.operation) }
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">预测之后 / 萧克六段挑战</span>
    <h2>避开来掌，再以低阶掌法回应。</h2>
    <p id="ke-challenge-help">地图用方向键或WASD行走，静态步骤走近按E；应战用下方动作按钮与35%–65%窗口。错动作、错时机或主动停下可免费重开，位置与时机都是原创压缩设计。重入从候测区出发。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="萧克挑战与离场地图" aria-describedby="ke-challenge-help" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#273c37" />
      <path d="M100 360 L240 300 H380 L580 180" fill="none" stroke="#69776b" strokeWidth="38" strokeLinejoin="round" />
      {preliminaryObstacles.map((rect, i) => <rect key={i} {...rect} rx="7" fill={i === 0 ? '#776650' : '#566751'} stroke="#9a9478" />)}
      <text x="165" y="100" textAnchor="middle" fill="#ead9b6" fontSize="13">高台 · 萧战宣布胜负</text>
      <circle cx="580" cy="180" r="74" fill="#446355" stroke="#9a9478" />
      {task.stage >= 2 && task.stage <= 5 && <g role="img" aria-label={task.stage >= 4 ? '萧克已倒地，低阶掌法击肩已记' : task.beats === 1 ? '萧炎已向左侧避，准备低阶掌法击肩' : '萧克来掌，等待左侧避'}>
        <g transform={`translate(${task.stage >= 4 ? 626 : 608} ${task.stage >= 4 ? 202 : 160}) rotate(${task.stage >= 4 ? 78 : 0})`}><circle cy="-15" r="8" fill="#dbb799" /><path d="M-12 18 L-7-5 H7 L12 18Z" fill="#b88775" /><path d="M-8-3 L-36 2" stroke="#dbb799" strokeWidth="5" /></g>
        {task.stage === 3 && <path d={task.beats === 0 ? 'M594 161 L553 179 L582 196Z' : 'M535 176 Q559 159 596 163'} fill={task.beats === 0 ? '#d7967c55' : 'none'} stroke="#d4bd79" strokeDasharray="4 3" />}
        <text x="630" y="232" textAnchor="middle" fill="#ead9b6" fontSize="11">萧克 · 六段</text>
      </g>}
      <g transform="translate(342 278)"><circle cy="-15" r="8" fill="#dfbca3" /><path d="M-12 16 L-7-5 H7 L12 16Z" fill="#73a98a" /><text y="34" textAnchor="middle" fill="#ead9b6" fontSize="11">薰儿</text></g>
      <path d="M87 345 V295 M61 304 Q86 280 112 305 M54 316 Q86 283 120 316" fill="none" stroke="#86a383" strokeWidth="7" />
      {Object.entries(keChallengePlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="44" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><text x={place.x} y={place.y + 57} textAnchor="middle" fill="#ead9b6" fontSize="12">{place.label}</text></g>)}
      <g transform={`translate(${position.x - (training && task.beats === 1 ? 18 : 0)} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
    </svg>
    <div className="early-walk-controls" aria-label="萧克挑战行走操作">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={['应战向上走', '应战向左走', '应战向下走', '应战向右走'][i]} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    <p role="status">萧克挑战 {task.stage}/12 · 动作 {task.beats}/2 · 重开 {task.attempts} 次 · {task.verdict === 'none' ? '尚未完成交锋' : task.verdict === 'pending' ? '萧克倒地，待父亲宣布' : '父亲已宣布萧克败'}</p>
    {scene ? near ? <section className="bond-summary" aria-label="萧克挑战步骤"><h3>{scene.title}</h3><p>{scene.text}</p>
      {training ? <>
        {steady && <label className="setting-row"><span>萧克应战时机<small>方向键调至35%–65%，当前{Math.round(marker * 100)}%。</small></span><input aria-label="萧克应战时机" type="range" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} /></label>}
        <div className="heat-meter" aria-label="萧克应战时机指针"><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
        {!steady && !paused && <button className="secondary" onClick={() => setPaused(true)}>暂停萧克应战时机</button>}
        {paused && <><p role="status">时机已暂停，需明确继续。</p><button className="secondary" onClick={() => { setMarker(.5); setPaused(false) }}>继续萧克应战 · 恢复时机</button></>}
        <p>{task.beats === 0 ? '当前应先向左侧避。' : '侧避已记，当前应用族内低阶掌法击肩。'}</p>
        <div className="early-walk-controls">
          {task.beats === 0 ? <><button className="primary" disabled={paused} onClick={() => act('evade-left')}>向左侧避 · 避开来掌</button><button className="secondary" disabled={paused} onClick={() => act('evade-right')}>向右侧避 · 尝试另一方向</button></>
            : <><button className="primary" disabled={paused} onClick={() => act('low-palm')}>族内低阶掌法 · 反击肩部</button><button className="secondary" disabled={paused} onClick={() => act('octane-blast')}>尝试八极崩 · 本段动作不符</button></>}
        </div>
      </> : <button className="primary" onClick={() => act(scene.operation)}>{scene.action}</button>}
    </section> : <p className="muted">下一步请走近{keChallengePlaces[scene.place].label}：{scene.title}。</p>
      : <section className="bond-summary"><h3>萧克挑战与离场已归档。</h3><p>父亲宣布胜负和薰儿再次邀请分别保留。后续次日同行、持续训练、八段突破与正式礼继续接续。</p>{onTraining && <button className="primary" onClick={onTraining}>接续同行与礼前八段 · 实际训练</button>}</section>}
    {training && <button className="secondary" onClick={() => act('stop')}>停下本轮应战 · 免费重新准备</button>}
    <p className="muted">这次不是萧宁正式礼挑战；低阶掌法不新增主线技能，错误八极崩选项只会重开练习。钱账、材料、故事七段、预测名簿与伙伴关系值保留。</p>
    <button className="secondary" onClick={onBack}>暂离萧克挑战 · 保留应战断点</button>
  </>
}
