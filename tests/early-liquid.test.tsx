import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { advanceEarlyTraining, beginEarlyTraining } from '../src/core/early-training'
import { earlySupplies } from '../src/core/early-training-state'
import { earlyLiquidScenes } from '../src/content/early-liquid'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function readyMaterials() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let state = beginEarlyTraining(validateState(old)).state
  state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
  for (const item of ['bluegrass', 'boneflower', 'woodCore'] as const)
    state = advanceEarlyTraining(state, { type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent }).state
  for (let step = 0; step < 4; step++) state = advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 110 }).state
  return state
}
describe('药老调制与清水稀释', () => {
  it('识别/备水/两草/魔核/稀释依次完成，每种材料只消耗一次，行囊及主线不变', () => {
    let state = readyMaterials()
    const before = structuredClone(state)
    const expectedSupplies = [
      { bluegrass: 3, boneflower: 2, woodCore: 1 },
      { bluegrass: 3, boneflower: 2, woodCore: 1 },
      { bluegrass: 0, boneflower: 2, woodCore: 1 },
      { bluegrass: 0, boneflower: 0, woodCore: 1 },
      { bluegrass: 0, boneflower: 0, woodCore: 0 },
      { bluegrass: 0, boneflower: 0, woodCore: 0 },
    ]
    for (let step = 0; step < 6; step++) {
      const action = { type: 'liquid' as const, step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 }
      const result = advanceEarlyTraining(state, action)
      expect(result.ok).toBe(true); state = result.state
      expect(state.earlyTraining.supplies).toEqual(expectedSupplies[step])
      expect(state.earlyTraining.liquid.ready).toBe(step === 5)
      expect(validateState(state)).toEqual(state)
      expect(advanceEarlyTraining(state, action).state).toBe(state)
    }
    before.earlyTraining.supplies = { bluegrass: 0, boneflower: 0, woodCore: 0 }
    before.earlyTraining.liquid = { stage: 6, water: true, ready: true }
    expect(state).toEqual(before)
    expect(state.totalBrews).toBe(0)
    expect(state.earlyTraining.market.blackIron).toBe(1)
  })
  it('拒绝错误操作/跳步/未完成交易附物/过期付账，失败不扣材料', () => {
    const state = readyMaterials()
    expect(advanceEarlyTraining(state, { type: 'liquid', step: 0, operation: 'dilute', expectedSpent: 110 }).state).toBe(state)
    expect(advanceEarlyTraining(state, { type: 'liquid', step: 1, operation: 'water', expectedSpent: 110 }).state).toBe(state)
    expect(advanceEarlyTraining(state, { type: 'liquid', step: 0, operation: 'identify', expectedSpent: 50 }).state).toBe(state)
    const incomplete = structuredClone(state); incomplete.earlyTraining.market = { stage: 3, blackIron: 0 }
    expect(advanceEarlyTraining(incomplete, { type: 'liquid', step: 0, operation: 'identify', expectedSpent: 110 }).state).toBe(incomplete)
  })
  it('每个消耗断点JSON/IndexedDB恢复，旧版补未开始调制，重复操作不产丹药', async () => {
    let state = readyMaterials()
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.15.3'; delete old.earlyTraining.liquid
    expect(validateState(old).earlyTraining.liquid).toEqual({ stage: 0, water: false, ready: false })
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (let step = 0; step < 6; step++) {
      state = advanceEarlyTraining(state, { type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 }).state
      await saveSlot(1, state); expect(await loadSlot(1)).toEqual(state)
      state = parseSave(serializeSave(state))
      expect(state.earlyTraining.liquid.stage).toBe(step + 1)
    }
  })
  it('拒绝阶段/材料消费/清水/药液准备/附物不一致组合', () => {
    const initial = readyMaterials()
    for (const liquid of [
      { stage: 1, water: true, ready: false },
      { stage: 2, water: false, ready: false },
      { stage: 3, water: true, ready: false },
      { stage: 6, water: true, ready: true },
      { stage: 0, water: false, ready: true },
      { stage: 7, water: true, ready: true },
    ]) {
      const copy = structuredClone(initial); copy.earlyTraining.liquid = liquid
      expect(() => validateState(copy)).toThrow('重修')
    }
    const missingMarket = structuredClone(initial)
    missingMarket.earlyTraining.liquid.stage = 1; missingMarket.earlyTraining.market = { stage: 3, blackIron: 0 }
    expect(() => validateState(missingMarket)).toThrow('重修')
  })
  it('未开放调制不泄露后段，完成显示供修炼使用与老师使用材料，动画过滤保持', () => {
    let state = readyMaterials()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('请药老辨认黑铁片')
    for (let step = 0; step < 6; step++) state = advanceEarlyTraining(state, { type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 }).state
    const html = renderToStaticMarkup(<EarlyTrainingPanel state={state} />)
    expect(html).toContain('修炼药液已备好')
    expect(html).toContain('已购入并由老师使用')
    expect(html).toContain('药液不会进入口服丹药行囊')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).not.toContain('修炼药液已备好')
  })
})
