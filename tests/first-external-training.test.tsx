import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { advanceFirstExternalTraining, submitFirstExternalTraining } from '../src/core/first-external-training'
import { firstExternalTrainingAt } from '../src/core/first-external-training-state'
import { externalTrainingSnapshotKeys } from '../src/core/early-snapshots'
import { firstExternalTrainingEligible, firstExternalTrainingInput, firstExternalTrainingStep } from './helpers/first-external-training-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstExternalTraining from '../src/ui/FirstExternalTraining'
import FirstHallTeacher from '../src/ui/FirstHallTeacher'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('山后受击现场与独立身体反应', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstExternalTrainingEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstExternalTraining.stage < 10)
      states.push(firstExternalTrainingStep(states.at(-1)!))
  })
  it('十个动作独立保存/四槽/上一自动档，只改新字段，不签监督/恢复/五段', async () => {
    expect(states.map(s => s.earlyTraining.firstExternalTraining.stage)).toEqual([0,1,2,3,4,5,6,7,8,9,10])
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], normalized = structuredClone(state)
      expect(state.earlyTraining.firstExternalTraining).toEqual(firstExternalTrainingAt(i))
      normalized.earlyTraining.firstExternalTraining = base.earlyTraining.firstExternalTraining
      expect(normalized).toEqual(base)
      expect(state.earlyTraining.supervision).toEqual(base.earlyTraining.supervision)
      for (const slot of [0,1,2,3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstExternalTraining state={state} onBack={() => {}} />)
      expect(html).toContain('translate(300 270)')
      expect(html.includes('山后老师独立位置')).toBe(i >= 3)
      expect(html.includes('红色斗气肩击已记录')).toBe(i >= 5)
      expect(html.includes('斗气流动凉意已记录')).toBe(i >= 7)
      expect(html).not.toContain('房中同一第二借卷仍在桌上')
    }
    expect(states[9].earlyTraining.firstExternalTraining.requestedAgain).toBe(true)
    const oldRoom = renderToStaticMarkup(<FirstHallTeacher body state={base} onBack={() => {}} />)
    expect(renderToStaticMarkup(<FirstHallTeacher body state={states[10]} onBack={() => {}} />)).toBe(oldRoom)
  })
  it('旧版本只补空，当前缺项/各派生字段/来源与较高旧监督绑定/伪造历史拒绝', () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
    old.contentVersion = '0.83.2'; delete old.earlyTraining.firstExternalTraining
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({ ...old, contentVersion: '0.84.0' })).toThrow()
    for (const state of states) {
      expect(validateState(state)).toEqual(state)
      for (const field of Object.keys(state.earlyTraining.firstExternalTraining)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstExternalTraining: Record<string, unknown> } }
        delete bad.earlyTraining.firstExternalTraining[field]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstExternalTraining[field] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
      if (state.earlyTraining.firstExternalTraining.stage)
        expect(() => validateState({ ...state, contentVersion: '0.83.2' })).toThrow('山后受击')
    }
    const bad = structuredClone(states[3]); bad.earlyTraining.firstExternalTraining.record = 'recalled'
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.firstExternalTraining.priorCompleted = true
    expect(() => validateState(bad)).toThrow()
    const unfinished = structuredClone(states[3]); unfinished.earlyTraining.firstHallBody.stage = 6
    expect(() => validateState(unfinished)).toThrow()
    const impossibleRetry = structuredClone(states[2]); impossibleRetry.earlyTraining.firstExternalTraining.attempts = 1
    expect(() => validateState(impossibleRetry)).toThrow()
  })
  it('23完整快照逐字段、错人物/双位置/空间/越序/旧flags/并发与重复全部零写', () => {
    expect(externalTrainingSnapshotKeys).toHaveLength(23)
    for (const state of states) {
      const t = state.earlyTraining.firstExternalTraining, action = firstExternalTrainingInput(state)
      const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      const reject = (input: typeof action, position = p, space = t.location as string) =>
        expect(advanceFirstExternalTraining(state, position, space, input).state).toBe(state)
      for (const label of externalTrainingSnapshotKeys) {
        const key = `expected${label}` as keyof typeof action, snapshot = action[key] as Record<string, unknown>
        reject({ ...action, [key]: undefined })
        for (const field of Object.keys(snapshot)) reject({ ...action, [key]: { ...snapshot, [field]: 'stale' } })
      }
      for (const field of Object.keys(t)) reject({ ...action, [field]: 'wrong' })
      for (const operation of ['morning','stance','seat','steady','lash','pain','flow','ease','again','archive','move-left','recover','upgrade','complete-round'])
        if (operation !== action.operation) reject({ ...action, operation })
      for (const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath'] as const)
        reject({ ...action, [flag]: true })
      reject({ ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action, { x: p.x + 1, y: p.y }); reject(action, p, 'room')
      reject(action, action.actor === 'teacher' ? t : { x: t.teacherX, y: t.teacherY })
    }
    for (let i = 1; i < states.length; i++) {
      const t = states[i].earlyTraining.firstExternalTraining, action = firstExternalTrainingInput(states[i - 1])
      expect(advanceFirstExternalTraining(states[i], action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, 'grove', action).state).toBe(states[i])
    }
    const noSource = structuredClone(base); noSource.earlyTraining.firstHallBody.record = 'none'
    expect(advanceFirstExternalTraining(noSource, noSource.earlyTraining.firstExternalTraining, 'grove', firstExternalTrainingInput(noSource)).state).toBe(noSource)
  })
  it('免费重试严格边界、上限、旧高账回顾与随后旧账推进相容，真实原子一次写', async () => {
    const state = states[3], action = firstExternalTrainingInput(state), p = state.earlyTraining.firstExternalTraining
    for (const marker of [undefined, NaN, Infinity, -.1, 1.1]) {
      expect(advanceFirstExternalTraining(state, p, 'grove', { ...action, marker }).state).toBe(state)
    }
    for (const marker of [.35, .5, .65]) expect(advanceFirstExternalTraining(state, p, 'grove', { ...action, marker }).state).toEqual(states[4])
    for (const marker of [0, .349, .651, 1]) {
      const retry = advanceFirstExternalTraining(state, p, 'grove', { ...action, marker }).state
      const normalized = structuredClone(retry); normalized.earlyTraining.firstExternalTraining.attempts--
      expect(normalized).toEqual(state); expect(parseSave(serializeSave(retry))).toEqual(retry)
      expect(firstExternalTrainingStep(retry).earlyTraining.firstExternalTraining.attempts).toBe(1)
    }
    const limit = structuredClone(state); limit.earlyTraining.firstExternalTraining.attempts = 1_000_000
    expect(advanceFirstExternalTraining(limit, limit.earlyTraining.firstExternalTraining, 'grove', { ...firstExternalTrainingInput(limit), marker: 0 }).state).toBe(limit)
    for (const marker of [0, .5]) {
      let writes = 0
      const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
      await store.initialize(); const runtime = store.getSnapshot().runtime
      expect(submitFirstExternalTraining(store, p, 'grove', { ...action, marker })).toBe(true)
      expect(submitFirstExternalTraining(store, p, 'grove', { ...action, marker })).toBe(false)
      expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    }
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let high = firstExternalTrainingEligible(old); const original = structuredClone(high)
    while (high.earlyTraining.firstExternalTraining.stage < 10) {
      high = firstExternalTrainingStep(high); expect(high.earlyTraining.firstExternalTraining.record).toBe('recalled')
      expect(high.earlyTraining.firstExternalTraining.priorCompleted).toBe(true)
    }
    high.earlyTraining.firstExternalTraining = original.earlyTraining.firstExternalTraining
    expect(high).toEqual(original)
    const later = structuredClone(states[3]); later.earlyTraining.supervision = { stage: 2, pulses: 4, attempts: 0 }
    expect(validateState(later)).toEqual(later)
    expect(firstExternalTrainingStep(later).earlyTraining.firstExternalTraining.record).toBe('current')
  })
  it('未入堂/未归档身体问答与动画chapter1封存，新摘要不泄漏或虚签整轮', () => {
    const unfinished = structuredClone(base); unfinished.earlyTraining.firstHallBody.stage = 6
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={unfinished} />)).not.toContain('接续山后受击与身体反应')
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续山后受击与身体反应')
    expect(savePreviewSummary(states[10], hidden)).not.toContain('受击现场')
    expect(advanceFirstExternalTraining(sealed, sealed.earlyTraining.firstExternalTraining, 'grove', firstExternalTrainingInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(states[10], base.settings)).toContain('整轮限度待续')
  })
})
