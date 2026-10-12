import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, firstHallExitResponsePosition, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallLeavingEligible, firstHallLeavingInput, firstHallLeavingStep } from './helpers/first-hall-leaving-replay'
import { firstHallCheckoutInput } from './helpers/first-hall-checkout-replay'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3c2c 同行与实际跨门，不代签午后或回房', () => {
  let base: GameState
  beforeAll(() => { base = firstHallLeavingEligible() })
  it('四步四槽与上一自动档；仅52同事务hall9与两人堂外、同一借卷随本人', async () => {
    let state = structuredClone(base); await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 53) {
      const previous = state, action = firstHallLeavingInput(state), p = firstHallExitResponsePosition(state.earlyTraining.firstHallApproach)
      const space = state.earlyTraining.firstHallApproach.yan === 'outside' ? 'outside' : 'hall'
      state = firstHallLeavingStep(state)
      const crossed = state.earlyTraining.firstHallApproach.stage >= 52
      expect(state.earlyTraining.firstHallApproach.exitRecord).toBe(crossed ? 'current' : 'none')
      expect(state.earlyTraining.firstHallApproach.xunerPos).toBe(crossed ? 'outside' : 'entrance')
      expect(state.earlyTraining.firstHallApproach.yan).toBe(crossed ? 'outside' : 'entrance')
      expect(state.earlyTraining.hall).toEqual({ stage: crossed ? 9 : 8, scroll: 'borrowed-second' })
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach; same.earlyTraining.hall = base.earlyTraining.hall
      expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state, p, space, action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const html = renderToStaticMarkup(<FirstHallApproach leaving state={state} onBack={() => {}} />)
      expect(html).toContain(crossed ? 'translate(60 310)' : 'translate(140 310)')
      expect(html).toContain(crossed ? 'translate(85 280)' : 'translate(175 280)')
      expect(html).toContain(`x="${crossed ? 80 : 160}" y="305"`)
      expect(html).toContain('薰儿自己的临时卷已放下'); expect(html).toContain('同一第一卷实际放回书架')
      expect(html).toContain('translate(450 280)'); expect(state.earlyTraining.firstHallTalk.ownScroll).toBe('xuner')
    }
    for (const [props, bounded] of [[{ checkout: true }, '同卷管理者登记 3/3'], [{ exitResponse: true }, '堂内移步与来年回应 6/6'], [{ threat: true }, '成人礼威胁 9/9']] as const) {
      const html = renderToStaticMarkup(<FirstHallApproach {...props} state={state} onBack={() => {}} />)
      expect(html).toContain(bounded); expect(html).toContain('明确回顾同行跨门前的位置')
      expect(html).toContain('薰儿仍坐东架'); expect(html).not.toContain('translate(60 310)')
    }
    expect(advanceFirstHallApproach(state, { x: 140, y: 310 }, 'hall', firstHallCheckoutInput(state)).state).toBe(state)
  })
  it('旧0.74/0.74.1 stage49只补空；旧50+、当前缺字段/错误派生、提前hall9拒绝', () => {
    for (const version of ['0.74.0', '0.74.1']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: { firstHallApproach: Record<string, unknown> } }
      old.contentVersion = version; delete old.earlyTraining.firstHallApproach.xunerPos; delete old.earlyTraining.firstHallApproach.exitRecord
      expect(validateState(old)).toEqual(base)
      for (let state = firstHallLeavingStep(base); state.earlyTraining.firstHallApproach.stage <= 53; state = firstHallLeavingStep(state)) {
        const forged = structuredClone(state); forged.contentVersion = version
        expect(() => validateState(forged)).toThrow('同行跨门')
        if (state.earlyTraining.firstHallApproach.stage === 53) break
      }
    }
    for (let state = base; ; state = firstHallLeavingStep(state)) {
      expect(validateState(state)).toEqual(state)
      for (const key of ['xunerPos', 'exitRecord', 'yan'] as const) {
        const missing = structuredClone(state) as unknown as { earlyTraining: { firstHallApproach: Record<string, unknown> } }
        delete missing.earlyTraining.firstHallApproach[key]; expect(() => validateState(missing)).toThrow()
        const bad = structuredClone(state)
        Object.assign(bad.earlyTraining.firstHallApproach, { [key]: key === 'exitRecord' ? state.earlyTraining.firstHallApproach.stage >= 52 ? 'none' : 'current' : 'wrong' })
        expect(() => validateState(bad)).toThrow()
      }
      const mismatch = structuredClone(state); mismatch.earlyTraining.hall.stage = state.earlyTraining.firstHallApproach.stage >= 52 ? 8 : 9
      expect(() => validateState(mismatch)).toThrow()
      if (state.earlyTraining.firstHallApproach.stage === 53) break
    }
  })
  it('前置/十三快照/人物/坐标空间严格；并用旧flags或冒签下午回房传技拒绝', () => {
    const incomplete = structuredClone(base); incomplete.earlyTraining.firstHallApproach = firstHallApproachAt(48, 'current', 'current', 'current')
    expect(advanceFirstHallApproach(incomplete, { x: 140, y: 310 }, 'hall', firstHallLeavingInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续同行与实际离堂')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage < 53) {
      const action = firstHallLeavingInput(state), p = firstHallExitResponsePosition(state.earlyTraining.firstHallApproach)
      const space = state.earlyTraining.firstHallApproach.yan === 'outside' ? 'outside' : 'hall'
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, p, space, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallApproach(state, p, space, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['afternoon', 'room', 'win', 'repay', 'return', 'second', 'learn']) expect(advanceFirstHallApproach(state, p, space, { ...action, operation }).state).toBe(state)
      for (const flag of ['checkout', 'exitResponse', 'threat', 'conflict', 'continuation'] as const) expect(advanceFirstHallApproach(state, p, space, { ...action, [flag]: true }).state).toBe(state)
      for (const actor of ['yan', 'xuner', 'ning', 'bystander'] as const) if (actor !== action.actor) expect(advanceFirstHallApproach(state, p, space, { ...action, actor }).state).toBe(state)
      expect(advanceFirstHallApproach(state, { x: p.x + 1, y: p.y }, space, action).state).toBe(state)
      expect(advanceFirstHallApproach(state, p, space === 'hall' ? 'outside' : 'hall', action).state).toBe(state)
      state = firstHallLeavingStep(state)
    }
  })
  it('旧更高保管显式recalled不退；只写一次跨门事务，重复拒绝、防剧透', async () => {
    const legacy = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let higher = firstHallLeavingEligible(legacy), before = structuredClone(higher)
    while (higher.earlyTraining.firstHallApproach.stage < 53) higher = firstHallLeavingStep(higher)
    expect(higher.earlyTraining.firstHallApproach.exitRecord).toBe('recalled')
    higher.earlyTraining.firstHallApproach = before.earlyTraining.firstHallApproach; expect(higher).toEqual(before)
    const state = firstHallLeavingStep(firstHallLeavingStep(base)); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach.exitRecord).toBe('current')
      expect(saved.earlyTraining.firstHallApproach.yan).toBe('outside'); expect(saved.earlyTraining.firstHallApproach.xunerPos).toBe('outside')
      expect(saved.earlyTraining.hall).toEqual({ stage: 9, scroll: 'borrowed-second' }); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const action = firstHallLeavingInput(state), runtime = store.getSnapshot().runtime
    expect(submitFirstHallApproach(store, { x: 140, y: 310 }, 'hall', action)).toBe(true)
    expect(submitFirstHallApproach(store, { x: 140, y: 310 }, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallApproach(sealed, { x: 140, y: 310 }, 'hall', firstHallLeavingInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(store.getSnapshot().state, hidden)).not.toContain('实际跨门')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续同行与实际离堂')
  })
})
