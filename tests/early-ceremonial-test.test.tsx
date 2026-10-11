import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyCeremonialTest, earlyCeremonialTestBlock, submitEarlyCeremonialTest, ceremonialPlaces,
  moveCeremonialWalker, validCeremonialPosition, nearCeremonialPlace, type CeremonialTestAction } from '../src/core/early-ceremonial-test'
import { ceremonialTestScenes } from '../src/content/early-ceremonial-test'
import { earlyCeremonialTestSaveSummary, earlyCeremonyGuestsSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyCeremonialTest from '../src/ui/EarlyCeremonialTest'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
}
function action(state: ReturnType<typeof eligible>): CeremonialTestAction {
  const scene = ceremonialTestScenes[state.earlyTraining.ceremonialTest.stage]
  return { ...state.earlyTraining.ceremonialTest, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' }
}
function next(state: ReturnType<typeof eligible>) {
  const scene = ceremonialTestScenes[state.earlyTraining.ceremonialTest.stage]
  const result = advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces[scene?.place ?? 'waiting'], action(state))
  expect(result.ok, result.message).toBe(true); return result.state
}
describe('二长老仪式、压缩时段、验碑与本人正式八段分开', () => {
  it('13断点JSON/自动手动备份往返，不能从故事八段/观察验碑代签本人结果，其他状态完全保留', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    expect(state.earlyTraining.eighthTraining.result).toBe('eighth-duan')
    expect(state.earlyTraining.ceremonialTest.result).toBe('unmeasured')
    while (state.earlyTraining.ceremonialTest.stage < 13) {
      const previous = state, scene = ceremonialTestScenes[state.earlyTraining.ceremonialTest.stage], input = action(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces[scene.place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(2, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 2].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyCeremonialTestSaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.ceremonialTest = before.earlyTraining.ceremonialTest
      expect(comparison).toEqual(before)
      expect(earlyCeremonyGuestsSaveSummary(state, state.settings)).not.toContain('尚待开礼')
      if (state.earlyTraining.ceremonialTest.stage === 5) expect(state.earlyTraining.ceremonialTest.rite).toBe('reviewed')
      if (state.earlyTraining.ceremonialTest.stage === 8) {
        expect(state.earlyTraining.ceremonialTest.result).toBe('unmeasured')
        expect(earlyCeremonialTestSaveSummary(state, state.settings)).toContain('本人尚未测')
      }
    }
    expect(state.earlyTraining.ceremonialTest).toEqual({ stage: 13, rite: 'ended', inspected: true, result: 'eighth-duan' })
    expect(advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces.waiting, action(state)).state).toBe(state)
  })
  it('旧0.29空迁移，新版缺字段/错误礼程与验碑/结果组合/缺前置/错人物步骤地点均拒绝', () => {
    let state = eligible(); const old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.29.0'; delete old.earlyTraining.ceremonialTest
    expect(validateState(old).earlyTraining.ceremonialTest).toEqual(state.earlyTraining.ceremonialTest)
    old.contentVersion = '0.30.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.ceremonialTest
      for (const change of [{ stage: -1 }, { stage: 14 }, { stage: .5 }, { rite: task.rite === 'none' ? 'ended' : 'none' },
        { inspected: !task.inspected }, { result: task.result === 'unmeasured' ? 'eighth-duan' : 'unmeasured' }]) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.ceremonialTest, change)
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 13) break
      const scene = ceremonialTestScenes[task.stage], input = action(state)
      expect(advanceEarlyCeremonialTest(state, { x: 0, y: 0 }, ceremonialPlaces[scene.place], input).state).toBe(state)
      expect(advanceEarlyCeremonialTest(state, teacher, { x: 300, y: 160 }, input).state).toBe(state)
      expect(advanceEarlyCeremonialTest(state, teacher, { x: NaN, y: 280 }, input).state).toBe(state)
      expect(advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces[scene.place], { ...input, actor: input.actor === 'observe' ? 'xiaoyan' : 'observe' }).state).toBe(state)
      expect(advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces[scene.place], { ...input, operation: input.operation === 'touch' ? 'inspect' : 'touch' }).state).toBe(state)
      expect(advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces[scene.place], { ...input, inspected: !input.inspected }).state).toBe(state)
      if (scene.place === 'monument') expect(advanceEarlyCeremonialTest(state, teacher, ceremonialPlaces.waiting, input).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.ceremonyGuests.stage = 11
      expect(earlyCeremonialTestBlock(bad, teacher)).not.toBe('')
      if (task.stage) expect(() => validateState(bad)).toThrow()
      state = next(state)
    }
  })
  it('叫名前木台不可进，叫名后只沿阶梯进入；各合法阶段目标可实际步行到达', () => {
    const step = { x: 440, y: 240 }
    expect(moveCeremonialWalker(step, 'up', 1)).toBe(step)
    expect(moveCeremonialWalker(step, 'up', 2)).toEqual({ x: 440, y: 220 })
    const edge = { x: 580, y: 240 }
    expect(moveCeremonialWalker(edge, 'up', 2)).toBe(edge)
    for (const [stage, scene] of ceremonialTestScenes.entries()) {
      const queue: { x: number; y: number }[] = [{ ...ceremonialPlaces.waiting }], visited = new Map<string, { x: number; y: number }>()
      while (queue.length) {
        const position = queue.shift()!, key = `${position.x},${position.y}`
        if (visited.has(key)) continue
        visited.set(key, position); expect(validCeremonialPosition(position, stage)).toBe(true)
        for (const direction of ['up', 'left', 'down', 'right'] as const) {
          const next = moveCeremonialWalker(position, direction, stage)
          if (!visited.has(`${next.x},${next.y}`)) queue.push(next)
        }
      }
      expect([...visited.values()].some(position => nearCeremonialPlace(position, scene.place, stage))).toBe(true)
    }
  })
  it('store成功才保存且幂等不改runtime，石碑状态图形严格区分验毕与八段，范围封存', async () => {
    let state = eligible(); while (state.earlyTraining.ceremonialTest.stage < 8) state = next(state)
    let writes = 0; const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const input = action(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    expect(submitEarlyCeremonialTest(store, teacher, ceremonialPlaces.waiting, input)).toBe(false); expect(writes).toBe(0)
    const before = renderToStaticMarkup(<EarlyCeremonialTest state={state} position={teacher} onBack={() => {}} />)
    expect(before).toContain('正式黑碑已验，本人尚未触碑'); expect(before).not.toContain('正式黑碑显示斗之气八段')
    expect(submitEarlyCeremonialTest(store, teacher, ceremonialPlaces.monument, input)).toBe(true)
    expect(submitEarlyCeremonialTest(store, teacher, ceremonialPlaces.monument, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(renderToStaticMarkup(<EarlyCeremonialTest state={store.getSnapshot().state} position={teacher} onBack={() => {}} />)).toContain('正式黑碑显示斗之气八段')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlyCeremonialTestSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyCeremonialTest state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/八段|二长老|木台|石碑/)
  })
})
