import { HallText, MapBackground } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import MarketWalker from './MarketWalker'
import MarketStreetBuildings from './MarketStreetBuildings'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { moveCityWalker } from '../core/early-city-pharmacy'
import { earlyMarketStandoffBlock, standoffNear, standoffPlaces, standoffNames, submitEarlyMarketStandoff,
  type StandoffFocus, type MarketStandoffAction, type MarketStandoffView } from '../core/early-market-standoff'
import { marketStandoffScenes } from '../content/early-market-standoff'
import { earlyMarketStandoffSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketStandoff({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.marketStandoff, scene = marketStandoffScenes[task.stage]
  const [yan, setYan] = useState<EarlyWalkPosition>({ ...(task.walkedDeep ? standoffPlaces.deep : standoffPlaces.street) })
  const [xuner, setXuner] = useState<EarlyWalkPosition>({ ...(task.walkedDeep ? standoffPlaces.deep : standoffPlaces.street) })
  const [selected, setSelected] = useState<StandoffFocus | null>(null)
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  useEffect(() => { setSelected(null) }, [task.stage])
  const blocked = earlyMarketStandoffBlock(state), position = selected === 'xuner' ? xuner : yan
  const observer = !!scene && scene.view !== 'yan' && scene.view !== 'xuner'
  const active = !!scene && selected === scene.view, near = active && (observer || standoffNear(position, scene.place))
  const move = (direction: EarlyWalkDirection) => {
    if (!active || observer || document.hidden) return
    const next = moveCityWalker(position, direction)
    if (selected === 'xuner') setXuner(next)
    else { setYan(next); if (task.stage === 32) setXuner(next) }
  }
  const act = (operation: MarketStandoffAction['operation']) => {
    if (!scene || document.hidden || !near || !selected) return
    const view: MarketStandoffView = selected === 'yan' || selected === 'xuner' ? { kind: selected, position }
      : { kind: 'observer', focus: selected, place: scene.place }
    submitEarlyMarketStandoff(gameStore, view, { ...task, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden) return
    walkKey(event, move, () => { if (scene) act(scene.operation) })
  }
  const select = (focus: StandoffFocus) => { setSelected(focus); field.current?.focus() }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">坊市 / 围堵与非战斗离场</span><h2>呼叫护卫，拒绝单挑，继续寻核。</h2>
    <p id="market-standoff-help">每一步先选人物或明确旁观焦点。本人方向/WASD行走，近地点按E；旁观没有移动，不能代签本人。刷新后重新选焦点，位置不保存。</p>
    <svg ref={field} role="group" aria-label="围堵与非战斗离场地图" aria-describedby="market-standoff-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <MapBackground /><path d="M80 310 H600" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <MarketStreetBuildings />
      {Object.entries(standoffPlaces).map(([id, p]) => <g key={id}><circle cx={p.x} cy={p.y} r="28" fill="none" stroke={scene?.place === id ? '#f7d699' : '#9d8b63'} strokeDasharray="4 5" /><HallText x={p.x} y={p.y + 65} fontSize="12">{p.label}</HallText></g>)}
      {task.opponent !== 'left' && <g aria-label={task.opponent === 'paused' ? '来人停步尚未离开' : task.opponent === 'withdrawing' ? '来人正向外走' : '来人仍在街角'} transform={`translate(${task.opponent === 'present' ? 150 : 80} 310)`}>
        <path d="M-13 16 L-7-7 H7 L13 16Z" fill="#b6a58a" /><circle cy="-15" r="9" fill="#dcc6ae" />
      </g>}
      {task.ring === 'closed' && <g aria-label="随从围堵尚未解除">{[[185, 275], [270, 280], [250, 345]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="9" fill="#b89070" />)}</g>}
      {(task.guards === 'approaching' || task.guards === 'surrounding') && <g aria-label={task.guards === 'approaching' ? '护卫已到场尚未外层围住' : '护卫在外层控制局面'}>
        {(task.guards === 'approaching' ? [[360, 350], [390, 350], [420, 350]] : [[160, 250], [300, 265], [300, 355], [170, 355]]).map(([x, y]) => <circle key={x} cx={x} cy={y} r="10" fill="#b6bb90" />)}</g>}
      <g aria-label="萧炎独立行走位置" transform={`translate(${yan.x} ${yan.y})`}><MarketWalker /></g>
      <g aria-label="薰儿独立行走位置" transform={`translate(${xuner.x + (xuner.x === yan.x && xuner.y === yan.y ? 25 : 0)} ${xuner.y})`}><MarketWalker xuner /><circle cx="12" cy="4" r="6" fill="none" stroke="#afd0ba" strokeWidth="3" /></g>
    </svg>
    {scene && <div className="early-walk-controls">
      <SecondaryButton onClick={() => select('yan')}>选择萧炎视角</SecondaryButton><SecondaryButton onClick={() => select('xuner')}>选择薰儿视角</SecondaryButton>
      {observer && <SecondaryButton onClick={() => select(scene.view)}>旁观{standoffNames[scene.view]} · {standoffPlaces[scene.place].label}</SecondaryButton>}
      {active && !observer && <WalkDirectionButtons prefix="围堵" onMove={move} />}
    </div>}
    <p role="status">围堵离场 {task.stage}/34 · {earlyMarketStandoffSaveSummary(state, state.settings)}</p>
    <p>当前焦点：{selected ? standoffNames[selected] : '尚未选择'} · {observer ? '旁观没有本人行走' : '本人或薰儿独立行走'} · 普通绿链仍由薰儿戴着</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={near ? scene.text : !active ? `本步请明确选择${standoffNames[scene.view]}${observer ? '旁观焦点' : '视角'}。` : `先走近${standoffPlaces[scene.place].label}。`} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 11 && <SecondaryButton disabled={!near} onClick={() => act('fight')}>把提出单挑当成已经开战</SecondaryButton>}
      {task.stage === 21 && <SecondaryButton disabled={!near} onClick={() => act('loot')}>来人离开后领取击杀战利品</SecondaryButton>}
      {task.stage === 27 && <SecondaryButton disabled={!near} onClick={() => act('recruit')}>把帮助的护卫加入伙伴队伍</SecondaryButton>}
      {task.stage === 33 && <SecondaryButton disabled={!near} onClick={() => act('claim-core')}>走进深处就把木核放入任务袋</SecondaryButton>}
    </section> : <section className="bond-summary"><h3>围堵与非战斗离场已归档。</h3><p>本人拒绝单挑，来人与护卫已分别离场。两人继续寻核，发现与实际成交待续。</p></section>}
    <SecondaryButton onClick={onBack}>暂离围堵离场 · 保留断点</SecondaryButton>
  </>
}
