import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { earlyMorningCardBlock, morningCardNear, morningCardPlaces, morningCardStart, moveMorningWalker, submitEarlyMorningCard, type MorningCardAction } from '../core/early-morning-card'
import { morningCardScenes } from '../content/early-morning-card'
import { earlyMorningCardSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMorningCard({ state, onBack, onRoute }: { state: GameState; onBack: () => void; onRoute: () => void }) {
  const ledger = state.earlyTraining, task = ledger.morningCard, scene = morningCardScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...morningCardStart })
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = earlyMorningCardBlock(state), near = !!scene && morningCardNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveMorningWalker(current, direction))
  const act = (operation: MorningCardAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyMorningCard(gameStore, position, { ...task, actor: scene.actor, operation,
      expectedStarted: ledger.started, expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (document.hidden || event.ctrlKey || event.altKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e' && near) { event.preventDefault(); act(scene.operation) }
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">次晨 / 普通黑卡与同一采购账</span><h2>本人接下普通黑卡，账本只记一次。</h2>
    <p id="morning-card-help">方向或WASD行走，近当前地点按E。先房中收气与门外招呼，再抽屉取原积蓄，最后门前出门和接卡。夜间没有现实等待或后台奖励。</p>
    <svg ref={field} role="group" aria-label="晨间房内与门前交卡地图" aria-describedby="morning-card-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#21362f" />
      <path d="M24 156 H420 V24 H24Z" fill="#354239" /><rect x="70" y="40" width="116" height="78" fill="#d1c08b" opacity=".35" />
      <path d="M100 62 H158 M128 40 V118" stroke="#b59b70" /><rect x="278" y="95" width="88" height="59" rx="3" fill="#7f6848" />
      <rect x="437" y="28" width="151" height="126" fill="#70845b" opacity=".3" /><path d="M24 156 H696" stroke="#b3a476" strokeWidth="4" />
      <text x="180" y="145" fill="#ddd0a4" textAnchor="middle">房内</text><text x="530" y="145" fill="#ddd0a4" textAnchor="middle">门前</text>
      {Object.entries(morningCardPlaces).map(([id, point]) => <g key={id}><circle cx={point.x} cy={point.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#a69065'} strokeDasharray="4 5" />
        <text x={point.x} y={point.y + 41} textAnchor="middle" fill="#ead0a4" fontSize="12">{point.label}</text></g>)}
      <g aria-label="门外浅绿衣的薰儿" transform="translate(567 188)"><path d="M-12 15 L-6-7 H6 L12 15Z" fill="#92b69c" /><circle cy="-14" r="8" fill="#edcfbd" />
        {task.card !== 'yan' && <rect aria-label={task.card === 'offered' ? '薰儿递出待接的普通黑卡' : '薰儿持有另一张普通黑卡'} x={task.card === 'offered' ? -45 : 12} y="-1" width="23" height="14" rx="2" fill="#151c19" stroke="#adab92" />}</g>
      <g aria-label="萧炎晨间行走位置" transform={`translate(${position.x} ${position.y})`}><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
        <circle aria-label="右手佩戴同一古戒" cx="12" cy="6" r="3" fill="#152621" stroke="#b5a27d" />
        {task.card === 'yan' && <rect aria-label="本人已接同一普通黑卡" x="15" y="-1" width="23" height="14" rx="2" fill="#151c19" stroke="#adab92" />}</g>
    </svg>
    <div className="early-walk-controls">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={`晨卡${['向上走', '向左走', '向下走', '向右走'][i]}`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    <p role="status">晨间交卡 {task.stage}/14 · {earlyMorningCardSaveSummary(state, state.settings)}</p>
    <p>普通黑卡：{task.card === 'yan' ? '本人已接' : task.card === 'offered' ? '薰儿递出，本人尚未接' : '仍由薰儿持有'} · 当晚紫金卡仍由薰儿保管 · 老师仍在戒中</p>
    <p>独立采购账：借资{ledger.purse.borrowed} / 已付{ledger.purse.spent} / 余{ledger.purse.borrowed - ledger.purse.spent} · {task.funds === 'existing' ? '旧账衔接，没有再发160' : task.funds === 'credited' ? '本人接卡时唯一折算160已入账' : '本段还未办理接卡到账，旧账保持'}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : `本人先走近${morningCardPlaces[scene.place].label}。`}</p>
      {task.stage === 8 && !ledger.started && <><p>准备单尚未接取。接卡需先明确建立独立采购账，不会重发主线奖励。</p><button className="secondary" disabled={!near} onClick={() => gameStore.beginEarlyTraining()}>记下重修准备 · 再接普通黑卡</button></>}
      <button className="primary" disabled={!near || task.stage === 8 && !ledger.started} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 6 && <button className="secondary" disabled={!near} onClick={() => act('claim-savings')}>尝试把旧积蓄新增为400金币</button>}
      {task.stage === 8 && <button className="secondary" disabled={!near} onClick={() => act('claim-purple')}>尝试将普通黑卡登记为紫金卡</button>}
      {task.stage === 10 && <button className="secondary" disabled={!near} onClick={() => act('claim-capacity')}>尝试按普通卡容量领取5000</button>}
      {task.stage === 12 && <button className="secondary" disabled={!near} onClick={() => act('restore-supplies')}>尝试接卡复原已用材料与药液</button>}
    </section> : <section className="bond-summary"><h3>晨间普通黑卡交接已归档。</h3><p>{ledger.cityPharmacy.stage ? earlyMorningCardSaveSummary(state, state.settings) : '实际入城与药铺采购待接续。'}已有准备、收据、药液与主线均保留。</p><button className="secondary" onClick={onRoute}>查看既有准备路线 · 保留已付收据</button></section>}
    <p className="muted">房门、位置和操作为原创比例，位置不保存。160是游戏折算，容量不是余额；不新增积蓄，不改变主线金币，也不让旧借资再领一次。</p>
    <button className="secondary" onClick={onBack}>暂离晨间交卡 · 保留断点</button>
  </>
}
