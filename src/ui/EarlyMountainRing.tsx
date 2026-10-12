import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { earlyMountainRingBlock, mountainRingPlaces, mountainRingStart, mountainRingObstacles, mountainRingNear,
  moveMountainRingWalker, submitEarlyMountainRing, type MountainRingAction } from '../core/early-mountain-ring'
import { mountainRingScenes } from '../content/early-mountain-ring'
import { earlyMountainRingSaveSummary } from '../core/save-preview'
import './early-walk.css'

export default function EarlyMountainRing({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.mountainRing, scene = mountainRingScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...mountainRingStart })
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = earlyMountainRingBlock(state), near = !!scene && mountainRingNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveMountainRingWalker(current, direction))
  const act = (operation: MountainRingAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyMountainRing(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden || event.altKey || event.ctrlKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e' && near && scene) { event.preventDefault(); act(scene.operation) }
  }
  if (blocked) return <><p className="muted">{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">拜师之前 / 后山与古戒</span><h2>声音从哪里来，古戒又去了哪里。</h2>
    <p id="mountain-ring-help">方向键或WASD沿安全山径行走，近当前地点后按E或回应。崖外和山石会阻挡，不提供跳崖操作。</p>
    <svg ref={field} role="group" aria-label="后山古戒行走地图" aria-describedby="mountain-ring-help" tabIndex={0}
      className="early-walk-map" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#243b37" />
      <path d="M0 330 L180 80 L380 185 L600 35 L720 115 V0 H0Z" fill="#77998d" opacity=".25" />
      <path d="M80 330 H300 V110 H540" fill="none" stroke="#b6a178" strokeWidth="23" opacity=".35" />
      {mountainRingObstacles.map((rect, i) => <rect key={i} {...rect} rx="6" fill={i === 2 ? '#132824' : '#435649'} />)}
      <text x="675" y="220" textAnchor="middle" fill="#c9bc99" fontSize="12">崖外</text>
      <text x="675" y="240" textAnchor="middle" fill="#c9bc99" fontSize="11">不可通行</text>
      {Object.entries(mountainRingPlaces).map(([id, place]) => <g key={id}>
        <circle cx={place.x} cy={place.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#a69065'} strokeDasharray="4 5" />
        <text x={place.x} y={place.y + 37} textAnchor="middle" fill="#ead0a4" fontSize="12">{place.label}</text>
      </g>)}
      {task.elder === 'visible' && <g aria-label="身份尚未公开的古戒老人" transform="translate(585 75)" opacity=".65">
        <path d="M-15 20 L-9-6 H9 L15 20Z" fill="#b2d6cb" /><circle cy="-13" r="9" fill="#cbded2" />
        <path d="M-7-8 L0 9 L7-8" fill="#e0e9df" />
      </g>}
      {task.ring === 'floating' && <g aria-label="老人处浮空的同一古戒"><ellipse cx="585" cy="115" rx="9" ry="5" fill="none" stroke="#a7bdb2" strokeWidth="3" /></g>}
      <g aria-label="萧炎后山行走位置" transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
        {task.ring === 'worn' && <circle aria-label="右手佩戴的同一古戒" cx="12" cy="6" r="3" fill="#152621" stroke="#b5a27d" />}
      </g>
    </svg>
    <div className="early-walk-controls" aria-label="后山行走操作">{(['up', 'left', 'down', 'right'] as const).map((direction, i) =>
      <button key={direction} className="secondary" aria-label={`后山${['向上走', '向左走', '向下走', '向右走'][i]}`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    <p role="status">后山与古戒 {task.stage}/21 · {earlyMountainRingSaveSummary(state, state.settings)}</p>
    <p>古戒：{task.ring === 'floating' ? '老人处浮空，尚未再佩戴' : task.ring === 'thrown' ? '已抛出，尚未返回' : '仍佩戴在右手'} · 身份：未公开 · 今后取气：{task.future === 'asked' ? '本人已询问，尚待答复' : '尚未询问'}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : `请先走近${mountainRingPlaces[scene.place].label}。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 4 && <button className="secondary" disabled={!near} onClick={() => act('claim-cause')}>尝试直接登记流失原因</button>}
      {task.stage === 14 && <button className="secondary" disabled={!near} onClick={() => act('wear-now')}>尝试在返回之前再佩戴古戒</button>}
      {task.stage === 18 && <button className="secondary" disabled={!near} onClick={() => act('claim-recovery')}>尝试把得知原因算作资源全恢复</button>}
      {task.stage === 20 && <button className="secondary" disabled={!near} onClick={() => act('claim-promise')}>尝试把问话算作已经承诺或拜师</button>}
    </section> : <section className="bond-summary"><h3>后山与古戒前段已归档。</h3><p>老人未公开姓名，同一古戒在他身旁浮空。取气边界答复、期限援助谈判与本人行礼拜师继续接续。</p></section>}
    <p className="muted">山路比例、障碍与20步长/38接近距离为原创。抛戒只作抽象回顾，事件不删除主线装备，不改变生命、资源、技能或已结算奖励。位置不保存，断点保存。</p>
    <button className="secondary" onClick={onBack}>暂离后山与古戒 · 保留断点</button>
  </>
}
