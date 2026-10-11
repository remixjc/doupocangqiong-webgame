import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { beginEarlyTraining, advanceEarlyTraining } from '../src/core/early-training'
import { earlySupplies } from '../src/core/early-training-state'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function marketState(core = false) {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let state = beginEarlyTraining(validateState(old)).state
  state = advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state
  for (const item of (core ? ['bluegrass', 'boneflower', 'woodCore'] : ['bluegrass', 'boneflower']) as (keyof typeof earlySupplies)[])
    state = advanceEarlyTraining(state, { type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent }).state
  return state
}
describe('坊市交涉与黑铁片附物', () => {
  it('四段逐次推进，过期/越段/重复拒绝，只有末段取得黑铁片且不再次付账', () => {
    let state = marketState(true)
    const main = structuredClone(state)
    for (let step = 0; step < 4; step++) {
      expect(advanceEarlyTraining(state, { type: 'market', step: step + 1, expectedSpent: 110 }).ok).toBe(false)
      const result = advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 110 })
      expect(result.ok).toBe(true); state = result.state
      expect(state.earlyTraining.market.blackIron).toBe(step === 3 ? 1 : 0)
      expect(advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 110 }).state).toBe(state)
      expect(validateState(state)).toEqual(state)
    }
    main.earlyTraining.market = { stage: 4, blackIron: 1 }
    expect(state).toEqual(main)
    expect(advanceEarlyTraining(state, { type: 'market', step: 4, expectedSpent: 110 }).state).toBe(state)
  })
  it('先有草药才能进坊市，魔核未付款不能领取附物，付款后按当前账继续', () => {
    const fresh = initialState()
    expect(advanceEarlyTraining(fresh, { type: 'market', step: 0, expectedSpent: 0 }).ok).toBe(false)
    let state = marketState()
    for (let step = 0; step < 3; step++) state = advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 50 }).state
    expect(advanceEarlyTraining(state, { type: 'market', step: 3, expectedSpent: 50 }).ok).toBe(false)
    state = advanceEarlyTraining(state, { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 50 }).state
    expect(advanceEarlyTraining(state, { type: 'market', step: 3, expectedSpent: 50 }).ok).toBe(false)
    expect(advanceEarlyTraining(state, { type: 'market', step: 3, expectedSpent: 110 }).ok).toBe(true)
  })
  it('四段每次JSON/IndexedDB恢复后继续，并保持交易与主线', async () => {
    let state = marketState(true)
    for (let step = 0; step < 4; step++) {
      state = advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 110 }).state
      await saveSlot(2, state); expect(await loadSlot(2)).toEqual(state)
      state = parseSave(serializeSave(state))
      expect(state.earlyTraining.market.stage).toBe(step + 1)
    }
  })
  it('旧已付款档不自动获得附物，新版缺往事/非法阶段/物品与付账前置拒绝', () => {
    const old = JSON.parse(JSON.stringify(marketState(true))); old.contentVersion = '0.15.2'; delete old.earlyTraining.market
    const migrated = validateState(old)
    expect(migrated.earlyTraining.market).toEqual({ stage: 0, blackIron: 0 })
    expect(migrated.earlyTraining.purse.spent).toBe(110)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const market of [{ stage: -1, blackIron: 0 }, { stage: 3, blackIron: 1 }, { stage: 4, blackIron: 0 }, { stage: 5, blackIron: 1 }]) {
      const copy = structuredClone(migrated); copy.earlyTraining.market = market
      expect(() => validateState(copy)).toThrow('重修')
    }
    const unpaid = marketState(); unpaid.earlyTraining.market = { stage: 4, blackIron: 1 }
    expect(() => validateState(unpaid)).toThrow('重修')
  })
  it('动画范围隐藏坊市细节，恢复范围可重读，但不授予战斗技能', () => {
    let state = marketState(true)
    for (let step = 0; step < 4; step++) state = advanceEarlyTraining(state, { type: 'market', step, expectedSpent: 110 }).state
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).not.toContain('黑铁片已收好')
    expect(advanceEarlyTraining(state, { type: 'market', step: 4, expectedSpent: 110 }).state).toBe(state)
    state.settings.spoiler = 'novel'
    const html = renderToStaticMarkup(<EarlyTrainingPanel state={state} />)
    expect(html).toContain('黑铁片已收好')
    expect(html).toContain('尚未化为玩家的战斗技能')
    expect(state.earlyTraining.market.blackIron).toBe(1)
  })
})
