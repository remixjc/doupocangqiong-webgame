import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { earlySupplies, type EarlySupplyId } from '../core/early-training-state'
import { earlyLiquidScenes } from '../content/early-liquid'
import { earlyRoomBlock, earlyRoomPresentation, submitEarlyRoom, type EarlyRoomStation } from '../core/early-room'
import { submitEarlyWalk } from '../core/early-walk-actions'
import type { EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import EarlyPractice from './EarlyPractice'
import './early-room.css'

const stations = { materials: '材料盘', water: '盛水容器', teacher: '药老操作处' } as const
export default function EarlyRoom({ state, position, onBack }: { state: GameState; position: EarlyWalkPosition; onBack: () => void }) {
  const task = state.earlyTraining, view = earlyRoomPresentation(state)
  const [station, setStation] = useState<EarlyRoomStation>(view.station)
  const heading = useRef<HTMLHeadingElement>(null)
  const blocked = earlyRoomBlock(state, position)
  const scene = earlyLiquidScenes[task.liquid.stage]
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>回到往事街巷</button></>
  return <>
    <span className="eyebrow">拜师之后 / 室内调制</span>
    <h2 ref={heading} tabIndex={-1}>把材料交给老师，留心每一步。</h2>
    <p className="muted">点选室内位置查看。萧炎备水，药老依次处理材料并将药液加入清水；这里接续准备单中的同一次调制。</p>
    <div className="early-room">
      <svg className="early-room-art" viewBox="0 0 720 360" role="img"
        aria-label={`静室调制场景：${view.water}；${view.mixture}；材料盘主药${view.supplies.bluegrass}株、辅药${view.supplies.boneflower}株、魔核${view.supplies.woodCore}枚。`}>
        <title>原创静室布局，材料与容器随已保存步骤变化</title>
        <rect width="720" height="360" fill="#1c302c" />
        <path d="M0 225 H720 V360 H0Z" fill="#3b3b30" />
        {[60, 180, 300, 420, 540, 660].map(x => <path key={x} d={`M360 180 L${x} 360`} stroke="#716249" strokeOpacity=".3" />)}
        <path d="M0 270 H720 M0 315 H720" stroke="#716249" strokeOpacity=".3" />
        <rect x="300" y="28" width="124" height="117" fill="#31463c" stroke="#ad9365" />
        <path d="M306 64 H418 M306 104 H418 M342 34 V139 M382 34 V139" stroke="#ad9365" strokeOpacity=".65" />
        <path d="M40 24 H680 M46 24 V231 M674 24 V231" fill="none" stroke="#7f694a" strokeWidth="10" />
        <rect x="72" y="124" width="232" height="18" rx="4" fill="#997a4d" />
        <path d="M85 142 V218 M290 142 V218" stroke="#79613e" strokeWidth="10" />
        {(['bluegrass', 'boneflower', 'woodCore'] as EarlySupplyId[]).map((id, index) => <g key={id} transform={`translate(${110 + index * 74} 102)`}>
          <ellipse cy="16" rx="30" ry="7" fill="#b69762" />
          {Array.from({ length: task.supplies[id] }, (_, item) => id === 'woodCore'
            ? <path key={item} d="M0-15 L14 0 L0 12 L-14 0Z" fill="#a4ba75" stroke="#e0d99b" />
            : <g key={item} transform={`translate(${(item - 1) * 13} 0)`}>
              <path d="M0 15 V-15 M0 0 Q-17-16-9-15 M0-5 Q17-21 10-19" fill="none" stroke={id === 'bluegrass' ? '#94b7a3' : '#d6c0ab'} strokeWidth="3" />
            </g>)}
          {!task.supplies[id] && <text y="5" textAnchor="middle" fill="#b4baa3" fontSize="11">已使用</text>}
          <text y="41" textAnchor="middle" fill="#e4cea0" fontSize="12">{['主药', '辅药', '木魔核'][index]} ×{task.supplies[id]}</text>
        </g>)}
        <g transform="translate(470 130)">
          <ellipse cy="78" rx="45" ry="12" fill="#1118" />
          <path d="M-32 65 Q-26-14 0-14 Q26-14 32 65Z" fill="#a9c3bd" opacity=".8" />
          <circle cy="-35" r="20" fill="#d8d9c6" />
          <path d="M-22-40 Q0-74 23-40 M-14-22 Q0 11 14-22" fill="#dee3d3" />
          <path d={task.liquid.stage >= 2 && task.liquid.stage <= 5 ? 'M-19 9 L-53 17 L-75 0 M19 9 L44 30' : 'M-19 9 L-35 39 M19 9 L35 39'} fill="none" stroke="#d2ded1" strokeWidth="9" strokeLinecap="round" />
          {view.flame && <g data-room-flame="teacher"><path d="M-93-3 Q-110-22-82-53 Q-87-26-72-31 Q-49-12-66-3Z" fill="#edf5e6" /><path d="M-82-5 Q-90-16-77-32 Q-80-17-72-14Z" fill="#b9ddd1" /></g>}
          {task.liquid.stage >= 3 && task.liquid.stage <= 5 && <path d="M-80-23 Q-99-3-80 2 Q-61-3-80-23Z" fill="#75ad87" stroke="#d3e8ad" />}
          <text y="100" textAnchor="middle" fill="#e6d4a6" fontSize="13">药老 · {view.flame ? '掌中处理材料' : task.liquid.ready ? '调制完成' : task.liquid.stage === 5 ? '药液待入水' : '指导准备'}</text>
        </g>
        <g transform="translate(224 255)">
          <ellipse cy="37" rx="29" ry="9" fill="#1118" /><path d="M-24 27 L-16-11 H16 L24 27Z" fill="#c29862" />
          <circle cy="-25" r="15" fill="#ebc59e" /><path d="M-15-29 Q0-51 16-29" fill="#202c29" />
          <path d="M-13 0 L-35 16 M13 0 L35 16" stroke="#d4aa75" strokeWidth="7" strokeLinecap="round" />
          <text y="59" textAnchor="middle" fill="#e6d4a6" fontSize="13">萧炎 · {task.liquid.stage === 1 ? '准备容器与清水' : '在旁观察'}</text>
        </g>
        <g transform="translate(530 280)">
          <path d="M-74-7 L-62 38 Q0 58 62 38 L74-7Z" fill="#786448" stroke="#bda16e" strokeWidth="2" />
          <ellipse rx="74" ry="24" cy="-7" fill={task.liquid.ready ? '#75ad87' : task.liquid.water ? '#709c99' : '#2e3d34'} stroke="#c3aa7b" strokeWidth="3" />
          {task.liquid.water && <path d="M-45-7 Q-25-15-5-7 T40-7" fill="none" stroke={task.liquid.ready ? '#d3e8ad' : '#b2d3ce'} strokeWidth="2" />}
          <path d="M-52 8 L-48 35 M-15 17 V45 M22 16 V45 M55 7 L50 35" stroke="#ae9366" strokeWidth="2" />
          <text y="68" textAnchor="middle" fill="#e6d4a6" fontSize="13">{view.water}</text>
        </g>
        <rect x="84" y="247" width="44" height="28" rx="3" fill="#282e2c" stroke="#858d7a" transform="rotate(-10 106 260)" />
        <text x="106" y="298" textAnchor="middle" fill="#c9c4a8" fontSize="11">黑铁片保留</text>
      </svg>
      <div className="early-room-stations" aria-label="室内位置">
        {(Object.keys(stations) as EarlyRoomStation[]).map(id => <button key={id} className={`secondary ${station === id ? 'selected' : ''}`}
          aria-pressed={station === id} onClick={() => setStation(id)}>{stations[id]}</button>)}
      </div>
    </div>
    <p className="early-room-state" role="status">调制 {task.liquid.stage}/6 · {view.water} · {view.mixture}</p>
    <section className="bond-summary" aria-label="室内当前操作">
      <span className="eyebrow">{stations[station]}</span>
      {station === 'materials' ? <>
        <h3>用掉的材料，不再留一份。</h3>
        {(Object.keys(earlySupplies) as EarlySupplyId[]).map(id => <p key={id}>{earlySupplies[id].label}：任务袋{task.supplies[id]} · {task.supplies[id] ? '待交老师处理' : '已由老师使用，收据保留'}</p>)}
        <p>黑铁片 ×{task.market.blackIron}，和三种药材分别保管。</p>
      </> : scene && station === view.station ? <>
        <h3>{scene.title}</h3><b>{scene.speaker}</b><p>{scene.text}</p>
        <button className="primary" onClick={() => submitEarlyRoom(gameStore, position, station,
          { type: 'liquid', step: task.liquid.stage, operation: scene.operation, expectedSpent: task.purse.spent })}>{scene.action}</button>
      </> : <p>{task.liquid.ready ? '药液已供修炼使用。容器和采购记录保留，不会再次消耗材料。'
        : `下一步请查看${stations[view.station]}：${scene?.title}。`}</p>}
    </section>
    <EarlyPractice state={state} onAction={action => submitEarlyWalk(gameStore, position, action)} />
    <p className="muted">场景位置与器物外观为原创表现。调制断点沿用准备单，离开室内不退材料、不重炼；这里没有口服丹药产出。</p>
    <button className="secondary" onClick={onBack}>回到往事街巷</button>
  </>
}
