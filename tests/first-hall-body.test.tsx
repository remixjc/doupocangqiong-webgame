import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallBody, submitFirstHallBody } from '../src/core/first-hall-body'
import { firstHallBodyAt } from '../src/core/first-hall-body-state'
import { hallBodySnapshotKeys } from '../src/core/early-snapshots'
import { firstHallBodyEligible, firstHallBodyInput, firstHallBodyStep } from './helpers/first-hall-body-replay'
import { firstHallTransmissionEligible } from './helpers/first-hall-transmission-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallTeacher from '../src/ui/FirstHallTeacher'
import FirstHallScrollReview from '../src/ui/FirstHallScrollReview'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('身体限制与增强问答', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstHallBodyEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstHallBody.stage < 7) states.push(firstHallBodyStep(states.at(-1)!))
  })
  it('七问答分别保存，限制才补4/归档才补5；整档四槽与上一自动档恢复', async () => {
    expect(states.map(s => s.earlyTraining.firstHallBody.stage)).toEqual([0,1,2,3,4,5,6,7])
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstHallBody, normalized = structuredClone(state)
      expect(t).toEqual(firstHallBodyAt(i)); expect(state.earlyTraining.teaching.stage).toBe(i === 7 ? 5 : i >= 2 ? 4 : 3)
      normalized.earlyTraining.firstHallBody = base.earlyTraining.firstHallBody
      normalized.earlyTraining.teaching = base.earlyTraining.teaching; expect(normalized).toEqual(base)
      for (const slot of [0,1,2,3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstHallTeacher body state={state} onBack={() => {}} />)
      expect(html).toContain('translate(300 250)'); expect(html).toContain('translate(300 270)')
      expect(html).toContain('x="320" y="255"'); expect(html).toContain('本人房门closed')
      expect(html).toContain('茶已饮'); expect(html).not.toContain('夜间薰儿位置')
    }
    expect(states[1].earlyTraining.firstHallBody.restricted).toBe(false)
    expect(states[5].earlyTraining.firstHallBody.stimulus).toBe('unheard')
    expect(states[6].earlyTraining.firstHallBody.stimulus).toBe('beatings')
  })
  it('旧0.82只补空/current缺项拒绝，各派生字段和前置/来源/旧账最低值严格', () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
    old.contentVersion = '0.82.1'; delete old.earlyTraining.firstHallBody
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({ ...old, contentVersion: '0.83.0' })).toThrow()
    for (const state of states.slice(1)) expect(() => validateState({ ...state, contentVersion: '0.82.1' })).toThrow('身体限制问答')
    for (const state of states) {
      expect(validateState(state)).toEqual(state)
      for (const field of Object.keys(state.earlyTraining.firstHallBody)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallBody: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallBody[field]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallBody[field] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    for (const index of [2,7]) {
      const bad = structuredClone(states[index]); bad.earlyTraining.teaching.stage--
      expect(() => validateState(bad)).toThrow()
    }
    const bad = structuredClone(states[2]); bad.earlyTraining.firstHallBody.record = 'recalled'
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.firstHallBody.record = 'current'; bad.earlyTraining.firstHallTransmission.stage = 5
    expect(() => validateState(bad)).toThrow()
  })
  it('21完整快照逐字段、人物/双坐标/空间、旧flags/operation/并发与重复拒绝', () => {
    expect(hallBodySnapshotKeys).toHaveLength(21)
    for (const state of states) {
      const t = state.earlyTraining.firstHallBody, action = firstHallBodyInput(state), p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      const reject = (input: typeof action, position = p, space = 'room') => expect(advanceFirstHallBody(state, position, space, input).state).toBe(state)
      for (const label of hallBodySnapshotKeys) {
        const field = `expected${label}` as keyof typeof action, snapshot = action[field] as Record<string, unknown>
        reject({ ...action, [field]: undefined })
        for (const key of Object.keys(snapshot)) reject({ ...action, [field]: { ...snapshot, [key]: 'stale' } })
      }
      for (const key of Object.keys(t)) reject({ ...action, [key]: 'stale' })
      for (const flag of ['leaving','checkout','exitResponse','threat','conflict','continuation','aftermath'] as const) reject({ ...action, [flag]: true })
      for (const operation of ['move-left','hope','restrict','ask-improve','explain-growth','ask-stimulus','explain-beatings','archive','use','train','upgrade'])
        if (operation !== action.operation) reject({ ...action, operation })
      reject({ ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action, { x: p.x + 1, y: p.y }); reject(action, p, 'courtyard')
      reject(action, action.actor === 'teacher' ? t : { x: t.teacherX, y: t.teacherY })
    }
    for (let i = 1; i < states.length; i++) {
      const action = firstHallBodyInput(states[i - 1]), t = states[i].earlyTraining.firstHallBody
      expect(advanceFirstHallBody(states[i], action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, 'room', action).state).toBe(states[i])
    }
    const unfinished = firstHallTransmissionEligible()
    expect(advanceFirstHallBody(unfinished, unfinished.earlyTraining.firstHallBody, 'room', firstHallBodyInput(unfinished)).state).toBe(unfinished)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={unfinished} />)).not.toContain('接续身体限制与增强问答')
    const noSource = structuredClone(base); noSource.earlyTraining.firstHallTransmission.record = 'none'
    expect(advanceFirstHallBody(noSource, noSource.earlyTraining.firstHallBody, 'room', firstHallBodyInput(noSource)).state).toBe(noSource)
  })
  it('旧高教学只回顾不退，四段/五段条件/身体恢复/消耗/练习/奖励与旧地图保留', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallBodyEligible(old); const original = structuredClone(state)
    while (state.earlyTraining.firstHallBody.stage < 7) {
      state = firstHallBodyStep(state); expect(state.earlyTraining.firstHallBody.record).toBe('recalled')
      expect(state.earlyTraining.teaching).toEqual(original.earlyTraining.teaching)
    }
    expect(renderToStaticMarkup(<FirstHallTeacher body state={state} onBack={() => {}} />)).toContain('详细历史回顾')
    state.earlyTraining.firstHallBody = original.earlyTraining.firstHallBody; expect(state).toEqual(original)
    for (const stage of [4,5]) {
      let current = structuredClone(base); current.earlyTraining.teaching.stage = stage
      for (let i=1;i<=7;i++) { current=firstHallBodyStep(current); expect(current.earlyTraining.teaching.stage).toBe(i===7?5:Math.max(stage,i>=2?4:3)) }
    }
    expect(renderToStaticMarkup(<FirstHallTeacher state={states[7]} onBack={() => {}} />)).toContain('translate(260 190)')
    expect(renderToStaticMarkup(<FirstHallTeacher agreement state={states[7]} onBack={() => {}} />)).toContain('translate(340 230)')
    expect(renderToStaticMarkup(<FirstHallScrollReview transmission state={states[7]} onBack={() => {}} />)).toContain('translate(300 250)')
  })
  it('两个桥接节点各一次原子写，重复无奖；chapter1封存入口及摘要', async () => {
    for (const index of [1,6]) {
      let writes = 0; const input = states[index]
      const store = new GameStore({ load: async () => input, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
      await store.initialize(); const runtime = store.getSnapshot().runtime, action = firstHallBodyInput(input), t = input.earlyTraining.firstHallBody
      const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      expect(submitFirstHallBody(store, p, 'room', action)).toBe(true); expect(submitFirstHallBody(store, p, 'room', action)).toBe(false)
      expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
      expect(store.getSnapshot().state).toEqual(states[index+1])
    }
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallBody(sealed, sealed.earlyTraining.firstHallBody, 'room', firstHallBodyInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(states[7], hidden)).not.toContain('身体问答')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续身体限制与增强问答')
  })
})
