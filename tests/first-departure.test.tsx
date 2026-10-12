import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstDepartureAt } from '../src/core/first-departure-state'
import { advanceFirstDeparture, departureNear, departurePlaces, moveDepartureWalker, submitFirstDeparture } from '../src/core/first-departure'
import { firstDepartureScenes } from '../src/content/first-departure'
import { firstDepartureEligible, firstDepartureInput, firstDepartureStep } from './helpers/first-departure-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstDepartureSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstDeparture from '../src/ui/FirstDeparture'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

describe('C1h-1b3 实际出门与石路', () => {
  it('九断点/自动三手动上一备份，只保存新历史；跨门和关门两步分开', async () => {
    let state = firstDepartureEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.firstDeparture.stage < 9) {
      const previous = state; state = firstDepartureStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstDeparture = before.earlyTraining.firstDeparture
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstDeparture
      expect(task).toEqual(firstDepartureAt(task.stage))
      const html = renderToStaticMarkup(<FirstDeparture state={state} onBack={() => {}} />)
      expect(html.includes('本人 · 室外')).toBe(task.outside)
      expect(html.includes('>从门外返回房内')).toBe(task.outside && !task.closed)
      if (task.stage === 4) { expect(task.closed).toBe(false); expect(task.path).toBe(false) }
    }
    expect(firstDepartureSaveSummary(state, state.settings)).toContain('路口待续')
    expect(advanceFirstDeparture(state, departurePlaces.path, 'outside', firstDepartureInput(state)).state).toBe(state)
  })
  it('旧0.61补独立未参与；旧试招/耗尽药液/五段/后期两瓶和原奖励保持', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    for (const input of [firstDepartureEligible(), firstDepartureEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.61.0'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstDeparture
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstDeparture.stage < 9) state = firstDepartureStep(state)
      const same = structuredClone(state); same.earlyTraining.firstDeparture = input.earlyTraining.firstDeparture
      expect(same).toEqual(input)
    }
    const bad = firstDepartureStep(firstDepartureEligible()); bad.contentVersion = '0.61.0'
    expect(() => validateState(bad)).toThrow('首次出门石路')
  })
  it('全快照/人物/空间/合法位置/动作/重复都零写，不能房内代签室外', () => {
    let state = firstDepartureEligible()
    while (state.earlyTraining.firstDeparture.stage < 9) {
      const scene = firstDepartureScenes[state.earlyTraining.firstDeparture.stage], p = departurePlaces[scene.place], action = firstDepartureInput(state)
      for (const key of Object.keys(state.earlyTraining.firstDeparture))
        expect(advanceFirstDeparture(state, p, scene.space, { ...action, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery'] as const) {
        expect(advanceFirstDeparture(state, p, scene.space, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstDeparture(state, p, scene.space, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      expect(advanceFirstDeparture(state, p, scene.space === 'room' ? 'outside' : 'room', action).state).toBe(state)
      expect(advanceFirstDeparture(state, p, scene.space, { ...action, actor: 'ring' }).state).toBe(state)
      for (const operation of ['finish', 'meet', 'learn', 'loot', 'teleport'])
        expect(advanceFirstDeparture(state, p, scene.space, { ...action, operation }).state).toBe(state)
      for (const pos of [{ x: NaN, y: p.y }, { x: p.x, y: Infinity }, { x: p.x, y: 420 }, { x: 660, y: 310 }])
        expect(advanceFirstDeparture(state, pos, scene.space, action).state).toBe(state)
      state = firstDepartureStep(state)
      expect(advanceFirstDeparture(state, p, scene.space, action).state).toBe(state)
    }
  })
  it('八步实际走到房门和八步石路；边界/旧场景位置不传送', () => {
    let p = { ...departurePlaces.bed }
    for (let i = 0; i < 8; i++) p = moveDepartureWalker(p, 'room', 'right')
    expect(p).toEqual(departurePlaces.door)
    expect(departureNear(p, 'room', 2)).toBe(true)
    expect(moveDepartureWalker(p, 'room', 'right')).toBe(p)
    expect(departureNear(p, 'room', 4)).toBe(false)
    p = { ...departurePlaces.yardDoor }
    for (let i = 0; i < 8; i++) p = moveDepartureWalker(p, 'outside', 'left')
    expect(p).toEqual(departurePlaces.path)
    expect(departureNear(p, 'outside', 6)).toBe(true)
    expect(moveDepartureWalker(p, 'outside', 'down')).toBe(p)
    expect(moveDepartureWalker(departurePlaces.bed, 'outside', 'left')).toEqual(departurePlaces.bed)
    expect(departureNear(departurePlaces.yardDoor, 'outside', 5)).toBe(true)
    expect(departureNear(departurePlaces.door, 'room', 5)).toBe(false)
  })
  it('派生字段、前置和版本严格；防剧透封存，旧完成不露未经体验会面', () => {
    let state = firstDepartureEligible()
    while (state.earlyTraining.firstDeparture.stage < 9) {
      state = firstDepartureStep(state)
      for (const key of Object.keys(state.earlyTraining.firstDeparture)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstDeparture, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
    const invalid = structuredClone(state); invalid.earlyTraining.firstTechnique.stage = 18
    expect(() => validateState(invalid)).toThrow()
    expect(renderToStaticMarkup(<FirstDeparture state={invalid} onBack={() => {}} />)).not.toContain('出门与石路地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={invalid} />)).not.toContain('接续实际出门与石路')
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }
    const sealed = { ...state, settings: hidden }
    expect(advanceFirstDeparture(sealed, departurePlaces.path, 'outside', firstDepartureInput(sealed)).state).toBe(sealed)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续实际出门与石路')
    expect(savePreviewSummary(state, hidden)).not.toContain('出门石路')
    expect(firstDepartureSaveSummary(state, hidden)).toContain('封存')
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstDeparture
    expect(() => validateState(missing)).toThrow()
  })
  it('原子单字段保存、旧入口并发与重复拒绝、运行态保持', async () => {
    const state = firstDepartureEligible(), action = firstDepartureInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(saved.earlyTraining.firstDeparture.stage).toBe(1) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstDeparture(store, departurePlaces.bed, 'room', action)).toBe(true)
    expect(submitFirstDeparture(store, departurePlaces.bed, 'room', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.practice.phase = 1
    expect(advanceFirstDeparture(changed, departurePlaces.bed, 'room', action).state).toBe(changed)
  })
})
