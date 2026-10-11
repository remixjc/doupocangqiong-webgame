import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyPreliminary, earlyPreliminaryBlock, submitEarlyPreliminary, preliminaryPlaces, preliminaryStart,
  movePreliminaryWalker, nearPreliminaryPlace, validPreliminaryPosition } from '../src/core/early-preliminary'
import { preliminaryScenes } from '../src/content/early-preliminary'
import { earlyPreliminarySaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyPreliminary from '../src/ui/EarlyPreliminary'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
}
function input(state: ReturnType<typeof eligible>) {
  const task = state.earlyTraining.preliminary, scene = preliminaryScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' } as const
}
function next(state: ReturnType<typeof eligible>) {
  const scene = preliminaryScenes[state.earlyTraining.preliminary.stage]
  const result = advanceEarlyPreliminary(state, teacher, preliminaryPlaces[scene?.place ?? 'waiting'], input(state))
  expect(result.ok, result.message).toBe(true)
  return result.state
}
describe('一月前预测，逐人点名、本人近碑与三个独立结果', () => {
  it('完整断点自动/手动/上一份备份，全部钱账、奖励、故事实例和主线不变量', async () => {
    let state = eligible()
    const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.preliminary.stage < 16) {
      const previous = state, scene = preliminaryScenes[state.earlyTraining.preliminary.stage], action = input(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyPreliminary(state, teacher, preliminaryPlaces[scene.place], action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyPreliminarySaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.preliminary = before.earlyTraining.preliminary
      expect(comparison).toEqual(before)
      if (state.earlyTraining.preliminary.stage === 6) expect(state.earlyTraining.preliminary).toMatchObject({ mei: 'eighth-duan', yan: 'unmeasured', xuner: 'unmeasured' })
      if (state.earlyTraining.preliminary.stage === 8) expect(state.earlyTraining.preliminary).toMatchObject({ xuner: 'one-star', yan: 'unmeasured' })
      if (state.earlyTraining.preliminary.stage === 11) expect(earlyPreliminarySaveSummary(state, state.settings)).toContain('待宣读')
    }
    expect(state.earlyTraining.preliminary).toEqual({ stage: 16, mei: 'eighth-duan', xuner: 'one-star', yan: 'seventh-duan' })
    expect(earlyPreliminarySaveSummary(state, state.settings)).toContain('待挑战')
    expect(advanceEarlyPreliminary(state, teacher, preliminaryPlaces.waiting, input(state)).state).toBe(state)
  })
  it('每阶段拒错人物、错序、整记录过期；本人远离黑碑不得写本人结果', () => {
    let state = eligible()
    do {
      const action = input(state), scene = preliminaryScenes[state.earlyTraining.preliminary.stage]
      for (const position of [{ x: NaN, y: 300 }, { x: 165, y: 110 }, { x: 490, y: 300 }, { x: 720, y: 400 }])
        expect(advanceEarlyPreliminary(state, teacher, position, action).state).toBe(state)
      expect(advanceEarlyPreliminary(state, { x: 0, y: 0 }, preliminaryPlaces[scene.place], action).state).toBe(state)
      expect(advanceEarlyPreliminary(state, teacher, preliminaryPlaces[scene.place], { ...action, actor: action.actor === 'xiaoyan' ? 'xuner' : 'xiaoyan' }).state).toBe(state)
      expect(advanceEarlyPreliminary(state, teacher, preliminaryPlaces[scene.place], { ...action, operation: action.operation === 'touch' ? 'archive' : 'touch' }).state).toBe(state)
      expect(advanceEarlyPreliminary(state, teacher, preliminaryPlaces[scene.place], { ...action, yan: 'one-star' as never }).state).toBe(state)
      if (state.earlyTraining.preliminary.stage === 10)
        expect(advanceEarlyPreliminary(state, teacher, preliminaryPlaces.waiting, action).state).toBe(state)
      state = next(state)
    } while (state.earlyTraining.preliminary.stage < 16)
  })
  it('旧档仅补未参与，不从七段或第3章首通代签，版本/角色成绩/前置严校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.25.0'; delete old.earlyTraining.preliminary
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    let current = state
    do {
      for (const change of [{ stage: -1 }, { stage: NaN }, { stage: .5 }, { stage: 17 },
        { mei: current.earlyTraining.preliminary.mei === 'unmeasured' ? 'eighth-duan' : 'unmeasured' },
        { xuner: 'seventh-duan' }, { yan: 'eighth-duan' }]) {
        const bad = structuredClone(current); Object.assign(bad.earlyTraining.preliminary, change)
        expect(() => validateState(bad)).toThrow('重修')
        expect(advanceEarlyPreliminary(bad, teacher, preliminaryPlaces.waiting, input(bad)).state).toBe(bad)
      }
      if (current.earlyTraining.preliminary.stage === 16) break
      current = next(current)
      const bad = structuredClone(current); bad.earlyTraining.palmPair.stage = 9
      expect(() => validateState(bad)).toThrow('重修')
      expect(earlyPreliminaryBlock(bad, teacher)).toContain('归档')
    } while (true)
  })
  it('地图全地点网格可达，障碍与边界无法穿越，不用点地点瞬移', () => {
    const queue = [{ ...preliminaryStart }], seen = new Set<string>()
    while (queue.length) {
      const position = queue.shift()!, id = `${position.x},${position.y}`
      if (seen.has(id)) continue
      seen.add(id); expect(validPreliminaryPosition(position)).toBe(true)
      for (const direction of ['up', 'down', 'left', 'right'] as const) {
        const next = movePreliminaryWalker(position, direction)
        if (!seen.has(`${next.x},${next.y}`)) queue.push(next)
      }
    }
    for (const place of Object.keys(preliminaryPlaces) as (keyof typeof preliminaryPlaces)[])
      expect([...seen].some(id => { const [x, y] = id.split(',').map(Number); return nearPreliminaryPlace({ x, y }, place) })).toBe(true)
    expect(movePreliminaryWalker({ x: 420, y: 300 }, 'right')).toEqual({ x: 420, y: 300 })
    expect(movePreliminaryWalker({ x: 40, y: 360 }, 'left')).toEqual({ x: 40, y: 360 })
  })
  it('防剧透封存不漏角色结果，store错角色不写且重复触碑不刷奖励/runtime', async () => {
    let state = eligible()
    while (state.earlyTraining.preliminary.stage < 10) state = next(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime, action = input(before)
    expect(submitEarlyPreliminary(store, teacher, preliminaryPlaces.monument, { ...action, actor: 'xuner' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyPreliminary(store, teacher, preliminaryPlaces.monument, action)).toBe(true)
    expect(submitEarlyPreliminary(store, teacher, preliminaryPlaces.monument, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    before.earlyTraining.preliminary.stage = 11; before.earlyTraining.preliminary.yan = 'seventh-duan'
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(renderToStaticMarkup(<EarlyPreliminary state={before} position={teacher} onBack={() => {}} />)).toContain('七段 · 待宣读')
    before.settings.spoiler = 'anime'; before.settings.animeLimit = 2
    expect(earlyPreliminarySaveSummary(before, before.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyPreliminary state={before} position={teacher} onBack={() => {}} />)).not.toMatch(/一星|七段|萧媚|黑碑/)
  })
})
