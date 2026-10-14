import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallGrant, submitFirstHallGrant } from '../src/core/first-hall-grant'
import { firstHallGrantAt } from '../src/core/first-hall-grant-state'
import { hallGrantSnapshotKeys } from '../src/core/early-snapshots'
import { firstHallGrantEligible, firstHallGrantInput, firstHallGrantStep } from './helpers/first-hall-grant-replay'
import { firstHallScrollReviewEligible } from './helpers/first-hall-scroll-review-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallTeacher from '../src/ui/FirstHallTeacher'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('老师认可与使用条件分步记录', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstHallGrantEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstHallGrant.stage < 7) states.push(firstHallGrantStep(states.at(-1)!))
  })
  it('七动作逐步四槽与上一自动档整档恢复，只单调桥接旧账至2，不接收知识或晋阶', async () => {
    expect(states).toHaveLength(8); await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstHallGrant, same = structuredClone(state)
      expect(t).toEqual(firstHallGrantAt(i)); expect(state.earlyTraining.teaching.stage).toBe(2)
      same.earlyTraining.firstHallGrant = base.earlyTraining.firstHallGrant
      same.earlyTraining.teaching = base.earlyTraining.teaching; expect(same).toEqual(base)
      expect(t.needed).toBe(i >= 3 ? 5 : 0); expect(state.earlyTraining.firstTraining.result).toBe(base.earlyTraining.firstTraining.result)
      expect(state.earlyTraining.practice).toEqual(base.earlyTraining.practice)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstHallTeacher agreement state={state} onBack={() => {}} />)
      expect(html).toContain('translate(300 270)'); expect(html).toContain('translate(340 230)')
      expect(html).toContain('x="320" y="255"'); expect(html).toContain('本人房门closed')
      expect(html).not.toContain('夜间薰儿位置')
    }
  })
  it('旧0.80仅补空；版本、每派生字段、来源、前置和旧账最低值严格', () => {
    for (const version of ['0.80.0', '0.80.1']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      old.contentVersion = version; delete old.earlyTraining.firstHallGrant; expect(validateState(old)).toEqual(base)
      for (const state of states.slice(1)) expect(() => validateState({ ...state, contentVersion: version })).toThrow('传技认可条件')
    }
    for (const state of states) {
      expect(validateState(state)).toEqual(state)
      for (const field of Object.keys(state.earlyTraining.firstHallGrant)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallGrant: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallGrant[field]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallGrant[field] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    const bad = structuredClone(states[1]); bad.earlyTraining.firstHallGrant.record = 'recalled'
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.firstHallGrant.record = 'current'; bad.earlyTraining.teaching.stage = 1
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.teaching.stage = 2; bad.earlyTraining.firstHallScrollReview.stage = 8
    expect(() => validateState(bad)).toThrow()
  })
  it('19完整快照含原教学，双人物坐标/空间/错误方向/操作/旧flags/并发均拒绝跳签', () => {
    expect(hallGrantSnapshotKeys).toHaveLength(19)
    for (const state of states) {
      const t = state.earlyTraining.firstHallGrant, action = firstHallGrantInput(state), p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      const reject = (input: typeof action, position = p, space = 'room') => expect(advanceFirstHallGrant(state, position, space, input).state).toBe(state)
      for (const label of hallGrantSnapshotKeys) {
        const field = `expected${label}` as keyof typeof action, snapshot = action[field] as Record<string, unknown>
        reject({ ...action, [field]: undefined })
        for (const key of Object.keys(snapshot)) reject({ ...action, [field]: { ...snapshot, [key]: 'stale' } })
      }
      for (const key of Object.keys(t)) reject({ ...action, [key]: 'stale' })
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation', 'aftermath'] as const) reject({ ...action, [flag]: true })
      for (const operation of ['approve', 'perk', 'condition', 'ask-tier', 'tier', 'gap', 'archive', 'move-right', 'move-left', 'move-down', 'move-up', 'focus', 'tap', 'receive', 'use', 'learn', 'repay'])
        if (operation !== action.operation) reject({ ...action, operation })
      reject({ ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action, { x: p.x + 1, y: p.y }); reject(action, p, 'courtyard')
      reject(action, action.actor === 'teacher' ? t : { x: t.teacherX, y: t.teacherY })
    }
    for (let i = 1; i < states.length; i++) {
      const action = firstHallGrantInput(states[i - 1]), t = states[i].earlyTraining.firstHallGrant
      expect(advanceFirstHallGrant(states[i], action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, 'room', action).state).toBe(states[i])
    }
    const unfinished = firstHallScrollReviewEligible(), t = unfinished.earlyTraining.firstHallGrant
    expect(advanceFirstHallGrant(unfinished, t, 'room', firstHallGrantInput(unfinished)).state).toBe(unfinished)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={unfinished} />)).not.toContain('接续老师认可与使用条件')
    const noSource = structuredClone(base); noSource.earlyTraining.firstHallScrollReview.record = 'none'
    expect(advanceFirstHallGrant(noSource, { x: 340, y: 230 }, 'room', firstHallGrantInput(noSource)).state).toBe(noSource)
  })
  it('旧更高教学仅详细回顾，2至5单调不退；旧身体/恢复/消耗和奖励保持', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallGrantEligible(old); const original = structuredClone(state)
    while (state.earlyTraining.firstHallGrant.stage < 7) {
      state = firstHallGrantStep(state); expect(state.earlyTraining.firstHallGrant.record).toBe('recalled')
      expect(state.earlyTraining.teaching).toEqual(original.earlyTraining.teaching)
    }
    const html = renderToStaticMarkup(<FirstHallTeacher agreement state={state} onBack={() => {}} />)
    expect(html).toContain('详细历史回顾')
    state.earlyTraining.firstHallGrant = original.earlyTraining.firstHallGrant; expect(state).toEqual(original)
    for (const stage of [2, 3, 4, 5]) {
      const input = structuredClone(base); input.earlyTraining.teaching.stage = stage
      expect(firstHallGrantStep(input).earlyTraining.teaching.stage).toBe(stage)
    }
    const oldHtml = renderToStaticMarkup(<FirstHallTeacher state={states[7]} onBack={() => {}} />)
    expect(oldHtml).toContain('当时房中问答'); expect(oldHtml).toContain('translate(260 190)')
  })
  it('双字段单次写入，批准并发仅一次，当前chapter1入口与摘要封存', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, action = firstHallGrantInput(base)
    expect(submitFirstHallGrant(store, { x: 340, y: 230 }, 'room', action)).toBe(true)
    expect(submitFirstHallGrant(store, { x: 340, y: 230 }, 'room', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state.earlyTraining.teaching.stage).toBe(2)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallGrant(sealed, { x: 340, y: 230 }, 'room', action).state).toBe(sealed)
    expect(savePreviewSummary(states[7], hidden)).not.toContain('认可条件')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续老师认可与使用条件')
  })
})
