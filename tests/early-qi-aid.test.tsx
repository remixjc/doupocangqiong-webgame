import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { blankProgress, initialState } from '../src/core/model'
import { parseSave, serializeSave, validateState, saveSlot, listSlots } from '../src/core/save'
import { advanceEarlyQiAid, qiAidPlaces, qiAidOperation, moveQiAidWalker, nearQiAidPlace, submitEarlyQiAid, type QiAidAction } from '../src/core/early-qi-aid'
import { qiAidScenes } from '../src/content/early-qi-aid'
import { earlyQiPavilionAidSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { renderToStaticMarkup } from 'react-dom/server'
import EarlyQiAid from '../src/ui/EarlyQiAid'
import { GameStore } from '../src/core/store'
import type { EarlyWalkPosition } from '../src/core/early-walk'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  const args: Parameters<typeof replayEarlyTraining> = [validateState(old)]
  args[31] = true
  return replayEarlyTraining(...args)
}
function action(state: ReturnType<typeof eligible>): QiAidAction {
  const task = state.earlyTraining.qiPavilionAid, scene = qiAidScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: qiAidOperation(task), marker: task.stage === 6 ? .5 : undefined }
}

describe('C1f-4 薰儿同行与萧媚风属性房独自援助', () => {
  it('十步与两个出手断点JSON/自动手动/备份往返，不取第二卷/不结算/不离阁', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.qiPavilionAid.stage < 10) {
      const previous = state, scene = qiAidScenes[state.earlyTraining.qiPavilionAid.stage]
      const result = advanceEarlyQiAid(state, qiAidPlaces[scene.place], action(state))
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.qiPavilionAid = before.earlyTraining.qiPavilionAid
      expect(comparison).toEqual(before)
      if (state.earlyTraining.qiPavilionAid.stage === 5) expect(state.earlyTraining.qiPavilionAid).toMatchObject({ returned: false, door: 'intact' })
      if (state.earlyTraining.qiPavilionAid.stage === 6) expect(state.earlyTraining.qiPavilionAid).toMatchObject({ solo: false, door: 'intact' })
    }
    expect(state.earlyTraining.qiPavilionAid).toEqual({ stage: 10, beats: 2, attempts: 0, group: 'together', xunerScroll: 'xuner', door: 'broken', returned: true, solo: true, thanks: 'spoken' })
    expect(earlyQiPavilionAidSaveSummary(state, state.settings)).toContain('登记待续')
    expect(advanceEarlyQiAid(state, qiAidPlaces.pass, action(state)).state).toBe(state)
  })
  it('免费错时机/停练，不清卷轴；多人同攻、远地点、错人、重复旧快照拒绝', () => {
    let state = eligible()
    const early = structuredClone(state); early.earlyTraining.qiPavilionExchange.stage = 7
    expect(advanceEarlyQiAid(early, qiAidPlaces.fire, action(early)).state).toBe(early)
    while (state.earlyTraining.qiPavilionAid.stage < 10) {
      const scene = qiAidScenes[state.earlyTraining.qiPavilionAid.stage], input = action(state)
      expect(advanceEarlyQiAid(state, qiAidPlaces[scene.place], { ...input, operation: 'take-scroll' }).state).toBe(state)
      expect(advanceEarlyQiAid(state, { x: 300, y: 250 }, input).state).toBe(state)
      expect(advanceEarlyQiAid(state, qiAidPlaces[scene.place], { ...input, actor: scene.actor === 'xiaoyan' ? 'mei' : 'xiaoyan' }).state).toBe(state)
      if (state.earlyTraining.qiPavilionAid.stage === 6) {
        expect(advanceEarlyQiAid(state, qiAidPlaces.wind, { ...input, operation: 'group-attack', marker: undefined }).state).toBe(state)
        const wrong = advanceEarlyQiAid(state, qiAidPlaces.wind, { ...input, marker: 0 })
        expect(wrong.ok).toBe(true)
        expect(wrong.state.earlyTraining.qiPavilionAid).toMatchObject({ stage: 6, beats: 0, door: 'intact', xunerScroll: 'xuner', attempts: 1 })
        const stopped = advanceEarlyQiAid(state, qiAidPlaces.wind, { ...input, operation: 'stop', marker: undefined })
        expect(stopped.ok).toBe(true)
        expect(stopped.state.earlyTraining.qiPavilionAid.beats).toBe(0)
        const capped = structuredClone(state); capped.earlyTraining.qiPavilionAid.attempts = 1_000_000
        expect(advanceEarlyQiAid(capped, qiAidPlaces.wind, { ...action(capped), marker: 0 }).state).toBe(capped)
        for (const marker of [-1, 2, NaN, Infinity, undefined]) expect(advanceEarlyQiAid(state, qiAidPlaces.wind, { ...input, marker }).state).toBe(state)
      }
      const result = advanceEarlyQiAid(state, qiAidPlaces[scene.place], input)
      expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyQiAid(state, qiAidPlaces[scene.place], input).state).toBe(state)
    }
  })
  it('旧档补空记录，新缺字段或异常组合拒绝，陈设碰撞与所有目标网格可达', () => {
    const state = eligible()
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.36.0'; delete old.earlyTraining.qiPavilionAid; delete old.earlyTraining.qiPavilionExchange
    expect(validateState(old).earlyTraining.qiPavilionAid.stage).toBe(0)
    old.contentVersion = '0.37.0'; expect(() => validateState(old)).toThrow()
    let next = state
    while (next.earlyTraining.qiPavilionAid.stage < 10) {
      const scene = qiAidScenes[next.earlyTraining.qiPavilionAid.stage]
      next = advanceEarlyQiAid(next, qiAidPlaces[scene.place], action(next)).state
      for (const key of ['door', 'group', 'returned', 'solo', 'thanks', 'xunerScroll'] as const) {
        const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.qiPavilionAid[key] = 'invalid'
        expect(() => validateState(bad)).toThrow()
      }
    }
    expect(moveQiAidWalker({ x: 240, y: 260 }, 'right')).toEqual({ x: 240, y: 260 })
    const queue: EarlyWalkPosition[] = [{ ...qiAidPlaces.fire }], reached = new Set(['100,320'])
    for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
      const p = moveQiAidWalker(queue[i], direction), key = `${p.x},${p.y}`
      if (!reached.has(key)) { reached.add(key); queue.push(p) }
    }
    for (const scene of qiAidScenes) expect(queue.some(p => nearQiAidPlace(p, scene.place))).toBe(true)
  })
  it('上限1/2封存且核心也拒写，正常提交只改当前记录且runtime保留', async () => {
    const state = eligible(), store = new GameStore({ load: async () => state, write: async () => {} })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyQiAid(store, qiAidPlaces.fire, action(state))).toBe(true)
    expect(submitEarlyQiAid(store, qiAidPlaces.fire, action(state))).toBe(false)
    await store.waitForAutosave(); expect(store.getSnapshot().runtime).toBe(runtime)
    for (const animeLimit of [1, 2]) {
      const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = animeLimit
      expect(renderToStaticMarkup(<EarlyQiAid state={limited} onBack={() => {}} />)).toContain('超出当前剧透范围')
      expect(savePreviewSummary(limited, limited.settings)).not.toMatch(/风属性|独自援助|双卷/)
      expect(advanceEarlyQiAid(limited, qiAidPlaces.fire, action(limited)).state).toBe(limited)
    }
  })
})
