import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallAftermathEligible, firstHallAftermathInput, firstHallAftermathStep } from './helpers/first-hall-aftermath-replay'
import { firstHallLeavingEligible, firstHallLeavingInput } from './helpers/first-hall-leaving-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3c3 萧宁独立反应，堂外本人不攻击或传送', () => {
  let base: GameState
  const outside = { x: 60, y: 310 }
  beforeAll(() => { base = firstHallAftermathEligible() })
  it('四个独立断点四槽与上一自动档，只有56留掌印；全部其他状态相等', async () => {
    let state = structuredClone(base); await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 57) {
      const previous = state, action = firstHallAftermathInput(state)
      state = firstHallAftermathStep(state)
      const task = state.earlyTraining.firstHallApproach
      expect(task.ningAngry).toBe(true); expect(task.handprint).toBe(task.stage >= 56)
      expect(task.yan).toBe('outside'); expect(task.xunerPos).toBe('outside'); expect(task.ning).toBe('east')
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach
      expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state, outside, 'outside', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const html = renderToStaticMarkup(<FirstHallApproach aftermath state={state} onBack={() => {}} />)
      expect(html).toContain('translate(60 310)'); expect(html).toContain('translate(85 280)'); expect(html).toContain('translate(450 280)')
      expect(html).toContain('x="80" y="305"'); expect(html).toContain('同一第一卷实际放回书架')
      expect(html).toContain('薰儿自己的临时卷已放下')
      expect(html.includes('萧宁留下的书架轻掌印')).toBe(task.handprint)
      expect(html).not.toContain('明确回顾同行跨门前的位置')
      expect(state.earlyTraining.firstHallTalk.ownScroll).toBe('xuner')
    }
    const old = renderToStaticMarkup(<FirstHallApproach leaving state={state} onBack={() => {}} />)
    expect(old).toContain('同行与实际离堂 4/4'); expect(old).not.toContain('8/4')
    expect(old).not.toContain('萧宁留下的书架轻掌印')
    expect(advanceFirstHallApproach(state, outside, 'outside', firstHallLeavingInput(state)).state).toBe(state)
  })
  it('0.75系列只补false，不补反应；旧54+、当前缺失或错误派生逐步拒绝', () => {
    for (const version of ['0.75.0', '0.75.1', '0.75.2']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: { firstHallApproach: Record<string, unknown> } }
      old.contentVersion = version; delete old.earlyTraining.firstHallApproach.ningAngry; delete old.earlyTraining.firstHallApproach.handprint
      expect(validateState(old)).toEqual(base)
      for (let state = firstHallAftermathStep(base); ; state = firstHallAftermathStep(state)) {
        const forged = structuredClone(state); forged.contentVersion = version
        expect(() => validateState(forged)).toThrow('离堂后萧宁反应')
        if (state.earlyTraining.firstHallApproach.stage === 57) break
      }
    }
    for (let state = base; ; state = firstHallAftermathStep(state)) {
      expect(validateState(state)).toEqual(state)
      for (const key of ['ningAngry', 'handprint'] as const) {
        const missing = structuredClone(state) as unknown as { earlyTraining: { firstHallApproach: Record<string, unknown> } }
        delete missing.earlyTraining.firstHallApproach[key]; expect(() => validateState(missing)).toThrow()
        const bad = structuredClone(state); bad.earlyTraining.firstHallApproach[key] = !bad.earlyTraining.firstHallApproach[key]
        expect(() => validateState(bad)).toThrow()
      }
      if (state.earlyTraining.firstHallApproach.stage === 57) break
    }
  })
  it('前置/13快照/人物/本人空间坐标/混用flags严格；不能代签午后回房或胜利', () => {
    const incomplete = firstHallLeavingEligible()
    expect(advanceFirstHallApproach(incomplete, outside, 'outside', firstHallAftermathInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续离堂后萧宁独立反应')
    for (let state = base; state.earlyTraining.firstHallApproach.stage < 57; state = firstHallAftermathStep(state)) {
      const action = firstHallAftermathInput(state)
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, outside, 'outside', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallApproach(state, outside, 'outside', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation'] as const)
        expect(advanceFirstHallApproach(state, outside, 'outside', { ...action, [flag]: true }).state).toBe(state)
      for (const actor of ['yan', 'xuner', 'ning', 'bystander'] as const) if (actor !== action.actor)
        expect(advanceFirstHallApproach(state, outside, 'outside', { ...action, actor }).state).toBe(state)
      for (const operation of ['afternoon', 'room', 'attack', 'win', 'repay', 'return', 'second', 'learn'])
        expect(advanceFirstHallApproach(state, outside, 'outside', { ...action, operation }).state).toBe(state)
      for (const p of [{ x: 61, y: 310 }, { x: 450, y: 280 }, { x: 140, y: 310 }])
        expect(advanceFirstHallApproach(state, p, 'outside', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, outside, 'hall', action).state).toBe(state)
    }
  })
  it('旧更高保管不退，原奖励保持；NPC掌印只一次事务，重复/并发拒绝且防剧透', async () => {
    const legacy = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let higher = firstHallAftermathEligible(legacy), before = structuredClone(higher)
    while (higher.earlyTraining.firstHallApproach.stage < 57) higher = firstHallAftermathStep(higher)
    higher.earlyTraining.firstHallApproach = before.earlyTraining.firstHallApproach; expect(higher).toEqual(before)
    const state = firstHallAftermathStep(firstHallAftermathStep(base)); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach.handprint).toBe(true)
      const same = structuredClone(saved); same.earlyTraining.firstHallApproach = state.earlyTraining.firstHallApproach
      expect(same).toEqual(state); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const action = firstHallAftermathInput(state), runtime = store.getSnapshot().runtime
    expect(submitFirstHallApproach(store, outside, 'outside', action)).toBe(true)
    expect(submitFirstHallApproach(store, outside, 'outside', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallApproach(sealed, outside, 'outside', firstHallAftermathInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(store.getSnapshot().state, hidden)).not.toContain('轻掌印')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续离堂后萧宁独立反应')
  })
})
