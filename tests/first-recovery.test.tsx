import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState, parseSave, saveSlot, listSlots } from '../src/core/save'
import { firstRecoveryAt, firstRecoveryMinimum } from '../src/core/first-recovery-state'
import { advanceFirstRecovery, submitFirstRecovery, firstRecoveryBlock } from '../src/core/first-recovery'
import { advanceEarlyRecovery } from '../src/core/early-recovery'
import { earlyRecoveryScenes } from '../src/content/early-recovery'
import { externalLimitSnapshotKeys } from '../src/core/early-snapshots'
import { firstRecoverySaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import FirstRecovery from '../src/ui/FirstRecovery'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import { firstRecoveryEligible, firstRecoveryInput, firstRecoveryStep, recoveryEntrance } from './helpers/first-recovery-replay'

describe('回房同一药液独立细分恢复', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstRecoveryEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstRecovery.stage < 11) states.push(firstRecoveryStep(states.at(-1)!))
  })
  it('十一动作和四路步逐点写入、四槽和上一自动档；只桥接回房/入液/色淡，未耗尽或五段', async () => {
    expect(states).toHaveLength(16)
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstRecovery, expected = structuredClone(base)
      expect(t).toEqual(firstRecoveryAt(t.stage, t.walk))
      expected.earlyTraining.firstRecovery = t
      expected.earlyTraining.recovery = { ...base.earlyTraining.recovery, stage: firstRecoveryMinimum(t.stage),
        energy: t.stage >= 10 ? 'fading' : t.stage >= 4 ? 'active' : 'unobserved' }
      expect(state).toEqual(expected)
      for (const slot of [0,1,2,3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(r => r.slot === -1)!.text)).toEqual(states[i - 1])
      expect(firstRecoverySaveSummary(state, state.settings)).toContain('同液恢复')
      const oldInput = firstRecoveryInput(states[i - 1]), oldT = states[i - 1].earlyTraining.firstRecovery
      expect(advanceFirstRecovery(state, recoveryEntrance, oldT, oldT.location, oldInput).state).toBe(state)
      expect(advanceEarlyRecovery(state, recoveryEntrance, 'container', {
        step: state.earlyTraining.recovery.stage, energy: state.earlyTraining.recovery.energy, operation: 'rest', marker: .5,
      }).state).toBe(state)
    }
    const done = states.at(-1)!
    expect(done.earlyTraining.recovery).toEqual({ stage:3, energy:'fading', period:'unreviewed', result:'none' })
    expect(done.earlyTraining.firstRecovery).toMatchObject({ awake:true, entered:true, asleep:false, eyes:'open' })
    expect(renderToStaticMarkup(<FirstRecovery state={done} position={recoveryEntrance} onBack={() => {}} />)).toContain('醒来断点已保存')
  })
  it('全部前置快照、人物、独立位置、空间、派生字段和旧标志拒绝，方向不能越序', () => {
    for (const state of states) {
      const t = state.earlyTraining.firstRecovery, action = firstRecoveryInput(state)
      const reject = (input: typeof action, p = t, space = t.location as string, entrance = recoveryEntrance) =>
        expect(advanceFirstRecovery(state, entrance, p, space, input).state).toBe(state)
      for (const label of externalLimitSnapshotKeys) {
        const key = `expected${label}` as keyof typeof action, snapshot = action[key] as Record<string, unknown>
        reject({ ...action, [key]: undefined })
        for (const field of Object.keys(snapshot)) reject({ ...action, [key]: { ...snapshot, [field]: 'stale' } })
      }
      for (const field of Object.keys(t)) reject({ ...action, [field]: 'wrong' })
      reject({ ...action, actor:'teacher' }); reject(action, { ...t, x: t.x+1 })
      reject(action, t, t.location === 'room' ? 'courtyard' : 'room')
      reject(action, t, t.location, { x:150,y:310 })
      for (const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath'])
        reject({ ...action, [flag]:true } as typeof action)
      for (const operation of ['move-right','enter','sleep','wake','rest','sense','restore','wait','approach'])
        if (operation !== action.operation) reject({ ...action, operation })
    }
  })
  it('旧版本只补空；当前缺字段、倒退消耗、伪来源、未离林和旧版本非空记录拒绝', () => {
    const old = JSON.parse(JSON.stringify(base))
    old.contentVersion = '0.87.2'; delete old.earlyTraining.firstRecovery
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({ ...old, contentVersion:'0.88.0' })).toThrow()
    for (const state of states.slice(1)) {
      for (const field of Object.keys(state.earlyTraining.firstRecovery)) {
        const bad = JSON.parse(JSON.stringify(state)); delete bad.earlyTraining.firstRecovery[field]
        expect(() => validateState(bad)).toThrow()
      }
      const earlier = structuredClone(state); earlier.contentVersion = '0.87.2'
      expect(() => validateState(earlier)).toThrow('不属于此版本')
      const missing = structuredClone(state); missing.earlyTraining.recovery = base.earlyTraining.recovery
      expect(() => validateState(missing)).toThrow()
      const wrong = structuredClone(state); wrong.earlyTraining.firstRecovery.record = 'recalled'
      expect(() => validateState(wrong)).toThrow()
    }
    const hidden = structuredClone(base); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 2
    expect(firstRecoveryBlock(hidden, recoveryEntrance)).toContain('剧透')
    expect(renderToStaticMarkup(<FirstRecovery state={hidden} position={recoveryEntrance} onBack={() => {}} />)).not.toContain('同一药液细分恢复')
    expect(savePreviewSummary(states[3], hidden.settings)).not.toContain('同液恢复')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={hidden} />)).not.toContain('限度后回房恢复')
    const unfinished = structuredClone(base); unfinished.earlyTraining.firstExternalLimit.stage = 7
    expect(firstRecoveryBlock(unfinished,recoveryEntrance)).not.toBe('')
  })
  it('旧耗尽/五段档逐步只回顾，不返还、回退、重领材料或奖励', () => {
    let state = structuredClone(base)
    for (const scene of earlyRecoveryScenes) state = advanceEarlyRecovery(state, recoveryEntrance, scene.station,
      { step:scene.step, energy:state.earlyTraining.recovery.energy, operation:scene.operation, marker:.5 }).state
    const original = structuredClone(state)
    while (state.earlyTraining.firstRecovery.stage < 11) {
      state = firstRecoveryStep(state)
      expect(state.earlyTraining.firstRecovery.record).toBe('recalled')
      expect(state.earlyTraining.firstRecovery.priorStage).toBe(7)
      const normalized = structuredClone(state); normalized.earlyTraining.firstRecovery = original.earlyTraining.firstRecovery
      expect(normalized).toEqual(original)
    }
    const bad = structuredClone(state); bad.earlyTraining.recovery.stage = 3
    expect(() => validateState(bad)).toThrow()
  })
  it.each(['story','normal','hard'] as const)('%s难度完整十五次操作与单次并发提交不改变runtime', async difficulty => {
    let state = structuredClone(base); state.settings.difficulty = difficulty
    while (state.earlyTraining.firstRecovery.stage < 11) state = firstRecoveryStep(state)
    expect(state.earlyTraining.recovery.result).toBe('none')
    let writes = 0
    const store = new GameStore({ load:async () => structuredClone(base), write:async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, t = base.earlyTraining.firstRecovery, action = firstRecoveryInput(base)
    expect(submitFirstRecovery(store,recoveryEntrance,t,t.location,action)).toBe(true)
    expect(submitFirstRecovery(store,recoveryEntrance,t,t.location,action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state).toEqual(states[1])
  })
})
