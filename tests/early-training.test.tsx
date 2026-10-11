import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { beginEarlyTraining, earlyTrainingBlock, advanceEarlyTraining, type EarlyTrainingAction } from '../src/core/early-training'
import { blankEarlyTraining, earlySupplies } from '../src/core/early-training-state'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { GameStore } from '../src/core/store'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function clearedTwo() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'
  old.completed = [1, 2]; old.chapter = 2
  old.progress = Object.fromEntries([1, 2].map(id => [id,
    { ...blankProgress(id), herbs: 3, kills: 3, brews: 0, intro: true, boss: true }]))
  delete old.earlyTraining
  return validateState(old)
}
describe('早期重修独立任务记录', () => {
  it('未首通/动画范围拒绝接取，不显示隐藏准备细节', () => {
    const fresh = initialState()
    expect(beginEarlyTraining(fresh).state).toBe(fresh)
    const state = clearedTwo(); state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(earlyTrainingBlock(state)).toContain('剧透')
    expect(beginEarlyTraining(state).state).toBe(state)
    const html = renderToStaticMarkup(<EarlyTrainingPanel state={state} />)
    expect(html).not.toContain('两种指定草药')
    expect(html).not.toContain('记下重修准备')
  })
  it('接取只改独立准备标记，拒绝重复，不发资金/材料/技能或章节奖励', () => {
    const state = clearedTwo(), result = beginEarlyTraining(state)
    expect(result.ok).toBe(true)
    const expected = structuredClone(state); expected.earlyTraining.started = true
    expect(result.state).toEqual(expected)
    expect(state.earlyTraining).toEqual(blankEarlyTraining())
    expect(beginEarlyTraining(result.state).state).toBe(result.state)
  })
  it('旧0.14.10缺记录只补空任务，新版缺记录与越过材料资金组合拒绝', () => {
    const old = JSON.parse(JSON.stringify(clearedTwo())); old.contentVersion = '0.14.10'; delete old.earlyTraining
    expect(validateState(old).earlyTraining).toEqual(blankEarlyTraining())
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    const invalid = beginEarlyTraining(clearedTwo()).state
    for (const change of [
      (state: typeof invalid) => { state.earlyTraining.purse.own = 400 },
      (state: typeof invalid) => { state.earlyTraining.supplies.woodCore = 1 },
      (state: typeof invalid) => { state.earlyTraining.supplies.bluegrass = -1 },
      (state: typeof invalid) => { state.earlyTraining.supplies.boneflower = NaN },
    ]) { const copy = structuredClone(invalid); change(copy); expect(() => validateState(copy)).toThrow('重修') }
    const beforeClear = initialState(); beforeClear.earlyTraining.started = true
    expect(() => validateState(beforeClear)).toThrow('重修')
  })
  it('接取状态JSON/IndexedDB往返，隐藏后保留，再恢复范围可见', async () => {
    const state = beginEarlyTraining(clearedTwo()).state
    expect(parseSave(serializeSave(state))).toEqual(state)
    await saveSlot(3, state)
    expect(await loadSlot(3)).toEqual(state)
    const hidden = structuredClone(state); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 1
    const restored = parseSave(serializeSave(hidden))
    expect(restored.earlyTraining.started).toBe(true)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={restored} />)).not.toContain('准备单已记下')
    restored.settings.spoiler = 'novel'
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={restored} />)).toContain('准备单已记下')
  })
  it('store接取保留运行态、章号和输入队列，仅成功写一次', () => {
    const store = new GameStore({ load: async () => null, write: async () => {} })
    store.replace(clearedTwo())
    const before = store.getSnapshot().runtime, persisted = vi.fn()
    store.onChange = persisted
    store.actions.push('attack')
    expect(store.beginEarlyTraining()).toBe(true)
    expect(store.beginEarlyTraining()).toBe(false)
    expect(persisted).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().runtime).toBe(before)
    expect(store.getSnapshot().state.chapter).toBe(2)
    expect(store.actions).toEqual(['attack'])
  })
})

