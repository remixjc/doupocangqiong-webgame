import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyCeremonyGuests, earlyCeremonyGuestsBlock, submitEarlyCeremonyGuests, ceremonyGuestPlaces,
  moveCeremonyGuestWalker, validCeremonyGuestPosition, nearCeremonyGuestPlace, type CeremonyGuestAction } from '../src/core/early-ceremony-guests'
import { ceremonyGuestScenes } from '../src/content/early-ceremony-guests'
import { earlyCeremonyGuestsSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyCeremonyGuests from '../src/ui/EarlyCeremonyGuests'
const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
}
function action(state: ReturnType<typeof eligible>): CeremonyGuestAction {
  return { ...state.earlyTraining.ceremonyGuests, operation: ceremonyGuestScenes[state.earlyTraining.ceremonyGuests.stage]?.operation ?? 'archive' }
}
function next(state: ReturnType<typeof eligible>) {
  const scene = ceremonyGuestScenes[state.earlyTraining.ceremonyGuests.stage]
  const result = advanceEarlyCeremonyGuests(state, teacher, ceremonyGuestPlaces[scene?.place ?? 'gate'], action(state))
  expect(result.ok, result.message).toBe(true); return result.state
}
describe('正式礼宾客、拔剑/提醒/收剑、父亲介绍独立观察链', () => {
  it('全部12断点往返自动/手动/备份，收剑前后没有战斗奖励或第三方身份泄露', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.ceremonyGuests.stage < 12) {
      const previous = state, scene = ceremonyGuestScenes[state.earlyTraining.ceremonyGuests.stage], input = action(state)
      state = parseSave(serializeSave(next(state)))
      expect(advanceEarlyCeremonyGuests(state, teacher, ceremonyGuestPlaces[scene.place], input).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const record of records.filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyCeremonyGuestsSaveSummary(state, state.settings))
      }
      expect(parseSave(records.find(entry => entry.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.ceremonyGuests = before.earlyTraining.ceremonyGuests
      expect(comparison).toEqual(before)
      if (state.earlyTraining.ceremonyGuests.stage === 6) {
        expect(state.earlyTraining.ceremonyGuests.sword).toBe('drawn')
        expect(earlyCeremonyGuestsSaveSummary(state, state.settings)).toContain('尚未交锋')
      }
      if (state.earlyTraining.ceremonyGuests.stage === 7) expect(state.earlyTraining.ceremonyGuests.sword).toBe('sheathed')
    }
    expect(state.earlyTraining.ceremonyGuests).toEqual({ stage: 12, sword: 'sheathed', introduced: true })
    expect(advanceEarlyCeremonyGuests(state, teacher, ceremonyGuestPlaces.gate, action(state)).state).toBe(state)
  })
  it('旧0.28只补未参与；新版缺字段、剑与介绍阶段矛盾/缺前置和错误动作地点拒绝', () => {
    let state = eligible(); const old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.28.0'; delete old.earlyTraining.ceremonyGuests
    expect(validateState(old).earlyTraining.ceremonyGuests).toEqual(state.earlyTraining.ceremonyGuests)
    old.contentVersion = '0.29.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.ceremonyGuests
      for (const change of [{ stage: -1 }, { stage: 13 }, { stage: .5 },
        { sword: task.sword === 'none' ? 'drawn' : 'none' }, { introduced: !task.introduced }]) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.ceremonyGuests, change)
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 12) break
      const scene = ceremonyGuestScenes[task.stage], input = action(state)
      expect(advanceEarlyCeremonyGuests(state, { x: 0, y: 0 }, ceremonyGuestPlaces[scene.place], input).state).toBe(state)
      expect(advanceEarlyCeremonyGuests(state, teacher, { x: 400, y: 160 }, input).state).toBe(state)
      expect(advanceEarlyCeremonyGuests(state, teacher, { x: NaN, y: 280 }, input).state).toBe(state)
      expect(advanceEarlyCeremonyGuests(state, teacher, ceremonyGuestPlaces[scene.place], { ...input, operation: input.operation === 'archive' ? 'enter' : 'archive' }).state).toBe(state)
      expect(advanceEarlyCeremonyGuests(state, teacher, ceremonyGuestPlaces[scene.place], { ...input, introduced: !input.introduced }).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.eighthTraining.stage = 14
      expect(earlyCeremonyGuestsBlock(bad, teacher)).not.toBe('')
      if (task.stage) expect(() => validateState(bad)).toThrow()
      state = next(state)
    }
  })
  it('木台碰撞不可穿，全部观礼地点可达，移动在边界止步', () => {
    const before = { x: 400, y: 240 }
    expect(moveCeremonyGuestWalker(before, 'up')).toBe(before)
    expect(validCeremonyGuestPosition({ x: 400, y: 160 })).toBe(false)
    const queue: { x: number; y: number }[] = [{ ...ceremonyGuestPlaces.gate }], visited = new Map<string, { x: number; y: number }>()
    while (queue.length) {
      const position = queue.shift()!, key = `${position.x},${position.y}`
      if (visited.has(key)) continue
      visited.set(key, position); expect(validCeremonyGuestPosition(position)).toBe(true)
      for (const direction of ['up', 'left', 'down', 'right'] as const) {
        const next = moveCeremonyGuestWalker(position, direction)
        if (!visited.has(`${next.x},${next.y}`)) queue.push(next)
      }
    }
    for (const place of Object.keys(ceremonyGuestPlaces) as (keyof typeof ceremonyGuestPlaces)[])
      expect([...visited.values()].some(position => nearCeremonyGuestPlace(position, place))).toBe(true)
    expect(moveCeremonyGuestWalker({ x: 40, y: 340 }, 'left')).toEqual({ x: 40, y: 340 })
  })
  it('仅成功步骤写store且不重复裁定；范围封存，剑和人物渲染随有效阶段', async () => {
    let state = eligible(); while (state.earlyTraining.ceremonyGuests.stage < 6) state = next(state)
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } }); let writes = 0
    await store.initialize(); const input = action(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    expect(submitEarlyCeremonyGuests(store, teacher, ceremonyGuestPlaces.gate, input)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyCeremonyGuests(store, teacher, ceremonyGuestPlaces.shade, input)).toBe(true)
    expect(submitEarlyCeremonyGuests(store, teacher, ceremonyGuestPlaces.shade, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const markup = renderToStaticMarkup(<EarlyCeremonyGuests state={store.getSnapshot().state} position={teacher} onBack={() => {}} />)
    expect(markup).toContain('佩剑已收回，没有战斗'); expect(markup).not.toContain('佩剑已出鞘')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(earlyCeremonyGuestsSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyCeremonyGuests state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/雅妃|木台|佩剑|宾客/)
  })
})
