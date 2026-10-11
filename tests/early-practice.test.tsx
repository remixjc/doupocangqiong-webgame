import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, loadSlot } from '../src/core/save'
import { advanceEarlyTraining } from '../src/core/early-training'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyPractice from '../src/ui/EarlyPractice'

function completedTask() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), true)
}
function practiceFixture() {
  const state = completedTask()
  // An explicit rule-test fixture at the just-prepared checkpoint; never a user save.
  state.earlyTraining.practice = { phase: 0, pulse: 0, score: 0, attempts: 0 }
  return validateState(state)
}
describe('初期重修与斗技尝试', () => {
  it('正常输入全链含一次失败重试完成，主线/技能/药液不改，报告不重复', () => {
    const state = completedTask()
    expect(state.earlyTraining.practice).toEqual({ phase: 4, pulse: 3, score: 300, attempts: 1 })
    expect(state.earlyTraining.liquid.ready).toBe(true)
    expect(state.earlyTraining.market.blackIron).toBe(1)
    expect(state.gold).toBe(80); expect(state.xp).toBe(0)
    expect(state.flame).toBe('ember')
    expect(advanceEarlyTraining(state, { type: 'practice', operation: 'finish', phase: 4, pulse: 3, expectedSpent: 110 }).state).toBe(state)
  })
  it('三次0分免费重置，每步及失败结果可存档，旧输入拒绝且材料不复生', async () => {
    let state = practiceFixture()
    state = advanceEarlyTraining(state, { type: 'practice', operation: 'begin', phase: 0, pulse: 0, expectedSpent: 110 }).state
    for (let pulse = 0; pulse < 3; pulse++) {
      const action = { type: 'practice' as const, operation: 'pulse' as const, phase: 1, pulse, marker: 0, expectedSpent: 110 }
      state = advanceEarlyTraining(state, action).state
      expect(advanceEarlyTraining(state, action).state).toBe(state)
      await saveSlot(3, state); expect(await loadSlot(3)).toEqual(state)
      state = parseSave(serializeSave(state))
    }
    expect(state.earlyTraining.practice).toEqual({ phase: 1, pulse: 0, score: 0, attempts: 1 })
    expect(advanceEarlyTraining(state, { type: 'practice', operation: 'pulse', phase: 1, pulse: 0, marker: .5, attempts: 0, expectedSpent: 110 }).state).toBe(state)
    expect(advanceEarlyTraining(state, { type: 'practice', operation: 'pulse', phase: 1, pulse: 0, marker: .5, attempts: 1, expectedSpent: 110 }).ok).toBe(true)
    expect(state.earlyTraining.supplies).toEqual({ bluegrass: 0, boneflower: 0, woodCore: 0 })
  })
  it('未准备/非法位置/过期锁定/跳结果均拒绝', () => {
    const fresh = initialState()
    expect(advanceEarlyTraining(fresh, { type: 'practice', operation: 'begin', phase: 0, pulse: 0, expectedSpent: 0 }).ok).toBe(false)
    let state = practiceFixture()
    state = advanceEarlyTraining(state, { type: 'practice', operation: 'begin', phase: 0, pulse: 0, expectedSpent: 110 }).state
    for (const marker of [-1, 2, NaN, Infinity]) expect(advanceEarlyTraining(state, { type: 'practice', operation: 'pulse', phase: 1, pulse: 0, marker, expectedSpent: 110 }).state).toBe(state)
    expect(advanceEarlyTraining(state, { type: 'practice', operation: 'finish', phase: 1, pulse: 0, expectedSpent: 110 }).state).toBe(state)
  })
  it('0.15.4只补未开始，新版缺字段/分数及阶段前置伪造拒绝', () => {
    const old = JSON.parse(JSON.stringify(practiceFixture())); old.contentVersion = '0.15.4'; delete old.earlyTraining.practice
    expect(validateState(old).earlyTraining.practice).toEqual({ phase: 0, pulse: 0, score: 0, attempts: 0 })
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const practice of [
      { phase: 0, pulse: 0, score: 0, attempts: 1 },
      { phase: 1, pulse: 1, score: 101, attempts: 0 },
      { phase: 2, pulse: 3, score: 179, attempts: 0 },
      { phase: 4, pulse: 2, score: 200, attempts: 0 },
      { phase: 5, pulse: 3, score: 300, attempts: 0 },
    ]) {
      const copy = practiceFixture(); copy.earlyTraining.practice = practice
      expect(() => validateState(copy)).toThrow('重修')
    }
  })
  it('减弱动态提供可键盘调位置的静态操作，动画范围不泄露完成结果', () => {
    const state = practiceFixture()
    state.earlyTraining.practice.phase = 1; state.settings.reducedMotion = true
    const html = renderToStaticMarkup(<EarlyPractice state={state} />)
    expect(html).toContain('aria-label=\"调息位置\"')
    expect(html).not.toContain('aria-label=\"调息指针\"')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyPractice state={state} />)).toBe('')
  })
})
