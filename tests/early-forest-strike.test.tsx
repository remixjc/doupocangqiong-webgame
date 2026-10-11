import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyForestStrike, earlyForestStrikeBlock, forestPlaces, forestStart, moveForestWalker, nearForestPlace, submitEarlyForestStrike, type ForestStrikeAction } from '../src/core/early-forest-strike'
import { earlyForestStrikeSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyForestStrike from '../src/ui/EarlyForestStrike'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, false, false, true)
}
function act(state: ReturnType<typeof eligible>, place: keyof typeof forestPlaces, operation: ForestStrikeAction['operation'], marker?: number) {
  return advanceEarlyForestStrike(state, teacher, forestPlaces[place], { ...state.earlyTraining.forestStrike, operation, marker })
}
describe('林中首次成功八极崩，树木/六段/耗尽分开', () => {
  it('行走真实到达四边界，位置/前置/第3章范围限制', () => {
    let position = { ...forestStart }
    expect(nearForestPlace(position, 'stone')).toBe(false)
    for (let i = 0; i < 2; i++) position = moveForestWalker(position, 'up')
    expect(nearForestPlace(position, 'stone')).toBe(true)
    for (let i = 0; i < 14; i++) position = moveForestWalker(position, 'right')
    for (let i = 0; i < 3; i++) position = moveForestWalker(position, 'up')
    expect(nearForestPlace(position, 'tree')).toBe(true)
    for (let i = 0; i < 100; i++) position = moveForestWalker(position, 'right')
    expect(position.x).toBe(680)
    for (const direction of ['left', 'up', 'down'] as const) for (let i = 0; i < 100; i++) position = moveForestWalker(position, direction)
    expect(position).toEqual({ x: 40, y: 340 })
    expect(moveForestWalker({ x: NaN, y: 1 }, 'left')).toEqual(forestStart)
    const state = eligible(), action = { ...state.earlyTraining.forestStrike, operation: 'review' as const }
    expect(advanceEarlyForestStrike(state, teacher, forestStart, action).state).toBe(state)
    for (const invalid of [{ x: NaN, y: 220 }, { x: 160, y: Infinity }, { x: -1, y: 220 }, { x: 720, y: 220 }])
      expect(advanceEarlyForestStrike(state, teacher, invalid, action).state).toBe(state)
    expect(advanceEarlyForestStrike(state, { x: 0, y: 0 }, forestPlaces.stone, action).state).toBe(state)
    const pending = structuredClone(state); pending.earlyTraining.longSupplies.stage = 5
    expect(earlyForestStrikeBlock(pending, teacher)).toContain('归档')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(act(state, 'stone', 'review').state).toBe(state)
    expect(earlyForestStrikeSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyForestStrike state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/八极崩|六段|树木/)
  })
  it('三步次序/非法时机/错位置/过期拒绝，失误和主动停练免费重试且不倒树', () => {
    let state = act(eligible(), 'stone', 'review').state
    state = act(state, 'tree', 'begin').state
    const snapshot = { ...state.earlyTraining.forestStrike, operation: 'steady' as const, marker: .5 }
    for (const marker of [undefined, NaN, Infinity, -.1, 1.1])
      expect(act(state, 'tree', 'steady', marker).state).toBe(state)
    for (const op of ['gather', 'strike', 'begin', 'rest', 'leave'] as const) expect(act(state, 'tree', op, .5).state).toBe(state)
    expect(act(state, 'stone', 'steady', .5).state).toBe(state)
    const before = structuredClone(state)
    state = act(state, 'tree', 'steady', .35).state
    expect(state.earlyTraining.forestStrike.beats).toBe(1)
    expect(advanceEarlyForestStrike(state, teacher, forestPlaces.tree, snapshot).state).toBe(state)
    state = act(state, 'tree', 'gather', .9).state
    expect(state.earlyTraining.forestStrike).toEqual({ ...before.earlyTraining.forestStrike, attempts: 1 })
    state = act(state, 'tree', 'steady', .65).state
    state = act(state, 'trail', 'stop').state
    expect(state.earlyTraining.forestStrike).toEqual({ stage: 1, beats: 0, attempts: 2, tree: 'intact', result: 'sixth-duan' })
    const comparison = structuredClone(state); comparison.earlyTraining.forestStrike = before.earlyTraining.forestStrike
    expect(comparison).toEqual(before)
    state = act(state, 'tree', 'begin').state
    state.earlyTraining.forestStrike.attempts = 1_000_000
    expect(act(state, 'tree', 'stop').state).toBe(state)
    expect(act(state, 'tree', 'steady', 0).state).toBe(state)
  })
  it('所有成功断点JSON/自动手动备份，树只倒一次，之后必须休息，不改任何已有账或主线runtime', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const [place, operation, marker] of [
      ['stone', 'review'], ['tree', 'begin'], ['tree', 'steady', .5], ['tree', 'gather', .5], ['tree', 'strike', .5],
      ['stone', 'rest'], ['stone', 'ask'], ['stone', 'goal'], ['trail', 'leave'],
    ] as const) {
      const input = { ...state.earlyTraining.forestStrike, operation, marker }
      const result = advanceEarlyForestStrike(state, teacher, forestPlaces[place], input)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(advanceEarlyForestStrike(state, teacher, forestPlaces[place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyForestStrikeSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state); comparison.earlyTraining.forestStrike = before.earlyTraining.forestStrike
      expect(comparison).toEqual(before)
      if (operation === 'strike') {
        expect(state.earlyTraining.forestStrike.tree).toBe('fallen')
        expect(earlyForestStrikeSaveSummary(state, state.settings)).toContain('当前耗尽')
        expect(act(state, 'tree', 'strike', .5).state).toBe(state)
      }
    }
    expect(earlyForestStrikeSaveSummary(state, state.settings)).toContain('七段仍是目标')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待下山')
    expect(state.earlyTraining.recovery.energy).toBe('spent')
    expect(act(state, 'tree', 'begin').state).toBe(state)
  })
  it('旧藏柜档补未参与，新版缺字段/阶段/树/六段/节拍组合与前置严校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.22.0'; delete old.earlyTraining.forestStrike
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion; expect(() => validateState(old)).toThrow('重修')
    for (const change of [{ stage: -1 }, { stage: .5 }, { stage: 8 }, { stage: NaN }, { beats: 1 }, { attempts: 1 },
      { tree: 'fallen' }, { result: 'sixth-duan' }, { stage: 3, beats: 2, tree: 'fallen', result: 'sixth-duan' }]) {
      const bad = structuredClone(state); Object.assign(bad.earlyTraining.forestStrike, change)
      expect(() => validateState(bad)).toThrow('重修')
    }
    let advanced = state
    for (const [place, operation, marker] of [['stone', 'review'], ['tree', 'begin'], ['tree', 'steady', .5], ['tree', 'gather', .5], ['tree', 'strike', .5], ['stone', 'rest'], ['stone', 'ask'], ['stone', 'goal'], ['trail', 'leave']] as const) {
      advanced = act(advanced, place, operation, marker).state
      for (const change of [{ tree: advanced.earlyTraining.forestStrike.tree === 'fallen' ? 'intact' : 'fallen' }, { result: 'none' }, { attempts: Infinity }, { beats: 4 }]) {
        const bad = structuredClone(advanced); Object.assign(bad.earlyTraining.forestStrike, change)
        expect(() => validateState(bad)).toThrow('重修')
        expect(act(bad, place, operation, marker).state).toBe(bad)
      }
      const bad = structuredClone(advanced); bad.earlyTraining.longSupplies.stage = 5
      expect(() => validateState(bad)).toThrow('重修')
    }
  })
  it('store最新快照/错误不写，合法记录保留runtime及所有主线资金奖励', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = { ...before.earlyTraining.forestStrike, operation: 'review' as const }
    expect(submitEarlyForestStrike(store, teacher, forestStart, action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyForestStrike(store, teacher, forestPlaces.stone, action)).toBe(true)
    expect(submitEarlyForestStrike(store, teacher, forestPlaces.stone, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.forestStrike.stage = 1; before.earlyTraining.forestStrike.result = 'sixth-duan'
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
