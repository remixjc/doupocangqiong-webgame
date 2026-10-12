import { earlyWalkDirections as directions } from '../core/early-walk-keys'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { earlyCityPharmacyBlock, cityPharmacyNear, cityPharmacyPlaces, cityPharmacyStart, moveCityWalker, submitEarlyCityPharmacy, type CityPharmacyAction } from '../core/early-city-pharmacy'
import { cityPharmacyScenes } from '../content/early-city-pharmacy'
import { earlyCityPharmacySaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyCityPharmacy({ state, onBack, onRoute }: { state: GameState; onBack: () => void; onRoute: () => void }) {
  const ledger = state.earlyTraining, task = ledger.cityPharmacy, scene = cityPharmacyScenes[task.stage]
  const [position, setPosition] = useState({ ...cityPharmacyStart }), field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = earlyCityPharmacyBlock(state), near = !!scene && cityPharmacyNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveCityWalker(current, direction))
  const act = (operation: CityPharmacyAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyCityPharmacy(gameStore, position, { ...task, actor: scene.actor, operation, expectedStarted: ledger.started,
      expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent, expectedLiquid: ledger.liquid.stage,
      expectedPrimary: ledger.receipts.bluegrass, expectedAuxiliary: ledger.receipts.boneflower, expectedCore: ledger.receipts.woodCore })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (document.hidden || event.ctrlKey || event.altKey || event.metaKey) return
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e' && near) { event.preventDefault(); act(scene.operation) }
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">次晨之后 / 实际同行与药铺</span><h2>走到药铺，两笔旧账各核一次。</h2>
    <p id="city-pharmacy-help">方向或WASD行走，近当前地点按E。先族内同行和离族，再入城逛摊、走到药铺；房屋不可穿过。位置不保存。</p>
    <svg ref={field} role="group" aria-label="族门入城与药铺同行地图" aria-describedby="city-pharmacy-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#284136" /><path d="M80 310 H650 M120 230 H650" stroke="#b8a16f" strokeWidth="25" opacity=".35" />
      <rect x="300" y="50" width="160" height="150" rx="5" fill="#536247" /><text x="380" y="125" fill="#d1c799" textAnchor="middle">街坊房屋 · 不可穿行</text>
      <path d="M170 40 H230 L252 90 H148Z" fill="#6b8056" /><path d="M520 105 H580 L597 120 H503Z" fill="#ab9260" />
      {Object.entries(cityPharmacyPlaces).map(([id, point]) => <g key={id}><circle cx={point.x} cy={point.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#a69065'} strokeDasharray="4 5" />
        <text x={point.x} y={point.y + 40} textAnchor="middle" fill="#ead0a4" fontSize="12">{point.label}</text></g>)}
      <g aria-label="同行的浅绿衣薰儿" transform={`translate(${position.x + 30} ${position.y - 20})`}><path d="M-12 15 L-6-7 H6 L12 15Z" fill="#92b69c" /><circle cy="-14" r="8" fill="#edcfbd" /></g>
      <g aria-label="萧炎入城行走位置" transform={`translate(${position.x} ${position.y})`}><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
        <circle aria-label="同一古戒仍佩戴" cx="12" cy="6" r="3" fill="#152621" stroke="#b5a27d" /></g>
    </svg>
    <div className="early-walk-controls">{(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={`药铺${['向上走', '向左走', '向下走', '向右走'][i]}`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>
    <p role="status">同行药铺 {task.stage}/15 · {earlyCityPharmacySaveSummary(state, state.settings)}</p>
    <p>独立采购账：借资{ledger.purse.borrowed} / 已付{ledger.purse.spent} / 余{ledger.purse.borrowed - ledger.purse.spent}</p>
    <p>实际任务袋主药{ledger.supplies.bluegrass}株 / 辅药{ledger.supplies.boneflower}株 / 木核{ledger.supplies.woodCore}枚 · 主药收据{ledger.receipts.bluegrass ? '已付' : '未购'} / 辅药收据{ledger.receipts.boneflower ? '已付' : '未购'} / 木核收据{ledger.receipts.woodCore ? '旧进度已付保留' : '尚未购'}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : `本人先走近${cityPharmacyPlaces[scene.place].label}。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 6 && <button className="secondary" disabled={!near} onClick={() => act('claim-items')}>尝试逛摊直接领取两药</button>}
      {task.stage === 13 && <button className="secondary" disabled={!near} onClick={() => act('charge-900')}>尝试在原收据外另扣900</button>}
      {task.stage === 14 && <><button className="secondary" disabled={!near} onClick={() => act('claim-core')}>尝试药铺直接交木核与附物</button>
        <button className="secondary" disabled={!near} onClick={() => act('restore-liquid')}>尝试补历史复原已用药液</button></>}
    </section> : <section className="bond-summary"><h3>实际同行与两药历史已归档。</h3><p>历史药铺只备齐两药，木核和附物另段接续。旧已购木核、调制和药液耗尽进度保留。</p><button className="secondary" onClick={onRoute}>接续既有坊市路线 · 保留原收据</button></section>}
    <p className="muted">三株二十年/两株五年是历史要求，材料称谓沿准备单。30/20是游戏折算，不追加900，不复原已用材料。主线金币与奖励保持。</p>
    <button className="secondary" onClick={onBack}>暂离同行药铺 · 保留断点</button>
  </>
}
