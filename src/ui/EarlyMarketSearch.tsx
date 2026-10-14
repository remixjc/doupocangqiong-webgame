import { robeFigureGroup } from './NativeRegions'
import { marketWalkerGroup } from './MarketWalker'
import { returnButton } from './Buttons'
import { sceneButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'

import { MutedParagraph } from './NativeRegions'
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
  useSceneFocus(field, true, [])
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
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden) return
    walkKey(event, move, () => { if (scene) act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>坊市 / 寻核与普通手链</Eyebrow><h2>一个继续寻核，一个停在手链摊。</h2>
    <p id="market-search-help">先明确选择本步人物，再用方向或WASD行走、近当前地点按E。两人的位置各自记录在本次行走中；换人物和刷新需重新选择。街坊不可穿过，位置不保存。</p>
    <EarlyMap ref={field} aria-label="两人分路寻核与手链地图" aria-describedby="market-search-help"
      viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground /><path d="M180 310 H650 M220 230 H620 V130 H580" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <MarketStreetBuildings />
      {Object.entries(marketSearchPlaces).map(([id, p]) => <g key={id}><circle cx={p.x} cy={p.y} r="24" fill="none" stroke={scene?.place === id ? '#f7d699' : '#9d8b63'} strokeDasharray="4 5" />
        <HallText x={p.x} y={p.y + 40} fontSize="11">{p.label}</HallText></g>)}
      {robeFigureGroup({ "aria-label": "普通手链摊主", "transform": "translate(190 210)" }, { "cut": "M-10 12 L-5-5 H5 L10 12Z", "robe": "#b2a480", "cy": "-12", "r": "7", "skin": "#ddb894", "bodyFirst": true })}
      {task.bracelet !== 'xuner-viewing' && <circle aria-label="普通手链在摊上" cx="220" cy="214" r="7" fill="none" stroke="#afd0ba" strokeWidth="3" />}
      {marketWalkerGroup({ "aria-label": "萧炎独立行走位置", "transform": `translate(${yan.x} ${yan.y})` }, {  })}
      {marketWalkerGroup({ "aria-label": "薰儿独立行走位置", "transform": `translate(${xuner.x + (xuner.x === yan.x && xuner.y === yan.y ? 25 : 0)} ${xuner.y})` }, { "xuner": true }, task.bracelet === 'xuner-viewing' && <circle aria-label="薰儿只拿看未购手链" cx="12" cy="4" r="6" fill="none" stroke="#afd0ba" strokeWidth="3" />)}
      {task.stranger === 'seen' && robeFigureGroup({ "aria-label": "姓名尚未揭出的华衣来人", "transform": "translate(145 310)" }, { "cut": "M-13 16 L-7-7 H7 L13 16Z", "robe": "#b6a58a", "cy": "-15", "r": "9", "skin": "#dcc6ae", "bodyFirst": true })}
    </EarlyMap>
    {scene && <WalkControls><SecondaryButton onClick={() => { setSelected('yan'); field.current?.focus() }}>选择萧炎视角</SecondaryButton>
      <SecondaryButton onClick={() => { setSelected('xuner'); field.current?.focus() }}>选择薰儿视角</SecondaryButton>
      {active && <WalkDirectionButtons prefix="寻核" onMove={move} />}</WalkControls>}
    <StatusParagraph>坊市寻核 {task.stage}/20 · {earlyMarketSearchSaveSummary(state, state.settings)}</StatusParagraph>
    <p>当前视角：{selected === 'yan' ? '萧炎' : selected === 'xuner' ? '薰儿' : '尚未选择'} · 普通手链：{task.bracelet === 'xuner-viewing' ? '薰儿拿看，仍属摊主' : task.bracelet === 'returned' ? '已放回，仍属摊主' : '仍在摊上'}</p>
    {scene ? <BondSummary>{sceneHeading(scene, near ? scene.text : !active ? `本步请明确选择${scene.view === 'yan' ? '萧炎' : '薰儿'}视角。`
      : `先由${selected === 'yan' ? '萧炎' : '薰儿'}走近${marketSearchPlaces[scene.place].label}。`)}
      {sceneButton(scene, !near, act)}
      {task.stage === 10 && <SecondaryButton disabled={!near} onClick={() => act('claim-gift')}>拿看就能算作已经得到礼物吗？</SecondaryButton>}
      {task.stage === 11 && <SecondaryButton disabled={!near} onClick={() => act('claim-core')}>能从这条普通手链取出木核吗？</SecondaryButton>}
      {task.stage === 12 && <SecondaryButton disabled={!near} onClick={() => act('refund-loan')}>不买手链就收回已借采购资金</SecondaryButton>}
      {task.stage === 19 && <SecondaryButton disabled={!near} onClick={() => act('reveal-name')}>尚未交谈就登记来人的姓名</SecondaryButton>}
    </BondSummary> : <BondSummary><h3>寻核与放回手链已归档。</h3><p>萧炎仍在寻找木核，薰儿没有买下摊上的手链。华衣来人的交谈另段接续。</p></BondSummary>}
    {state.earlyTraining.bracelet.gift === 'xuner' && <MutedParagraph>后来的已赠手链记录保留。这一段回看的是当时尚未购买的时刻。</MutedParagraph>}
    {returnButton(onBack, "暂离坊市寻核 · 保留断点")}
  </>
}
