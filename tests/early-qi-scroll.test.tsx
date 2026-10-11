import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { blankProgress, initialState } from '../src/core/model'
import { parseSave, serializeSave, validateState } from '../src/core/save'
import { advanceEarlyQiScroll } from '../src/core/early-qi-scroll'
import { qiScrollScenes } from '../src/content/early-qi-scroll'
import { earlyQiPavilionScrollSaveSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  const args: Parameters<typeof replayEarlyTraining> = [validateState(old)]
  args[27] = true; args[28] = true
  return replayEarlyTraining(...args)
}

describe('C1f-3 四十三号房卷轴保管与薰儿提议', () => {
  it('六步保存/往返，唯一家族卷由萧炎保管且额外提议独立婉拒', () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of qiScrollScenes) {
      const task = state.earlyTraining.qiPavilionScroll
      const result = advanceEarlyQiScroll(state, { ...task, operation: scene.operation })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
    }
    expect(state.earlyTraining.qiPavilionScroll).toEqual({ stage: 6, family: 'held', offer: 'declined', owner: 'xiaoyan' })
    const comparison = structuredClone(state)
    comparison.earlyTraining.qiPavilionScroll = before.earlyTraining.qiPavilionScroll
    expect(comparison).toEqual(before)
    expect(earlyQiPavilionScrollSaveSummary(state, state.settings)).toContain('婉拒')
    expect(advanceEarlyQiScroll(state, { ...state.earlyTraining.qiPavilionScroll, operation: 'archive' }).state).toBe(state)
  })

  it('不允许提前取卷、错序、旧快照；0.35旧档只补空记录', () => {
    let state = eligible()
    const wrong = advanceEarlyQiScroll(state, { ...state.earlyTraining.qiPavilionScroll, operation: 'archive' })
    expect(wrong.ok).toBe(false)
    const stale = structuredClone(state); stale.earlyTraining.qiPavilionBarrier.stage = 9
    expect(advanceEarlyQiScroll(stale, { ...stale.earlyTraining.qiPavilionScroll, operation: 'inspect' }).ok).toBe(false)
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.35.0'; delete old.earlyTraining.qiPavilionScroll
    expect(validateState(old).earlyTraining.qiPavilionScroll.stage).toBe(0)
    old.contentVersion = '0.36.0'
    expect(() => validateState(old)).toThrow()
  })
})
