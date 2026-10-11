import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlySupervision, earlySupervisionBlock, submitEarlySupervision, type EarlySupervisionAction } from '../src/core/early-supervision'
import { earlySupervisionSaveSummary, earlyTeachingSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlySupervision from '../src/ui/EarlySupervision'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true)
}
function act(state: ReturnType<typeof eligible>, operation: EarlySupervisionAction['operation'], marker?: number) {
  return advanceEarlySupervision(state, teacher, { ...state.earlyTraining.supervision, operation, marker })
}
describe('药老后山督练', () => {
  it('检查老师位置、正式传技和范围，旧归档不能代签', () => {
    const state = eligible()
    expect(earlySupervisionBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlySupervision(state, position, { ...state.earlyTraining.supervision, operation: 'begin' }).state).toBe(state)
    const unfinished = structuredClone(state); unfinished.earlyTraining.teaching.stage = 4
    expect(earlySupervisionBlock(unfinished, teacher)).toContain('正式传授')
    expect(earlySupervisionBlock(initialState(), teacher)).toContain('第2章')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(act(state, 'begin').state).toBe(state)
    expect(earlySupervisionSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlySupervision state={state} position={teacher} onBack={() => {}} />)).not.toContain('药老在后山')
  })
  it('四次合法承接逐断点自动/手动/备份，75%预警，不发主线奖励或恢复结果', async () => {
    let state = eligible()
    const before = structuredClone(state)
    state = act(state, 'begin').state
    for (let pulse = 0; pulse <= 4; pulse++) {
      state = parseSave(serializeSave(state))
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlySupervisionSaveSummary(state, state.settings))
      }
      if (pulse === 3) expect(renderToStaticMarkup(<EarlySupervision state={state} position={teacher} onBack={() => {}} />)).toContain('负荷已接近')
      if (pulse < 4) state = act(state, 'brace', pulse % 2 ? .65 : .35).state
    }
    before.earlyTraining.supervision = { stage: 2, pulses: 4, attempts: 0 }
    expect(state).toEqual(before)
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('承接 3/4')
    expect(earlySupervisionSaveSummary(state, state.settings)).toContain('待恢复')
    expect(earlyTeachingSaveSummary(state, state.settings)).toBe('老师传技 · 已归档')
    for (const operation of ['begin', 'brace', 'stop'] as const) expect(act(state, operation, .5).state).toBe(state)
  })
  it('失误与停练只清当前轮，免费重开，拒绝前一轮过期输入', () => {
    let state = act(eligible(), 'begin').state
    const before = structuredClone(state), stale = { ...state.earlyTraining.supervision, operation: 'brace' as const, marker: .5 }
    state = act(state, 'brace', 0).state
    expect(state.earlyTraining.supervision).toEqual({ stage: 0, pulses: 0, attempts: 1 })
    state = act(state, 'begin').state
    expect(advanceEarlySupervision(state, teacher, stale).state).toBe(state)
    state = act(state, 'brace', .5).state
    state = act(state, 'stop').state
    before.earlyTraining.supervision = { stage: 0, pulses: 0, attempts: 2 }
    expect(parseSave(serializeSave(state))).toEqual(before)
    state.earlyTraining.supervision.attempts = 1_000_000
    state = act(state, 'begin').state
    expect(act(state, 'stop').state).toBe(state)
  })
  it('非法动作、快照与marker不写档；旧版补未参与、新版严格校验组合', () => {
    const state = eligible()
    expect(act(state, 'brace', .5).state).toBe(state)
    const begun = act(state, 'begin').state
    for (const marker of [undefined, NaN, Infinity, -.1, 1.1, '0.5'])
      expect(act(begun, 'brace', marker as number).state).toBe(begun)
    for (const key of ['stage', 'pulses', 'attempts'] as const)
      for (const value of [-1, NaN, .5, Infinity, 9]) {
        const action = { ...begun.earlyTraining.supervision, operation: 'brace' as const, marker: .5, [key]: value }
        expect(advanceEarlySupervision(begun, teacher, action).state).toBe(begun)
      }
    expect(act(begun, 'bad' as 'brace').state).toBe(begun)
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.17.3'; delete old.earlyTraining.supervision
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const task of [{ stage: 0, pulses: 1, attempts: 0 }, { stage: 1, pulses: 4, attempts: 0 },
      { stage: 2, pulses: 3, attempts: 0 }, { stage: 3, pulses: 4, attempts: 0 },
      { stage: 1, pulses: 1, attempts: 1_000_001 }, { stage: 1, pulses: .5, attempts: 0 }]) {
      const bad = structuredClone(state); bad.earlyTraining.supervision = task
      expect(() => validateState(bad)).toThrow('重修')
    }
    const bad = structuredClone(begun); bad.earlyTraining.teaching.stage = 4
    expect(() => validateState(bad)).toThrow('重修')
    bad.earlyTraining.supervision = { stage: 0, pulses: 0, attempts: 1 }
    expect(() => validateState(bad)).toThrow('重修')
  })
  it('store读最新快照、成功一次自动保存，失败不写且保留runtime', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = { ...before.earlyTraining.supervision, operation: 'begin' as const }
    expect(submitEarlySupervision(store, teacher, action)).toBe(true)
    expect(submitEarlySupervision(store, teacher, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.supervision.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
