import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyPalmPair, earlyPalmPairBlock, submitEarlyPalmPair } from '../src/core/early-palm-pair'
import { palmPairScenes } from '../src/content/early-palm-pair'
import { earlyPalmPairSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyPalmPair from '../src/ui/EarlyPalmPair'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
}
function act(state: ReturnType<typeof eligible>, marker?: number) {
  const task = state.earlyTraining.palmPair, scene = palmPairScenes[task.stage]
  return advanceEarlyPalmPair(state, teacher, scene?.station ?? 'door', { ...task, operation: scene?.operation ?? 'archive', marker })
}
function next(state: ReturnType<typeof eligible>, marker?: number) {
  const result = act(state, marker); expect(result.ok, result.message).toBe(true); return result.state
}
describe('两只练习花瓶，吸掌/直接推风和吹火掌分开', () => {
  it('全序列和逐断点存档保留其他全部记录，首瓶已碎尚未传技，最终两瓶各有结果', async () => {
    let state = eligible()
    const before = structuredClone(state)
    while (state.earlyTraining.palmPair.stage < 10) {
      const task = state.earlyTraining.palmPair, scene = palmPairScenes[task.stage]
      const marker = [5, 8].includes(task.stage) ? .5 : undefined
      const input = { ...task, operation: scene.operation, marker }
      state = parseSave(serializeSave(next(state, marker)))
      expect(advanceEarlyPalmPair(state, teacher, scene.station, input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyPalmPairSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state); comparison.earlyTraining.palmPair = before.earlyTraining.palmPair
      expect(comparison).toEqual(before)
      if (state.earlyTraining.palmPair.stage === 2) expect(state.earlyTraining.palmPair).toMatchObject({ first: 'intact', teaching: 'unlearned' })
      if (state.earlyTraining.palmPair.stage === 4) {
        expect(state.earlyTraining.palmPair).toMatchObject({ first: 'fragments', second: 'intact', teaching: 'unlearned' })
        expect(earlyPalmPairSaveSummary(state, state.settings)).toContain('尚未学')
      }
    }
    expect(state.earlyTraining.palmPair).toEqual({ stage: 10, beats: 2, attempts: 0, first: 'fragments', second: 'dust', teaching: 'basic', period: 'reviewed' })
    expect(state.earlyTraining.consignment).toMatchObject({ product: 'sealed', owner: 'xiaoyan' })
    expect(saveRecordSummary((await listSlots()).find(record => record.slot === -1)!, state.settings)).toContain('待归档')
    expect(act(state).state).toBe(state)
  })
  it('错序/入口/站位/快照/重复拒绝，基础免费重练和组合失败只能归位第二只', () => {
    let state = eligible()
    const input = { ...state.earlyTraining.palmPair, operation: 'ready' as const }
    for (const position of [{ x: 0, y: 0 }, { x: NaN, y: 310 }]) expect(advanceEarlyPalmPair(state, position, 'door', input).state).toBe(state)
    expect(advanceEarlyPalmPair(state, teacher, 'table', input).state).toBe(state)
    expect(advanceEarlyPalmPair(state, teacher, 'door', { ...input, first: 'pulled' }).state).toBe(state)
    expect(act(state, .5).state).toBe(state)
    while (state.earlyTraining.palmPair.stage < 5) state = next(state)
    for (const marker of [undefined, NaN, Infinity, -1, 2]) expect(act(state, marker).state).toBe(state)
    state = next(state, .5); state = next(state, 0)
    expect(state.earlyTraining.palmPair).toMatchObject({ stage: 5, beats: 0, attempts: 1, first: 'fragments', second: 'intact', teaching: 'explained' })
    state = next(state, .35); state = next(state, .65); state = next(state)
    expect(state.earlyTraining.palmPair.stage).toBe(7)
    state = next(state)
    const pending = { ...state.earlyTraining.palmPair, operation: 'palm-second' as const, marker: .5 }
    state = next(state, 0)
    expect(state.earlyTraining.palmPair).toMatchObject({ stage: 7, first: 'fragments', second: 'intact', attempts: 2, teaching: 'basic', beats: 2 })
    expect(advanceEarlyPalmPair(state, teacher, 'table', pending).state).toBe(state)
    state = next(state)
    const limit = structuredClone(state); limit.earlyTraining.palmPair.attempts = 1_000_000
    expect(act(limit, 0).state).toBe(limit); expect(act(limit, .5).ok).toBe(true)
  })
  it('旧七段档补未参与，新版缺字段、两瓶/传技/时期组合及前置强校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.24.0'; delete old.earlyTraining.palmPair
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    let current = state
    do {
      for (const change of [{ stage: -1 }, { stage: NaN }, { stage: .5 }, { stage: 11 }, { beats: 3 }, { attempts: Infinity },
        { first: current.earlyTraining.palmPair.first === 'intact' ? 'fragments' : 'intact' },
        { second: current.earlyTraining.palmPair.second === 'intact' ? 'dust' : 'intact' },
        { teaching: current.earlyTraining.palmPair.teaching === 'basic' ? 'unlearned' : 'basic' },
        { period: current.earlyTraining.palmPair.period === 'reviewed' ? 'unreviewed' : 'reviewed' }]) {
        const bad = structuredClone(current); Object.assign(bad.earlyTraining.palmPair, change)
        expect(() => validateState(bad)).toThrow('重修'); expect(act(bad).state).toBe(bad)
      }
      if (current.earlyTraining.palmPair.stage === 10) break
      current = parseSave(serializeSave(next(current, [5, 8].includes(current.earlyTraining.palmPair.stage) ? .5 : undefined)))
      const bad = structuredClone(current); bad.earlyTraining.seventhRoom.stage = 7
      expect(() => validateState(bad)).toThrow('重修')
    } while (true)
  })
  it('第3章范围封存，剧情不赋予大斗师外放，未归档七段不可入场', () => {
    const state = eligible(), pending = structuredClone(state); pending.earlyTraining.seventhRoom.stage = 7
    expect(earlyPalmPairBlock(pending, teacher)).toContain('归档')
    expect(renderToStaticMarkup(<EarlyPalmPair state={state} position={teacher} onBack={() => {}} />)).toContain('父亲赠回')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(act(state).state).toBe(state)
    expect(earlyPalmPairSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyPalmPair state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/吸掌|吹火掌|花瓶/)
  })
  it('store只更新往事，错站不写，过期不重复破瓶/runtime与奖励保留', async () => {
    let state = eligible()
    while (state.earlyTraining.palmPair.stage < 3) state = next(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const input = { ...before.earlyTraining.palmPair, operation: 'wind-first' as const }
    expect(submitEarlyPalmPair(store, teacher, 'teacher', input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyPalmPair(store, teacher, 'table', input)).toBe(true)
    expect(submitEarlyPalmPair(store, teacher, 'table', input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.palmPair.stage = 4; before.earlyTraining.palmPair.first = 'fragments'
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
