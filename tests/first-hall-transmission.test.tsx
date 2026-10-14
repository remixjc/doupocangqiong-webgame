import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallTransmission, submitFirstHallTransmission } from '../src/core/first-hall-transmission'
import { firstHallTransmissionAt } from '../src/core/first-hall-transmission-state'
import { hallTransmissionSnapshotKeys } from '../src/core/early-snapshots'
import { firstHallTransmissionEligible, firstHallTransmissionInput, firstHallTransmissionStep } from './helpers/first-hall-transmission-replay'
import { firstHallGrantEligible } from './helpers/first-hall-grant-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallScrollReview from '../src/ui/FirstHallScrollReview'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('额前实际传授与接收知识', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstHallTransmissionEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstHallTransmission.stage < 6) states.push(firstHallTransmissionStep(states.at(-1)!))
  })
  it('先凝神，再两个老师独立路步、点触、接收、恢复、阅读、归档；四槽与上一自动档整档恢复', async () => {
    expect(states.map(s => [s.earlyTraining.firstHallTransmission.stage, s.earlyTraining.firstHallTransmission.walk]))
      .toEqual([[0,0], [1,0], [1,1], [1,2], [2,0], [3,0], [4,0], [5,0], [6,0]])
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstHallTransmission, normalized = structuredClone(state)
      expect(t).toEqual(firstHallTransmissionAt(t.stage, t.walk)); expect(t.x).toBe(300); expect(t.y).toBe(270)
      expect(state.earlyTraining.teaching.stage).toBe(t.received ? 3 : 2)
      expect(t.description).toBe(t.stage >= 5 ? 'close-eight-forces' : 'unread')
      normalized.earlyTraining.firstHallTransmission = base.earlyTraining.firstHallTransmission
      normalized.earlyTraining.teaching = base.earlyTraining.teaching; expect(normalized).toEqual(base)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstHallScrollReview transmission state={state} onBack={() => {}} />)
      expect(html).toContain(`translate(${t.teacherX} ${t.teacherY})`); expect(html).toContain('translate(300 270)')
      expect(html).toContain('x="320" y="255"'); expect(html).toContain('本人房门closed')
      expect(html).not.toContain('夜间薰儿位置')
    }
    expect(states[1].earlyTraining.firstHallTransmission.touched).toBe(false)
    expect(states[3].earlyTraining.firstHallTransmission.received).toBe(false)
    expect(states[4].earlyTraining.firstHallTransmission.received).toBe(false)
    expect(states[5].earlyTraining.firstHallTransmission.recovered).toBe(false)
    expect(states[6].earlyTraining.firstHallTransmission.eyesClosed).toBe(false)
  })
  it('旧0.81仅补空，旧版本首路步拒绝，每派生字段、来源、前置及知识旧账最低值严格', () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
    old.contentVersion = '0.81.0'; delete old.earlyTraining.firstHallTransmission
    expect(validateState(old)).toEqual(base)
    for (const state of states.slice(1)) expect(() => validateState({ ...state, contentVersion: '0.81.0' })).toThrow('额前实际传授')
    for (const state of states) {
      expect(validateState(state)).toEqual(state)
      for (const field of Object.keys(state.earlyTraining.firstHallTransmission)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallTransmission: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallTransmission[field]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallTransmission[field] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    const bad = structuredClone(states[5]); bad.earlyTraining.firstHallTransmission.record = 'recalled'
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.firstHallTransmission.record = 'current'; bad.earlyTraining.teaching.stage = 2
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.teaching.stage = 3; bad.earlyTraining.firstHallGrant.stage = 6
    expect(() => validateState(bad)).toThrow()
    const walkingBeforeFocus = structuredClone(base); walkingBeforeFocus.earlyTraining.firstHallTransmission.walk = 1
    expect(() => validateState(walkingBeforeFocus)).toThrow()
  })
  it('20完整旧快照/每字段，原人物坐标、方向与空间、旧flags、重复与并发均拒绝跳签', () => {
    expect(hallTransmissionSnapshotKeys).toHaveLength(20)
    for (const state of states) {
      const t = state.earlyTraining.firstHallTransmission, action = firstHallTransmissionInput(state), p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      const reject = (input: typeof action, position = p, space = 'room') => expect(advanceFirstHallTransmission(state, position, space, input).state).toBe(state)
      for (const label of hallTransmissionSnapshotKeys) {
        const field = `expected${label}` as keyof typeof action, snapshot = action[field] as Record<string, unknown>
        reject({ ...action, [field]: undefined })
        for (const key of Object.keys(snapshot)) reject({ ...action, [field]: { ...snapshot, [key]: 'stale' } })
      }
      for (const key of Object.keys(t)) reject({ ...action, [key]: 'stale' })
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation', 'aftermath'] as const) reject({ ...action, [flag]: true })
      for (const operation of ['move-up', 'move-down', 'move-left', 'move-right', 'focus', 'tap', 'receive', 'recover', 'read', 'archive', 'use', 'upgrade', 'train'])
        if (operation !== action.operation) reject({ ...action, operation })
      reject({ ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action, { x: p.x + 1, y: p.y }); reject(action, p, 'courtyard')
      reject(action, action.actor === 'teacher' ? t : { x: t.teacherX, y: t.teacherY })
    }
    for (let i = 1; i < states.length; i++) {
      const action = firstHallTransmissionInput(states[i - 1]), t = states[i].earlyTraining.firstHallTransmission
      expect(advanceFirstHallTransmission(states[i], action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, 'room', action).state).toBe(states[i])
    }
    const unfinished = firstHallGrantEligible()
    expect(advanceFirstHallTransmission(unfinished, unfinished.earlyTraining.firstHallTransmission, 'room', firstHallTransmissionInput(unfinished)).state).toBe(unfinished)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={unfinished} />)).not.toContain('接续实际额前传授与知识')
    const noSource = structuredClone(base); noSource.earlyTraining.firstHallGrant.record = 'none'
    expect(advanceFirstHallTransmission(noSource, noSource.earlyTraining.firstHallTransmission, 'room', firstHallTransmissionInput(noSource)).state).toBe(noSource)
  })
  it('旧高教学仅详细回顾不退，四段/五段条件/身体/奖励保持，旧桌边图仍340230', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallTransmissionEligible(old); const original = structuredClone(state)
    while (state.earlyTraining.firstHallTransmission.stage < 6) {
      state = firstHallTransmissionStep(state); expect(state.earlyTraining.firstHallTransmission.record).toBe('recalled')
      expect(state.earlyTraining.teaching).toEqual(original.earlyTraining.teaching)
    }
    expect(renderToStaticMarkup(<FirstHallScrollReview transmission state={state} onBack={() => {}} />)).toContain('详细历史回顾')
    state.earlyTraining.firstHallTransmission = original.earlyTraining.firstHallTransmission; expect(state).toEqual(original)
    for (const stage of [3,4,5]) {
      let current = structuredClone(base); current.earlyTraining.teaching.stage = stage
      while (current.earlyTraining.firstHallTransmission.stage < 6) current = firstHallTransmissionStep(current)
      expect(current.earlyTraining.teaching.stage).toBe(stage)
    }
    const oldHtml = renderToStaticMarkup(<FirstHallScrollReview state={states[8]} onBack={() => {}} />)
    expect(oldHtml).toContain('translate(340 230)'); expect(oldHtml).toContain('同卷求技 9/9')
    expect(oldHtml).toContain('当时桌边求技')
  })
  it('接收双字段仅一次原子写入，重复不补奖，chapter1封存入口与摘要', async () => {
    let writes = 0; const input = states[4]
    const store = new GameStore({ load: async () => input, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, action = firstHallTransmissionInput(input)
    expect(submitFirstHallTransmission(store, input.earlyTraining.firstHallTransmission, 'room', action)).toBe(true)
    expect(submitFirstHallTransmission(store, input.earlyTraining.firstHallTransmission, 'room', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state.earlyTraining.teaching.stage).toBe(3)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallTransmission(sealed, sealed.earlyTraining.firstHallTransmission, 'room', firstHallTransmissionInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(states[8], hidden)).not.toContain('额前传授')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续实际额前传授与知识')
  })
})
