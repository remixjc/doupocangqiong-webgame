import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress, type GameState } from '../src/core/model'
import { advanceEarlyBracelet, submitEarlyBracelet } from '../src/core/early-bracelet'
import { earlyBraceletScenes } from '../src/content/early-bracelet'
import { earlyWalkPlaces, earlyWalkStart } from '../src/core/early-walk'
import { validateState, serializeSave, parseSave, saveSlot, loadSlot } from '../src/core/save'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import EarlyBracelet from '../src/ui/EarlyBracelet'

function prepared(completed = false) {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let bought: GameState | undefined
  const done = replayEarlyTraining(validateState(old), false, state => {
    if (!bought && state.earlyTraining.receipts.boneflower && state.earlyTraining.receipts.bluegrass) bought = state
  })
  return completed ? done : bought!
}
const market = earlyWalkPlaces.find(place => place.id === 'market')!
describe('坊市手链独立事件', () => {
  it.each([false, true])('采购进行中/既有重修归档(%s)可逐步保存，不获得赠核或额外奖励', async completed => {
    let state = prepared(completed)
    const before = structuredClone(state)
    for (let stage = 0; stage < earlyBraceletScenes.length; stage++) {
      const action = { stage, operation: earlyBraceletScenes[stage].operation }
      const result = advanceEarlyBracelet(state, market, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.bracelet.gift).toBe(stage >= 4 ? 'xuner' : 'none')
      await saveSlot(2, state); expect(await loadSlot(2)).toEqual(state)
      expect(advanceEarlyBracelet(state, market, action).state).toBe(state)
    }
    expect(state.earlyTraining.bracelet).toEqual({ stage: 6, gift: 'xuner' })
    const expected = structuredClone(before); expected.earlyTraining.bracelet = { stage: 6, gift: 'xuner' }
    expect(state).toEqual(expected)
  })
  it('错误地点/缺草/阶段过期/错误操作/动画范围拒绝且没有接取加列奥魔核', () => {
    const state = prepared(), action = { stage: 0, operation: 'begin' as const }
    expect(advanceEarlyBracelet(state, earlyWalkStart, action).state).toBe(state)
    expect(advanceEarlyBracelet(initialState(), market, action).ok).toBe(false)
    expect(advanceEarlyBracelet(state, market, { stage: 1, operation: 'consider' }).state).toBe(state)
    expect(advanceEarlyBracelet(state, market, { stage: 0, operation: 'accept' }).state).toBe(state)
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(advanceEarlyBracelet(state, market, action).state).toBe(state)
    expect(renderToStaticMarkup(<EarlyBracelet state={state} position={market} />)).toBe('')
  })
  it('旧0.16.2归档只补未参与，新版缺字段/错归属/越阶段拒绝', () => {
    const old = JSON.parse(JSON.stringify(prepared(true))); old.contentVersion = '0.16.2'
    delete old.earlyTraining.bracelet
    expect(validateState(old).earlyTraining.bracelet).toEqual({ stage: 0, gift: 'none' })
    expect(validateState(old).earlyTraining.practice.phase).toBe(4)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const bracelet of [{ stage: 3, gift: 'xuner' }, { stage: 5, gift: 'none' }, { stage: 7, gift: 'xuner' }, { stage: 1.5, gift: 'none' }]) {
      const copy = prepared(); copy.earlyTraining.bracelet = bracelet as GameState['earlyTraining']['bracelet']
      expect(() => validateState(copy)).toThrow('重修')
    }
  })
  it('store只保存成功的一次/保持runtime，尚未赠予不提前显示已收下', () => {
    const store = new GameStore(), changes: unknown[] = []
    store.replace(prepared(true)); store.onChange = state => changes.push(state)
    const runtime = store.getSnapshot().runtime
    expect(submitEarlyBracelet(store, market, { stage: 0, operation: 'begin' })).toBe(true)
    expect(submitEarlyBracelet(store, market, { stage: 0, operation: 'begin' })).toBe(false)
    expect(changes).toHaveLength(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const html = renderToStaticMarkup(<EarlyBracelet state={store.getSnapshot().state} position={market} />)
    expect(html).toContain('尚未交付'); expect(html).not.toContain('薰儿已收下')
    expect(html).toContain('没有进入萧炎的任务袋')
  })
})
