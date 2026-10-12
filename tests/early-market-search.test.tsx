import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { marketSearchAt, type MarketSearchState } from '../src/core/early-market-search-state'
import { marketEscortAt } from '../src/core/early-market-escort-state'
import { advanceEarlyMarketSearch, marketSearchPlaces, submitEarlyMarketSearch, type MarketSearchAction } from '../src/core/early-market-search'
import { marketSearchScenes } from '../src/content/early-market-search'
import { searchEligible, searchInput, searchStep } from './helpers/market-search-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import { earlyMarketEscortSaveSummary, earlyMarketSearchSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketSearch from '../src/ui/EarlyMarketSearch'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4c2 两人分路、寻核和未购手链', () => {
  it('20断点JSON/自动/手动/备份，仅历史记录变化，拿看/放回/闻声/见人分别保存', async () => {
    let state = searchEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.marketSearch.stage < 20) {
      const previous = state; state = searchStep(state); await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const compare = structuredClone(state); compare.earlyTraining.marketSearch = before.earlyTraining.marketSearch
      expect(compare).toEqual(before)
      const task = state.earlyTraining.marketSearch
      expect(task.bracelet).toBe(task.stage >= 13 ? 'returned' : task.stage >= 10 ? 'xuner-viewing' : 'stall')
      expect(task.stranger).toBe(task.stage >= 19 ? 'seen' : task.stage >= 16 ? 'heard' : 'unseen')
    }
    expect(state.earlyTraining.bracelet).toEqual({ stage: 0, gift: 'none' })
    expect(state.earlyTraining).toMatchObject({ supplies: { woodCore: 0 }, market: { stage: 0, blackIron: 0 } })
    expect(advanceEarlyMarketSearch(state, { kind: 'xuner', position: marketSearchPlaces.voice }, searchInput(state)).state).toBe(state)
    expect(earlyMarketEscortSaveSummary(state, state.settings)).toContain('来人交谈待续')
  })
  it('0.48尚未赠/已赠/已购木核和药液耗尽旧档仅补空，不撤借资或倒退手链', () => {
    const fresh = searchEligible(), consumed = searchEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))
    consumed.earlyTraining.marketSearch = marketSearchAt(0)
    expect(consumed.earlyTraining.bracelet.gift).toBe('xuner'); expect(consumed.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [fresh, consumed]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.48.0'; delete old.earlyTraining.marketSearch
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.marketSearch.stage < 20) state = searchStep(state)
      const compare = structuredClone(state); compare.earlyTraining.marketSearch = input.earlyTraining.marketSearch
      expect(compare).toEqual(input)
    }
  })
  it('本人和薰儿不可互代，完整快照/演员/操作/远处/墙内/四错误/重复零写', () => {
    let state = searchEligible()
    while (state.earlyTraining.marketSearch.stage < 20) {
      const action = searchInput(state), scene = marketSearchScenes[action.stage], view = { kind: scene.view, position: marketSearchPlaces[scene.place] }
      for (const key of Object.keys(action) as (keyof MarketSearchAction)[])
        expect(advanceEarlyMarketSearch(state, view, { ...action, [key]: 'stale' } as MarketSearchAction).state).toBe(state)
      expect(advanceEarlyMarketSearch(state, { ...view, kind: scene.view === 'yan' ? 'xuner' : 'yan' }, action).state).toBe(state)
      for (const operation of ['claim-gift', 'claim-core', 'refund-loan', 'reveal-name'] as const)
        expect(advanceEarlyMarketSearch(state, view, { ...action, operation }).state).toBe(state)
      for (const position of [{ x: 80, y: 370 }, { x: 380, y: 100 }, { x: NaN, y: 310 }, { x: 800, y: 310 }])
        expect(advanceEarlyMarketSearch(state, { ...view, position }, action).state).toBe(state)
      state = searchStep(state); expect(advanceEarlyMarketSearch(state, view, action).state).toBe(state)
    }
  })
  it('新版缺字段/所有派生变造/非法阶段/护卫前置拒绝，合法每页往返一致', () => {
    let state = searchEligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.marketSearch
    expect(() => validateState(missing)).toThrow()
    const all = Array.from({ length: 21 }, (_, stage) => marketSearchAt(stage))
    for (;;) {
      const task = state.earlyTraining.marketSearch
      expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(task) as (keyof MarketSearchState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.marketSearch[key] = value; expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(state); bad.earlyTraining.marketEscort = marketEscortAt(23); expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 20) break
      state = searchStep(state)
    }
    for (const stage of [-1, 21, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.marketSearch.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('两个位置分别绘制、默认未选不可移动、来人见后才画、旧已赠提示与防剧透1全封存', () => {
    const state = searchEligible(), ui = () => renderToStaticMarkup(<EarlyMarketSearch state={state} onBack={() => {}} />)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续坊市寻核')
    for (let stage = 0; stage <= 20; stage++) {
      state.earlyTraining.marketSearch = marketSearchAt(stage); const html = ui()
      expect(html).toContain('萧炎独立行走位置'); expect(html).toContain('薰儿独立行走位置')
      expect(html).not.toContain('aria-label="寻核向上走"')
      expect(html.includes('姓名尚未揭出的华衣来人')).toBe(stage >= 19)
      if (stage < 20) expect(html).toContain('本步请明确选择')
    }
    state.earlyTraining.bracelet.gift = 'xuner'; expect(ui()).toContain('后来的已赠手链记录保留')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMarketSearch state={limited} onBack={() => {}} />)).not.toMatch(/薰儿|手链|华衣|木核/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续坊市寻核')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|手链|华衣|木核/)
    expect(earlyMarketSearchSaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyMarketSearch(limited, { kind: 'xuner', position: marketSearchPlaces.voice }, searchInput(limited)).state).toBe(limited)
  })
  it('store放回动作仅一次历史写，错人物/双击零写、库存礼物和runtime保持', async () => {
    let state = searchEligible(); while (state.earlyTraining.marketSearch.stage < 12) state = searchStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.marketSearch.bracelet).toBe('returned')
      expect(saved.earlyTraining.bracelet).toEqual(state.earlyTraining.bracelet)
      expect(saved.earlyTraining.purse).toEqual(state.earlyTraining.purse)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = searchInput(state)
    expect(submitEarlyMarketSearch(store, { kind: 'yan', position: marketSearchPlaces.bracelet }, input)).toBe(false)
    expect(writes).toBe(0); expect(submitEarlyMarketSearch(store, { kind: 'xuner', position: marketSearchPlaces.bracelet }, input)).toBe(true)
    expect(submitEarlyMarketSearch(store, { kind: 'xuner', position: marketSearchPlaces.bracelet }, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
