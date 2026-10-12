import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, firstHallExitResponsePosition, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { firstHallExitResponseEligible, firstHallExitResponseInput, firstHallExitResponseStep } from './helpers/first-hall-exit-response-replay'
import { firstHallThreatInput } from './helpers/first-hall-threat-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3c2a 同卷堂内移步与来年回应', () => {
  let base: GameState
  beforeAll(() => { base = firstHallExitResponseEligible() })
  it('六断点保存四槽备份，实际位置和同卷一起移动；登记离堂及奖励保持', async () => {
    let state = structuredClone(base); await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 46) {
      const previous = state, action = firstHallExitResponseInput(state)
      state = firstHallExitResponseStep(state)
      const stage = state.earlyTraining.firstHallApproach.stage
      expect(state.earlyTraining.firstHallApproach.yan).toBe(stage >= 43 ? 'entrance' : 'aisle')
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach
      expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state, firstHallExitResponsePosition(state.earlyTraining.firstHallApproach), 'hall', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const html = renderToStaticMarkup(<FirstHallApproach exitResponse state={state} onBack={() => {}} />)
      const position = firstHallExitResponsePosition(state.earlyTraining.firstHallApproach)
      expect(html).toContain(`translate(${position.x} ${position.y})`)
      expect(html).toContain(`x="${position.x + 20}" y="${position.y - 5}"`)
      expect(html).toContain('本人另取的同一第二卷')
      expect(html).toContain('薰儿自己的临时卷已放下')
      expect(html).toContain('同一第一卷实际放回书架')
      expect(html).toContain('旧卷账 7/9')
    }
    expect(renderToStaticMarkup(<FirstHallApproach threat state={state} onBack={() => {}} />)).toContain('成人礼威胁 9/9')
    expect(advanceFirstHallApproach(state, { x: 400, y: 250 }, 'hall', firstHallThreatInput(state)).state).toBe(state)
  })
  it('旧40只补东架；旧41+、缺失/错误位置、提前借卷与离堂拒绝', () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: { firstHallApproach: Record<string, unknown> } }
    old.contentVersion = '0.72.1'; delete old.earlyTraining.firstHallApproach.yan
    expect(validateState(old)).toEqual(base)
    const forged = firstHallExitResponseStep(base); forged.contentVersion = '0.72.1'
    expect(() => validateState(forged)).toThrow('堂内移步')
    old.contentVersion = base.contentVersion; expect(() => validateState(old)).toThrow()
    for (const stage of [40, 41, 42, 43, 44, 45, 46]) {
      const state = structuredClone(base); state.earlyTraining.firstHallApproach = firstHallApproachAt(stage, 'current', 'current')
      for (const yan of ['east', 'aisle', 'entrance'] as const) {
        if (yan === state.earlyTraining.firstHallApproach.yan) continue
        const bad = structuredClone(state); bad.earlyTraining.firstHallApproach.yan = yan
        expect(() => validateState(bad)).toThrow()
      }
      for (const hall of [8, 9]) {
        const bad = structuredClone(state); bad.earlyTraining.hall = { stage: hall, scroll: 'borrowed-second' }
        expect(() => validateState(bad)).toThrow()
      }
    }
  })
  it('前置、十三完整快照、坐标空间人物、分支混用和额外结算拒绝', () => {
    const incomplete = structuredClone(base); incomplete.earlyTraining.firstHallApproach = firstHallApproachAt(39, 'current', 'current')
    expect(advanceFirstHallApproach(incomplete, { x: 400, y: 250 }, 'hall', firstHallExitResponseInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续堂内移步与来年回应')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage < 46) {
      const action = firstHallExitResponseInput(state), position = firstHallExitResponsePosition(state.earlyTraining.firstHallApproach)
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, position, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallApproach(state, position, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['win', 'register', 'leave', 'repay', 'return', 'second', 'learn']) expect(advanceFirstHallApproach(state, position, 'hall', { ...action, operation }).state).toBe(state)
      for (const flag of ['continuation', 'conflict', 'threat'] as const) expect(advanceFirstHallApproach(state, position, 'hall', { ...action, [flag]: true }).state).toBe(state)
      expect(advanceFirstHallApproach(state, { ...position, x: position.x + 1 }, 'hall', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, position, 'outside', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, position, 'hall', { ...action, actor: action.actor === 'yan' ? 'ning' : 'yan' }).state).toBe(state)
      state = firstHallExitResponseStep(state)
    }
  })
  it('旧高保管/spent五段与结算保持；位置和历史一次写入，重复、防剧透拒绝', async () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let higher = firstHallExitResponseEligible(old), before = structuredClone(higher)
    while (higher.earlyTraining.firstHallApproach.stage < 46) higher = firstHallExitResponseStep(higher)
    higher.earlyTraining.firstHallApproach = before.earlyTraining.firstHallApproach; expect(higher).toEqual(before)
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach.yan).toBe('aisle')
      expect(saved.earlyTraining.hall).toEqual(base.earlyTraining.hall); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const action = firstHallExitResponseInput(base), runtime = store.getSnapshot().runtime
    expect(submitFirstHallApproach(store, { x: 400, y: 250 }, 'hall', action)).toBe(true)
    expect(submitFirstHallApproach(store, { x: 400, y: 250 }, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallApproach(sealed, { x: 400, y: 250 }, 'hall', action).state).toBe(sealed)
    expect(savePreviewSummary(firstHallExitResponseStep(base), hidden)).not.toContain('堂内移步')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续堂内移步与来年回应')
  })
})
