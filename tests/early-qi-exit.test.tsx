import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { parseSave, serializeSave, validateState, saveSlot, listSlots } from '../src/core/save'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { qiExitAt } from '../src/core/early-qi-exit-state'
import { qiExitScenes } from '../src/content/early-qi-exit'
import { advanceEarlyQiExit, moveQiExitWalker, qiExitStart, qiExitPlaces, nearQiExitPlace, submitEarlyQiExit, type QiExitAction } from '../src/core/early-qi-exit'
import { earlyQiExitSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyQiExit from '../src/ui/EarlyQiExit'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  const args: Parameters<typeof replayEarlyTraining> = [validateState(old)]
  args[30] = true
  return replayEarlyTraining(...args)
}
function input(state: GameState): QiExitAction {
  const task = state.earlyTraining.qiPavilionExit, scene = qiExitScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' }
}
describe('C1f-5 complete registration and departure', () => {
  it.each(['story', 'normal', 'hard'] as const)('preserves all other state, four slots and previous backup at every step (%s)', async difficulty => {
    let state = eligible(); state.settings.difficulty = difficulty
    const before = structuredClone(state)
    await saveSlot(0, state)
    for (const scene of qiExitScenes) {
      const previous = state, action = input(state)
      const result = advanceEarlyQiExit(state, qiExitPlaces[scene.place], action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state)
      comparison.earlyTraining.qiPavilionExit = before.earlyTraining.qiPavilionExit
      expect(comparison).toEqual(before)
      expect(advanceEarlyQiExit(state, qiExitPlaces[scene.place], action).state).toBe(state)
      if (state.earlyTraining.qiPavilionExit.stage === 3) expect(state.earlyTraining.qiPavilionExit).toMatchObject({ family: 'elder', registered: false })
      if (state.earlyTraining.qiPavilionExit.stage === 7) expect(state.earlyTraining.qiPavilionExit).toMatchObject({ family: 'xiaoyan', xuner: 'elder', exited: false })
    }
    expect(state.earlyTraining.qiPavilionExit).toEqual(qiExitAt(13))
    expect(earlyQiExitSaveSummary(state, state.settings)).toContain('已归档')
    expect(advanceEarlyQiExit(state, qiExitPlaces.father, input(state)).ok).toBe(false)
  })
  it('rejects actors, skips, remote locations, forged snapshots and premature gate crossing', () => {
    let state = eligible()
    for (const scene of qiExitScenes) {
      const action = input(state), position = qiExitPlaces[scene.place]
      for (const operation of ['take-support', 'leave-clan', 'learn'] as const)
        expect(advanceEarlyQiExit(state, position, { ...action, operation }).state).toBe(state)
      expect(advanceEarlyQiExit(state, position, { ...action, actor: scene.actor === 'xiaoyan' ? 'yaolao' : 'xiaoyan' }).state).toBe(state)
      expect(advanceEarlyQiExit(state, { x: NaN, y: 90 }, action).state).toBe(state)
      expect(advanceEarlyQiExit(state, { x: 700, y: 400 }, action).state).toBe(state)
      expect(advanceEarlyQiExit(state, position, { ...action, assured: !action.assured }).state).toBe(state)
      const broken = structuredClone(state); broken.earlyTraining.qiPavilionAid.stage = 9
      expect(advanceEarlyQiExit(broken, position, action).state).toBe(broken)
      state = advanceEarlyQiExit(state, position, action).state
      for (const key of Object.keys(qiExitAt(0))) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { qiPavilionExit: Record<string, unknown> } }
        bad.earlyTraining.qiPavilionExit[key] = 'invalid'
        expect(() => validateState(bad)).toThrow()
        delete bad.earlyTraining.qiPavilionExit[key]
        expect(() => validateState(bad)).toThrow()
      }
    }
    expect(moveQiExitWalker({ x: 360, y: 170 }, 'up', 7)).toEqual({ x: 360, y: 170 })
    expect(moveQiExitWalker({ x: 360, y: 170 }, 'up', 8)).toEqual({ x: 360, y: 150 })
    expect(moveQiExitWalker({ x: 280, y: 170 }, 'up', 8)).toEqual({ x: 280, y: 170 })
  })
  it('has a reachable actual walk for each stage, stays on the proper side before registration', () => {
    for (let stage = 0; stage < 13; stage++) {
      const queue = [qiExitStart(stage)], seen = new Set([JSON.stringify(queue[0])])
      for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'down', 'left', 'right'] as const) {
        const p = moveQiExitWalker(queue[i], direction, stage), key = JSON.stringify(p)
        if (!seen.has(key)) { seen.add(key); queue.push(p) }
      }
      expect(queue.some(p => nearQiExitPlace(p, qiExitScenes[stage].place, stage))).toBe(true)
      if (stage < 8) expect(queue.every(p => p.y >= 162)).toBe(true)
    }
  })
  it('migrates only an empty task; cannot backdate new progress or erase present fields', () => {
    const state = eligible(), old = structuredClone(state) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
    old.contentVersion = '0.93.3'; delete old.earlyTraining.qiPavilionExit
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.94.0'; expect(() => validateState(old)).toThrow()
    old.contentVersion = '0.93.3'; old.earlyTraining.qiPavilionExit = qiExitAt(1)
    expect(() => validateState(old)).toThrow('不属于此版本')
    const broken = structuredClone(state); broken.earlyTraining.qiPavilionExit = qiExitAt(1); broken.earlyTraining.qiPavilionAid.stage = 9
    expect(() => validateState(broken)).toThrow()
  })
  it('seals both UI and writes; only commits the exit record and retains runtime', async () => {
    const state = eligible(), store = new GameStore({ load: async () => state, write: async () => {} })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyQiExit(store, qiExitPlaces.queue, input(state))).toBe(true)
    expect(submitEarlyQiExit(store, qiExitPlaces.queue, input(state))).toBe(false)
    await store.waitForAutosave()
    expect(store.getSnapshot().runtime).toBe(runtime)
    for (const animeLimit of [1, 2]) {
      const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = animeLimit
      expect(renderToStaticMarkup(<EarlyQiExit state={limited} onBack={() => {}} />)).toContain('超出当前剧透范围')
      expect(savePreviewSummary(limited, limited.settings)).not.toMatch(/炼火焚|登记离阁|萧旱/)
      expect(advanceEarlyQiExit(limited, qiExitPlaces.queue, input(limited)).state).toBe(limited)
    }
  })
})
