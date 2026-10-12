import { earlyWalkDirections as directions } from '../core/early-walk-keys'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { moveCityWalker } from '../core/early-city-pharmacy'
import { earlyMarketSearchBlock, marketSearchNear, marketSearchPlaces, submitEarlyMarketSearch, type MarketSearchAction } from '../core/early-market-search'
import { marketSearchScenes } from '../content/early-market-search'
import { earlyMarketSearchSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketSearch({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.marketSearch, scene = marketSearchScenes[task.stage]
  const [yan, setYan] = useState<EarlyWalkPosition>({ ...(task.stage >= 6 ? marketSearchPlaces.deep : task.stage >= 2 ? marketSearchPlaces.ahead : marketSearchPlaces.together) })
  const [xuner, setXuner] = useState<EarlyWalkPosition>({ ...(task.stage >= 14 ? marketSearchPlaces.voice : task.stage >= 9 ? marketSearchPlaces.bracelet : task.stage >= 6 ? marketSearchPlaces.deep : task.stage >= 5 ? marketSearchPlaces.ahead : marketSearchPlaces.together) })
  const [selected, setSelected] = useState<'yan' | 'xuner' | null>(null)
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  useEffect(() => { setSelected(null) }, [scene?.view])
  const blocked = earlyMarketSearchBlock(state), position = selected === 'xuner' ? xuner : yan
  const active = !!scene && selected === scene.view, near = active && marketSearchNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => {
    if (!active || document.hidden) return
    const next = moveCityWalker(position, direction)
    if (selected === 'xuner') setXuner(next)
    else { setYan(next); if (task.stage >= 5 && task.stage < 8) setXuner(next) }
  }
  const act = (operation: MarketSearchAction['operation']) => {
    if (!scene || document.hidden || !near || !selected) return
    submitEarlyMarketSearch(gameStore, { kind: selected, position }, { ...task, actor: scene.actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (document.hidden || event.ctrlKey || event.altKey || event.metaKey) return
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (directions[value]) { event.preventDefault(); move(directions[value]) }
    else if (value === 'e') { event.preventDefault(); if (scene) act(scene.operation) }
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">坊市 / 寻核与普通手链</span><h2>一个继续寻核，一个停在手链摊。</h2>
    <p id="market-search-help">先明确选择本步人物，再用方向或WASD行走、近当前地点按E。两人的位置各自记录在本次行走中；换人物和刷新需重新选择。街坊不可穿过，位置不保存。</p>
    <svg ref={field} role="group" aria-label="两人分路寻核与手链地图" aria-describedby="market-search-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" /><path d="M180 310 H650 M220 230 H620 V130 H580" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <rect x="300" y="50" width="160" height="150" rx="5" fill="#59664a" /><text x="380" y="120" fill="#e1d1a7" textAnchor="middle">街坊房屋 · 不可穿行</text>
      {Object.entries(marketSearchPlaces).map(([id, p]) => <g key={id}><circle cx={p.x} cy={p.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#9d8b63'} strokeDasharray="4 5" />
        <text x={p.x} y={p.y + 40} textAnchor="middle" fill="#eed7ad" fontSize="11">{p.label}</text></g>)}
      <g aria-label="普通手链摊主" transform="translate(190 210)"><path d="M-10 12 L-5-5 H5 L10 12Z" fill="#b2a480" /><circle cy="-12" r="7" fill="#ddb894" /></g>
      {task.bracelet !== 'xuner-viewing' && <circle aria-label="普通手链在摊上" cx="220" cy="214" r="7" fill="none" stroke="#afd0ba" strokeWidth="3" />}
      <g aria-label="萧炎独立行走位置" transform={`translate(${yan.x} ${yan.y})`}><path d="M-11 14 L-6-5 H6 L11 14Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
      <g aria-label="薰儿独立行走位置" transform={`translate(${xuner.x + (xuner.x === yan.x && xuner.y === yan.y ? 25 : 0)} ${xuner.y})`}>
        <path d="M-11 14 L-6-5 H6 L11 14Z" fill="#9dbca4" /><circle cy="-13" r="8" fill="#edcfbd" />
        {task.bracelet === 'xuner-viewing' && <circle aria-label="薰儿只拿看未购手链" cx="12" cy="4" r="6" fill="none" stroke="#afd0ba" strokeWidth="3" />}
      </g>
      {task.stranger === 'seen' && <g aria-label="姓名尚未揭出的华衣来人" transform="translate(145 310)"><path d="M-13 16 L-7-7 H7 L13 16Z" fill="#b6a58a" /><circle cy="-15" r="9" fill="#dcc6ae" /></g>}
    </svg>
    {scene && <div className="early-walk-controls"><button className="secondary" onClick={() => { setSelected('yan'); field.current?.focus() }}>选择萧炎视角</button>
      <button className="secondary" onClick={() => { setSelected('xuner'); field.current?.focus() }}>选择薰儿视角</button>
      {active && (['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={`寻核向${['上', '左', '下', '右'][i]}走`} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}</div>}
    <p role="status">坊市寻核 {task.stage}/20 · {earlyMarketSearchSaveSummary(state, state.settings)}</p>
    <p>当前视角：{selected === 'yan' ? '萧炎' : selected === 'xuner' ? '薰儿' : '尚未选择'} · 普通手链：{task.bracelet === 'xuner-viewing' ? '薰儿拿看，仍属摊主' : task.bracelet === 'returned' ? '已放回，仍属摊主' : '仍在摊上'}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : !active ? `本步请明确选择${scene.view === 'yan' ? '萧炎' : '薰儿'}视角。`
      : `先由${selected === 'yan' ? '萧炎' : '薰儿'}走近${marketSearchPlaces[scene.place].label}。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 10 && <button className="secondary" disabled={!near} onClick={() => act('claim-gift')}>拿看就能算作已经得到礼物吗？</button>}
      {task.stage === 11 && <button className="secondary" disabled={!near} onClick={() => act('claim-core')}>能从这条普通手链取出木核吗？</button>}
      {task.stage === 12 && <button className="secondary" disabled={!near} onClick={() => act('refund-loan')}>不买手链就收回已借采购资金</button>}
      {task.stage === 19 && <button className="secondary" disabled={!near} onClick={() => act('reveal-name')}>尚未交谈就登记来人的姓名</button>}
    </section> : <section className="bond-summary"><h3>寻核与放回手链已归档。</h3><p>萧炎仍在寻找木核，薰儿没有买下摊上的手链。华衣来人的交谈另段接续。</p></section>}
    {state.earlyTraining.bracelet.gift === 'xuner' && <p className="muted">后来的已赠手链记录保留。这一段回看的是当时尚未购买的时刻。</p>}
    <button className="secondary" onClick={onBack}>暂离坊市寻核 · 保留断点</button>
  </>
}
