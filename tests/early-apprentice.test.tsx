import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { apprenticeAt, type ApprenticeState } from '../src/core/early-apprentice-state'
import { mountainRingAt } from '../src/core/early-mountain-ring-state'
import { advanceEarlyFamilyVisit, familyVisitPlaces } from '../src/core/early-family-visit'
import { familyVisitScenes } from '../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation } from '../src/core/early-family-compensation'
import { familyCompensationScenes } from '../src/content/early-family-compensation'
import { advanceEarlyFamilyContract, familyContractPlaces, type FamilyContractView } from '../src/core/early-family-contract'
import { familyContractScenes } from '../src/content/early-family-contract'
import { advanceEarlyMountainRing, mountainRingPlaces } from '../src/core/early-mountain-ring'
import { mountainRingScenes } from '../src/content/early-mountain-ring'
import { advanceEarlyApprentice, submitEarlyApprentice, type ApprenticeAction } from '../src/core/early-apprentice'
import { apprenticeScenes } from '../src/content/early-apprentice'
import { earlyApprenticeSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyApprentice from '../src/ui/EarlyApprentice'
import EarlyMountainRing from '../src/ui/EarlyMountainRing'
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
  for (const scene of mountainRingScenes) {
    const result = advanceEarlyMountainRing(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.mountainRing, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
function input(state: GameState): ApprenticeAction {
  const task = state.earlyTraining.apprentice, scene = apprenticeScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
describe('C1g-3b 援助谈判、本人行礼与其后听名字', () => {
  it('25断点JSON/自动/手动/备份只改本人拜师，承诺不授许可、目标不授结果、愿学不代本人行礼', async () => {
    let state = eligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.apprentice.stage < 25) {
      const previous = state, scene = apprenticeScenes[state.earlyTraining.apprentice.stage]
      const result = advanceEarlyApprentice(state, mountainRingPlaces[scene.place], input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(3, state)
      const records = await listSlots()
      for (const slot of [0, 3]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.apprentice = before.earlyTraining.apprentice
      expect(comparison).toEqual(before)
      const task = state.earlyTraining.apprentice
      if (task.stage === 1) expect(task).toMatchObject({ promise: 'permission-required', aid: 'none' })
      if (task.stage === 4) expect(task).toMatchObject({ years: 1, target: 7, aid: 'none', choice: 'unspoken' })
      if (task.stage === 14) expect(task).toMatchObject({ alchemy: 'qualified', teacher: 'unknown' })
      if (task.stage === 19) expect(task).toMatchObject({ choice: 'willing', rite: 'none', name: 'unknown' })
      if (task.stage === 22) expect(task).toMatchObject({ rite: 'required', name: 'unknown' })
      if (task.stage === 23) expect(task).toMatchObject({ rite: 'bowed', name: 'unknown' })
      if (task.stage === 24) expect(task).toMatchObject({ rite: 'bowed', name: 'yaolao' })
      expect(state.earlyTraining.mountainRing.ring).toBe('floating')
    }
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyApprenticeSaveSummary(state, state.settings)).toContain('功法说明与正式返戒待续')
    expect(advanceEarlyApprentice(state, mountainRingPlaces.stone, input(state)).state).toBe(state)
  })
  it('整快照各字段、人物/次序/远处/五错误选择与重复零改变，青石前才可本人行礼', () => {
    let state = eligible()
    while (state.earlyTraining.apprentice.stage < 25) {
      const action = input(state), scene = apprenticeScenes[action.stage], position = mountainRingPlaces[scene.place]
      for (const operation of ['claim-seven', 'claim-profession', 'skip-bow', 'wear-ring', 'grant-permission'] as const) {
        const result = advanceEarlyApprentice(state, position, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      for (const key of Object.keys(apprenticeAt(0)) as (keyof ApprenticeState)[])
        expect(advanceEarlyApprentice(state, position, { ...action, [key]: 'stale' } as ApprenticeAction).state).toBe(state)
      expect(advanceEarlyApprentice(state, position, { ...action, actor: action.actor === 'yan' ? 'elder' : 'yan' }).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyApprentice(state, position, { ...action, operation: 'archive' }).state).toBe(state)
      for (const far of [{ x: 20, y: 20 }, { x: 675, y: 110 }, { x: NaN, y: 330 }])
        expect(advanceEarlyApprentice(state, far, action).state).toBe(state)
      if (action.stage === 22) expect(advanceEarlyApprentice(state, mountainRingPlaces.ridge, action).state).toBe(state)
      const result = advanceEarlyApprentice(state, position, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyApprentice(state, position, action).state).toBe(state)
    }
  })
  it('0.41仅补空、新缺字段拒绝，全部派生值/非法阶段及后山21前置强校', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.41.0'; delete old.earlyTraining.apprentice
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.42.0'; expect(() => validateState(old)).toThrow()
    const all = Array.from({ length: 26 }, (_, stage) => apprenticeAt(stage))
    for (const task of all) {
      const next = structuredClone(state); next.earlyTraining.apprentice = task
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof ApprenticeState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.apprentice[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.mountainRing = mountainRingAt(20)
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (const stage of [-1, 26, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.apprentice.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('未听名字仍匿名、行礼与名字分显、五错误可见、旧摘要跟随并上限1封存', () => {
    const state = eligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续援助与拜师')
    for (const [stage, text] of [[1, '尝试把承诺算作已授取气许可'], [4, '尝试把一年目标登记为已到七段'],
      [14, '尝试把资质登记为已成为炼药师'], [22, '尝试跳过本人行礼直接签礼成'], [24, '尝试在返戒之前重新佩戴古戒']] as const) {
      state.earlyTraining.apprentice = apprenticeAt(stage)
      expect(renderToStaticMarkup(<EarlyApprentice state={state} onBack={() => {}} />)).toContain(text)
    }
    state.earlyTraining.apprentice = apprenticeAt(23)
    const bowed = renderToStaticMarkup(<EarlyApprentice state={state} onBack={() => {}} />)
    expect(bowed).toContain('本人行礼已记录'); expect(bowed).toContain('古戒老人 · 姓名未报'); expect(bowed).not.toContain('药老')
    state.earlyTraining.apprentice = apprenticeAt(24)
    const named = renderToStaticMarkup(<EarlyApprentice state={state} onBack={() => {}} />)
    expect(named).toContain('已报名字的药老'); expect(named).toContain('老人处浮空的同一古戒'); expect(named).not.toContain('右手佩戴的同一古戒')
    state.earlyTraining.apprentice = apprenticeAt(25)
    expect(renderToStaticMarkup(<EarlyMountainRing state={state} onBack={() => {}} />)).toContain('功法说明与正式返戒待续')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyApprentice state={limited} onBack={() => {}} />)).not.toMatch(/后山|古戒|取气|拜师|药老/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续援助与拜师')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/后山|古戒|取气|拜师|药老/)
    expect(advanceEarlyApprentice(limited, mountainRingPlaces.stone, input(limited)).state).toBe(limited)
    expect(advanceEarlyApprentice(initialState(), mountainRingPlaces.ridge, input(initialState())).ok).toBe(false)
  })
  it('store拒绝零写、合法一次、runtime和主线保留', async () => {
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyApprentice(store, mountainRingPlaces.ridge, { ...input(state), operation: 'grant-permission' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyApprentice(store, mountainRingPlaces.ridge, input(state))).toBe(true)
    expect(submitEarlyApprentice(store, mountainRingPlaces.ridge, input(state))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
