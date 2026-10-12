import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallFirstReturnInput } from './helpers/first-hall-first-return-replay'
import { firstHallConflictEligible, firstHallConflictInput, firstHallConflictStep } from './helpers/first-hall-conflict-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3b3 东架交锋与独立第二卷', () => {
  let base: GameState
  beforeAll(() => { base = firstHallConflictEligible() })
  it('十二断点四槽与备份；25才她放卷，28才本人取第二卷；整state其他字段保持', async () => {
    let state = structuredClone(base); await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 31) {
      const previous = state, action = firstHallConflictInput(state); state = firstHallConflictStep(state)
      const stage = state.earlyTraining.firstHallApproach.stage, task = state.earlyTraining.firstHallApproach
      expect(task.ownPlaced).toBe(stage >= 25); expect(task.secondRecord).toBe(stage >= 28 ? 'current' : 'none')
      expect(state.earlyTraining.hall).toEqual(stage >= 28 ? { stage: 7, scroll: 'selected-second' } : base.earlyTraining.hall)
      expect(state.earlyTraining.firstHallTalk.ownScroll).toBe('xuner')
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach; same.earlyTraining.hall = base.earlyTraining.hall
      expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const html = renderToStaticMarkup(<FirstHallApproach conflict state={state} onBack={() => {}} />)
      expect(html.includes('薰儿自己的临时卷已放下')).toBe(stage >= 25)
      expect(html.includes('本人另取的同一第二卷')).toBe(stage >= 28)
      expect(html).toContain('同一第一卷实际放回书架')
    }
    const old = renderToStaticMarkup(<FirstHallApproach continuation state={state} onBack={() => {}} />)
    expect(old).toContain('同卷归架 5/5'); expect(old).toContain('明确回顾当时第一卷')
    expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', firstHallFirstReturnInput(state)).state).toBe(state)
  })
  it('旧19仅补未参与字段，伪造旧20+、当前缺字段或派生/保管错误拒绝', () => {
    for (const version of ['0.70.0', '0.70.1']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: { firstHallApproach: Record<string, unknown> } }
      old.contentVersion = version; delete old.earlyTraining.firstHallApproach.ownPlaced; delete old.earlyTraining.firstHallApproach.secondRecord
      expect(validateState(old)).toEqual(base)
      const forged = firstHallConflictStep(base); forged.contentVersion = version
      expect(() => validateState(forged)).toThrow('东架交锋与第二卷')
    }
    for (const key of ['ownPlaced', 'secondRecord']) {
      const missing = structuredClone(base) as unknown as { earlyTraining: { firstHallApproach: Record<string, unknown> } }
      delete missing.earlyTraining.firstHallApproach[key]; expect(() => validateState(missing)).toThrow()
    }
    for (const stage of [19, 24, 25, 27, 28, 31]) {
      const bad = structuredClone(base); bad.earlyTraining.firstHallApproach = firstHallApproachAt(stage, 'current', stage >= 28 ? 'current' : 'none')
      bad.earlyTraining.hall = { stage: stage >= 28 ? 6 : 7, scroll: stage >= 28 ? 'none' : 'selected-second' }
      expect(() => validateState(bad)).toThrow()
      const derived = structuredClone(base); derived.earlyTraining.firstHallApproach.ownPlaced = true; expect(() => validateState(derived)).toThrow()
    }
  })
  it('前置、人物、顺序、空间、13完整快照、旧入口及冒开战/卷转交/登记拒绝', () => {
    const blocked = structuredClone(base); blocked.earlyTraining.firstHallApproach = firstHallApproachAt(18, 'current')
    expect(advanceFirstHallApproach(blocked, hallReadingPlaces.shelf, 'hall', firstHallConflictInput(blocked)).state).toBe(blocked)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={blocked} />)).not.toContain('接续东架交锋与本人第二卷')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage < 31) {
      const action = firstHallConflictInput(state)
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['second', 'return', 'win', 'learn', 'register', 'leave', 'repay']) expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, conflict: false, continuation: true }).state).toBe(state)
      expect(advanceFirstHallApproach(state, { x: 235, y: 244 }, 'hall', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, actor: action.actor === 'yan' ? 'xuner' : 'yan' }).state).toBe(state)
      state = firstHallConflictStep(state)
    }
  })
  it('旧hall7/8/9、spent五段显式回顾，保留所有更高卷账', () => {
    const branches = new Map<number, GameState>(), old = replayEarlyTraining(morningEligible(), false, s => {
      if (s.earlyTraining.hall.stage >= 7) branches.set(s.earlyTraining.hall.stage, structuredClone(s))
    }, true, true, true, true, true, true, true)
    for (const input of [...[7, 8, 9].map(n => firstHallConflictEligible(branches.get(n)!)), firstHallConflictEligible(old)]) {
      let state = structuredClone(input); while (state.earlyTraining.firstHallApproach.stage < 31) state = firstHallConflictStep(state)
      expect(state.earlyTraining.firstHallApproach.secondRecord).toBe('recalled')
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = input.earlyTraining.firstHallApproach; expect(same).toEqual(input)
      expect(renderToStaticMarkup(<FirstHallApproach conflict state={state} onBack={() => {}} />)).toContain('明确回顾当时另取第二卷')
    }
  })
  it('28第二卷单事务保存，重复拒绝，防剧透保持', async () => {
    let state = structuredClone(base); while (state.earlyTraining.firstHallApproach.stage < 27) state = firstHallConflictStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach).toEqual(firstHallApproachAt(28, 'current', 'current'))
      expect(saved.earlyTraining.hall).toEqual({ stage: 7, scroll: 'selected-second' }); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const action = firstHallConflictInput(state), runtime = store.getSnapshot().runtime
    expect(submitFirstHallApproach(store, hallReadingPlaces.shelf, 'hall', action)).toBe(true)
    expect(submitFirstHallApproach(store, hallReadingPlaces.shelf, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallApproach(sealed, hallReadingPlaces.shelf, 'hall', action).state).toBe(sealed)
    expect(savePreviewSummary(state, hidden)).not.toContain('交锋')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续东架交锋与本人第二卷')
  })
})
