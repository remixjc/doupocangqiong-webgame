import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { familyCompensationAt } from '../src/core/early-family-compensation-state'
import { parseEarlyTraining } from '../src/core/early-training-state'
import { advanceEarlyFamilyVisit, familyVisitPlaces } from '../src/core/early-family-visit'
import { familyVisitScenes } from '../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation, submitEarlyFamilyCompensation, type FamilyCompensationAction } from '../src/core/early-family-compensation'
import { familyCompensationScenes } from '../src/content/early-family-compensation'
import { earlyFamilyCompensationSaveSummary, earlyFamilyVisitSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyFamilyCompensation from '../src/ui/EarlyFamilyCompensation'
import EarlyFamilyVisit from '../src/ui/EarlyFamilyVisit'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

function eligible(): GameState {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let state = validateState(old)
  while (state.earlyTraining.familyVisit.stage < 17) {
    const task = state.earlyTraining.familyVisit, scene = familyVisitScenes[task.stage]
    const result = advanceEarlyFamilyVisit(state, familyVisitPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
function input(state: GameState): FamilyCompensationAction {
  const scene = familyCompensationScenes[state.earlyTraining.familyCompensation.stage]
  return { ...state.earlyTraining.familyCompensation, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
describe('C1g-2a 补偿提议与本人发言', () => {
  it('15步每个JSON/自动/手动/备份断点往返，问话不代答、提议不授丹/职业/功法', async () => {
    let state = eligible()
    const before = structuredClone(state); await saveSlot(0, state)
    while (state.earlyTraining.familyCompensation.stage < 15) {
      const previous = state, task = state.earlyTraining.familyCompensation, scene = familyCompensationScenes[task.stage]
      const result = advanceEarlyFamilyCompensation(state, familyVisitPlaces[scene.place], input(state))
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
      await saveSlot(0, state); await saveSlot(2, state)
      const records = await listSlots()
      for (const slot of [0, 2]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.familyCompensation = before.earlyTraining.familyCompensation
      expect(comparison).toEqual(before)
      if (state.earlyTraining.familyCompensation.stage === 7) expect(state.earlyTraining.familyCompensation.elders).toBe('blocking')
      if (state.earlyTraining.familyCompensation.stage === 10) expect(state.earlyTraining.familyCompensation.consent).toBe('asked')
      if (state.earlyTraining.familyCompensation.stage === 11) expect(state.earlyTraining.familyCompensation.consent).toBe('not-given')
      if (state.earlyTraining.familyCompensation.stage === 13) expect(state.earlyTraining.familyCompensation).toMatchObject({ extra: 'offered', terms: 'unreviewed' })
    }
    expect(advanceEarlyFamilyCompensation(state, familyVisitPlaces.entrance, input(state)).state).toBe(state)
    expect(state.earlyTraining.started).toBe(false)
    expect(earlyFamilyCompensationSaveSummary(state, state.settings)).toContain('文书与立约待续')
    expect(earlyFamilyVisitSaveSummary(state, state.settings)).toContain('后续交涉已归档')
    expect(renderToStaticMarkup(<EarlyFamilyVisit state={state} onBack={() => {}} />)).toContain('后续补偿交涉已归档')
  })
  it('三种越界领取/职业、错位置/人物/次序/整快照及重复拒绝，不写', () => {
    let state = eligible()
    while (state.earlyTraining.familyCompensation.stage < 15) {
      const action = input(state), scene = familyCompensationScenes[action.stage], position = familyVisitPlaces[scene.place]
      for (const operation of ['take-extra', 'join-now', 'claim-alchemist'] as const) {
        const result = advanceEarlyFamilyCompensation(state, position, { ...action, operation })
        expect(result.ok).toBe(false); expect(result.state).toBe(state)
      }
      const wrongActor: FamilyCompensationAction['actor'] = action.actor === 'yan' ? 'nalan' : 'yan'
      expect(advanceEarlyFamilyCompensation(state, position, { ...action, actor: wrongActor }).state).toBe(state)
      expect(advanceEarlyFamilyCompensation(state, position, { ...action, lore: action.lore === 'unread' ? 'reviewed' : 'unread' }).state).toBe(state)
      expect(advanceEarlyFamilyCompensation(state, { x: 20, y: 20 }, action).state).toBe(state)
      expect(advanceEarlyFamilyCompensation(state, { x: NaN, y: 1 }, action).state).toBe(state)
      if (action.operation !== 'archive') expect(advanceEarlyFamilyCompensation(state, position, { ...action, operation: 'archive' }).state).toBe(state)
      const result = advanceEarlyFamilyCompensation(state, position, action); expect(result.ok).toBe(true); state = result.state
      expect(advanceEarlyFamilyCompensation(state, position, action).state).toBe(state)
    }
  })
  it('0.38旧完成来访仅补空，新缺字段/异常派生组合/缺前半程拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.38.0'; delete old.earlyTraining.familyCompensation
    expect(validateState(old)).toEqual(state)
    old.contentVersion = '0.39.0'; expect(() => validateState(old)).toThrow()
    for (let stage = 0; stage <= 15; stage++) {
      const next = structuredClone(state); next.earlyTraining.familyCompensation = familyCompensationAt(stage)
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of ['pill', 'lore', 'maker', 'objection', 'elders', 'consent', 'extra', 'terms'] as const) {
        const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.familyCompensation[key] = 'invalid'
        expect(() => validateState(bad)).toThrow()
      }
      if (stage) {
        const bad = structuredClone(next); bad.earlyTraining.familyVisit.stage = 16
        expect(() => parseEarlyTraining(bad.earlyTraining, [1, 2])).toThrow()
      }
    }
    for (const stage of [-1, 16, .2, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.familyCompensation.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('防剧透上限1封存整入口/人物/摘要，前半程不足不能开始；正常入口可用', () => {
    const state = eligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续补偿交涉')
    const fresh = initialState()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={fresh} />)).not.toContain('接续补偿交涉')
    expect(advanceEarlyFamilyCompensation(fresh, familyVisitPlaces.guests, input(fresh)).state).toBe(fresh)
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyFamilyCompensation state={limited} onBack={() => {}} />)).not.toMatch(/丹药|来访|纳兰|补偿|古河/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续补偿交涉')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/补偿|来访|古河|祖辈/)
    expect(advanceEarlyFamilyCompensation(limited, familyVisitPlaces.guests, input(limited)).state).toBe(limited)
    const visible = renderToStaticMarkup(<EarlyFamilyCompensation state={state} onBack={() => {}} />)
    expect(visible).toContain('补偿答复行走地图'); expect(visible).toContain('WASD')
    expect(visible).toContain('仍在来客席的玉匣')
  })
  it('store非法零写、合法一次且runtime不变', async () => {
    const state = eligible(); let writes = 0
    const store = new GameStore({ load: async () => state, write: async () => { writes++ } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyFamilyCompensation(store, familyVisitPlaces.guests, { ...input(state), operation: 'take-extra' })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyFamilyCompensation(store, familyVisitPlaces.guests, input(state))).toBe(true)
    expect(submitEarlyFamilyCompensation(store, familyVisitPlaces.guests, input(state))).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
