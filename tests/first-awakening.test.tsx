import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState, parseSave, saveSlot, listSlots } from '../src/core/save'
import { firstAwakeningAt, firstAwakeningMinimum } from '../src/core/first-awakening-state'
import { advanceFirstAwakening, submitFirstAwakening, firstAwakeningBlock } from '../src/core/first-awakening'
import { advanceFirstRecovery } from '../src/core/first-recovery'
import { advanceEarlyRecovery } from '../src/core/early-recovery'
import { recoveryEnergyAt } from '../src/core/early-training-state'
import { awakeningSnapshotKeys } from '../src/core/early-snapshots'
import { firstAwakeningSaveSummary, firstRecoverySaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { earlyConsignmentBlock } from '../src/core/early-consignment'
import { GameStore } from '../src/core/store'
import FirstAwakening from '../src/ui/FirstAwakening'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import { firstAwakeningEligible, firstAwakeningInput, firstAwakeningStep, recoveryEntrance } from './helpers/first-awakening-replay'
import { firstRecoveryInput } from './helpers/first-recovery-replay'

describe('醒后舒展、同液耗尽与感知独立记录', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstAwakeningEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstAwakening.stage < 11) states.push(firstAwakeningStep(states.at(-1)!))
  })
  it('十一动作四槽/上一档逐点恢复，离容器与耗尽分存，五段先独立于旧时段核对', async () => {
    expect(states).toHaveLength(12)
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const s = states[i], t = s.earlyTraining.firstAwakening, expected = structuredClone(base), minimum = firstAwakeningMinimum(i)
      expect(t).toEqual(firstAwakeningAt(i, 'current', 3))
      expected.earlyTraining.firstAwakening = t
      expected.earlyTraining.recovery = { stage: minimum, energy: recoveryEnergyAt(minimum),
        period: minimum >= 6 ? 'reviewed' : 'unreviewed', result: minimum === 7 ? 'fifth-duan' : 'none' }
      expect(s).toEqual(expected)
      for (const slot of [0,1,2,3]) await saveSlot(slot,s)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(r => r.slot === slot)!.text)).toEqual(s)
      expect(parseSave(slots.find(r => r.slot === -1)!.text)).toEqual(states[i - 1])
      expect(firstAwakeningSaveSummary(s,s.settings)).toContain('醒后耗尽与感知')
      const previous = states[i - 1].earlyTraining.firstAwakening
      expect(advanceFirstAwakening(s,recoveryEntrance,previous,previous.location,firstAwakeningInput(states[i-1])).state).toBe(s)
    }
    expect(states[2].earlyTraining.firstAwakening).toMatchObject({ exited:false,x:120 })
    expect(states[3].earlyTraining.firstAwakening).toMatchObject({ exited:true,x:180,spent:false })
    expect(states[5].earlyTraining.recovery.stage).toBe(3)
    expect(states[6].earlyTraining.recovery).toMatchObject({ stage:5,energy:'spent',period:'unreviewed',result:'none' })
    expect(states[8].earlyTraining.firstAwakening).toMatchObject({ eyes:'closed',sensed:true,result:'none' })
    expect(states[9].earlyTraining.firstAwakening).toMatchObject({ eyes:'open',result:'fifth-duan',legacyReviewed:false })
    expect(states[9].earlyTraining.recovery.result).toBe('none')
    expect(states[10].earlyTraining.recovery).toMatchObject({ stage:7,period:'reviewed',result:'fifth-duan' })
    expect(earlyConsignmentBlock(states[9],recoveryEntrance)).not.toBe('')
    expect(earlyConsignmentBlock(states[11],recoveryEntrance)).toBe('')
    expect(firstRecoverySaveSummary(states[11],states[11].settings)).not.toContain('醒后结果待续')
    expect(renderToStaticMarkup(<FirstAwakening state={states[11]} position={recoveryEntrance} onBack={() => {}} />)).toContain('醒后全过程已归档')
  })
  it('26完整快照、人物、位置、空间、动作、派生字段和并发断点严格拒绝', () => {
    for (const state of states) {
      const t = state.earlyTraining.firstAwakening, action = firstAwakeningInput(state)
      const reject = (input: typeof action, p = t, space = t.location as string, entrance = recoveryEntrance) =>
        expect(advanceFirstAwakening(state,entrance,p,space,input).state).toBe(state)
      for (const label of awakeningSnapshotKeys) {
        const key = `expected${label}` as keyof typeof action, snapshot = action[key] as Record<string,unknown>
        reject({ ...action,[key]:undefined })
        for (const field of Object.keys(snapshot)) reject({ ...action,[key]:{ ...snapshot,[field]:'stale' } })
      }
      for (const key of Object.keys(t)) reject({ ...action,[key]:'wrong' })
      reject({ ...action,actor:'teacher' }); reject(action,{ ...t,x:t.x+1 }); reject(action,t,'courtyard')
      reject(action,t,t.location,{ x:150,y:310 })
      for (const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath'])
        reject({ ...action,[flag]:true } as typeof action)
      for (const operation of ['move-left','move-right','sleep','wake','sense','legacy-review','open-result','wait','refill'])
        if (operation !== action.operation) reject({ ...action,operation })
      expect(advanceEarlyRecovery(state,recoveryEntrance,'container',{
        step:state.earlyTraining.recovery.stage,energy:state.earlyTraining.recovery.energy,operation:'rest',marker:.5,
      }).state).toBe(state)
      const recovery = state.earlyTraining.firstRecovery
      expect(advanceFirstRecovery(state,recoveryEntrance,recovery,recovery.location,firstRecoveryInput(state)).state).toBe(state)
    }
  })
  it('旧版本只补空，缺字段/伪来源/倒退/提前醒后/旧版带新历史均拒绝，3章摘要不泄漏', () => {
    const old = JSON.parse(JSON.stringify(base))
    old.contentVersion = '0.88.0'; delete old.earlyTraining.firstAwakening
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({ ...old,contentVersion:'0.89.0' })).toThrow()
    for (const state of states.slice(1)) {
      for (const key of Object.keys(state.earlyTraining.firstAwakening)) {
        const bad = JSON.parse(JSON.stringify(state)); delete bad.earlyTraining.firstAwakening[key]
        expect(() => validateState(bad)).toThrow()
      }
      const earlier = structuredClone(state); earlier.contentVersion = '0.88.0'
      expect(() => validateState(earlier)).toThrow('不属于此版本')
      const wrong = structuredClone(state); wrong.earlyTraining.firstAwakening.record = 'recalled'
      expect(() => validateState(wrong)).toThrow()
      const missing = structuredClone(state); missing.earlyTraining.firstRecovery.stage = 10
      expect(() => validateState(missing)).toThrow()
      if (state.earlyTraining.firstAwakening.stage >= 6) {
        const stale = structuredClone(state); stale.earlyTraining.recovery = base.earlyTraining.recovery
        expect(() => validateState(stale)).toThrow()
      }
    }
    const hidden = structuredClone(base); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 2
    expect(firstAwakeningBlock(hidden,recoveryEntrance)).toContain('剧透')
    expect(renderToStaticMarkup(<FirstAwakening state={hidden} position={recoveryEntrance} onBack={() => {}} />)).not.toContain('醒后与同液耗尽')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={hidden} />)).not.toContain('限度后回房恢复')
    expect(savePreviewSummary(states[9],hidden.settings)).not.toContain('醒后耗尽与感知')
  })
  it.each([4,5,6,7])('旧恢复%d与spent/旧结果逐步只回顾，不回退或返还', prior => {
    let state = structuredClone(base)
    state.earlyTraining.recovery = { stage:prior,energy:recoveryEnergyAt(prior),
      period:prior>=6?'reviewed':'unreviewed',result:prior===7?'fifth-duan':'none' }
    state = validateState(state)
    const original = structuredClone(state)
    while (state.earlyTraining.firstAwakening.stage < 11) {
      state = firstAwakeningStep(state)
      expect(state.earlyTraining.firstAwakening).toMatchObject({ record:'recalled',priorStage:prior })
      expect(state.earlyTraining.recovery.stage).toBeGreaterThanOrEqual(prior)
      const normalized = structuredClone(state)
      normalized.earlyTraining.firstAwakening = original.earlyTraining.firstAwakening
      normalized.earlyTraining.recovery = original.earlyTraining.recovery
      expect(normalized).toEqual(original)
      if (prior === 7) expect(state.earlyTraining.recovery).toEqual(original.earlyTraining.recovery)
    }
  })
  it.each(['story','normal','hard'] as const)('%s完整前期接续，十一动作仅一个并发提交且runtime不变', async difficulty => {
    let state = structuredClone(base); state.settings.difficulty = difficulty
    while (state.earlyTraining.firstAwakening.stage < 11) state = firstAwakeningStep(state)
    expect(state.earlyTraining.firstAwakening.archived).toBe(true)
    let writes = 0
    const store = new GameStore({ load:async () => structuredClone(base),write:async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, t = base.earlyTraining.firstAwakening, action = firstAwakeningInput(base)
    expect(submitFirstAwakening(store,recoveryEntrance,t,t.location,action)).toBe(true)
    expect(submitFirstAwakening(store,recoveryEntrance,t,t.location,action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state).toEqual(states[1])
  })
})
