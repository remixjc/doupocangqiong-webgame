import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { advanceEarlyWalk, submitEarlyWalk, type EarlyWalkAction } from '../src/core/early-walk-actions'
import { beginEarlyTraining, advanceEarlyTraining } from '../src/core/early-training'
import { earlyWalkStart, earlyWalkPlaces, moveEarlyWalker } from '../src/core/early-walk'
import { earlySupplies } from '../src/core/early-training-state'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { GameStore } from '../src/core/store'
import EarlyWalkInteraction from '../src/ui/EarlyWalkInteraction'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return validateState(old)
}
function position(id: string) { return earlyWalkPlaces.find(place => place.id === id)! }

describe('往事地点事务', () => {
  it('方向行走到四地完成接取/借资/逆序草药/魔核/附物，全断点保存且与面板同账', async () => {
    let state = eligible(), current = { ...earlyWalkStart }
    const before = structuredClone(state)
    async function act(place: string, action: EarlyWalkAction) {
      // Walk along a safe horizontal corridor before approaching the destination.
      const destination = position(place)
      while (current.y < 350) current = moveEarlyWalker(current, 'down')
      while (Math.abs(current.x - destination.x) > 10) current = moveEarlyWalker(current, current.x < destination.x ? 'right' : 'left')
      while (Math.abs(current.y - destination.y) > 10) current = moveEarlyWalker(current, current.y < destination.y ? 'down' : 'up')
      const result = advanceEarlyWalk(state, current, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      await saveSlot(3, state); expect(await loadSlot(3)).toEqual(state)
      expect(advanceEarlyWalk(state, current, action).state).toBe(state)
    }
    await act('teacher', { type: 'begin' })
    await act('xuner', { type: 'borrow', expectedSpent: 0 })
    for (const item of ['boneflower', 'bluegrass', 'woodCore'] as const)
      await act(item === 'woodCore' ? 'market' : 'pharmacy', { type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent })
    for (let step = 0; step < 4; step++) await act('market', { type: 'market', step, expectedSpent: 110 })
    expect(state.earlyTraining.market.blackIron).toBe(1)
    expect(state.earlyTraining.purse).toEqual({ own: 0, borrowed: 160, spent: 110 })
    expect(state.earlyTraining.supplies).toEqual({ bluegrass: 3, boneflower: 2, woodCore: 1 })
    expect(state.gold).toBe(before.gold); expect(state.inventory).toEqual(before.inventory)
    expect(state.completed).toEqual(before.completed); expect(state.chapter).toBe(before.chapter)
    expect(advanceEarlyTraining(state, { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 110 }).state).toBe(state)
  })
  it('远处/错地点/未接取/缺草/旧报价/非法位置拒绝，面板取得的记录不能地图重复', () => {
    let state = eligible()
    expect(advanceEarlyWalk(state, earlyWalkStart, { type: 'begin' }).ok).toBe(false)
    expect(advanceEarlyWalk(state, position('xuner'), { type: 'begin' }).ok).toBe(false)
    expect(advanceEarlyWalk(state, position('xuner'), { type: 'borrow', expectedSpent: 0 }).ok).toBe(false)
    state = beginEarlyTraining(state).state
    state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
    expect(advanceEarlyWalk(state, position('xuner'), { type: 'borrow', expectedSpent: 0 }).state).toBe(state)
    const order = { type: 'purchase' as const, item: 'bluegrass' as const, price: 30, expectedSpent: 0 }
    expect(advanceEarlyWalk(state, position('market'), order).state).toBe(state)
    expect(advanceEarlyWalk(state, { x: NaN, y: 150 }, order).state).toBe(state)
    expect(advanceEarlyWalk(state, position('market'), { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 0 }).state).toBe(state)
    expect(advanceEarlyWalk(state, position('pharmacy'), { ...order, price: 1 }).state).toBe(state)
    state = advanceEarlyTraining(state, order).state
    expect(advanceEarlyWalk(state, position('pharmacy'), order).state).toBe(state)
    expect(advanceEarlyWalk(state, position('pharmacy'), { ...order, item: 'boneflower', price: 20 }).state).toBe(state)
  })
  it('store点击读取最新状态，一次保存且不重建主线runtime，失败不保存', () => {
    const store = new GameStore(), changes: unknown[] = []
    store.replace(eligible()); store.onChange = state => changes.push(state)
    const runtime = store.getSnapshot().runtime
    const action = { type: 'begin' as const }
    expect(submitEarlyWalk(store, position('teacher'), action)).toBe(true)
    expect(submitEarlyWalk(store, position('teacher'), action)).toBe(false)
    expect(changes).toHaveLength(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state.chapter).toBe(2)
  })
  it('未付魔核时附物按钮禁用且不宣称已结清，付款后才可领取', () => {
    let state = beginEarlyTraining(eligible()).state
    state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
    for (const item of ['bluegrass', 'boneflower'] as const)
      state = advanceEarlyTraining(state, { type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent }).state
    for (let step = 0; step < 3; step++) state = advanceEarlyWalk(state, position('market'), { type: 'market', step, expectedSpent: 50 }).state
    const before = renderToStaticMarkup(<EarlyWalkInteraction state={state} position={position('market')} />)
    expect(before).not.toContain('货款已结清')
    expect(before).toContain('disabled="">领取交易中的黑铁片')
    state = advanceEarlyWalk(state, position('market'), { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 50 }).state
    const after = renderToStaticMarkup(<EarlyWalkInteraction state={state} position={position('market')} />)
    expect(after).not.toContain('disabled="">领取交易中的黑铁片')
    expect(advanceEarlyWalk(state, position('market'), { type: 'market', step: 3, expectedSpent: 110 }).ok).toBe(true)
  })
  it('附近界面显示合法订单/前置，未接取不借资，远处不出现操作', () => {
    const state = eligible()
    const initial = renderToStaticMarkup(<EarlyWalkInteraction state={state} position={position('xuner')} />)
    expect(initial).toContain('disabled=""'); expect(initial).toContain('先到药老')
    expect(renderToStaticMarkup(<EarlyWalkInteraction state={state} position={earlyWalkStart} />)).toBe('')
    expect(renderToStaticMarkup(<EarlyWalkInteraction state={state} position={position('market')} />)).toContain('先去药铺')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyWalkInteraction state={state} position={position('pharmacy')} />)).toBe('')
  })
})