function purchaseFixture() { return beginEarlyTraining(clearedTwo()).state }
function buyAction(state: ReturnType<typeof purchaseFixture>, item: keyof typeof earlySupplies): EarlyTrainingAction {
  return { type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent }
}
describe('重修借资与采购事务', () => {
  it('借资一次、任意药草先后、魔核在后，资金/材料/收据一次同步结算', () => {
    let state = purchaseFixture()
    const main = { chapter: state.chapter, gold: state.gold, inventory: state.inventory, xp: state.xp, progress: state.progress }
    expect(advanceEarlyTraining(state, buyAction(state, 'bluegrass')).ok).toBe(false)
    state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
    expect(state.earlyTraining.purse.borrowed).toBe(160)
    expect(advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).ok).toBe(false)
    expect(advanceEarlyTraining(state, buyAction(state, 'woodCore')).ok).toBe(false)
    for (const item of ['boneflower', 'bluegrass', 'woodCore'] as const) {
      const action = buyAction(state, item), result = advanceEarlyTraining(state, action)
      expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyTraining(state, buyAction(state, item)).state).toBe(state)
      expect(validateState(state)).toEqual(state)
    }
    expect(state.earlyTraining.supplies).toEqual({ bluegrass: 3, boneflower: 2, woodCore: 1 })
    expect(state.earlyTraining.purse).toEqual({ own: 0, borrowed: 160, spent: 110 })
    expect({ chapter: state.chapter, gold: state.gold, inventory: state.inventory, xp: state.xp, progress: state.progress }).toEqual(main)
  })
  it('拒绝伪造价格、过期付账、非法项目以及未接取/防剧透操作', () => {
    let state = advanceEarlyTraining(purchaseFixture(), { type: 'borrow', expectedSpent: 0 }).state
    const action = buyAction(state, 'bluegrass')
    expect(advanceEarlyTraining(state, { ...action, type: 'purchase', item: 'bluegrass', price: 0 }).state).toBe(state)
    expect(advanceEarlyTraining(state, { type: 'purchase', item: '__proto__' as 'bluegrass', price: 0, expectedSpent: 0 }).state).toBe(state)
    state = advanceEarlyTraining(state, action).state
    expect(advanceEarlyTraining(state, { type: 'purchase', item: 'boneflower', price: 20, expectedSpent: 0 }).state).toBe(state)
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(advanceEarlyTraining(state, buyAction(state, 'boneflower')).state).toBe(state)
    expect(advanceEarlyTraining(clearedTwo(), { type: 'borrow', expectedSpent: 0 }).ok).toBe(false)
  })
  it('每个采购断点JSON/IndexedDB恢复，返回后继续，重复领取不变', async () => {
    let state = purchaseFixture()
    const actions: EarlyTrainingAction[] = [
      { type: 'borrow', expectedSpent: 0 },
      { type: 'purchase', item: 'bluegrass', price: 30, expectedSpent: 0 },
      { type: 'purchase', item: 'boneflower', price: 20, expectedSpent: 30 },
      { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 50 },
    ]
    for (const action of actions) {
      state = advanceEarlyTraining(state, action).state
      await saveSlot(3, state); expect(await loadSlot(3)).toEqual(state)
      state = parseSave(serializeSave(state))
      expect(advanceEarlyTraining(state, action).state).toBe(state)
    }
  })
  it('0.15.0迁移只补未购收据，新版丢收据/错总额/无借资有材料拒绝', () => {
    const old = JSON.parse(JSON.stringify(purchaseFixture())); old.contentVersion = '0.15.0'; delete old.earlyTraining.receipts
    expect(validateState(old).earlyTraining).toEqual({ ...blankEarlyTraining(), started: true })
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    let purchased = advanceEarlyTraining(purchaseFixture(), { type: 'borrow', expectedSpent: 0 }).state
    purchased = advanceEarlyTraining(purchased, buyAction(purchased, 'bluegrass')).state
    for (const change of [
      (state: typeof purchased) => { state.earlyTraining.purse.spent++ },
      (state: typeof purchased) => { state.earlyTraining.purse.borrowed = 0 },
      (state: typeof purchased) => { state.earlyTraining.receipts.bluegrass = false },
      (state: typeof purchased) => { state.earlyTraining.supplies.bluegrass = 999 },
      (state: typeof purchased) => { state.earlyTraining.receipts.woodCore = true; state.earlyTraining.supplies.woodCore = 1; state.earlyTraining.purse.spent += 60 },
    ]) { const copy = structuredClone(purchased); change(copy); expect(() => validateState(copy)).toThrow('重修') }
  })
  it('采购面板在材料不齐时隐藏魔核，买齐后展示精确属性及尚无药液结果', () => {
    let state = advanceEarlyTraining(purchaseFixture(), { type: 'borrow', expectedSpent: 0 }).state
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).not.toContain('购买一阶木属性魔核')
    for (const item of ['bluegrass', 'boneflower'] as const) state = advanceEarlyTraining(state, buyAction(state, item)).state
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('购买一阶木属性魔核')
    state = advanceEarlyTraining(state, buyAction(state, 'woodCore')).state
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('现在没有药液')
  })
})
