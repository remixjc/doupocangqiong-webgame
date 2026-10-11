import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyConsignment, earlyConsignmentBlock, submitEarlyConsignment, type ConsignmentAction, type ConsignmentStation } from '../src/core/early-consignment'
import { consignmentSupplies, type ConsignmentSupplyId } from '../src/core/early-training-state'
import { earlyConsignmentSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyConsignment from '../src/ui/EarlyConsignment'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true, true, true)
}
const plan: ConsignmentAction = { stage: 0, spent: 0, operation: 'plan' }
describe('首次寄售独立备料与封存待售实例', () => {
  it('恢复结果/位置/范围保护，旧首通与自用药液不能代签或售卖', () => {
    const state = eligible()
    expect(earlyConsignmentBlock(state, teacher)).toBe('')
    const unfinished = structuredClone(state); unfinished.earlyTraining.recovery = { stage: 6, energy: 'spent', period: 'reviewed', result: 'none' }
    expect(earlyConsignmentBlock(unfinished, teacher)).toContain('五段')
    expect(earlyConsignmentBlock(initialState(), teacher)).toContain('第2章')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyConsignment(state, position, 'plan', plan).state).toBe(state)
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyConsignment(state, teacher, 'plan', plan).state).toBe(state)
    expect(earlyConsignmentSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyConsignment state={state} position={teacher} onBack={() => {}} />)).not.toContain('玉瓶')
  })
  it('各笔收据、交材、老师调制和装瓶逐断点保存，不复制物资或重复扣款', async () => {
    let state = eligible()
    const before = structuredClone(state)
    const act = async (station: ConsignmentStation, action: ConsignmentAction) => {
      expect(advanceEarlyConsignment(state, teacher, station === 'plan' ? 'alley' : 'plan', action).state).toBe(state)
      const result = advanceEarlyConsignment(state, teacher, station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(advanceEarlyConsignment(state, teacher, station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyConsignmentSaveSummary(state, state.settings))
      }
    }
    await act('plan', plan)
    for (const id of Object.keys(consignmentSupplies) as ConsignmentSupplyId[])
      await act('pharmacy', { stage: 1, spent: state.earlyTraining.consignment.spent, operation: 'buy', item: id, price: consignmentSupplies[id].price })
    expect(state.earlyTraining.consignment.stage).toBe(2)
    expect(state.earlyTraining.consignment.supplies).toEqual({ youngPrimary: 1, youngAuxiliary: 1, woodCore: 1, jadeBottle: 1 })
    await act('alley', { stage: 2, spent: 50, operation: 'deliver' })
    expect(state.earlyTraining.consignment.supplies).toEqual({ youngPrimary: 0, youngAuxiliary: 0, woodCore: 0, jadeBottle: 1 })
    await act('alley', { stage: 3, spent: 50, operation: 'refine' })
    expect(state.earlyTraining.consignment.product).toBe('mixture')
    expect(state.earlyTraining.consignment.owner).toBe('none')
    await act('alley', { stage: 4, spent: 50, operation: 'bottle' })
    before.earlyTraining.consignment = { stage: 5, funds: 90, spent: 50,
      receipts: { youngPrimary: true, youngAuxiliary: true, woodCore: true, jadeBottle: true },
      supplies: { youngPrimary: 0, youngAuxiliary: 0, woodCore: 0, jadeBottle: 0 }, product: 'sealed', owner: 'xiaoyan' }
    expect(state).toEqual(before)
    expect(state.earlyTraining.recovery.energy).toBe('spent')
    expect(earlyConsignmentSaveSummary(state, state.settings)).toContain('待鉴定')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待装瓶')
  })
  it('报价/余额/收据/阶段快照严格保护，非法或重复采购不写', () => {
    const state = advanceEarlyConsignment(eligible(), teacher, 'plan', plan).state
    const order: ConsignmentAction = { stage: 1, spent: 0, operation: 'buy', item: 'youngPrimary', price: 10 }
    for (const price of [-1, NaN, 0, Infinity, 9, 11])
      expect(advanceEarlyConsignment(state, teacher, 'pharmacy', { ...order, price }).state).toBe(state)
    expect(advanceEarlyConsignment(state, teacher, 'pharmacy', { ...order, item: '__proto__' as ConsignmentSupplyId }).state).toBe(state)
    for (const stage of [-1, NaN, .5, Infinity, 2])
      expect(advanceEarlyConsignment(state, teacher, 'pharmacy', { ...order, stage }).state).toBe(state)
    expect(advanceEarlyConsignment(state, teacher, 'pharmacy', { stage: 1, spent: 0, operation: 'refine' }).state).toBe(state)
    const bought = advanceEarlyConsignment(state, teacher, 'pharmacy', order).state
    expect(advanceEarlyConsignment(bought, teacher, 'pharmacy', { ...order, spent: 10 }).state).toBe(bought)
    const poor = structuredClone(state); poor.earlyTraining.consignment.funds = 0
    expect(advanceEarlyConsignment(poor, teacher, 'pharmacy', order).state).toBe(poor)
  })
  it('旧恢复档只补未参与，新版字段/订单/钱/消耗/产品归属组合拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.18.1'; delete old.earlyTraining.consignment
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    const begun = advanceEarlyConsignment(state, teacher, 'plan', plan).state
    for (const changed of [{ stage: 2 }, { funds: 91 }, { spent: 1 }, { product: 'sealed' }, { owner: 'xiaoyan' }, { stage: 6 }]) {
      const bad = structuredClone(begun); Object.assign(bad.earlyTraining.consignment, changed)
      expect(() => validateState(bad)).toThrow('重修')
    }
    for (const mutate of [
      (bad: typeof state) => { bad.earlyTraining.consignment.supplies.youngPrimary = 1 },
      (bad: typeof state) => { bad.earlyTraining.consignment.receipts.youngPrimary = true },
      (bad: typeof state) => { bad.earlyTraining.recovery = { stage: 6, energy: 'spent', period: 'reviewed', result: 'none' } },
    ]) { const bad = structuredClone(begun); mutate(bad); expect(() => validateState(bad)).toThrow('重修') }
  })
  it('store读取最新记录，失败不写、成功只更新寄售准备，保留运行态', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    expect(submitEarlyConsignment(store, teacher, 'alley', plan)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyConsignment(store, teacher, 'plan', plan)).toBe(true)
    expect(submitEarlyConsignment(store, teacher, 'plan', plan)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.consignment.stage = 1; before.earlyTraining.consignment.funds = 90
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
