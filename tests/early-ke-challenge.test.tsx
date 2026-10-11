import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyKeChallenge, earlyKeChallengeBlock, submitEarlyKeChallenge, keChallengePlaces, type KeChallengeAction } from '../src/core/early-ke-challenge'
import { keChallengeScenes } from '../src/content/early-ke-challenge'
import { earlyKeChallengeSaveSummary, earlyPreliminarySaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyKeChallenge from '../src/ui/EarlyKeChallenge'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
}
function action(state: ReturnType<typeof eligible>, operation?: KeChallengeAction['operation'], marker?: number): KeChallengeAction {
  const task = state.earlyTraining.keChallenge, scene = keChallengeScenes[task.stage]
  return { ...task, operation: operation ?? (task.stage === 3 ? task.beats === 0 ? 'evade-left' : 'low-palm' : scene?.operation ?? 'archive'),
    marker: marker ?? (task.stage === 3 && operation !== 'stop' ? .5 : undefined) }
}
function act(state: ReturnType<typeof eligible>, operation?: KeChallengeAction['operation'], marker?: number) {
  const scene = keChallengeScenes[state.earlyTraining.keChallenge.stage]
  return advanceEarlyKeChallenge(state, teacher, keChallengePlaces[scene?.place ?? 'fork'], action(state, operation, marker))
}
function next(state: ReturnType<typeof eligible>, operation?: KeChallengeAction['operation'], marker?: number) {
  const result = act(state, operation, marker); expect(result.ok, result.message).toBe(true); return result.state
}
describe('萧克六段挑战，左侧避/低阶击肩/父亲宣布/离场邀请分开', () => {
  it('断点全链存档与备份；倒地仍待宣布，所有主线/钱账/材料/名簿/关系保留', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.keChallenge.stage < 12) {
      const previous = state, scene = keChallengeScenes[state.earlyTraining.keChallenge.stage], input = action(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyKeChallenge(state, teacher, keChallengePlaces[scene.place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyKeChallengeSaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      expect(earlyPreliminarySaveSummary(state, state.settings)).not.toContain('待挑战')
      const comparison = structuredClone(state); comparison.earlyTraining.keChallenge = before.earlyTraining.keChallenge
      expect(comparison).toEqual(before)
      if (state.earlyTraining.keChallenge.stage === 4) {
        expect(state.earlyTraining.keChallenge.verdict).toBe('pending')
        expect(earlyKeChallengeSaveSummary(state, state.settings)).toContain('待父亲宣布')
      }
    }
    expect(state.earlyTraining.keChallenge).toEqual({ stage: 12, beats: 2, attempts: 0, verdict: 'xiaoyan', invitation: 'offered' })
    expect(earlyPreliminarySaveSummary(state, state.settings)).toContain('后续应战已归档')
    expect(act(state).state).toBe(state)
  })
  it('错时机/方向/八极崩免费重开，主动停下；拒过期、非法时机、上限重试', () => {
    let state = eligible()
    while (state.earlyTraining.keChallenge.stage < 3) state = next(state)
    const before = structuredClone(state)
    for (const marker of [undefined, NaN, Infinity, -1, 2])
      expect(advanceEarlyKeChallenge(state, teacher, keChallengePlaces.arena, { ...action(state), marker }).state).toBe(state)
    expect(act(state, 'announce').state).toBe(state)
    state = next(state, 'evade-left', 0)
    expect(state.earlyTraining.keChallenge).toMatchObject({ stage: 2, beats: 0, attempts: 1, verdict: 'none' })
    state = next(state); state = next(state, 'evade-right')
    expect(state.earlyTraining.keChallenge.attempts).toBe(2)
    state = next(state); state = next(state, 'evade-left', .35)
    const oldInput = action(state)
    state = next(state, 'octane-blast', .5)
    expect(state.earlyTraining.keChallenge).toMatchObject({ stage: 2, beats: 0, attempts: 3 })
    expect(advanceEarlyKeChallenge(state, teacher, keChallengePlaces.arena, oldInput).state).toBe(state)
    state = next(state); state = next(state, 'stop')
    expect(state.earlyTraining.keChallenge.attempts).toBe(4)
    state = next(state)
    const limit = structuredClone(state); limit.earlyTraining.keChallenge.attempts = 1_000_000
    expect(act(limit, 'evade-left', 0).state).toBe(limit); expect(act(limit, 'evade-left', .5).ok).toBe(true)
    state = next(state, 'evade-left', .65); state = next(state, 'low-palm', .35)
    expect(state.earlyTraining.keChallenge).toMatchObject({ stage: 4, verdict: 'pending' })
    const comparison = structuredClone(state); comparison.earlyTraining.keChallenge = before.earlyTraining.keChallenge
    expect(comparison).toEqual(before)
    expect(act(state, 'octane-blast', .5).state).toBe(state)
  })
  it('旧档只补未参与，新版缺字段/前置/胜负/动作数/邀请组合强校，非法地点不写', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.26.0'; delete old.earlyTraining.keChallenge
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion; expect(() => validateState(old)).toThrow('重修')
    let current = state
    do {
      for (const change of [{ stage: -1 }, { stage: NaN }, { stage: .5 }, { stage: 13 }, { beats: 3 }, { attempts: Infinity },
        { verdict: current.earlyTraining.keChallenge.verdict === 'none' ? 'pending' : 'none' },
        { invitation: current.earlyTraining.keChallenge.invitation === 'none' ? 'offered' : 'none' }]) {
        const bad = structuredClone(current); Object.assign(bad.earlyTraining.keChallenge, change)
        expect(() => validateState(bad)).toThrow('重修'); expect(act(bad).state).toBe(bad)
      }
      if (current.earlyTraining.keChallenge.stage === 12) break
      const input = action(current), scene = keChallengeScenes[current.earlyTraining.keChallenge.stage]
      expect(advanceEarlyKeChallenge(current, { x: 0, y: 0 }, keChallengePlaces[scene.place], input).state).toBe(current)
      for (const position of [{ x: NaN, y: 300 }, { x: 165, y: 110 }, { x: 490, y: 300 }, { x: 720, y: 400 }])
        expect(advanceEarlyKeChallenge(current, teacher, position, input).state).toBe(current)
      current = next(current)
      const bad = structuredClone(current); bad.earlyTraining.preliminary.stage = 15
      expect(() => validateState(bad)).toThrow('重修'); expect(earlyKeChallengeBlock(bad, teacher)).toContain('归档')
    } while (true)
  })
  it('范围封存不透出挑战与结果，store只有成功步骤写入且不重复裁定/runtime', async () => {
    let state = eligible(); while (state.earlyTraining.keChallenge.stage < 4) state = next(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime, input = action(before)
    expect(submitEarlyKeChallenge(store, teacher, keChallengePlaces.waiting, input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyKeChallenge(store, teacher, keChallengePlaces.arena, input)).toBe(true)
    expect(submitEarlyKeChallenge(store, teacher, keChallengePlaces.arena, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    before.earlyTraining.keChallenge.stage = 5; before.earlyTraining.keChallenge.verdict = 'xiaoyan'
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(renderToStaticMarkup(<EarlyKeChallenge state={before} position={teacher} onBack={() => {}} />)).toContain('父亲已宣布萧克败')
    before.settings.spoiler = 'anime'; before.settings.animeLimit = 2
    expect(earlyKeChallengeSaveSummary(before, before.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyKeChallenge state={before} position={teacher} onBack={() => {}} />)).not.toMatch(/萧克|六段|低阶|邀请/)
  })
})
