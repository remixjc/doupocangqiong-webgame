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
import { earlyMarketDiscoveryBlock, discoveryNear, marketDiscoveryPlace, submitEarlyMarketDiscovery, type MarketDiscoveryAction } from '../core/early-market-discovery'
import { marketDiscoveryScenes } from '../content/early-market-discovery'
import { marketTradeScenes } from '../content/early-market-trade'
import { earlyMarketTradeBlock, tradeNear, marketTradeExit, marketTradeLedger, submitEarlyMarketTrade, type MarketTradeAction } from '../core/early-market-trade'
import { earlyMarketReturnBlock, returnNear, marketReturnPlaces, marketReturnStart, submitEarlyMarketReturn, type MarketReturnAction } from '../core/early-market-return'
import { marketReturnScenes } from '../content/early-market-return'
import { earlyMarketDiscoverySaveSummary, earlyMarketTradeSaveSummary, earlyMarketReturnSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketDiscovery({ state, onBack, trade = false, returning = false }: { state: GameState; onBack: () => void; trade?: boolean; returning?: boolean }) {
  const discovery = state.earlyTraining.marketDiscovery, order = state.earlyTraining.marketTrade, home = state.earlyTraining.marketReturn
  const task = returning ? home : trade ? order : discovery, scene = (returning ? marketReturnScenes : trade ? marketTradeScenes : marketDiscoveryScenes)[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...(returning ? marketReturnStart(task.stage) : trade ? order.left ? marketTradeExit : marketDiscoveryPlace : task.stage ? marketDiscoveryPlace : marketTradeExit) })
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = returning ? earlyMarketReturnBlock(state) : trade ? earlyMarketTradeBlock(state) : earlyMarketDiscoveryBlock(state)
  const near = returning ? returnNear(position, task.stage) : trade ? tradeNear(position, task.stage) : discoveryNear(position)
  const move = (direction: EarlyWalkDirection) => { if (scene && !document.hidden) setPosition(moveCityWalker(position, direction)) }
  const act = (operation: MarketDiscoveryAction['operation'] | MarketTradeAction['operation'] | MarketReturnAction['operation']) => {
    if (!scene || !near || document.hidden) return
    if (returning) submitEarlyMarketReturn(gameStore, position, { ...home, expectedLedger: marketTradeLedger(state), actor: scene.actor, operation } as MarketReturnAction)
    else if (trade) submitEarlyMarketTrade(gameStore, position, { ...order, expectedLedger: marketTradeLedger(state), actor: scene.actor, operation } as MarketTradeAction)
    else submitEarlyMarketDiscovery(gameStore, position, { ...discovery, actor: scene.actor, operation } as MarketDiscoveryAction)
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden) return
    walkKey(event, move, () => { if (scene) act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">{returning ? '回族与房中准备' : `坊市 / ${trade ? '询价与唯一成交' : '发现与心中购买建议'}`}</span><h2>{returning ? '走回族内，锁门后再摆材料。' : trade ? '同意之后，才付清同一笔订单。' : '一枚绿核，一片尚未辨明的黑铁。'}</h2>
    <p id="market-discovery-help">{returning ? '先同行出坊回族、分路后本人独自回房。方向/WASD行走，近当前地点按E；街坊不可穿过。位置不保存，刷新回到已完成地点；摆材料不恢复后来已耗物资。' : '由本人带薰儿走近前方摊位。方向/WASD行走，近摊按E；街坊不可穿过。历史逐步保存，行走位置不保存。老师的声音只在本人心中。'}{trade && '成交后需实际走到离摊标记。'}</p>
    <svg ref={field} role="group" aria-label={returning ? '回族与房中准备地图' : trade ? '询价与唯一成交地图' : '发现魔核与黑铁片地图'} aria-describedby="market-discovery-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <MapBackground /><path d={returning ? 'M540 310 H140 V370' : 'M500 310 H620 V230'} fill="none" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <MarketStreetBuildings />
      {returning ? <>
        {Object.entries(marketReturnPlaces).map(([id, p]) => <g key={id}><circle cx={p.x} cy={p.y} r="24" fill="none" stroke="#f7d699" strokeDasharray="4 5" />
          <text x={p.x} y={p.y - 30} textAnchor="middle" fill="#eed7ad">{id === 'gate' ? '族门前' : id === 'clan' ? '族内道路' : home.locked ? '房中 · 门已锁' : '房中 · 门未锁'}</text></g>)}
        {home.teacher && <g aria-label="锁门转身后看见的老师" transform="translate(220 370)"><MarketWalker /><text y="-30" textAnchor="middle" fill="#eed7ad">老师</text></g>}
        {home.materials && <g aria-label="当时材料桌面历史，旧耗材不补回"><rect x="220" y="300" width="65" height="25" fill="#937954" /><text x="253" y="295" textAnchor="middle" fill="#eed7ad">当时材料</text></g>}
      </> : <>
      <circle cx="620" cy="230" r="28" fill="none" stroke="#f7d699" strokeDasharray="4 5" /><text x="620" y="180" textAnchor="middle" fill="#eed7ad">前方摊位</text>
      {trade && <><circle cx="540" cy="310" r="28" fill="none" stroke="#f7d699" strokeDasharray="4 5" /><text x="540" y="365" textAnchor="middle" fill="#eed7ad">离摊标记</text></>}
      {(!trade || task.stage < 13) && <>
        {discovery.core === 'seen' && <circle aria-label="绿核仍属摊主，未成交" cx="615" cy="213" r="7" fill="#75bd7e" />}
        {discovery.iron !== 'unseen' && <rect aria-label="古旧黑铁片仍属摊主，未成交" x="630" y="208" width="14" height="9" fill="#292a29" stroke="#9f886b" />}
      </>}
      </>}
      <g aria-label="萧炎本人行走位置" transform={`translate(${position.x} ${position.y})`}><MarketWalker /></g>
      {(!returning || !home.parted) && <g aria-label="薰儿同行位置" transform={`translate(${position.x + 25} ${position.y})`}><MarketWalker xuner /></g>}
    </svg>
    {scene && <div className="early-walk-controls">{<WalkDirectionButtons prefix="发现" onMove={move} />}</div>}
    <StatusParagraph>{returning ? '回族房中' : trade ? '唯一成交' : '摊位发现'} {task.stage}/{returning ? 9 : trade ? 17 : 10} · {(returning ? earlyMarketReturnSaveSummary : trade ? earlyMarketTradeSaveSummary : earlyMarketDiscoverySaveSummary)(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={near ? scene.text : returning ? '先由本步人物实际走到当前地点。' : trade && task.stage >= 13 ? '先由本人带薰儿实际走到离摊标记。' : '先由本人带薰儿走近前方摊位。'} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {!trade && !returning && <>
        {task.stage === 2 && <SecondaryButton disabled={!near} onClick={() => act('claim-core')}>看见绿核就算已经买到</SecondaryButton>}
        {task.stage === 6 && <SecondaryButton disabled={!near} onClick={() => act('claim-iron')}>看见铁片就将附物再发一份</SecondaryButton>}
        {task.stage === 8 && <SecondaryButton disabled={!near} onClick={() => act('learn')}>听见购买建议就学会铁片斗技</SecondaryButton>}
        {task.stage === 9 && <SecondaryButton disabled={!near} onClick={() => act('pay')}>未经卖家同意先追加付款</SecondaryButton>}
      </>}
      {trade && <>
        {task.stage === 4 && <SecondaryButton onClick={() => act('extra-charge')}>将报价额外扣到账本</SecondaryButton>}
        {task.stage === 9 && <SecondaryButton onClick={() => act('early-pay')}>未经卖家同意就付款</SecondaryButton>}
        {task.stage === 12 && <SecondaryButton onClick={() => act('duplicate')}>再付一次并补回已耗材料</SecondaryButton>}
        {task.stage === 14 && <SecondaryButton onClick={() => act('learn')}>成交后直接学会铁片斗技</SecondaryButton>}
      </>}
      {returning && <>
        {task.stage === 4 && <SecondaryButton disabled={!near} onClick={() => act('learn')}>锁门就学会铁片斗技</SecondaryButton>}
        {task.stage === 6 && <SecondaryButton disabled={!near} onClick={() => act('restore')}>摆上桌就补回后来已耗材料</SecondaryButton>}
        {task.stage === 7 && <SecondaryButton disabled={!near} onClick={() => act('refine')}>材料齐备就算完成炼化</SecondaryButton>}
      </>}
    </BondSummary> : <BondSummary><h3>{returning ? '回族与房中准备已归档。' : trade ? '询价与唯一成交已归档。' : '发现与心中购买建议已归档。'}</h3><p>{returning ? '已回族分路、锁门并摆出当时材料；辨认黑铁片与详细炼化尚待接续，现有账与耗材保持。' : trade ? '已核同一采购并离摊；回族、分路和回房解释待续，尚未因成交授予斗技。' : '此刻魔核与黑铁片仍在摊上，未询价或成交。原有唯一采购、附物和已耗药液记录保留。'}</p></BondSummary>}
    {state.earlyTraining.receipts.woodCore && <p className="muted">后来的已购或已耗材料记录保留；回补历史不重新发放木核、黑铁片或药液。</p>}
    <SecondaryButton onClick={onBack}>{returning ? '暂离回族准备' : trade ? '暂离询价成交' : '暂离摊位发现'} · 保留断点</SecondaryButton>
  </>
}
