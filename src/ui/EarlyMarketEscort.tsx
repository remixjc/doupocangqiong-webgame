import { robeFigureGroup } from './NativeRegions'
import { marketWalkerGroup } from './MarketWalker'
import { returnButton } from './Buttons'
import { sceneButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallText, MapBackground } from './MapPrimitives'
import { SecondaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import MarketStreetBuildings from './MarketStreetBuildings'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { cityPharmacyStart, moveCityWalker } from '../core/early-city-pharmacy'
import { earlyMarketEscortBlock, marketEscortNear, marketEscortPlaces, submitEarlyMarketEscort, type MarketEscortAction, type MarketEscortView } from '../core/early-market-escort'
import { marketEscortObserver } from '../core/early-market-escort-state'
import { marketEscortScenes } from '../content/early-market-escort'
import { earlyMarketEscortSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketEscort({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.marketEscort, scene = marketEscortScenes[task.stage], observer = marketEscortObserver(task.stage)
  const [position, setPosition] = useState({ ...(task.stage >= 21 ? marketEscortPlaces.inner : task.stage >= 13 ? marketEscortPlaces.crowd : cityPharmacyStart) })
  const [focus, setFocus] = useState<keyof typeof marketEscortPlaces | null>(null)
  const [returned, setReturned] = useState(task.stage < 18)
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  useEffect(() => { setFocus(null); if (task.stage === 18) setReturned(false) }, [task.stage])
  const blocked = earlyMarketEscortBlock(state), canWalk = !observer && (task.stage < 18 || returned)
  const near = !!scene && (observer ? focus === scene.place : canWalk && marketEscortNear(position, scene.place))
  const move = (direction: EarlyWalkDirection) => { if (canWalk && !document.hidden) setPosition(p => moveCityWalker(p, direction)) }
  const act = (operation: MarketEscortAction['operation']) => {
    if (!scene || document.hidden || !near) return
    const view: MarketEscortView = observer ? { kind: 'observer', place: focus! } : { kind: 'yan', position }
    submitEarlyMarketEscort(gameStore, view, { ...task, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden) return
    walkKey(event, move, () => { if (scene) act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>坊市 / 入坊与巡卫</Eyebrow><h2>穿过南坊入口，听清护卫安排。</h2>
    <p id="market-escort-help">{observer ? '本人仍在人群中。选择护卫事件的旁观焦点，分别记录领命、跟随与巡逻。'
      : '方向或WASD行走，近当前地点按E。街坊不可穿过；返回本人视角后继续与薰儿同行。位置不保存。'}</p>
    <EarlyMap ref={field} aria-label="南坊入市与巡卫地图" aria-describedby="market-escort-help"
      viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground /><path d="M70 310 H640 M260 230 H540 V130 H630" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <MarketStreetBuildings />
      {Object.entries(marketEscortPlaces).map(([id, p]) => <g key={id}><circle cx={p.x} cy={p.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#9d8b63'} strokeDasharray="4 5" />
        <HallText x={p.x} y={p.y + 40} fontSize="11">{p.label}</HallText></g>)}
      {[240, 280].map(x => <g key={x} aria-label="门前家族护卫" transform={`translate(${x} 280)`}><RobeFigure cut="M-9 12 L-5-5 H5 L9 12Z" robe="#697a87" cy="-12" r="7" skin="#ddb894" bodyFirst /></g>)}
      {robeFigureGroup({ "aria-label": task.captain === 'introduced' ? '已自我介绍的巡卫队长' : '尚未自报身份的护卫', "transform": `translate(${task.patrol ? 260 : 540} ${task.patrol ? 210 : 290})` }, { "cut": "M-11 15 L-6-5 H6 L11 15Z", "robe": "#809298", "skin": "#d8b796", "bodyFirst": true })}
      {task.following === 3 && [0, 1, 2].map(i => <g key={i} aria-label="人群中的跟随护卫" transform={`translate(${490 + i * 20} 205)`}><RobeFigure cut="M-7 10 L-4-5 H4 L7 10Z" robe="#7b8d86" cy="-10" r="6" skin="#dbb795" bodyFirst /></g>)}
      {marketWalkerGroup({ "aria-label": observer ? '人群中同行的萧炎与薰儿 · 旁观时不移动' : '萧炎坊市行走位置', "transform": `translate(${observer ? 540 : position.x} ${observer ? 230 : position.y})` }, {  }, <path d="M20 10 L25-12 H37 L42 10Z" fill="#9dbca4" />, <circle cx="31" cy="-18" r="8" fill="#edcfbd" />)}
    </EarlyMap>
    {canWalk && <WalkControls>{<WalkDirectionButtons prefix="入坊" onMove={move} />}</WalkControls>}
    {observer && scene && <SecondaryButton onClick={() => setFocus(scene.place)}>选择旁观焦点 · {marketEscortPlaces[scene.place].label}</SecondaryButton>}
    {!observer && task.stage >= 18 && !returned && <SecondaryButton onClick={() => { setReturned(true); field.current?.focus() }}>回到本人视角 · 与薰儿继续同行</SecondaryButton>}
    <StatusParagraph>入坊巡卫 {task.stage}/24 · {earlyMarketEscortSaveSummary(state, state.settings)}</StatusParagraph>
    <p>三位跟随护卫：{task.following === 3 ? '已经进入人群' : task.stage >= 14 ? '已受命，实际跟随待续' : '尚未派出'} · 队长与其余护卫：{task.patrol ? '已接续巡逻' : '仍在原街口'}</p>
    {scene ? <BondSummary>{sceneHeading(scene, near ? scene.text : observer ? '先选择本步的旁观焦点。'
      : !canWalk ? '先明确回到本人视角，再接续两人的同行。' : `本人先走近${marketEscortPlaces[scene.place].label}。`)}
      {sceneButton(scene, !near, act)}
      {task.stage === 0 && <SecondaryButton disabled={!near} onClick={() => act('absorb-core')}>直接吸收魔核可行吗？</SecondaryButton>}
      {task.stage === 1 && <SecondaryButton disabled={!near} onClick={() => act('collect-tax')}>能把摊主税费用于本次采购吗？</SecondaryButton>}
      {task.stage === 16 && <SecondaryButton disabled={!near} onClick={() => act('recruit')}>请跟随护卫加入可用队伍</SecondaryButton>}
      {task.stage === 21 && <SecondaryButton disabled={!near} onClick={() => act('claim-rank')}>凭同行评价登记新的九段成就</SecondaryButton>}
      {task.stage === 23 && <SecondaryButton disabled={!near} onClick={() => act('claim-core')}>请护卫直接交付木核</SecondaryButton>}
    </BondSummary> : <BondSummary><h3>入坊与护卫安排已归档。</h3><p>两人继续寻找木核。三位护卫跟随，队长与其余人巡街；手链与实际交易另段继续。</p></BondSummary>}
    {returnButton(onBack, "暂离入坊巡卫 · 保留断点")}
  </>
}
