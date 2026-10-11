import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyQiBarrier, earlyQiBarrierBlock, moveQiBarrierWalker, nearQiBarrierPlace, nearQiPath, qiBarrierPlaces, qiPaths, submitEarlyQiBarrier, type QiBarrierAction, validQiBarrierPosition } from '../src/core/early-qi-barrier'
import { qiBarrierScenes } from '../src/content/early-qi-barrier'
import { earlyQiBarrierSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyQiBarrier from '../src/ui/EarlyQiBarrier'
import type { EarlyWalkPosition } from '../src/core/early-walk'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  const args: Parameters<typeof replayEarlyTraining> = [validateState(old)]
  args[27] = true
  return replayEarlyTraining(...args)
}
function input(state: ReturnType<typeof eligible>): QiBarrierAction {
  const task = state.earlyTraining.qiPavilionBarrier, scene = qiBarrierScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' }
}
function advance(state: ReturnType<typeof eligible>) {
  const task = state.earlyTraining.qiPavilionBarrier, scene = qiBarrierScenes[task.stage]
  if (task.stage === 1) return advanceEarlyQiBarrier(state, qiBarrierPlaces.path, { ...input(state), operation: 'path', chosenPath: 3 }).state
  if (task.stage === 6) {
    let next = state
    for (const operation of ['settle', 'gather', 'blast'] as const) {
      const current = next.earlyTraining.qiPavilionBarrier
      const result = advanceEarlyQiBarrier(next, qiBarrierPlaces.stance, { ...current, actor: 'xiaoyan', operation, marker: .5 })
      expect(result.ok, result.message).toBe(true); next = result.state
    }
    return next
  }
  const result = advanceEarlyQiBarrier(state, qiBarrierPlaces[scene?.place ?? 'inside'], input(state))
  expect(result.ok, result.message).toBe(true)
  return result.state
}
describe('C1f-2 火通道、四十三号门障与入室分段保存', () => {
  it('十阶段JSON/自动手动/上一份备份往返，入室不发卷轴且其他持久状态不变', async () => {
    let state = eligible(); const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.qiPavilionBarrier.stage < 10) {
      const previous = state
      state = parseSave(serializeSave(advance(state)))
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.qiPavilionBarrier = before.earlyTraining.qiPavilionBarrier
      expect(comparison).toEqual(before)
    }
    expect(state.earlyTraining.qiPavilionBarrier).toMatchObject({ stage: 10, path: 3, room37: true, room43: true, barrier: 'broken', entered: true, beats: 3 })
    expect(earlyQiBarrierSaveSummary(state, state.settings)).toContain('取卷待续')
    expect(advanceEarlyQiBarrier(state, qiBarrierPlaces.inside, input(state)).state).toBe(state)
  })
  it('错路免费返回第三路，错时机与停练不扣物品；错位置/取卷/过期快照和未入阁均拒绝', () => {
    let state = eligible()
    expect(earlyQiBarrierBlock(initialState())).not.toBe('')
    while (state.earlyTraining.qiPavilionBarrier.stage < 10) {
      const task = state.earlyTraining.qiPavilionBarrier, scene = qiBarrierScenes[task.stage], action = input(state)
      if (task.stage === 1) {
        const wrong = advanceEarlyQiBarrier(state, { x: qiPaths[0], y: 300 }, { ...action, operation: 'path', chosenPath: 1 })
        expect(wrong.ok).toBe(true); expect(wrong.state.earlyTraining.qiPavilionBarrier).toMatchObject({ stage: 1, path: 0, attempts: 1 })
      } else if (task.stage === 6) {
        const wrong = advanceEarlyQiBarrier(state, qiBarrierPlaces.stance, { ...action, operation: 'settle', marker: .1 })
        expect(wrong.ok).toBe(true); expect(wrong.state.earlyTraining.qiPavilionBarrier).toMatchObject({ stage: 6, beats: 0, attempts: 1 })
        const stopped = advanceEarlyQiBarrier(state, qiBarrierPlaces.stance, { ...action, operation: 'stop' })
        expect(stopped.ok).toBe(true); expect(stopped.state.earlyTraining.qiPavilionBarrier).toMatchObject({ stage: 6, beats: 0, attempts: 1 })
      } else {
        expect(advanceEarlyQiBarrier(state, qiBarrierPlaces[scene.place], { ...action, operation: 'take-scroll' }).state).toBe(state)
        expect(advanceEarlyQiBarrier(state, { x: 50, y: 390 }, action).state).toBe(state)
      }
      const stale = structuredClone(state); stale.earlyTraining.qiPavilionEntry.stage = 11
      expect(earlyQiBarrierBlock(stale)).not.toBe('')
      state = advance(state)
    }
  })
  it('旧0.34.0只补空门障记录，新版本缺字段与阶段组合拒绝，支路和门洞网格可达', () => {
    let state = eligible()
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.34.0'; delete old.earlyTraining.qiPavilionBarrier
    expect(validateState(old).earlyTraining.qiPavilionBarrier.stage).toBe(0)
    old.contentVersion = '0.35.0'; expect(() => validateState(old)).toThrow()
    for (const stage of [-1, 11, .5, NaN]) {
      const bad = structuredClone(state); bad.earlyTraining.qiPavilionBarrier.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
    while (state.earlyTraining.qiPavilionBarrier.stage < 10) {
      state = advance(state)
      const task = state.earlyTraining.qiPavilionBarrier
      for (const key of ['path', 'room37', 'room43', 'barrier', 'entered'] as const) {
        const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.qiPavilionBarrier[key] = key === 'entered' || key === 'room37' || key === 'room43' ? !task[key] : 'bad'
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (let stage = 0; stage <= 10; stage++) {
      const queue: EarlyWalkPosition[] = [{ x: qiBarrierPlaces.fire.x, y: qiBarrierPlaces.fire.y }], reached = new Set([`${qiBarrierPlaces.fire.x},${qiBarrierPlaces.fire.y}`])
      for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
        const p = moveQiBarrierWalker(queue[i], direction, stage), key = `${p.x},${p.y}`
        if (!reached.has(key)) { reached.add(key); queue.push(p) }
      }
      const scene = qiBarrierScenes[stage]
      if (scene) expect(queue.some(p => scene.place === 'path' ? nearQiPath(p, 3, stage) : nearQiBarrierPlace(p, scene.place, stage))).toBe(true)
      expect(moveQiBarrierWalker({ x: 380, y: 140 }, 'right', stage)).toEqual(stage >= 7 ? { x: 400, y: 140 } : { x: 380, y: 140 })
      expect(validQiBarrierPosition(qiBarrierPlaces.inside, stage)).toBe(stage >= 7)
    }
    expect(qiPaths).toHaveLength(5)
  })
  it('一步成功只写一次且不改runtime，动画上限1/2封存整个门障与火路名称', async () => {
    const state = eligible(), store = new GameStore({ load: async () => state, write: async () => {} })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyQiBarrier(store, qiBarrierPlaces.fire, input(state))).toBe(true)
    expect(submitEarlyQiBarrier(store, qiBarrierPlaces.fire, input(state))).toBe(false)
    await store.waitForAutosave(); expect(store.getSnapshot().runtime).toBe(runtime)
    for (const animeLimit of [1, 2]) {
      const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = animeLimit
      expect(renderToStaticMarkup(<EarlyQiBarrier state={limited} onBack={() => {}} />)).toContain('超出当前剧透范围')
      expect(savePreviewSummary(limited, limited.settings)).not.toMatch(/火通道|四十三|红幕/)
    }
  })
})
