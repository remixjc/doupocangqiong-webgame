import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { parseEarlyTraining } from '../src/core/early-training-state'
import { mountainRingAt, type MountainRingState } from '../src/core/early-mountain-ring-state'
import { familyContractAt } from '../src/core/early-family-contract-state'
import { advanceEarlyFamilyVisit, familyVisitPlaces } from '../src/core/early-family-visit'
import { familyVisitScenes } from '../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation } from '../src/core/early-family-compensation'
import { familyCompensationScenes } from '../src/content/early-family-compensation'
import { advanceEarlyFamilyContract, familyContractPlaces, type FamilyContractView } from '../src/core/early-family-contract'
import { familyContractScenes } from '../src/content/early-family-contract'
import { advanceEarlyMountainRing, mountainRingPlaces, mountainRingNear, mountainRingStart, mountainRingPositionValid,
  moveMountainRingWalker, submitEarlyMountainRing, type MountainRingAction } from '../src/core/early-mountain-ring'
import { mountainRingScenes } from '../src/content/early-mountain-ring'
import { earlyMountainRingSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyMountainRing from '../src/ui/EarlyMountainRing'
import EarlyFamilyContract from '../src/ui/EarlyFamilyContract'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function eligible(): GameState {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let state = validateState(old)
  for (const scene of familyVisitScenes) {
    const result = advanceEarlyFamilyVisit(state, familyVisitPlaces[scene.place], { ...state.earlyTraining.familyVisit, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of familyCompensationScenes) {
    const result = advanceEarlyFamilyCompensation(state, familyVisitPlaces[scene.place], { ...state.earlyTraining.familyCompensation, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of familyContractScenes) {
    const task = state.earlyTraining.familyContract
    const view: FamilyContractView = task.yan === 'hall' ? { kind: 'yan', position: familyContractPlaces[scene.place] } : { kind: 'observer', place: scene.place }
    const result = advanceEarlyFamilyContract(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
function input(state: GameState): MountainRingAction {
  const task = state.earlyTraining.mountainRing, scene = mountainRingScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
describe('C1g-3a 后山声音、流失承认与同一古戒返回', () => {
  it('21断点自动/手动/备份/JSON只改新记录，声音/提示/定位、询问/承认、抛出/返回独立', async () => {
    let state = eligible()
    const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.mountainRing.stage < 21) {
      const previous = state, scene = mountainRingScenes[state.earlyTraining.mountainRing.stage]
      const result = advanceEarlyMountainRing(state, mountainRingPlaces[scene.place], input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const slot of [0, 3]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.mountainRing = before.earlyTraining.mountainRing
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.mountainRing
      if (task.stage === 4) expect(task).toMatchObject({ voice: 'heard', qi: 'unknown', ring: 'worn' })
      if (task.stage === 6) expect(task.voice).toBe('hinted')
      if (task.stage === 7) expect(task).toMatchObject({ voice: 'located', identity: 'unknown' })
      if (task.stage === 11) expect(task.qi).toBe('asked')
      if (task.stage === 12) expect(task).toMatchObject({ qi: 'admitted', ring: 'worn', elder: 'unseen' })
      if (task.stage === 14) expect(task).toMatchObject({ ring: 'thrown', elder: 'unseen', mood: 'regretful' })
      if (task.stage === 16) expect(task).toMatchObject({ ring: 'floating', elder: 'visible', identity: 'withheld' })
      if (task.stage === 20) expect(task).toMatchObject({ future: 'asked', ring: 'floating' })
    }
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyMountainRingSaveSummary(state, state.settings)).toContain('本人拜师待续')
    expect(advanceEarlyMountainRing(state, mountainRingPlaces.stone, input(state)).state).toBe(state)
  })
  it('所有整快照字段、错人/顺序/地点、四种提前因果/佩戴/承诺/资源及重复拒绝', () => {
    let state = eligible()
    while (state.earlyTraining.mountainRing.stage < 21) {
      const action = input(state), scene = mountainRingScenes[action.stage], position = mountainRingPlaces[scene.place]
      for (const operation of ['claim-cause', 'wear-now', 'claim-promise', 'claim-recovery'] as const) {
        const result = advanceEarlyMountainRing(state, position, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const key of Object.keys(mountainRingAt(0)) as (keyof MountainRingState)[])
        expect(advanceEarlyMountainRing(state, position, { ...action, [key]: 'stale' } as MountainRingAction).state).toBe(state)
      expect(advanceEarlyMountainRing(state, position, { ...action, actor: action.actor === 'yan' ? 'elder' : 'yan' }).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyMountainRing(state, position, { ...action, operation: 'archive' }).state).toBe(state)
      for (const far of [{ x: 20, y: 20 }, { x: 675, y: 110 }, { x: NaN, y: 330 }])
        expect(advanceEarlyMountainRing(state, far, action).state).toBe(state)
      const result = advanceEarlyMountainRing(state, position, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyMountainRing(state, position, action).state).toBe(state)
    }
  })
  it('0.40旧档仅补空；新版缺字段、派生值互换/非法阶段与未完成双方离厅拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.40.0'; delete old.earlyTraining.mountainRing
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.41.0'; expect(() => validateState(old)).toThrow()
    const all = Array.from({ length: 22 }, (_, stage) => mountainRingAt(stage))
    for (const task of all) {
      const next = structuredClone(state); next.earlyTraining.mountainRing = task
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof MountainRingState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.mountainRing[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.familyContract = familyContractAt(32)
        expect(() => parseEarlyTraining(bad.earlyTraining, [1, 2])).toThrow()
      }
    }
    for (const stage of [-1, 22, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.mountainRing.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('安全网格全地点可达，崖外/山石/树丛阻挡且非法位置不交互', () => {
    const queue = [{ ...mountainRingStart }], reached = new Set([`${mountainRingStart.x},${mountainRingStart.y}`])
    for (let i = 0; i < queue.length; i++) for (const direction of ['up', 'left', 'down', 'right'] as const) {
      const next = moveMountainRingWalker(queue[i], direction), key = `${next.x},${next.y}`
      if (!reached.has(key)) { reached.add(key); queue.push(next) }
    }
    for (const scene of mountainRingScenes) expect(queue.some(p => mountainRingNear(p, scene.place))).toBe(true)
    for (const point of [{ x: 600, y: 110 }, { x: 360, y: 230 }, { x: 80, y: 110 }])
      expect(moveMountainRingWalker(point, 'right')).toBe(point)
    expect(mountainRingPositionValid({ x: 675, y: 110 })).toBe(false)
    expect(moveMountainRingWalker({ x: NaN, y: 110 }, 'right')).toEqual(mountainRingStart)
  })
  it('不提前显示姓名/佩戴/拜师、四错误选项可见、旧归档随新进度更新和剧透1封存', () => {
    const state = eligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('独自走上后山')
    for (const [stage, text] of [[4, '尝试直接登记流失原因'], [14, '尝试在返回之前再佩戴古戒'],
      [18, '尝试把得知原因算作资源全恢复'], [20, '尝试把问话算作已经承诺或拜师']] as const) {
      state.earlyTraining.mountainRing = mountainRingAt(stage)
      expect(renderToStaticMarkup(<EarlyMountainRing state={state} onBack={() => {}} />)).toContain(text)
    }
    state.earlyTraining.mountainRing = mountainRingAt(14)
    const thrown = renderToStaticMarkup(<EarlyMountainRing state={state} onBack={() => {}} />)
    expect(thrown).not.toMatch(/右手佩戴的同一古戒|老人处浮空的同一古戒|药老/)
    state.earlyTraining.mountainRing = mountainRingAt(21)
    const done = renderToStaticMarkup(<EarlyMountainRing state={state} onBack={() => {}} />)
    expect(done).toContain('老人处浮空的同一古戒'); expect(done).toContain('身份尚未公开的古戒老人')
    expect(done).not.toMatch(/右手佩戴的同一古戒|药老/)
    expect(renderToStaticMarkup(<EarlyFamilyContract state={state} onBack={() => {}} />)).toContain('取气答复与本人拜师待续')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMountainRing state={limited} onBack={() => {}} />)).not.toMatch(/后山|古戒|取气|拜师/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('独自走上后山')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/后山|古戒|取气|拜师/)
    expect(earlyMountainRingSaveSummary(state, limited.settings)).toBe('前期记录 · 当前范围封存')
    expect(advanceEarlyMountainRing(limited, mountainRingPlaces.stone, input(limited)).state).toBe(limited)
    const fresh = initialState()
    expect(advanceEarlyMountainRing(fresh, mountainRingPlaces.path, input(fresh)).state).toBe(fresh)
  })
  it('store拒绝零写/合法单写/runtime不变', async () => {
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyMountainRing(store, mountainRingPlaces.path, { ...input(state), operation: 'claim-recovery' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyMountainRing(store, mountainRingPlaces.path, input(state))).toBe(true)
    expect(submitEarlyMountainRing(store, mountainRingPlaces.path, input(state))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
