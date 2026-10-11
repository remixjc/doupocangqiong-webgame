import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyQiPavilionEntry, earlyQiPavilionBlock, submitEarlyQiPavilionEntry, qiPavilionPlaces, nearQiPavilionPlace, moveQiPavilionWalker, validQiPavilionPosition, type QiPavilionEntryAction } from '../src/core/early-qi-pavilion'
import { qiPavilionEntryScenes } from '../src/content/early-qi-pavilion'
import { earlyQiPavilionEntrySaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyQiPavilion from '../src/ui/EarlyQiPavilion'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function eligible() {
  // Explicit legacy fixture for rules; the browser journey never imports this.
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  const args: Parameters<typeof replayEarlyTraining> = [validateState(old)]
  args[26] = true // includeCeremonyVerdict: dependency chain uses normal transactions.
  return replayEarlyTraining(...args)
}
function input(state: ReturnType<typeof eligible>): QiPavilionEntryAction {
  const task = state.earlyTraining.qiPavilionEntry, scene = qiPavilionEntryScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'xiaoyan', operation: scene?.operation ?? 'archive' }
}
function advance(state: ReturnType<typeof eligible>) {
  const scene = qiPavilionEntryScenes[state.earlyTraining.qiPavilionEntry.stage]
  const result = advanceEarlyQiPavilionEntry(state, qiPavilionPlaces[scene?.place ?? 'inside'], input(state))
  expect(result.ok, result.message).toBe(true)
  return result.state
}
describe('C1f-1 属性分人、裂纹/碎裂与许可/过门分开，不提前发卷', () => {
  it('十二断点JSON/自动手动/上一份备份往返，其他全部持久状态不变', async () => {
    let state = eligible(); expect(state.earlyTraining.ceremonyVerdict.stage).toBe(16)
    const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.qiPavilionEntry.stage < 12) {
      const previous = state, scene = qiPavilionEntryScenes[state.earlyTraining.qiPavilionEntry.stage], stale = input(state)
      state = parseSave(serializeSave(advance(state)))
      expect(advanceEarlyQiPavilionEntry(state, qiPavilionPlaces[scene.place], stale).state).toBe(state)
      await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.qiPavilionEntry = before.earlyTraining.qiPavilionEntry
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.qiPavilionEntry
      if (task.stage === 4) expect(task).toMatchObject({ other: 'wind', yan: 'unmeasured', xuner: 'unmeasured' })
      if (task.stage === 5) expect(task).toMatchObject({ yan: 'fire', xuner: 'unmeasured', hint: 'none', crystal: 'intact' })
      if (task.stage === 7) expect(task).toMatchObject({ xuner: 'fire', crystal: 'cracked', permission: false, entered: false })
      if (task.stage === 8) expect(task).toMatchObject({ permission: true, entered: false })
      if (task.stage === 10) expect(task).toMatchObject({ entered: true, crystal: 'cracked' })
      if (task.stage === 11) expect(task.crystal).toBe('broken')
    }
    expect(advanceEarlyQiPavilionEntry(state, qiPavilionPlaces.inside, input(state)).state).toBe(state)
    expect(earlyQiPavilionEntrySaveSummary(state, state.settings)).toContain('择卷待续')
  })
  it('错人/越步/重复/非法或远坐标/未礼终拒绝，不从入阁取卷、水晶或物资', () => {
    let state = eligible()
    expect(earlyQiPavilionBlock(initialState())).not.toBe('')
    while (state.earlyTraining.qiPavilionEntry.stage < 12) {
      const scene = qiPavilionEntryScenes[state.earlyTraining.qiPavilionEntry.stage], action = input(state), place = qiPavilionPlaces[scene.place]
      for (const operation of ['take-scroll', 'take-crystal'] as const)
        expect(advanceEarlyQiPavilionEntry(state, place, { ...action, operation }).state).toBe(state)
      expect(advanceEarlyQiPavilionEntry(state, place, { ...action, actor: scene.actor === 'observe' ? 'xiaoyan' : 'observe' }).state).toBe(state)
      expect(advanceEarlyQiPavilionEntry(state, { x: 20, y: 400 }, action).state).toBe(state)
      expect(advanceEarlyQiPavilionEntry(state, { x: NaN, y: 300 }, action).state).toBe(state)
      const bad = structuredClone(state); bad.earlyTraining.ceremonyVerdict.stage = 15
      expect(earlyQiPavilionBlock(bad)).not.toBe('')
      expect(advanceEarlyQiPavilionEntry(bad, place, action).state).toBe(bad)
      state = advance(state)
    }
  })
  it('旧0.33.11只补未参与，新缺字段/全部阶段不符的属性、球、线索及入阁组合拒绝', () => {
    let state = eligible()
    const old = JSON.parse(JSON.stringify(state)); old.contentVersion = '0.33.11'; delete old.earlyTraining.qiPavilionEntry
    expect(validateState(old).earlyTraining.qiPavilionEntry).toEqual(state.earlyTraining.qiPavilionEntry)
    old.contentVersion = '0.34.0'; expect(() => validateState(old)).toThrow()
    while (true) {
      const task = state.earlyTraining.qiPavilionEntry
      for (const stage of [-1, 13, .5, NaN]) {
        const bad = structuredClone(state); bad.earlyTraining.qiPavilionEntry.stage = stage
        expect(() => validateState(bad)).toThrow()
      }
      for (const key of ['door', 'other', 'yan', 'xuner', 'crystal', 'hint', 'permission', 'entered'] as const) {
        const bad = JSON.parse(JSON.stringify(state))
        bad.earlyTraining.qiPavilionEntry[key] = typeof task[key] === 'boolean' ? !task[key] : 'invalid'
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage > 0) {
        const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.ceremonyVerdict.stage = 15
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 12) break
      state = advance(state)
    }
  })
  it('每阶段当前地点真实网格可达；许可后评述之前仍不能过门，开通后只能走门洞', () => {
    for (let stage = 0; stage <= 12; stage++) {
      const queue = [{ x: 180, y: 350 }], reached = new Set(['180,350'])
      for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
        const p = moveQiPavilionWalker(queue[i], direction, stage), key = `${p.x},${p.y}`
        if (!reached.has(key)) { reached.add(key); queue.push(p) }
      }
      const scene = qiPavilionEntryScenes[stage]
      if (scene) expect(queue.some(p => nearQiPavilionPlace(p, scene.place, stage))).toBe(true)
      expect(queue.some(p => p.y < 170)).toBe(stage >= 9)
      const wall = { x: 200, y: 210 }
      expect(moveQiPavilionWalker(wall, 'up', stage)).toBe(wall)
    }
    for (const stage of [-1, 13, NaN, Infinity]) expect(validQiPavilionPosition(qiPavilionPlaces.forecourt, stage)).toBe(false)
    expect(validQiPavilionPosition(qiPavilionPlaces.inside, 8)).toBe(false)
    expect(validQiPavilionPosition(qiPavilionPlaces.inside, 9)).toBe(true)
  })
  it('成功一步只排一次写入且不改runtime，动画上限1/2封存入口、整摘要与人物线索', async () => {
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    const action = input(state)
    expect(submitEarlyQiPavilionEntry(store, qiPavilionPlaces.inside, action)).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyQiPavilionEntry(store, qiPavilionPlaces.forecourt, action)).toBe(true)
    expect(submitEarlyQiPavilionEntry(store, qiPavilionPlaces.forecourt, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('前往功法阁')
    for (const animeLimit of [1, 2]) {
      const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = animeLimit
      expect(earlyQiPavilionBlock(limited)).toContain('超出')
      expect(renderToStaticMarkup(<EarlyQiPavilion state={limited} onBack={() => {}} />)).not.toMatch(/功法阁|薰儿|水晶|四十三/)
      expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('前往功法阁')
      expect(savePreviewSummary(limited, limited.settings)).not.toMatch(/功法阁|四十三/)
    }
  })
})
