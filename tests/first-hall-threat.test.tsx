import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallConflictInput } from './helpers/first-hall-conflict-replay'
import { firstHallThreatEligible, firstHallThreatInput, firstHallThreatStep } from './helpers/first-hall-threat-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3c1 来年成人礼威胁与本人观察', () => {
  let base: GameState
  beforeAll(() => { base = firstHallThreatEligible() })
  it('九断点四槽备份；37才未来威胁，全部其他state与同一第二卷保持', async () => {
    let state = structuredClone(base); await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 40) {
      const previous = state, action = firstHallThreatInput(state); state = firstHallThreatStep(state)
      expect(state.earlyTraining.firstHallApproach.threatHeard).toBe(state.earlyTraining.firstHallApproach.stage >= 37)
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach; expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const html = renderToStaticMarkup(<FirstHallApproach threat state={state} onBack={() => {}} />)
      expect(html).toContain('本人另取的同一第二卷'); expect(html).toContain('薰儿自己的临时卷已放下')
      expect(html).toContain('同一第一卷实际放回书架'); expect(html).toContain('旧卷账 7/9')
    }
    expect(renderToStaticMarkup(<FirstHallApproach conflict state={state} onBack={() => {}} />)).toContain('交锋与第二卷 12/12')
    expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', firstHallConflictInput(state)).state).toBe(state)
  })
  it('旧31只补false不补威胁；旧32+、当前缺字段、派生错与hall8/9冒签拒绝', () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: { firstHallApproach: Record<string, unknown> } }
    old.contentVersion = '0.71.0'; delete old.earlyTraining.firstHallApproach.threatHeard; expect(validateState(old)).toEqual(base)
    const forged = firstHallThreatStep(base); forged.contentVersion = '0.71.0'; expect(() => validateState(forged)).toThrow('成人礼威胁')
    const missing = structuredClone(old); missing.contentVersion = base.contentVersion; expect(() => validateState(missing)).toThrow()
    for (const stage of [31, 32, 36, 37, 40]) {
      const bad = structuredClone(base); bad.earlyTraining.firstHallApproach = firstHallApproachAt(stage, 'current', 'current')
      bad.earlyTraining.firstHallApproach.threatHeard = stage < 37; expect(() => validateState(bad)).toThrow()
      for (const hallStage of [8, 9]) {
        const custody = structuredClone(base); custody.earlyTraining.firstHallApproach = firstHallApproachAt(stage, 'current', 'current')
        custody.earlyTraining.hall = { stage: hallStage, scroll: 'borrowed-second' }; expect(() => validateState(custody)).toThrow()
      }
    }
  })
  it('前置、13快照、人物/位置/旧入口并发与战斗登记还款冒签拒绝', () => {
    const incomplete = structuredClone(base); incomplete.earlyTraining.firstHallApproach = firstHallApproachAt(30, 'current', 'current')
    expect(advanceFirstHallApproach(incomplete, hallReadingPlaces.shelf, 'hall', firstHallThreatInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续成人礼威胁与本人观察')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage < 40) {
      const action = firstHallThreatInput(state)
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['win', 'learn', 'register', 'leave', 'repay', 'return', 'second']) expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, threat: false, conflict: true }).state).toBe(state)
      expect(advanceFirstHallApproach(state, { x: 235, y: 244 }, 'hall', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, actor: action.actor === 'yan' ? 'ning' : 'yan' }).state).toBe(state)
      state = firstHallThreatStep(state)
    }
  })
  it('旧高保管/spent五段和成人礼结算保持；单事务、重复与防剧透核验', async () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let higher = firstHallThreatEligible(old), before = structuredClone(higher)
    while (higher.earlyTraining.firstHallApproach.stage < 40) higher = firstHallThreatStep(higher)
    higher.earlyTraining.firstHallApproach = before.earlyTraining.firstHallApproach; expect(higher).toEqual(before)
    let state = structuredClone(base); while (state.earlyTraining.firstHallApproach.stage < 36) state = firstHallThreatStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach.threatHeard).toBe(true)
      expect(saved.earlyTraining.hall).toEqual(state.earlyTraining.hall); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const action = firstHallThreatInput(state), runtime = store.getSnapshot().runtime
    expect(submitFirstHallApproach(store, hallReadingPlaces.shelf, 'hall', action)).toBe(true)
    expect(submitFirstHallApproach(store, hallReadingPlaces.shelf, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallApproach(sealed, hallReadingPlaces.shelf, 'hall', action).state).toBe(sealed)
    expect(savePreviewSummary(state, hidden)).not.toContain('威胁')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续成人礼威胁与本人观察')
  })
})
