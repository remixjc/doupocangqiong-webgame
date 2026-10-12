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
import { earlyMarketDiscoverySaveSummary, earlyMarketTradeSaveSummary } from '../core/save-preview'
import './early-walk.css'
export default function EarlyMarketDiscovery({ state, onBack, trade = false }: { state: GameState; onBack: () => void; trade?: boolean }) {
  const discovery = state.earlyTraining.marketDiscovery, order = state.earlyTraining.marketTrade
  const task = trade ? order : discovery, scene = (trade ? marketTradeScenes : marketDiscoveryScenes)[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...(trade ? order.left ? marketTradeExit : marketDiscoveryPlace : task.stage ? marketDiscoveryPlace : marketTradeExit) })
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = trade ? earlyMarketTradeBlock(state) : earlyMarketDiscoveryBlock(state), near = trade ? tradeNear(position, task.stage) : discoveryNear(position)
  const move = (direction: EarlyWalkDirection) => { if (scene && !document.hidden) setPosition(moveCityWalker(position, direction)) }
  const act = (operation: MarketDiscoveryAction['operation'] | MarketTradeAction['operation']) => {
    if (!scene || !near || document.hidden) return
    if (trade) submitEarlyMarketTrade(gameStore, position, { ...order, expectedLedger: marketTradeLedger(state), actor: scene.actor, operation } as MarketTradeAction)
    else submitEarlyMarketDiscovery(gameStore, position, { ...discovery, actor: scene.actor, operation } as MarketDiscoveryAction)
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden) return
    walkKey(event, move, () => { if (scene) act(scene.operation) })
  }
  if (blocked) return <><p>{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">坊市 / {trade ? '询价与唯一成交' : '发现与心中购买建议'}</span><h2>{trade ? '同意之后，才付清同一笔订单。' : '一枚绿核，一片尚未辨明的黑铁。'}</h2>
    <p id="market-discovery-help">由本人带薰儿走近前方摊位。方向/WASD行走，近摊按E；街坊不可穿过。历史逐步保存，行走位置不保存。老师的声音只在本人心中。{trade && '成交后需实际走到离摊标记。'}</p>
    <svg ref={field} role="group" aria-label={trade ? '询价与唯一成交地图' : '发现魔核与黑铁片地图'} aria-describedby="market-discovery-help" tabIndex={0}
      viewBox="0 0 720 420" className="early-walk-map" onKeyDown={key}>
      <rect width="720" height="420" fill="#293e36" /><path d="M500 310 H620 V230" fill="none" stroke="#bfa46a" strokeWidth="25" opacity=".35" />
      <MarketStreetBuildings />
      <circle cx="620" cy="230" r="28" fill="none" stroke="#f7d699" strokeDasharray="4 5" /><text x="620" y="180" textAnchor="middle" fill="#eed7ad">前方摊位</text>
      {trade && <><circle cx="540" cy="310" r="28" fill="none" stroke="#f7d699" strokeDasharray="4 5" /><text x="540" y="365" textAnchor="middle" fill="#eed7ad">离摊标记</text></>}
      {(!trade || task.stage < 13) && <>
        {discovery.core === 'seen' && <circle aria-label="绿核仍属摊主，未成交" cx="615" cy="213" r="7" fill="#75bd7e" />}
        {discovery.iron !== 'unseen' && <rect aria-label="古旧黑铁片仍属摊主，未成交" x="630" y="208" width="14" height="9" fill="#292a29" stroke="#9f886b" />}
      </>}
      <g aria-label="萧炎本人行走位置" transform={`translate(${position.x} ${position.y})`}><MarketWalker /></g>
      <g aria-label="薰儿同行位置" transform={`translate(${position.x + 25} ${position.y})`}><MarketWalker xuner /></g>
    </svg>
    {scene && <div className="early-walk-controls">{<WalkDirectionButtons prefix="发现" onMove={move} />}</div>}
    <p role="status">{trade ? '唯一成交' : '摊位发现'} {task.stage}/{trade ? 17 : 10} · {(trade ? earlyMarketTradeSaveSummary : earlyMarketDiscoverySaveSummary)(state, state.settings)}</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : trade && task.stage >= 13 ? '先由本人带薰儿实际走到离摊标记。' : '先由本人带薰儿走近前方摊位。'}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {!trade && <>
        {task.stage === 2 && <button className="secondary" disabled={!near} onClick={() => act('claim-core')}>看见绿核就算已经买到</button>}
        {task.stage === 6 && <button className="secondary" disabled={!near} onClick={() => act('claim-iron')}>看见铁片就将附物再发一份</button>}
        {task.stage === 8 && <button className="secondary" disabled={!near} onClick={() => act('learn')}>听见购买建议就学会铁片斗技</button>}
        {task.stage === 9 && <button className="secondary" disabled={!near} onClick={() => act('pay')}>未经卖家同意先追加付款</button>}
      </>}
      {trade && <>
        {task.stage === 4 && <button className="secondary" onClick={() => act('extra-charge')}>将报价额外扣到账本</button>}
        {task.stage === 9 && <button className="secondary" onClick={() => act('early-pay')}>未经卖家同意就付款</button>}
        {task.stage === 12 && <button className="secondary" onClick={() => act('duplicate')}>再付一次并补回已耗材料</button>}
        {task.stage === 14 && <button className="secondary" onClick={() => act('learn')}>成交后直接学会铁片斗技</button>}
      </>}
    </section> : <section className="bond-summary"><h3>{trade ? '询价与唯一成交已归档。' : '发现与心中购买建议已归档。'}</h3><p>{trade ? '已核同一采购并离摊；回族、分路和回房解释待续，尚未因成交授予斗技。' : '此刻魔核与黑铁片仍在摊上，未询价或成交。原有唯一采购、附物和已耗药液记录保留。'}</p></section>}
    {state.earlyTraining.receipts.woodCore && <p className="muted">后来的已购或已耗材料记录保留；回补历史不重新发放木核、黑铁片或药液。</p>}
    <button className="secondary" onClick={onBack}>{trade ? '暂离询价成交' : '暂离摊位发现'} · 保留断点</button>
  </>
}
