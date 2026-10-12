import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { marketEscortAt, marketEscortObserver, type MarketEscortState } from '../src/core/early-market-escort-state'
import { advanceEarlyMarketEscort, marketEscortPlaces, submitEarlyMarketEscort, type MarketEscortAction } from '../src/core/early-market-escort'
import { escortEligible, escortInput, escortStep, escortView } from './helpers/market-escort-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import { earlyCityPharmacySaveSummary, earlyMarketEscortSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketEscort from '../src/ui/EarlyMarketEscort'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4c1 南坊与明确的巡卫旁观', () => {
  it('24断点JSON/自动/手动/备份，仅新记录变化，入市/介绍/实际三人/巡街依序发生', async () => {
    let state = escortEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.marketEscort.stage < 24) {
      const previous = state; state = escortStep(state); await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const compare = structuredClone(state); compare.earlyTraining.marketEscort = before.earlyTraining.marketEscort
      expect(compare).toEqual(before)
      const task = state.earlyTraining.marketEscort
      expect(task.entered).toBe(task.stage >= 5); expect(task.following).toBe(task.stage >= 16 ? 3 : 0)
      expect(task.captain).toBe(task.stage >= 9 ? 'introduced' : 'unknown'); expect(task.patrol).toBe(task.stage >= 18)
    }
    expect(state.earlyTraining).toMatchObject({ purse: { borrowed: 160, spent: 50 }, supplies: { woodCore: 0 }, market: { stage: 0, blackIron: 0 } })
    expect(advanceEarlyMarketEscort(state, escortView(state), escortInput(state)).state).toBe(state)
    expect(earlyCityPharmacySaveSummary(state, state.settings)).toContain('寻核待续')
  })
  it('0.47两药/已有木核手链/已经药液耗尽旧档仅补空，重修全段不回滚或复原', () => {
    const fresh = escortEligible(), consumed = escortEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))
    consumed.earlyTraining.marketEscort = marketEscortAt(0)
    expect(consumed.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [fresh, consumed]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.47.0'; delete old.earlyTraining.marketEscort
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.marketEscort.stage < 24) state = escortStep(state)
      const compare = structuredClone(state); compare.earlyTraining.marketEscort = input.earlyTraining.marketEscort
      expect(compare).toEqual(input)
    }
  })
  it('本人/旁观不可互代、焦点不能错处，全快照/人/操作/位置/五错误/双击均零写', () => {
    let state = escortEligible()
    while (state.earlyTraining.marketEscort.stage < 24) {
      const action = escortInput(state), view = escortView(state)
      for (const key of Object.keys(action) as (keyof MarketEscortAction)[])
        expect(advanceEarlyMarketEscort(state, view, { ...action, [key]: 'stale' } as MarketEscortAction).state).toBe(state)
      for (const operation of ['absorb-core', 'collect-tax', 'recruit', 'claim-rank', 'claim-core'] as const)
        expect(advanceEarlyMarketEscort(state, view, { ...action, operation }).state).toBe(state)
      const wrong = view.kind === 'yan' ? { kind: 'observer' as const, place: 'inner' as const }
        : { kind: 'yan' as const, position: marketEscortPlaces[view.place] }
      expect(advanceEarlyMarketEscort(state, wrong, action).state).toBe(state)
      if (view.kind === 'observer') expect(advanceEarlyMarketEscort(state, { kind: 'observer', place: 'alley' }, action).state).toBe(state)
      else for (const position of [{ x: 140, y: 370 }, { x: 380, y: 100 }, { x: NaN, y: 310 }, { x: 800, y: 310 }])
        expect(advanceEarlyMarketEscort(state, { kind: 'yan', position }, action).state).toBe(state)
      state = escortStep(state); expect(advanceEarlyMarketEscort(state, view, action).state).toBe(state)
    }
  })
  it('新版缺字段/全部派生变造/非法阶段/药铺前置拒绝，不替代旧核心账校验', () => {
    let state = escortEligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.marketEscort
    expect(() => validateState(missing)).toThrow()
    const all = Array.from({ length: 25 }, (_, stage) => marketEscortAt(stage))
    for (;;) {
      const task = state.earlyTraining.marketEscort
      expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(task) as (keyof MarketEscortState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.marketEscort[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(state); bad.earlyTraining.cityPharmacy.stage = 14; expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 24) break
      state = escortStep(state)
    }
    for (const stage of [-1, 25, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.marketEscort.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('旁观隐藏本人移动、焦点默认未选、返回本人需明选，旧摘要跟随及上限1入口摘要封存', () => {
    const state = escortEligible(), ui = () => renderToStaticMarkup(<EarlyMarketEscort state={state} onBack={() => {}} />)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续入坊巡卫')
    for (let stage = 13; stage < 18; stage++) {
      state.earlyTraining.marketEscort = marketEscortAt(stage)
      expect(marketEscortObserver(stage)).toBe(true); expect(ui()).toContain('选择旁观焦点')
      expect(ui()).not.toContain('aria-label="入坊向上走"'); expect(ui()).toContain('先选择本步的旁观焦点')
    }
    state.earlyTraining.marketEscort = marketEscortAt(18)
    expect(ui()).toContain('回到本人视角'); expect(ui()).not.toContain('aria-label="入坊向上走"')
    state.earlyTraining.marketEscort = marketEscortAt(24)
    expect(ui()).toContain('入坊与护卫安排已归档')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMarketEscort state={limited} onBack={() => {}} />)).not.toMatch(/薰儿|护卫|木核|南坊/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续入坊巡卫')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|护卫|木核|南坊/)
    expect(earlyMarketEscortSaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyMarketEscort(limited, escortView(limited), escortInput(limited)).state).toBe(limited)
    const unfinished = escortEligible(); unfinished.completed = [1]
    expect(advanceEarlyMarketEscort(unfinished, escortView(unfinished), escortInput(unfinished)).state).toBe(unfinished)
  })
  it('store合法一步一次写，错焦点与双击零写、自动保存等待与runtime保持', async () => {
    let state = escortEligible(); while (state.earlyTraining.marketEscort.stage < 15) state = escortStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.marketEscort.following).toBe(3); expect(saved.earlyTraining.marketEscort.stage).toBe(16)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = escortInput(state), view = escortView(state)
    expect(submitEarlyMarketEscort(store, { kind: 'observer', place: 'captain' }, input)).toBe(false)
    expect(writes).toBe(0); expect(submitEarlyMarketEscort(store, view, input)).toBe(true)
    expect(submitEarlyMarketEscort(store, view, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
