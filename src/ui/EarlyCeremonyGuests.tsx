import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { ceremonyGuestPlaces, ceremonyPlatform, earlyCeremonyGuestsBlock, moveCeremonyGuestWalker,
  nearCeremonyGuestPlace, submitEarlyCeremonyGuests } from '../core/early-ceremony-guests'
import { ceremonyGuestScenes } from '../content/early-ceremony-guests'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyCeremonyGuests({ state, position: entryPosition, onBack, onCeremony }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onCeremony?: () => void
}) {
  const task = state.earlyTraining.ceremonyGuests, scene = ceremonyGuestScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...ceremonyGuestPlaces.gate })
  const field = useRef<SVGSVGElement>(null), blocked = earlyCeremonyGuestsBlock(state, entryPosition)
  const near = scene && nearCeremonyGuestPlace(position, scene.place)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveCeremonyGuestWalker(current, direction))
  function act() {
    if (document.hidden || !scene) return
    submitEarlyCeremonyGuests(gameStore, entryPosition, position, { ...task, operation: scene.operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const direction = directions[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (direction) { event.preventDefault(); move(direction) }
    if (event.key.toLowerCase() === 'e') { event.preventDefault(); act() }
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">正式礼当天 / 宾客与收剑</span>
    <h2>木台已备，先平息树下争执。</h2>
    <p id="ceremony-guests-help">方向键或WASD行走，走近地点按E观察与交谈，也可用下方方向和步骤按钮。木台现在尚未开放；入口、树荫与接待处是原创压缩布局。重入从场口出发。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="正式礼宾客与收剑地图" aria-describedby="ceremony-guests-help" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#34463b" />
      <path d="M100 320 L240 280 L520 300" fill="none" stroke="#79816b" strokeWidth="34" strokeLinejoin="round" />
      <rect {...ceremonyPlatform} rx="6" fill="#89704b" stroke="#b79b65" strokeWidth="5" />
      {[100, 128, 156, 184, 212].map(y => <path key={y} d={`M304 ${y} H656`} stroke="#b39464" strokeWidth="2" />)}
      <text x="480" y="145" textAnchor="middle" fill="#f0dfb9" fontSize="16">成年礼木台 · 尚待开礼</text>
      <path d="M195 298 V200" stroke="#957454" strokeWidth="12" /><circle cx="195" cy="194" r="60" fill="#496b4f" /><circle cx="156" cy="200" r="32" fill="#56765a" />
      <g transform="translate(266 260)" aria-label="薰儿候礼" role="img"><circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#73a98a" /></g>
      {task.stage >= 4 && task.stage <= 7 && <g transform="translate(330 270)" role="img" aria-label={task.sword === 'drawn' ? '萧玉佩剑已出鞘，尚未交锋' : '萧玉佩剑仍由本人保管'}>
        <circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#9e83a6" />
        <path d={task.sword === 'drawn' ? 'M-12 0 L-67-5' : 'M16-5 L19 24'} stroke={task.sword === 'drawn' ? '#dddcd3' : '#827361'} strokeWidth="5" />
        <text y="42" textAnchor="middle" fill="#ead9b6" fontSize="11">萧玉</text>
      </g>}
      <g transform="translate(550 268)" role="img" aria-label="雅妃与宾客"><circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#b86c65" /><text y="36" textAnchor="middle" fill="#ead9b6" fontSize="11">雅妃</text></g>
      {task.stage >= 6 && task.stage < 12 && <g transform={`translate(${task.stage >= 9 ? 490 : 290} 260)`} role="img" aria-label="萧战已走近"><circle cy="-13" r="8" fill="#d5b491" /><path d="M-14 17 L-8-5 H8 L14 17Z" fill="#7f8cba" /></g>}
      {Object.entries(ceremonyGuestPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="44" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><text x={place.x} y={place.y + 56} textAnchor="middle" fill="#ead9b6" fontSize="12">{place.label}</text></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
    </svg>
    <div className="early-walk-controls" aria-label="宾客场地行走操作">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={['候礼向上走', '候礼向左走', '候礼向下走', '候礼向右走'][i]} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    <p role="status">宾客与收剑 {task.stage}/12 · {task.sword === 'none' ? '尚未拔剑' : task.sword === 'drawn' ? '佩剑出鞘，尚未交锋' : '佩剑已收回，没有战斗'} · {task.introduced ? '父亲介绍已记' : '父亲介绍尚待'}</p>
    {scene ? near ? <section className="bond-summary" aria-label="宾客与收剑步骤"><h3>{scene.title}</h3><p>{scene.text}</p><button className="primary" onClick={act}>{scene.action}</button></section>
      : <p className="muted">下一步请走近{ceremonyGuestPlaces[scene.place].label}：{scene.title}。</p>
      : <section className="bond-summary"><h3>宾客与收剑已归档。</h3><p>萧玉收剑离去，父亲介绍与雅妃询问已记。正式仪式和八段石碑复测接下来继续。</p>{onCeremony && <button className="primary" onClick={onCeremony}>接续正式仪式 · 二长老验碑与八段</button>}</section>}
    <p className="muted">本段以观察和交谈平息争执，没有战斗结算；剑由萧玉保管，钱账、原封瓶、人物与伙伴记录保留。</p>
    <button className="secondary" onClick={onBack}>暂离宾客场地 · 保留收剑断点</button>
  </>
}
