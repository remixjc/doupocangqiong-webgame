import { BondSummary } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { earlySupplies, type EarlySupplyId } from '../core/early-training-state'
import { earlyMarketScenes } from '../content/early-market'
import { submitEarlyWalk, type EarlyWalkAction } from '../core/early-walk-actions'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from '../core/early-walk'
import { earlyTrainingBlock } from '../core/early-training'
import { earlyLiquidScenes } from '../content/early-liquid'
import EarlyPractice from './EarlyPractice'
import EarlyBracelet from './EarlyBracelet'

export default function EarlyWalkInteraction({ state, position, onContinue }: { state: GameState; position: EarlyWalkPosition; onContinue?: () => void }) {
  const place = nearbyEarlyWalkPlace(position)
  if (!place || earlyTrainingBlock(state)) return null
  const task = state.earlyTraining, spent = task.purse.spent, balance = task.purse.borrowed - spent
  const act = (action: EarlyWalkAction) => submitEarlyWalk(gameStore, position, action)
  const herbsReady = task.receipts.bluegrass && task.receipts.boneflower
  const liquidScene = earlyLiquidScenes[task.liquid.stage]
  function order(id: EarlySupplyId) {
    const item = earlySupplies[id]
    return <article className="recap-line" key={id}><b>{item.label} · {item.price}采购资金</b>
      {task.receipts[id] && <p>收据已保留 · {task.supplies[id] ? `任务袋${task.supplies[id]}` : '老师已使用材料'}</p>}
      <SecondaryButton disabled={!task.started || task.receipts[id] || balance < item.price}
        onClick={() => act({ type: 'purchase', item: id, price: item.price, expectedSpent: spent })}>
        {task.receipts[id] ? '购买记录已保留' : `在此购买${item.label}`}
      </SecondaryButton>
    </article>
  }
  return <BondSummary aria-label="往事地点事务">
    <p>采购余额 {balance} · 已付 {spent}。两处采购与准备单共用同一份收据，已买过的订单保留。</p>
    {place.id === 'teacher' && (!task.started
      ? <PrimaryButton onClick={() => act({ type: 'begin' })}>请老师列重修准备单</PrimaryButton>
      : task.market.stage !== 4 ? <p>准备单已记好。先去药铺和坊市备齐材料，带回黑铁片，再请老师调制。</p>
        : <>
          <span className="eyebrow">药老调制 · {task.liquid.stage}/6</span>
          {liquidScene ? <>
            <h3>{liquidScene.title}</h3><b>{liquidScene.speaker}</b><p>{liquidScene.text}</p>
            <SecondaryButton onClick={() => act({ type: 'liquid', step: task.liquid.stage,
              operation: liquidScene.operation, expectedSpent: spent })}>{liquidScene.action}</SecondaryButton>
          </> : <p>{task.recovery.energy === 'spent' ? '药液曾经加水，现已在恢复中耗尽；容器保留。' : task.recovery.energy === 'fading' ? '药液已经加水，恢复中药色渐淡。' : '药液已经加水。'}三种材料由老师依次使用，收据和黑铁片保留。</p>}
          <p className="muted">玩家准备与观察，药老调制；药液不进入口服丹药行囊。</p>
          <EarlyPractice state={state} onAction={act} onContinue={onContinue} />
        </>)}
    {place.id === 'xuner' && <>
      <p>薰儿：这笔资金借给你，先把老师的准备单做齐。</p>
      <PrimaryButton disabled={!task.started || task.purse.borrowed > 0}
        onClick={() => act({ type: 'borrow', expectedSpent: spent })}>{task.purse.borrowed ? '借资记录已保留' : '在此向薰儿借采购资金'}</PrimaryButton>
    </>}
    {place.id === 'pharmacy' && <>{order('bluegrass')}{order('boneflower')}</>}
    {place.id === 'market' && <>
      {!herbsReady ? <p>先去药铺买齐两种药草，再回来寻找指定魔核。</p> : <>
        {order('woodCore')}
        {earlyMarketScenes[task.market.stage] ? <>
          <h3>{earlyMarketScenes[task.market.stage].title}</h3>
          <b>{earlyMarketScenes[task.market.stage].speaker}</b><p>{earlyMarketScenes[task.market.stage].text}</p>
          <SecondaryButton disabled={task.market.stage === 3 && !task.receipts.woodCore}
            onClick={() => act({ type: 'market', step: task.market.stage, expectedSpent: spent })}>{earlyMarketScenes[task.market.stage].action}</SecondaryButton>
        </> : <p>黑铁片已收好 · 任务袋 ×{task.market.blackIron} · 没有再次付账</p>}
      </>}
      <EarlyBracelet state={state} position={position} />
    </>}
    {!task.started && place.id !== 'teacher' && <p>先到药老的盛水容器处接取准备单。</p>}
    <p className="muted">资金和价格是游戏折算单位，和行囊金币分账；本次交易不发主线奖励。</p>
  </BondSummary>
}
