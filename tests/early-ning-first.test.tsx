import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyNingFirst, earlyNingFirstBlock, submitEarlyNingFirst, ningPlaces,
  ningFirstOperation, moveNingWalker, nearNingPlace, type NingFirstAction } from '../src/core/early-ning-first'
import { ningFirstScenes } from '../src/content/early-ning-first'
import { earlyNingFirstSaveSummary, earlyCeremonialTestSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyNingFirst from '../src/ui/EarlyNingFirst'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
}
function action(state: ReturnType<typeof eligible>, operation?: NingFirstAction['operation'], marker?: number): NingFirstAction {
  const task = state.earlyTraining.ningFirst, scene = ningFirstScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: operation ?? ningFirstOperation(task),
    marker: marker ?? (task.stage === 6 && operation !== 'stop' ? .5 : undefined) }
}
function act(state: ReturnType<typeof eligible>, operation?: NingFirstAction['operation'], marker?: number) {
  const scene = ningFirstScenes[state.earlyTraining.ningFirst.stage]
  return advanceEarlyNingFirst(state, teacher, ningPlaces[scene?.place ?? 'stairs'], action(state, operation, marker))
}
function next(state: ReturnType<typeof eligible>, operation?: NingFirstAction['operation'], marker?: number) {
  const result = act(state, operation, marker); expect(result.ok, result.message).toBe(true); return result.state
}
describe('萧宁持药未服，首轮推拉推后只pending', () => {
  it('逐动作JSON自动/手动/备份往返；所有其他状态和奖励完全保留，终点不是最终胜利', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.ningFirst.stage < 10) {
      const previous = state, scene = ningFirstScenes[state.earlyTraining.ningFirst.stage], input = action(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyNingFirst(state, teacher, ningPlaces[scene.place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 1].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyNingFirstSaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.ningFirst = before.earlyTraining.ningFirst
      expect(comparison).toEqual(before)
      expect(earlyCeremonialTestSaveSummary(state, state.settings)).not.toContain('尚待挑战')
      if (state.earlyTraining.ningFirst.stage >= 7) {
        expect(state.earlyTraining.ningFirst.verdict).toBe('pending')
        expect(earlyNingFirstSaveSummary(state, state.settings)).toContain('仍待裁判')
      }
    }
    expect(state.earlyTraining.ningFirst).toEqual({ stage: 10, beats: 3, attempts: 0, pill: 'ning-held', verdict: 'pending' })
    expect(act(state).state).toBe(state)
  })
  it('错次序/八极崩/时机/停下仅免费重开首轮，药物持有和其他状态不改；非法/过期/上限拒绝', () => {
    let state = eligible(); while (state.earlyTraining.ningFirst.stage < 6) state = next(state)
    const before = structuredClone(state)
    for (const marker of [undefined, NaN, Infinity, -1, 2])
      expect(advanceEarlyNingFirst(state, teacher, ningPlaces.arena, { ...action(state), marker }).state).toBe(state)
    expect(act(state, 'claim').state).toBe(state)
    state = next(state, 'pull'); expect(state.earlyTraining.ningFirst).toMatchObject({ stage: 5, beats: 0, attempts: 1 })
    state = next(state); state = next(state, 'push', .35); const stale = action(state)
    state = next(state, 'octane')
    expect(advanceEarlyNingFirst(state, teacher, ningPlaces.arena, stale).state).toBe(state)
    state = next(state); state = next(state, 'stop'); expect(state.earlyTraining.ningFirst.attempts).toBe(3)
    state = next(state); const cap = structuredClone(state); cap.earlyTraining.ningFirst.attempts = 1_000_000
    expect(act(cap, 'stop').state).toBe(cap); expect(act(cap, 'push', 0).state).toBe(cap)
    state = next(state, 'push', 0); state = next(state)
    state = next(state, 'push', .65); state = next(state, 'pull', .5); state = next(state, 'push', .5)
    expect(state.earlyTraining.ningFirst).toEqual({ stage: 7, beats: 3, attempts: 4, pill: 'ning-held', verdict: 'pending' })
    const comparison = structuredClone(state); comparison.earlyTraining.ningFirst = before.earlyTraining.ningFirst
    expect(comparison).toEqual(before)
  })
  it('旧0.30补未参与，新版缺字段/矛盾动作阶段/药物/裁定/前置拒绝；错人物、位置和快照不写', () => {
    let state = eligible(); const old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.30.0'; delete old.earlyTraining.ningFirst
    expect(validateState(old).earlyTraining.ningFirst).toEqual(state.earlyTraining.ningFirst)
    old.contentVersion = '0.31.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.ningFirst
      for (const change of [{ stage: -1 }, { stage: 11 }, { stage: .5 }, { beats: 4 }, { attempts: -1 }, { attempts: 1_000_001 },
        { pill: task.pill === 'unseen' ? 'ning-held' : 'unseen' }, { verdict: task.verdict === 'none' ? 'pending' : 'none' }]) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.ningFirst, change)
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 10) break
      const scene = ningFirstScenes[task.stage], input = action(state)
      expect(advanceEarlyNingFirst(state, { x: 0, y: 0 }, ningPlaces[scene.place], input).state).toBe(state)
      expect(advanceEarlyNingFirst(state, teacher, { x: 300, y: 160 }, input).state).toBe(state)
      expect(advanceEarlyNingFirst(state, teacher, { x: NaN, y: 280 }, input).state).toBe(state)
      expect(advanceEarlyNingFirst(state, teacher, ningPlaces[scene.place], { ...input, actor: input.actor === 'observe' ? 'xiaoyan' : 'observe' }).state).toBe(state)
      expect(advanceEarlyNingFirst(state, teacher, ningPlaces[scene.place], { ...input, pill: input.pill === 'unseen' ? 'ning-held' : 'unseen' }).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.ceremonialTest.stage = 12
      expect(earlyNingFirstBlock(bad, teacher)).not.toBe('')
      if (task.stage) expect(() => validateState(bad)).toThrow()
      state = next(state)
    }
  })
  it('地图栏边与阶梯通行，store成功才保存不改runtime；待裁判画面/范围封存没有最终胜利', async () => {
    expect(moveNingWalker({ x: 440, y: 240 }, 'up')).toEqual({ x: 440, y: 220 })
    const edge = { x: 540, y: 240 }; expect(moveNingWalker(edge, 'up')).toBe(edge)
    for (const place of Object.keys(ningPlaces) as (keyof typeof ningPlaces)[]) expect(nearNingPlace(ningPlaces[place], place)).toBe(true)
    let state = eligible(); while (state.earlyTraining.ningFirst.stage < 6) state = next(state)
    state = next(state); state = next(state); const input = action(state)
    let writes = 0; const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyNingFirst(store, teacher, ningPlaces.waiting, input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyNingFirst(store, teacher, ningPlaces.arena, input)).toBe(true)
    expect(submitEarlyNingFirst(store, teacher, ningPlaces.arena, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state.earlyTraining.ningFirst.verdict).toBe('pending')
    const markup = renderToStaticMarkup(<EarlyNingFirst state={store.getSnapshot().state} position={teacher} onBack={() => {}} />)
    expect(markup).toContain('萧宁首轮倒地，裁判尚未最终宣布')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlyNingFirstSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyNingFirst state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/萧宁|药物|倒地|推拉/)
  })
})
