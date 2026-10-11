import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState } from '../src/core/model'
import { parseSave, serializeSave, validateState, saveSlot, listSlots } from '../src/core/save'
import { advanceEarlyQiExchange, submitEarlyQiExchange, type QiExchangeAction } from '../src/core/early-qi-exchange'
import { qiExchangeScenes } from '../src/content/early-qi-exchange'
import { advanceEarlyTraining } from '../src/core/early-training'
import { earlyQiPavilionExchangeSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyQiExchange from '../src/ui/EarlyQiExchange'
import { replayEarlyTraining } from './helpers/early-training-replay'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  const args: Parameters<typeof replayEarlyTraining> = [validateState(old)]; args[29] = true
  return replayEarlyTraining(...args)
}
function action(state: ReturnType<typeof eligible>): QiExchangeAction {
  const task = state.earlyTraining.qiPavilionExchange, scene = qiExchangeScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' }
}
describe('C1f-3a 同一卷拿看、支持卷展示、取回和婉拒独立记录', () => {
  it('八断点JSON/自动手动/备份往返，原6步结局与其他全state保持', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.qiPavilionExchange.stage < 8) {
      const previous = state, result = advanceEarlyQiExchange(state, action(state))
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.qiPavilionExchange = before.earlyTraining.qiPavilionExchange
      expect(comparison).toEqual(before)
      if (state.earlyTraining.qiPavilionExchange.stage === 3) expect(state.earlyTraining.qiPavilionExchange).toMatchObject({ familyOwner: 'xuner', support: 'hidden' })
      if (state.earlyTraining.qiPavilionExchange.stage === 4) expect(state.earlyTraining.qiPavilionExchange).toMatchObject({ familyOwner: 'xuner', support: 'shown', reply: 'none' })
      if (state.earlyTraining.qiPavilionExchange.stage === 5) expect(state.earlyTraining.qiPavilionExchange).toMatchObject({ familyOwner: 'xiaoyan', reply: 'none' })
    }
    expect(earlyQiPavilionExchangeSaveSummary(state, state.settings)).toContain('已归档')
  })
  it('错人/错序/重复快照与支持卷领取拒绝，0.36迁移不代签新过程', () => {
    let state = eligible()
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.36.0'; delete old.earlyTraining.qiPavilionExchange; delete old.earlyTraining.qiPavilionAid
    const migrated = validateState(old)
    expect(migrated.earlyTraining.qiPavilionExchange.stage).toBe(0)
    expect(migrated.earlyTraining.qiPavilionScroll).toEqual(state.earlyTraining.qiPavilionScroll)
    old.contentVersion = '0.37.0'; expect(() => validateState(old)).toThrow()
    while (state.earlyTraining.qiPavilionExchange.stage < 8) {
      const input = action(state)
      for (const operation of ['take-support', 'extra-family'] as const) expect(advanceEarlyQiExchange(state, { ...input, operation }).state).toBe(state)
      expect(advanceEarlyQiExchange(state, { ...input, actor: input.actor === 'xiaoyan' ? 'xuner' : 'xiaoyan' }).state).toBe(state)
      const result = advanceEarlyQiExchange(state, input); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyQiExchange(state, input).state).toBe(state)
      for (const key of ['familyOwner', 'support', 'reply'] as const) {
        const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.qiPavilionExchange[key] = 'invalid'
        expect(() => validateState(bad)).toThrow()
      }
    }
  })
  it('上限1/2拒核心和旧简略入口，store只改本记录且runtime不变', async () => {
    const state = eligible(), store = new GameStore({ load: async () => state, write: async () => {} })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyQiExchange(store, action(state))).toBe(true)
    expect(submitEarlyQiExchange(store, action(state))).toBe(false)
    await store.waitForAutosave(); expect(store.getSnapshot().runtime).toBe(runtime)
    for (const animeLimit of [1, 2]) {
      const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = animeLimit
      expect(renderToStaticMarkup(<EarlyQiExchange state={limited} onBack={() => {}} />)).toContain('超出当前剧透范围')
      expect(savePreviewSummary(limited, limited.settings)).not.toMatch(/双卷|风属性|支持卷/)
      expect(advanceEarlyQiExchange(limited, action(limited)).state).toBe(limited)
      expect(advanceEarlyTraining(limited, { type: 'qi-scroll', ...limited.earlyTraining.qiPavilionScroll, operation: 'archive', expectedSpent: 110 }).state).toBe(limited)
    }
  })
})
