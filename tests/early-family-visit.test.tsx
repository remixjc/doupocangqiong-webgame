import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { familyVisitAt } from '../src/core/early-family-visit-state'
import { parseEarlyTraining } from '../src/core/early-training-state'
import { advanceEarlyFamilyVisit, familyVisitPlaces, familyVisitPositionValid, moveFamilyVisitWalker,
  nearFamilyVisitPlace, submitEarlyFamilyVisit, type FamilyVisitAction } from '../src/core/early-family-visit'
import { familyVisitScenes } from '../src/content/early-family-visit'
import { earlyFamilyVisitSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyFamilyVisit from '../src/ui/EarlyFamilyVisit'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function eligible(): GameState {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return validateState(old)
}
function input(state: GameState): FamilyVisitAction {
  const scene = familyVisitScenes[state.earlyTraining.familyVisit.stage]
  return { ...state.earlyTraining.familyVisit, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
describe('C1g-1 拜师前来访、入席和公开请求', () => {
  it('17个断点自动/手动/备份/JSON往返，只改来访记录，不要求先接拜师后重修', async () => {
    let state = eligible()
    const before = structuredClone(state)
    expect(state.earlyTraining.started).toBe(false)
    await saveSlot(0, state)
    while (state.earlyTraining.familyVisit.stage < 17) {
      const previous = state, scene = familyVisitScenes[state.earlyTraining.familyVisit.stage]
      const result = advanceEarlyFamilyVisit(state, familyVisitPlaces[scene.place], input(state))
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const slot of [0, 3]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.familyVisit = before.earlyTraining.familyVisit
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.familyVisit
      if (task.stage === 7) expect(task.seat).toBe('missing')
      if (task.stage === 8) expect(task.seat).toBe('shared')
      if (task.stage === 12) expect(task.request).toBe('unspoken')
      if (task.stage === 14) expect(task).toMatchObject({ pressure: 'raised', box: 'unseen' })
      if (task.stage === 15) expect(task).toMatchObject({ pressure: 'withdrawn', box: 'unseen' })
      if (task.stage === 16) expect(earlyFamilyVisitSaveSummary(state, state.settings)).toContain('仍属来客')
    }
    expect(advanceEarlyFamilyVisit(state, familyVisitPlaces.entrance, input(state)).state).toBe(state)
    expect(earlyFamilyVisitSaveSummary(state, state.settings)).toContain('补偿与文书待续')
  })
  it('错地点/人物/操作/过期字段/重复与代答收匣均拒绝且不写，不能把戒备当交战', () => {
    let state = eligible()
    while (state.earlyTraining.familyVisit.stage < 17) {
      const action = input(state), scene = familyVisitScenes[action.stage], position = familyVisitPlaces[scene.place]
      for (const wrong of [
        { ...action, actor: action.actor === 'yan' ? 'xuner' : 'yan' },
        { ...action, operation: 'take-box' }, { ...action, operation: 'accept-for-father' },
        { ...action, seat: action.seat === 'unseen' ? 'shared' : 'unseen' },
        { ...action, operation: 'archive' },
      ] as FamilyVisitAction[]) {
        if (wrong.operation === action.operation && wrong.actor === action.actor && wrong.seat === action.seat) continue
        const result = advanceEarlyFamilyVisit(state, position, wrong)
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const far of [{ x: 20, y: 20 }, { x: 240, y: 170 }, { x: NaN, y: 330 }])
        expect(advanceEarlyFamilyVisit(state, far, action).state).toBe(state)
      const result = advanceEarlyFamilyVisit(state, position, action); expect(result.ok).toBe(true)
      state = result.state
      expect(advanceEarlyFamilyVisit(state, position, action).state).toBe(state)
    }
  })
  it('旧0.37.6仅补空/新缺字段拒绝，所有阶段派生字段与第2章前置强校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.37.6'; delete old.earlyTraining.familyVisit
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.38.0'; expect(() => validateState(old)).toThrow()
    for (let stage = 0; stage <= 17; stage++) {
      const next = structuredClone(state); next.earlyTraining.familyVisit = familyVisitAt(stage)
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of ['seat', 'emblem', 'identity', 'request', 'pressure', 'box'] as const) {
        const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.familyVisit[key] = 'invalid'
        expect(() => validateState(bad)).toThrow()
      }
      if (stage) expect(() => parseEarlyTraining(next.earlyTraining, [])).toThrow()
    }
    for (const stage of [-1, 18, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.familyVisit.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('门洞、陈设真实碰撞且所有阶段经行走网格可达，界面保留方向/E与当前人物操作', () => {
    const queue = [{ x: 100, y: 330 }], reached = new Set(['100,330'])
    for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
      const p = moveFamilyVisitWalker(queue[i], direction), key = `${p.x},${p.y}`
      if (!reached.has(key)) { reached.add(key); queue.push(p) }
    }
    for (const scene of familyVisitScenes) expect(queue.some(p => nearFamilyVisitPlace(p, scene.place))).toBe(true)
    const wall = { x: 220, y: 170 }, furniture = { x: 420, y: 230 }
    expect(moveFamilyVisitWalker(wall, 'right')).toBe(wall)
    expect(moveFamilyVisitWalker(furniture, 'right')).toBe(furniture)
    expect(moveFamilyVisitWalker({ x: 220, y: 270 }, 'right')).toEqual({ x: 240, y: 270 })
    expect(familyVisitPositionValid({ x: 550, y: Infinity })).toBe(false)
    expect(moveFamilyVisitWalker({ x: NaN, y: 1 }, 'up')).toMatchObject(familyVisitPlaces.room)
    const markup = renderToStaticMarkup(<EarlyFamilyVisit state={eligible()} onBack={() => {}} />)
    expect(markup).toContain('WASD'); expect(markup).toContain('家族来访行走地图')
    expect(markup).toContain('收功起身')
  })
  it('上限1入口/标题/摘要封存，未首通不可推进；store拒绝不写/合法一步单写/runtime保持', async () => {
    const state = eligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('回到家族来访')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyFamilyVisit state={limited} onBack={() => {}} />)).not.toMatch(/来访|薰儿|玉匣|退婚/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('回到家族来访')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/来访|玉匣|纳兰|退婚/)
    expect(advanceEarlyFamilyVisit(limited, familyVisitPlaces.room, input(limited)).state).toBe(limited)
    const fresh = initialState()
    expect(advanceEarlyFamilyVisit(fresh, familyVisitPlaces.room, input(fresh)).state).toBe(fresh)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyFamilyVisit(store, familyVisitPlaces.father, input(state))).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyFamilyVisit(store, familyVisitPlaces.room, input(state))).toBe(true)
    expect(submitEarlyFamilyVisit(store, familyVisitPlaces.room, input(state))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
