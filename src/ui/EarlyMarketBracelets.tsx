import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground } from './MapPrimitives'
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
import { marketSearchNear, marketSearchPlaces } from '../core/early-market-search'
import { earlyMarketBraceletsBlock, submitEarlyMarketBracelets, type MarketBraceletsAction } from '../core/early-market-bracelets'
import { marketBraceletsScenes } from '../content/early-market-bracelets'
import { earlyMarketBraceletsSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketBracelets({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.marketBracelets, scene = marketBraceletsScenes[task.stage]
  const [yan, setYan] = useState<EarlyWalkPosition>({ ...(task.stage >= 12 ? marketSearchPlaces.voice : marketSearchPlaces.deep) })
  const [xuner, setXuner] = useState<EarlyWalkPosition>({ ...marketSearchPlaces.voice })
  const [selected, setSelected] = useState<'yan' | 'xuner' | null>(null)
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  useEffect(() => { setSelected(null) }, [scene?.view])
  const blocked = earlyMarketBraceletsBlock(state), position = selected === 'xuner' ? xuner : yan
  const active = !!scene && selected === scene.view, near = active && marketSearchNear(position, 'voice')
  const move = (direction: EarlyWalkDirection) => {
    if (!active || document.hidden) return
    const next = moveCityWalker(position, direction)
    if (selected === 'xuner') setXuner(next); else setYan(next)
  }
  const act = (operation: MarketBraceletsAction['operation']) => {
    if (!scene || document.hidden || !near || !selected) return
    const gift = state.earlyTraining.bracelet
    submitEarlyMarketBracelets(gameStore, { kind: selected, position }, { ...task, expectedBracelet: gift.stage, expectedGift: gift.gift, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden) return
    walkKey(event, move, () => { if (scene) act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>坊市 / 让路与两条手链</Eyebrow><h2>先请让路，再分清两件赠礼。</h2>
    <p id="market-bracelets-help">明确选择本步人物，方向或WASD行走，近街角按E。两人独立行走，换人物和刷新需重选；位置不保存，街坊不可穿过。</p>
    <EarlyMap ref={field} aria-label="让路与两条手链地图" aria-describedby="market-bracelets-help"
      viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground /><path d="M160 310 H600" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <MarketStreetBuildings />
      <circle cx="220" cy="310" r="38" fill="none" stroke="#f7d699" strokeDasharray="4 5" />
      <text x="220" y="365" textAnchor="middle" fill="#eed7ad">拦路街角</text>
      <text x="540" y="365" textAnchor="middle" fill="#eed7ad">萧炎原先寻核处</text>
      <g aria-label={task.identity === 'named' ? '已在对话揭名的加列奥' : '尚未在对话揭名的青年'} transform="translate(160 310)">
        <RobeFigure cut="M-13 16 L-7-7 H7 L13 16Z" robe="#b6a58a" cy="-15" r="9" skin="#dcc6ae" bodyFirst />
        {task.expensive !== 'unoffered' && <g aria-label="蓝金手链与木核仍由来人持有"><circle cx="17" cy="3" r="8" fill="none" stroke="#8fb9d9" strokeWidth="3" /><circle cx="17" cy="11" r="4" fill="#75bd7e" /></g>}
      </g>
      <g aria-label="萧炎独立行走位置" transform={`translate(${yan.x} ${yan.y})`}>
        <MarketWalker />
        {task.green === 'shown' && <circle aria-label="普通绿链仍由萧炎持有" cx="12" cy="4" r="6" fill="none" stroke="#afd0ba" strokeWidth="3" />}
      </g>
      <g aria-label="薰儿独立行走位置" transform={`translate(${xuner.x + (xuner.x === yan.x && xuner.y === yan.y ? 25 : 0)} ${xuner.y})`}>
        <MarketWalker xuner />
        {(task.green === 'received' || task.green === 'worn') && <circle aria-label={task.green === 'worn' ? '薰儿已戴普通绿链' : '薰儿收到但尚未戴上普通绿链'} cx="12" cy="4" r="6" fill="none" stroke="#afd0ba" strokeWidth="3" />}
      </g>
    </EarlyMap>
    {scene && <WalkControls><SecondaryButton onClick={() => { setSelected('yan'); field.current?.focus() }}>选择萧炎视角</SecondaryButton>
      <SecondaryButton onClick={() => { setSelected('xuner'); field.current?.focus() }}>选择薰儿视角</SecondaryButton>
      {active && <WalkDirectionButtons prefix="手链" onMove={move} />}</WalkControls>}
    <StatusParagraph>让路手链 {task.stage}/28 · {earlyMarketBraceletsSaveSummary(state, state.settings)}</StatusParagraph>
    <p>当前视角：{selected === 'yan' ? '萧炎' : selected === 'xuner' ? '薰儿' : '尚未选择'} · 蓝金手链：{task.expensive === 'unoffered' ? '尚未提出' : '来人持有，未交付'}
      {' · '}普通绿链：{task.green === 'unshown' ? '尚未拿出' : task.green === 'shown' ? '萧炎持有，未交付' : task.green === 'received' ? '薰儿已收到，尚未戴上' : '薰儿已戴上'}</p>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={near ? scene.text : !active ? `本步请明确选择${scene.view === 'yan' ? '萧炎' : '薰儿'}视角。` : '先走近拦路街角。'} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 6 && <SecondaryButton disabled={!near} onClick={() => act('take-blue')}>提议赠送就算蓝金手链已交付吗？</SecondaryButton>}
      {task.stage === 10 && <SecondaryButton disabled={!near} onClick={() => act('claim-core')}>想到拆核就把木核放入任务袋</SecondaryButton>}
      {task.stage === 18 && <SecondaryButton disabled={!near} onClick={() => act('pay-extra')}>比较价格后追加支付赠礼费用</SecondaryButton>}
      {task.stage === 24 && <SecondaryButton disabled={!near} onClick={() => act('claim-rank')}>看见徽记就为本人授予一星境界</SecondaryButton>}
    </BondSummary> : <BondSummary><h3>让路与两条手链已归档。</h3><p>普通绿链已经收到、戴上并道谢。蓝金手链与木核未交付，来人尚未离开，围堵另段继续。</p></BondSummary>}
    <MutedParagraph>与简略手链往事共用唯一赠礼记录。已有进度只补历史，不倒退或重复交付；本段不改变金币、木核、队伍或主线奖励。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离让路手链 · 保留断点</SecondaryButton>
  </>
}
