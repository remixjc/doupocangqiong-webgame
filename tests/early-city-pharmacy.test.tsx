import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { beginEarlyTraining, advanceEarlyTraining } from '../src/core/early-training'
import { cityPharmacyAt, type CityPharmacyState } from '../src/core/early-city-pharmacy-state'
import { morningCardAt } from '../src/core/early-morning-card-state'
import { advanceEarlyCityPharmacy, submitEarlyCityPharmacy, cityPharmacyPlaces, cityPharmacyStart, moveCityWalker, cityPharmacyNear, type CityPharmacyAction } from '../src/core/early-city-pharmacy'
import { cityPharmacyScenes } from '../src/content/early-city-pharmacy'
import { morningEligible, morningStep } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { earlyCityPharmacySaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyCityPharmacy from '../src/ui/EarlyCityPharmacy'
import EarlyMorningCard from '../src/ui/EarlyMorningCard'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
function eligible(input = morningEligible()): GameState {
  let state = input.earlyTraining.started ? input : beginEarlyTraining(input).state
  while (state.earlyTraining.morningCard.stage < 14) state = morningStep(state)
  return state
}
function action(state: GameState): CityPharmacyAction {
  const ledger = state.earlyTraining, task = ledger.cityPharmacy, scene = cityPharmacyScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive',
    expectedStarted: ledger.started, expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent, expectedLiquid: ledger.liquid.stage,
    expectedPrimary: ledger.receipts.bluegrass, expectedAuxiliary: ledger.receipts.boneflower, expectedCore: ledger.receipts.woodCore }
}
function step(state: GameState): GameState {
  const scene = cityPharmacyScenes[state.earlyTraining.cityPharmacy.stage]
  const result = advanceEarlyCityPharmacy(state, cityPharmacyPlaces[scene.place], action(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
describe('C1g-4b2 实际同行、药铺年份与同一两药订单', () => {
  it('15断点JSON/自动/手动/备份，只在两笔实际订单同事务扣30/20与交付3/2，木核仍未购', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.cityPharmacy.stage < 15) {
      const previous = state; state = step(state); const stage = state.earlyTraining.cityPharmacy.stage
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const compare = structuredClone(state), expected = structuredClone(before)
      compare.earlyTraining.cityPharmacy = before.earlyTraining.cityPharmacy
      if (stage >= 11) {
        expected.earlyTraining.purse.spent = 30; expected.earlyTraining.supplies.bluegrass = 3; expected.earlyTraining.receipts.bluegrass = true
        expect(state.earlyTraining.cityPharmacy.primaryOrder).toBe('new')
      }
      if (stage >= 12) {
        expected.earlyTraining.purse.spent = 50; expected.earlyTraining.supplies.boneflower = 2; expected.earlyTraining.receipts.boneflower = true
        expect(state.earlyTraining.cityPharmacy.auxiliaryOrder).toBe('new')
      }
      expect(compare).toEqual(expected)
    }
    expect(state.earlyTraining).toMatchObject({ purse: { borrowed: 160, spent: 50 }, receipts: { woodCore: false }, supplies: { woodCore: 0 } })
    for (const item of ['bluegrass', 'boneflower'] as const)
      expect(advanceEarlyTraining(state, { type: 'purchase', item, price: item === 'bluegrass' ? 30 : 20, expectedSpent: 50 }).ok).toBe(false)
    expect(advanceEarlyCityPharmacy(state, cityPharmacyPlaces.pharmacy, action(state)).state).toBe(state)
    expect(earlyCityPharmacySaveSummary(state, state.settings)).toContain('历史木核待后段')
  })
  it('0.46未购/任一药已购/两药已购/木核已购药液耗尽全迁移，仅补已有历史不扣款或復库存', () => {
    const fresh = eligible()
    const primary = advanceEarlyTraining(fresh, { type: 'purchase', item: 'bluegrass', price: 30, expectedSpent: 0 }).state
    const auxiliary = advanceEarlyTraining(fresh, { type: 'purchase', item: 'boneflower', price: 20, expectedSpent: 0 }).state
    const both = advanceEarlyTraining(primary, { type: 'purchase', item: 'boneflower', price: 20, expectedSpent: 30 }).state
    const consumed = eligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))
    expect(consumed.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [fresh, primary, auxiliary, both, consumed]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.46.0'; delete old.earlyTraining.cityPharmacy
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.cityPharmacy.stage < 15) state = step(state)
      expect(state.earlyTraining.cityPharmacy.primaryOrder).toBe(input.earlyTraining.receipts.bluegrass ? 'existing' : 'new')
      expect(state.earlyTraining.cityPharmacy.auxiliaryOrder).toBe(input.earlyTraining.receipts.boneflower ? 'existing' : 'new')
      const expected = structuredClone(input); expected.earlyTraining.cityPharmacy = state.earlyTraining.cityPharmacy
      for (const [item, price, quantity] of [['bluegrass', 30, 3], ['boneflower', 20, 2]] as const) if (!input.earlyTraining.receipts[item]) {
        expected.earlyTraining.purse.spent += price; expected.earlyTraining.receipts[item] = true; expected.earlyTraining.supplies[item] = quantity
      }
      expect(state).toEqual(expected)
    }
  })
  it('全快照/账本/收据/调制阶段/错序/人/远位/四越界/重复全部零写，路线绕过街坊碰撞', () => {
    let state = eligible()
    while (state.earlyTraining.cityPharmacy.stage < 15) {
      const current = action(state), scene = cityPharmacyScenes[current.stage], place = cityPharmacyPlaces[scene.place]
      for (const key of Object.keys(current) as (keyof CityPharmacyAction)[])
        expect(advanceEarlyCityPharmacy(state, place, { ...current, [key]: 'stale' } as CityPharmacyAction).state).toBe(state)
      for (const operation of ['claim-items', 'charge-900', 'claim-core', 'restore-liquid'] as const)
        expect(advanceEarlyCityPharmacy(state, place, { ...current, operation }).state).toBe(state)
      for (const far of [cityPharmacyStart, { x: 380, y: 125 }, { x: -1, y: 310 }, { x: NaN, y: 170 }])
        expect(advanceEarlyCityPharmacy(state, far, current).state).toBe(state)
      state = step(state); expect(advanceEarlyCityPharmacy(state, place, current).state).toBe(state)
    }
    let position = { x: 540, y: 170 }
    for (let i = 0; i < 8; i++) position = moveCityWalker(position, 'left')
    expect(position).toEqual({ x: 480, y: 170 })
    for (let i = 0; i < 3; i++) position = moveCityWalker(position, 'down')
    for (let i = 0; i < 14; i++) position = moveCityWalker(position, 'left')
    for (let i = 0; i < 3; i++) position = moveCityWalker(position, 'up')
    expect(cityPharmacyNear(position, 'pharmacy')).toBe(true)
  })
  it('新版缺字段/所有派生变造/非法阶段/晨卡前置/成交漏收据拒绝', () => {
    let state = eligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.cityPharmacy
    expect(() => validateState(missing)).toThrow()
    const all = Array.from({ length: 16 }, (_, stage) => cityPharmacyAt(stage, 'new', 'new'))
    for (;;) {
      const task = state.earlyTraining.cityPharmacy
      expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(task) as (keyof CityPharmacyState)[]) {
        if (['stage', 'primaryOrder', 'auxiliaryOrder'].includes(key)) continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.cityPharmacy[key] = value; expect(() => validateState(bad)).toThrow()
        }
      }
      for (const [key, threshold] of [['primaryOrder', 11], ['auxiliaryOrder', 12]] as const) {
        const bad = structuredClone(state); bad.earlyTraining.cityPharmacy[key] = task.stage < threshold ? 'new' : 'pending'
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage) {
        const bad = structuredClone(state); bad.earlyTraining.morningCard = morningCardAt(13, 'credited'); expect(() => validateState(bad)).toThrow()
      }
      if (task.stage >= 11) {
        const bad = structuredClone(state); bad.earlyTraining.receipts.bluegrass = false; expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 15) break
      state = step(state)
    }
    for (const stage of [-1, 16, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.cityPharmacy.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('四越界按钮可见、实际任务袋和已付显示、旧晨卡摘要跟随、防剧透1封存', () => {
    const state = eligible(), ui = () => renderToStaticMarkup(<EarlyCityPharmacy state={state} onBack={() => {}} onRoute={() => {}} />)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续同行药铺')
    for (const [stage, text] of [[6, '尝试逛摊直接领取两药'], [13, '尝试在原收据外另扣900'],
      [14, '尝试药铺直接交木核与附物'], [14, '尝试补历史复原已用药液']] as const) {
      state.earlyTraining.cityPharmacy = cityPharmacyAt(stage, 'new', 'new'); expect(ui()).toContain(text)
    }
    state.earlyTraining.cityPharmacy = cityPharmacyAt(15, 'existing', 'existing')
    expect(ui()).toContain('实际任务袋'); expect(ui()).toContain('历史药铺只备齐两药')
    expect(renderToStaticMarkup(<EarlyMorningCard state={state} onBack={() => {}} onRoute={() => {}} />)).toContain('历史木核待后段')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyCityPharmacy state={limited} onBack={() => {}} onRoute={() => {}} />)).not.toMatch(/薰儿|药铺|木核|古戒/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续同行药铺')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|药铺|木核|古戒/)
    expect(advanceEarlyCityPharmacy(limited, cityPharmacyPlaces.pharmacy, action(limited)).state).toBe(limited)
  })
  it('store一次写同时订单和30交三株，双击/过期报价零写/runtime保持', async () => {
    let state = eligible(); while (state.earlyTraining.cityPharmacy.stage < 10) state = step(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.cityPharmacy.primaryOrder).toBe('new')
      expect(saved.earlyTraining).toMatchObject({ purse: { spent: 30 }, supplies: { bluegrass: 3 }, receipts: { bluegrass: true } })
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, current = action(state)
    expect(submitEarlyCityPharmacy(store, cityPharmacyPlaces.pharmacy, { ...current, expectedPrimary: true })).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyCityPharmacy(store, cityPharmacyPlaces.pharmacy, current)).toBe(true)
    expect(submitEarlyCityPharmacy(store, cityPharmacyPlaces.pharmacy, current)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
