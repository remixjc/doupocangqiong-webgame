import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { advanceEarlyTraining } from '../src/core/early-training'
import { marketTradeAt, marketTradeMinimum, type MarketTradeState } from '../src/core/early-market-trade-state'
import { marketDiscoveryAt } from '../src/core/early-market-discovery-state'
import { marketDiscoveryPlace } from '../src/core/early-market-discovery'
import { advanceEarlyMarketTrade, submitEarlyMarketTrade, marketTradeExit, marketTradeLedger, type MarketTradeAction } from '../src/core/early-market-trade'
import { tradeEligible, tradeInput, tradeStep } from './helpers/market-trade-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import { earlyMarketTradeSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketDiscovery from '../src/ui/EarlyMarketDiscovery'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4c5b 询价、同意、实际唯一成交与离摊', () => {
  it('17断点全槽/上一备份，报价和同意不付账；实际付款单次60核铁同交，其他state保持', async () => {
    let state = tradeEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    for (let stage = 1; stage <= 17; stage++) {
      const previous = state; state = tradeStep(state); await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const t = state.earlyTraining
      expect(t.purse.spent).toBe(stage < 13 ? 50 : 110)
      expect(t.receipts.woodCore).toBe(stage >= 13); expect(t.supplies.woodCore).toBe(stage >= 13 ? 1 : 0)
      expect(t.market).toEqual({ stage: marketTradeMinimum(stage), blackIron: stage >= 13 ? 1 : 0 })
      expect(t.marketTrade).toEqual(marketTradeAt(stage, stage >= 13 ? 'new-order' : 'none'))
      const compare = structuredClone(state)
      for (const key of ['marketTrade', 'purse', 'receipts', 'supplies', 'market'] as const) Object.assign(compare.earlyTraining, { [key]: before.earlyTraining[key] })
      expect(compare).toEqual(before)
    }
    expect(advanceEarlyMarketTrade(state, marketTradeExit, tradeInput(state)).state).toBe(state)
  })
  it('0.52.1迁移只补空；所有旧market0至4/已购尚存/液各耗材阈值/恢复耗尽均不重扣补发', () => {
    const fresh = tradeEligible(), cases = [fresh]
    for (let stage = 0; stage <= 4; stage++) {
      let state = advanceEarlyTraining(fresh, { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 50 }).state
      for (let step = 0; step < stage; step++) state = advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 110 }).state
      cases.push(state)
    }
    const operations = ['identify', 'water', 'primary', 'auxiliary', 'core', 'dilute'] as const
    let liquid = cases.at(-1)!
    for (let step = 0; step < 6; step++) {
      liquid = advanceEarlyTraining(liquid, { type: 'liquid', step, operation: operations[step], expectedSpent: 110 }).state; cases.push(liquid)
    }
    cases.push(tradeEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)))
    expect(cases.at(-1)!.earlyTraining.recovery.energy).toBe('spent')
    for (const input of cases) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.52.1'; delete old.earlyTraining.marketTrade
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.marketTrade.stage < 17) state = tradeStep(state)
      expect(state.earlyTraining.marketTrade.settlement).toBe(input.earlyTraining.receipts.woodCore ? 'existing-order' : 'new-order')
      const compare = structuredClone(state)
      for (const key of ['marketTrade', 'market'] as const) Object.assign(compare.earlyTraining, { [key]: input.earlyTraining[key] })
      if (!input.earlyTraining.receipts.woodCore) for (const key of ['purse', 'receipts', 'supplies'] as const) Object.assign(compare.earlyTraining, { [key]: input.earlyTraining[key] })
      expect(compare).toEqual(input)
    }
  })
  it('整新任务/旧账字段快照、演员、操作、坏坐标、提前付款、四错误与双击全部零推进', () => {
    let state = tradeEligible()
    while (state.earlyTraining.marketTrade.stage < 17) {
      const action = tradeInput(state), p = action.stage < 13 ? marketDiscoveryPlace : marketTradeExit
      for (const key of Object.keys(marketTradeAt(0)) as (keyof MarketTradeState)[])
        expect(advanceEarlyMarketTrade(state, p, { ...action, [key]: 'stale' } as MarketTradeAction).state).toBe(state)
      for (const key of Object.keys(action.expectedLedger) as (keyof ReturnType<typeof marketTradeLedger>)[])
        expect(advanceEarlyMarketTrade(state, p, { ...action, expectedLedger: { ...action.expectedLedger, [key]: 'stale' } } as MarketTradeAction).state).toBe(state)
      for (const operation of ['extra-charge', 'duplicate', 'learn', 'early-pay'] as const)
        expect(advanceEarlyMarketTrade(state, p, { ...action, operation }).state).toBe(state)
      expect(advanceEarlyMarketTrade(state, p, { ...action, actor: action.actor === 'yan' ? 'vendor' : 'yan' }).state).toBe(state)
      if (action.stage !== 12) expect(advanceEarlyMarketTrade(state, p, { ...action, operation: 'pay' }).state).toBe(state)
      for (const position of [action.stage < 13 ? marketTradeExit : marketDiscoveryPlace, { x: 380, y: 100 }, { x: NaN, y: 230 }, { x: 800, y: 230 }])
        expect(advanceEarlyMarketTrade(state, position, action).state).toBe(state)
      state = tradeStep(state); expect(advanceEarlyMarketTrade(state, p, action).state).toBe(state)
    }
  })
  it('旧入口并发采购、附物推进和耗材均使过期快照失效，重新取快照沿唯一收据续行', () => {
    let state = tradeEligible(); while (state.earlyTraining.marketTrade.stage < 12) state = tradeStep(state)
    const stale = tradeInput(state)
    let purchased = advanceEarlyTraining(state, { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 50 }).state
    expect(advanceEarlyMarketTrade(purchased, marketDiscoveryPlace, stale).state).toBe(purchased)
    const beforeMarket = tradeInput(purchased)
    purchased = advanceEarlyTraining(purchased, { type: 'market', step: 3, expectedSpent: 110 }).state
    expect(advanceEarlyMarketTrade(purchased, marketDiscoveryPlace, beforeMarket).state).toBe(purchased)
    const beforeLiquid = tradeInput(purchased)
    purchased = advanceEarlyTraining(purchased, { type: 'liquid', step: 0, operation: 'identify', expectedSpent: 110 }).state
    expect(advanceEarlyMarketTrade(purchased, marketDiscoveryPlace, beforeLiquid).state).toBe(purchased)
    const settled = tradeStep(purchased); expect(settled.earlyTraining.marketTrade.settlement).toBe('existing-order')
    expect(settled.earlyTraining.liquid).toEqual(purchased.earlyTraining.liquid)
  })
  it('派生/前置/唯一订单交叉校验与当前缺字段拒绝；合法逐页可往返', () => {
    let state = tradeEligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.marketTrade; expect(() => validateState(missing)).toThrow()
    const forms = [...Array.from({ length: 13 }, (_, n) => marketTradeAt(n)), ...Array.from({ length: 5 }, (_, n) => marketTradeAt(13 + n, 'new-order'))]
    for (;;) {
      const task = state.earlyTraining.marketTrade; expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of ['quote', 'bundle', 'left'] as const) for (const value of new Set(forms.map(t => t[key]))) if (value !== task[key]) {
        const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.marketTrade[key] = value; expect(() => validateState(bad)).toThrow()
      }
      const wrongSettlement = structuredClone(state); wrongSettlement.earlyTraining.marketTrade.settlement = task.stage < 13 ? 'new-order' : 'none'; expect(() => validateState(wrongSettlement)).toThrow()
      if (task.stage) {
        const missingPrior = structuredClone(state); missingPrior.earlyTraining.marketDiscovery = marketDiscoveryAt(9); expect(() => validateState(missingPrior)).toThrow()
        const reverse = structuredClone(state); reverse.earlyTraining.market = { stage: 0, blackIron: 0 }; expect(() => validateState(reverse)).toThrow()
      }
      if (task.stage === 17) break
      state = tradeStep(state)
    }
    for (const stage of [-1, 18, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.marketTrade.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('入口/地图/未付到已交付视觉分明，离摊近距与回焦入口，剧透1封存', () => {
    let state = tradeEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续询价与唯一成交')
    while (state.earlyTraining.marketTrade.stage < 17) {
      const html = renderToStaticMarkup(<EarlyMarketDiscovery trade state={state} onBack={() => {}} />)
      expect(html.includes('aria-label="绿核仍属摊主，未成交"')).toBe(state.earlyTraining.marketTrade.stage < 13)
      if (state.earlyTraining.marketTrade.stage === 12) expect(earlyMarketTradeSaveSummary(state, state.settings)).toContain('尚未实际付款')
      if (state.earlyTraining.marketTrade.stage === 13) expect(html).toContain('disabled=""')
      state = tradeStep(state)
    }
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMarketDiscovery trade state={limited} onBack={() => {}} />)).not.toMatch(/薰儿|魔核|黑铁|470|成交/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续询价与唯一成交')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/黑铁|470|成交/)
    expect(earlyMarketTradeSaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyMarketTrade(limited, marketTradeExit, tradeInput(limited)).state).toBe(limited)
  })
  it('实际支付、收据、核心、附物与历史恰好同一次存储写入，旧runtime保持', async () => {
    let state = tradeEligible(); while (state.earlyTraining.marketTrade.stage < 12) state = tradeStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.marketTrade.stage).toBe(13); expect(saved.earlyTraining.marketTrade.settlement).toBe('new-order')
      expect(saved.earlyTraining.purse.spent).toBe(110); expect(saved.earlyTraining.receipts.woodCore).toBe(true)
      expect(saved.earlyTraining.supplies.woodCore).toBe(1); expect(saved.earlyTraining.market).toEqual({ stage: 4, blackIron: 1 })
      expect(parseSave(serializeSave(saved))).toEqual(saved)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = tradeInput(state)
    expect(submitEarlyMarketTrade(store, marketTradeExit, input)).toBe(false)
    expect(submitEarlyMarketTrade(store, marketDiscoveryPlace, input)).toBe(true)
    expect(submitEarlyMarketTrade(store, marketDiscoveryPlace, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
