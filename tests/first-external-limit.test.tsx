import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState, parseSave, saveSlot, listSlots } from '../src/core/save'
import { advanceFirstExternalLimit, submitFirstExternalLimit } from '../src/core/first-external-limit'
import { firstExternalLimitAt } from '../src/core/first-external-limit-state'
import { externalLimitSnapshotKeys } from '../src/core/early-snapshots'
import { firstExternalLimitEligible, firstExternalLimitInput, firstExternalLimitStep } from './helpers/first-external-limit-replay'
import { firstExternalTrainingEligible } from './helpers/first-external-training-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstExternalLimit from '../src/ui/FirstExternalLimit'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('限度说明与离林', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstExternalLimitEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstExternalLimit.stage < 8)
      states.push(firstExternalLimitStep(states.at(-1)!))
  })
  it('八个动作逐步保存，最后一次原子桥接旧督练完成且不消耗药液', async () => {
    expect(states.map(s => s.earlyTraining.firstExternalLimit.stage)).toEqual([0,1,2,3,4,5,6,7,8])
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], normalized = structuredClone(state)
      expect(state.earlyTraining.firstExternalLimit).toEqual(firstExternalLimitAt(i))
      expect(state.earlyTraining.supervision.stage).toBe(i === 8 ? 2 : 0)
      normalized.earlyTraining.firstExternalLimit = base.earlyTraining.firstExternalLimit
      if (i === 8) normalized.earlyTraining.supervision = base.earlyTraining.supervision
      expect(normalized).toEqual(base)
      for (const slot of [0,1,2,3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstExternalLimit state={state} onBack={() => {}} />)
      expect(html).toContain('translate(300 270)')
      expect(html).toContain('山后老师独立位置')
      expect(html).not.toContain('回房同液恢复已完成')
    }
    expect(states[8].earlyTraining.firstExternalLimit.left).toBe(true)
    expect(states[8].earlyTraining.recovery.stage).toBe(0)
  })
  it('24快照字段、演员/空间/顺序/旧flags/并发与当前缺项拒绝', () => {
    expect(externalLimitSnapshotKeys).toHaveLength(25)
    for (const state of states) {
      const t = state.earlyTraining.firstExternalLimit, action = firstExternalLimitInput(state)
      const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      const reject = (input: typeof action, position = p, space = t.location as string) =>
        expect(advanceFirstExternalLimit(state, position, space, input).state).toBe(state)
      for (const label of externalLimitSnapshotKeys) {
        const key = `expected${label}` as keyof typeof action, snapshot = action[key] as Record<string, unknown>
        reject({ ...action, [key]: undefined })
        for (const field of Object.keys(snapshot)) reject({ ...action, [key]: { ...snapshot, [field]: 'stale' } })
      }
      for (const field of Object.keys(t)) reject({ ...action, [field]: 'wrong' })
      for (const operation of ['fall','ask-result','explain-counts','regain','take-clothes','dress','return-ring','leave-grove','recover','train'])
        if (operation !== action.operation) reject({ ...action, operation })
      reject({ ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action, { x: p.x + 1, y: p.y }); reject(action, p, 'room')
    }
  })
  it('旧版本只补空，高督练回顾不降级，回房恢复/五段/奖励保持，单次原子提交', async () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
    old.contentVersion = '0.84.0'; delete old.earlyTraining.firstExternalLimit
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({ ...old, contentVersion: '0.85.0' })).toThrow()
    const higher = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let recalled = firstExternalLimitEligible(higher)
    while (recalled.earlyTraining.firstExternalLimit.stage < 8) {
      recalled = firstExternalLimitStep(recalled)
      expect(recalled.earlyTraining.firstExternalLimit.record).toBe('recalled')
    }
    expect(recalled.earlyTraining.supervision.stage).toBe(2)
    expect(recalled.earlyTraining.recovery.stage).toBe(higher.earlyTraining.recovery.stage)
    const state = states[2], action = firstExternalLimitInput(state), t = state.earlyTraining.firstExternalLimit
    const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y }
    let writes = 0; const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); expect(submitFirstExternalLimit(store, p, 'grove', action)).toBe(true)
    expect(submitFirstExternalLimit(store, p, 'grove', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
  })
  it('防剧透和未完成前置不泄漏限度入口', () => {
    const unfinished = structuredClone(firstExternalTrainingEligible()); unfinished.earlyTraining.firstExternalTraining.stage = 9
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={unfinished} />)).not.toContain('接续限度说明与离林')
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续限度说明与离林')
    expect(savePreviewSummary(states[8], hidden)).not.toContain('限度说明')
  })
})
