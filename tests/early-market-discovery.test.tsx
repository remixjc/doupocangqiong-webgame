import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { marketDiscoveryAt, type MarketDiscoveryState } from '../src/core/early-market-discovery-state'
import { marketStandoffAt } from '../src/core/early-market-standoff-state'
import { advanceEarlyMarketDiscovery, submitEarlyMarketDiscovery, marketDiscoveryPlace, type MarketDiscoveryAction } from '../src/core/early-market-discovery'
import { discoveryEligible, discoveryInput, discoveryStep } from './helpers/market-discovery-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import type { GameState } from '../src/core/model'
import { earlyMarketStandoffSaveSummary, earlyMarketDiscoverySaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketDiscovery from '../src/ui/EarlyMarketDiscovery'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4c5a 发现绿核、黑铁片与心中购买建议', () => {
  it('10断点JSON/自动/手动/备份，仅历史变化，发现和购买严格分开', async () => {
    let state = discoveryEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.marketDiscovery.stage < 10) {
      const previous = state; state = discoveryStep(state); await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const compare = structuredClone(state); compare.earlyTraining.marketDiscovery = before.earlyTraining.marketDiscovery; expect(compare).toEqual(before)
      const task = state.earlyTraining.marketDiscovery
      expect(task.core).toBe(task.stage >= 2 ? 'seen' : 'unseen')
      expect(task.feeling).toBe(task.stage >= 4)
      expect(task.iron).toBe(task.stage >= 7 ? 'examined' : task.stage >= 6 ? 'noticed' : 'unseen')
      expect(task.advice).toBe(task.stage >= 8)
    }
    expect(earlyMarketStandoffSaveSummary(state, state.settings)).toContain('未询价成交')
    expect(advanceEarlyMarketDiscovery(state, marketDiscoveryPlace, discoveryInput(state)).state).toBe(state)
  })
  it('0.51未购、已购和已耗尽旧档只补空，不重置账本/附物/药液/章节', () => {
    const fresh = discoveryEligible()
    let purchased: GameState | undefined
    replayEarlyTraining(morningEligible(), false, state => {
      if (!purchased && state.earlyTraining.market.stage === 4 && state.earlyTraining.liquid.stage === 0) purchased = state
    })
    const bought = discoveryEligible(purchased!)
    const consumed = discoveryEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))
    expect(bought.earlyTraining.receipts.woodCore).toBe(true); expect(bought.earlyTraining.supplies.woodCore).toBe(1)
    expect(consumed.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [fresh, bought, consumed]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.51.0'; delete old.earlyTraining.marketDiscovery
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.marketDiscovery.stage < 10) state = discoveryStep(state)
      const compare = structuredClone(state); compare.earlyTraining.marketDiscovery = input.earlyTraining.marketDiscovery; expect(compare).toEqual(input)
    }
  })
  it('全快照/演员/操作/远处/墙内/四错误/双击均零写', () => {
    let state = discoveryEligible()
    while (state.earlyTraining.marketDiscovery.stage < 10) {
      const action = discoveryInput(state)
      for (const key of Object.keys(action) as (keyof MarketDiscoveryAction)[])
        expect(advanceEarlyMarketDiscovery(state, marketDiscoveryPlace, { ...action, [key]: 'stale' } as MarketDiscoveryAction).state).toBe(state)
      for (const operation of ['claim-core', 'claim-iron', 'learn', 'pay'] as const)
        expect(advanceEarlyMarketDiscovery(state, marketDiscoveryPlace, { ...action, operation }).state).toBe(state)
      for (const position of [{ x: 540, y: 310 }, { x: 380, y: 100 }, { x: NaN, y: 230 }, { x: 800, y: 230 }])
        expect(advanceEarlyMarketDiscovery(state, position, action).state).toBe(state)
      state = discoveryStep(state); expect(advanceEarlyMarketDiscovery(state, marketDiscoveryPlace, action).state).toBe(state)
    }
  })
  it('新版缺字段/所有派生变造/非法阶段/离场前置拒绝，每页合法往返', () => {
    let state = discoveryEligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.marketDiscovery; expect(() => validateState(missing)).toThrow()
    const all = Array.from({ length: 11 }, (_, stage) => marketDiscoveryAt(stage))
    for (;;) {
      const task = state.earlyTraining.marketDiscovery; expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(task) as (keyof MarketDiscoveryState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.marketDiscovery[key] = value; expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(state); bad.earlyTraining.marketStandoff = marketStandoffAt(33); expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 10) break
      state = discoveryStep(state)
    }
    for (const stage of [-1, 11, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.marketDiscovery.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('发现前不显示物品、提示仅心中建议不授技能，旧采购提示与防剧透1封存', () => {
    let state = discoveryEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续摊位发现与心中建议')
    for (;;) {
      const task = state.earlyTraining.marketDiscovery, html = renderToStaticMarkup(<EarlyMarketDiscovery state={state} onBack={() => {}} />)
      expect(html.includes('aria-label="绿核仍属摊主，未成交"')).toBe(task.stage >= 2)
      expect(html.includes('aria-label="古旧黑铁片仍属摊主，未成交"')).toBe(task.stage >= 6)
      if (task.stage === 10) break
      state = discoveryStep(state)
    }
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMarketDiscovery state={limited} onBack={() => {}} />)).not.toMatch(/薰儿|绿核|黑铁|购买建议/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续摊位发现与心中建议')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|绿核|黑铁|购买建议/)
    expect(earlyMarketDiscoverySaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyMarketDiscovery(limited, marketDiscoveryPlace, discoveryInput(limited)).state).toBe(limited)
    state.earlyTraining.receipts.woodCore = true
    expect(renderToStaticMarkup(<EarlyMarketDiscovery state={state} onBack={() => {}} />)).toContain('后来的已购或已耗材料记录保留')
  })
  it('心中建议成功仅一写、不添加材料或技能，远处和双击零写且runtime保持', async () => {
    let state = discoveryEligible(); while (state.earlyTraining.marketDiscovery.stage < 7) state = discoveryStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.marketDiscovery.advice).toBe(true)
      const compare = structuredClone(saved); compare.earlyTraining.marketDiscovery = state.earlyTraining.marketDiscovery; expect(compare).toEqual(state)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = discoveryInput(state)
    expect(submitEarlyMarketDiscovery(store, { x: 540, y: 310 }, input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyMarketDiscovery(store, marketDiscoveryPlace, input)).toBe(true)
    expect(submitEarlyMarketDiscovery(store, marketDiscoveryPlace, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
