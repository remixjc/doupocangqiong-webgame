import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyNingSecond, earlyNingSecondBlock, submitEarlyNingSecond, ningSecondOperation, type NingSecondAction } from '../src/core/early-ning-second'
import { ningPlaces, moveNingWalker, nearNingPlace } from '../src/core/early-ning-first'
import { ningSecondScenes } from '../src/content/early-ning-second'
import { earlyNingSecondSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyNingSecond from '../src/ui/EarlyNingSecond'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
}
function action(state: ReturnType<typeof eligible>, operation?: NingSecondAction['operation'], marker?: number): NingSecondAction {
  const task = state.earlyTraining.ningSecond, scene = ningSecondScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: operation ?? ningSecondOperation(task),
    marker: marker ?? (task.stage === 4 && operation !== 'stop' ? .5 : undefined) }
}
function act(state: ReturnType<typeof eligible>, operation?: NingSecondAction['operation'], marker?: number) {
  const scene = ningSecondScenes[state.earlyTraining.ningSecond.stage]
  return advanceEarlyNingSecond(state, teacher, ningPlaces[scene?.place ?? 'stairs'], action(state, operation, marker))
}
function next(state: ReturnType<typeof eligible>, operation?: NingSecondAction['operation'], marker?: number) {
  const result = act(state, operation, marker); expect(result.ok, result.message).toBe(true); return result.state
}
describe('违规再攻用药与叫停已记，迎击后追加拳击才出场', () => {
  it('所有动作与静态断点JSON自动/手动/备份往返；仅再攻记录变化，全程仍pending', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.ningSecond.stage < 8) {
      const previous = state, scene = ningSecondScenes[state.earlyTraining.ningSecond.stage], input = action(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyNingSecond(state, teacher, ningPlaces[scene.place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 1].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyNingSecondSaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.ningSecond = before.earlyTraining.ningSecond
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.ningSecond
      expect(task.verdict).toBe('pending')
      if (task.stage === 4 && task.beats === 1) {
        expect(task.contact).toBe('met')
        expect(earlyNingSecondSaveSummary(state, state.settings)).toContain('尚待追加拳击')
      }
      if (task.stage >= 5) expect(task.contact).toBe('out')
    }
    expect(state.earlyTraining.ningSecond).toEqual({ stage: 8, beats: 2, attempts: 0, pill: 'used', ignored: true, contact: 'out', verdict: 'pending' })
    expect(act(state).state).toBe(state)
    expect(state.earlyTraining.ningFirst.pill).toBe('ning-held') // 首轮历史保留当时未服
  })
  it('错招/错时机/停下仅重开迎击；已经用药与叫停不回滚，非法和上限拒绝', () => {
    let state = eligible(); while (state.earlyTraining.ningSecond.stage < 4) state = next(state)
    const before = structuredClone(state)
    for (const marker of [undefined, NaN, Infinity, -1, 2])
      expect(advanceEarlyNingSecond(state, teacher, ningPlaces.arena, { ...action(state), marker }).state).toBe(state)
    expect(act(state, 'surge').state).toBe(state)
    state = next(state, 'strike'); expect(state.earlyTraining.ningSecond).toMatchObject({ stage: 3, beats: 0, attempts: 1, pill: 'used', ignored: true })
    state = next(state); state = next(state, 'octane', .35); const stale = action(state)
    state = next(state, 'octane'); expect(state.earlyTraining.ningSecond.contact).toBe('none')
    expect(advanceEarlyNingSecond(state, teacher, ningPlaces.arena, stale).state).toBe(state)
    state = next(state); state = next(state, 'stop'); state = next(state)
    state = next(state, 'octane', 0); state = next(state); state = next(state, 'push'); state = next(state)
    const cap = structuredClone(state); cap.earlyTraining.ningSecond.attempts = 1_000_000
    expect(act(cap, 'stop').state).toBe(cap); expect(act(cap, 'strike', 0).state).toBe(cap)
    state = next(state, 'octane', .65); state = next(state, 'strike', .5)
    expect(state.earlyTraining.ningSecond).toEqual({ stage: 5, beats: 2, attempts: 5, pill: 'used', ignored: true, contact: 'out', verdict: 'pending' })
    const comparison = structuredClone(state); comparison.earlyTraining.ningSecond = before.earlyTraining.ningSecond
    expect(comparison).toEqual(before)
  })
  it('旧0.31补未参与，新缺字段/矛盾阶段/药物/叫停/出场/裁定/前置严格拒绝，错身份与位置不写', () => {
    let state = eligible(); const old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.31.0'; delete old.earlyTraining.ningSecond
    expect(validateState(old).earlyTraining.ningSecond).toEqual(state.earlyTraining.ningSecond)
    old.contentVersion = '0.32.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.ningSecond
      for (const change of [{ stage: -1 }, { stage: 9 }, { stage: .5 }, { beats: 3 }, { attempts: -1 }, { attempts: 1_000_001 },
        { pill: task.pill === 'used' ? 'ning-held' : 'used' }, { ignored: !task.ignored },
        { contact: task.contact === 'none' ? 'out' : 'none' }, { verdict: 'xiaoyan' }]) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.ningSecond, change)
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 8) break
      const scene = ningSecondScenes[task.stage], input = action(state)
      expect(advanceEarlyNingSecond(state, { x: 0, y: 0 }, ningPlaces[scene.place], input).state).toBe(state)
      expect(advanceEarlyNingSecond(state, teacher, { x: 300, y: 160 }, input).state).toBe(state)
      expect(advanceEarlyNingSecond(state, teacher, { x: NaN, y: 280 }, input).state).toBe(state)
      expect(advanceEarlyNingSecond(state, teacher, ningPlaces[scene.place], { ...input, actor: input.actor === 'observe' ? 'xiaoyan' : 'observe' }).state).toBe(state)
      expect(advanceEarlyNingSecond(state, teacher, ningPlaces[scene.place], { ...input, ignored: !input.ignored }).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.ningFirst.stage = 9
      expect(earlyNingSecondBlock(bad, teacher)).not.toBe('')
      if (task.stage) expect(() => validateState(bad)).toThrow()
      state = next(state)
    }
  })
  it('阶梯实走可达、栏边阻挡，store只成功保存不动runtime、断点画面与防剧透', async () => {
    let position: { x: number; y: number } = { ...ningPlaces.stairs }
    for (let i = 0; i < 4; i++) position = moveNingWalker(position, 'up')
    expect(nearNingPlace(position, 'arena')).toBe(true)
    for (let i = 0; i < 4; i++) position = moveNingWalker(position, 'down')
    expect(nearNingPlace(position, 'stairs')).toBe(true)
    const edge = { x: 540, y: 240 }; expect(moveNingWalker(edge, 'up')).toBe(edge)
    let state = eligible(); while (state.earlyTraining.ningSecond.stage < 4) state = next(state)
    const input = action(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyNingSecond(store, teacher, ningPlaces.stairs, input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyNingSecond(store, teacher, ningPlaces.arena, input)).toBe(true)
    expect(submitEarlyNingSecond(store, teacher, ningPlaces.arena, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(renderToStaticMarkup(<EarlyNingSecond state={store.getSnapshot().state} position={teacher} onBack={() => {}} />)).toContain('八极崩已对拳迎击，萧宁尚未出场')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlyNingSecondSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyNingSecond state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/萧宁|药物|拳击|迎击/)
  })
})
