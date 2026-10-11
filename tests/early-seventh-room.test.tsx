import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlySeventhRoom, earlySeventhRoomBlock, submitEarlySeventhRoom, type SeventhAction, type SeventhStation } from '../src/core/early-seventh-room'
import { seventhRoomScenes } from '../src/content/early-seventh-room'
import { earlySeventhRoomSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlySeventhRoom from '../src/ui/EarlySeventhRoom'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
}
function act(state: ReturnType<typeof eligible>, marker?: number) {
  const task = state.earlyTraining.seventhRoom, scene = seventhRoomScenes[task.stage]
  return advanceEarlySeventhRoom(state, teacher, scene?.station ?? 'window', { ...task, operation: scene?.operation ?? 'archive', marker })
}
function next(state: ReturnType<typeof eligible>, marker?: number) {
  const result = act(state, marker); expect(result.ok, result.message).toBe(true); return result.state
}
describe('房中七段，独立木盆与老师唯一一滴', () => {
  it('旧森林档只补未参与；新版缺字段、前置和所有组合强校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.23.1'; delete old.earlyTraining.seventhRoom
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    const badChanges = [{ stage: -1 }, { stage: .5 }, { stage: 9 }, { stage: NaN }, { beats: 1 }, { attempts: 1 },
      { drops: 1 }, { energy: 'active' }, { period: 'reviewed' }, { result: 'seventh-duan' }]
    for (const change of badChanges) {
      const bad = structuredClone(state); Object.assign(bad.earlyTraining.seventhRoom, change)
      expect(() => validateState(bad)).toThrow('重修'); expect(act(bad).state).toBe(bad)
    }
    let current = state
    while (current.earlyTraining.seventhRoom.stage < 8) {
      const training = [1, 4].includes(current.earlyTraining.seventhRoom.stage)
      current = parseSave(serializeSave(next(current, training ? .5 : undefined)))
      for (const change of [{ drops: current.earlyTraining.seventhRoom.drops ? 0 : 1 }, { energy: 'unobserved' },
        { beats: 4 }, { attempts: Infinity }, { result: current.earlyTraining.seventhRoom.result === 'none' ? 'seventh-duan' : 'none' }]) {
        const bad = structuredClone(current); Object.assign(bad.earlyTraining.seventhRoom, change)
        expect(() => validateState(bad)).toThrow('重修')
      }
      const bad = structuredClone(current); bad.earlyTraining.forestStrike.stage = 6
      expect(() => validateState(bad)).toThrow('重修')
    }
  })
  it('错误站位/入口/步骤/快照和非法时机拒绝；补液前后免费失误不多补', () => {
    let state = eligible()
    const input: SeventhAction = { ...state.earlyTraining.seventhRoom, operation: 'enter' }
    expect(advanceEarlySeventhRoom(state, { x: 0, y: 0 }, 'window', input).state).toBe(state)
    expect(advanceEarlySeventhRoom(state, { x: NaN, y: 310 }, 'window', input).state).toBe(state)
    expect(advanceEarlySeventhRoom(state, teacher, 'ring', input).state).toBe(state)
    expect(advanceEarlySeventhRoom(state, teacher, 'window', { ...input, energy: 'active' }).state).toBe(state)
    expect(act(state, .5).state).toBe(state)
    state = next(state); state = next(state, .5)
    for (const marker of [undefined, NaN, Infinity, -1, 2]) expect(act(state, marker).state).toBe(state)
    const before = structuredClone(state)
    state = next(state, 0)
    expect(state.earlyTraining.seventhRoom).toEqual({ ...before.earlyTraining.seventhRoom, beats: 0, attempts: 1 })
    state = next(state, .35); state = next(state, .65)
    expect(state.earlyTraining.seventhRoom.energy).toBe('fading')
    state = next(state); expect(state.earlyTraining.seventhRoom.energy).toBe('clear')
    const staleRefill = { ...state.earlyTraining.seventhRoom, operation: 'refill' as const }
    state = next(state); expect(state.earlyTraining.seventhRoom.drops).toBe(1)
    expect(advanceEarlySeventhRoom(state, teacher, 'ring', staleRefill).state).toBe(state)
    state = next(state, .5); state = next(state, 1)
    expect(state.earlyTraining.seventhRoom).toMatchObject({ stage: 4, beats: 0, attempts: 2, drops: 1, energy: 'restored', result: 'none' })
    expect(advanceEarlySeventhRoom(state, teacher, 'basin', { ...state.earlyTraining.seventhRoom, operation: 'sense' }).state).toBe(state)
    const limit = structuredClone(state); limit.earlyTraining.seventhRoom.attempts = 1_000_000
    expect(act(limit, 0).state).toBe(limit); expect(act(limit, .5).ok).toBe(true)
  })
  it('每次合法断点JSON/自动手动与上一份备份恢复，其他记录全部不变', async () => {
    let state = eligible()
    const before = structuredClone(state)
    const sequence = [undefined, .5, .5, undefined, undefined, .5, .5, .5, undefined, undefined, undefined]
    for (const marker of sequence) {
      const task = state.earlyTraining.seventhRoom, scene = seventhRoomScenes[task.stage]
      const input = { ...task, operation: scene.operation, marker }
      state = parseSave(serializeSave(next(state, marker)))
      expect(advanceEarlySeventhRoom(state, teacher, scene.station, input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlySeventhRoomSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state); comparison.earlyTraining.seventhRoom = before.earlyTraining.seventhRoom
      expect(comparison).toEqual(before)
      if (state.earlyTraining.seventhRoom.stage === 6) expect(state.earlyTraining.seventhRoom.result).toBe('none')
    }
    expect(state.earlyTraining.seventhRoom).toMatchObject({ stage: 8, drops: 1, result: 'seventh-duan', energy: 'lighter' })
    expect(saveRecordSummary((await listSlots()).find(record => record.slot === -1)!, state.settings)).toContain('待归档')
    expect(act(state).state).toBe(state)
    expect(state.earlyTraining.recovery.energy).toBe('spent')
    expect(state.earlyTraining.consignment.owner).toBe('xiaoyan')
  })
  it('第3章范围封存，不泄漏结果，初始页面明确独立木盆', () => {
    const state = eligible()
    const pending = structuredClone(state); pending.earlyTraining.forestStrike.stage = 6
    expect(earlySeventhRoomBlock(pending, teacher)).toContain('归档')
    const visible = renderToStaticMarkup(<EarlySeventhRoom state={state} position={teacher} onBack={() => {}} />)
    expect(visible).toContain('古戒'); expect(visible).toContain('早先耗尽')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlySeventhRoomSaveSummary(state, state.settings)).toContain('封存')
    expect(act(state).state).toBe(state)
    expect(renderToStaticMarkup(<EarlySeventhRoom state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/七段|古戒|木盆/)
  })
  it('store过期与错位不写，合法补液仅改往事且保留runtime', async () => {
    let state = eligible()
    for (const marker of [undefined, .5, .5, undefined]) state = next(state, marker)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const input = { ...before.earlyTraining.seventhRoom, operation: 'refill' as const }
    expect(submitEarlySeventhRoom(store, teacher, 'window' as SeventhStation, input)).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlySeventhRoom(store, teacher, 'ring', input)).toBe(true)
    expect(submitEarlySeventhRoom(store, teacher, 'ring', input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.seventhRoom = { ...before.earlyTraining.seventhRoom, stage: 4, beats: 0, drops: 1, energy: 'restored' }
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
