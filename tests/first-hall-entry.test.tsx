import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstHallEntryAt } from '../src/core/first-hall-entry-state'
import { advanceFirstHallEntry, hallEntryNear, hallEntryPlaces, moveHallEntryWalker, submitFirstHallEntry } from '../src/core/first-hall-entry'
import { firstHallEntryScenes } from '../src/content/first-hall-entry'
import { firstHallEntryEligible, firstHallEntryInput, firstHallEntryStep } from './helpers/first-hall-entry-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallEntrySaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallEntry from '../src/ui/FirstHallEntry'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

describe('C1h-2b1 本人实际入堂', () => {
  it('九断点/四槽与备份，门外堂内分开，旧全部state和卷轴不变', async () => {
    let state = firstHallEntryEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.firstHallEntry.stage < 9) {
      const previous = state; state = firstHallEntryStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstHallEntry = before.earlyTraining.firstHallEntry
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstHallEntry
      expect(task).toEqual(firstHallEntryAt(task.stage))
      const html = renderToStaticMarkup(<FirstHallEntry state={state} onBack={() => {}} />)
      expect(html.includes('本人 · 堂内')).toBe(task.entered)
      expect(html.includes('>从堂内返回门外')).toBe(task.entered && task.stage < 9)
      if (task.stage === 2) expect(task.entered).toBe(false)
    }
    expect(firstHallEntrySaveSummary(state, state.settings)).toContain('东卷待续')
    expect(advanceFirstHallEntry(state, hallEntryPlaces.entry, 'hall', firstHallEntryInput(state)).state).toBe(state)
  })
  it('0.63迁移不由旧堂卷和五段补签，全部新断点不发卷/退技能/补奖励', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    old.earlyTraining.firstHallEntry = firstHallEntryAt(0)
    for (const input of [firstHallEntryEligible(), firstHallEntryEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.63.0'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstHallEntry
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstHallEntry.stage < 9) state = firstHallEntryStep(state)
      const same = structuredClone(state); same.earlyTraining.firstHallEntry = input.earlyTraining.firstHallEntry
      expect(same).toEqual(input)
    }
    const bad = firstHallEntryStep(firstHallEntryEligible()); bad.contentVersion = '0.63.0'
    expect(() => validateState(bad)).toThrow('首次实际入堂')
  })
  it('全旧历史/材料/堂卷快照、错空间/错人/取卷胜利与重复零写', () => {
    let state = firstHallEntryEligible()
    while (state.earlyTraining.firstHallEntry.stage < 9) {
      const scene = firstHallEntryScenes[state.earlyTraining.firstHallEntry.stage], p = hallEntryPlaces[scene.place], action = firstHallEntryInput(state)
      for (const key of Object.keys(state.earlyTraining.firstHallEntry))
        expect(advanceFirstHallEntry(state, p, scene.space, { ...action, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallEntry(state, p, scene.space, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstHallEntry(state, p, scene.space, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      expect(advanceFirstHallEntry(state, p, scene.space === 'hall' ? 'outside' : 'hall', action).state).toBe(state)
      expect(advanceFirstHallEntry(state, p, scene.space, { ...action, actor: 'bystander' }).state).toBe(state)
      for (const operation of ['scroll', 'win', 'learn', 'register', 'teleport'])
        expect(advanceFirstHallEntry(state, p, scene.space, { ...action, operation }).state).toBe(state)
      for (const pos of [{ x: NaN, y: p.y }, { x: p.x, y: Infinity }, { x: p.x, y: 420 }])
        expect(advanceFirstHallEntry(state, pos, scene.space, action).state).toBe(state)
      state = firstHallEntryStep(state)
      expect(advanceFirstHallEntry(state, p, scene.space, action).state).toBe(state)
    }
  })
  it('五右三上绕转再五右到门，合法位置相同也不能互代门外堂内', () => {
    let p = { ...hallEntryPlaces.start }
    for (let i = 0; i < 5; i++) p = moveHallEntryWalker(p, 'right')
    for (let i = 0; i < 3; i++) p = moveHallEntryWalker(p, 'up')
    expect(p).toEqual(hallEntryPlaces.turn); expect(hallEntryNear(p, 'outside', 0)).toBe(true)
    for (let i = 0; i < 5; i++) p = moveHallEntryWalker(p, 'right')
    expect(p).toEqual(hallEntryPlaces.door); expect(hallEntryNear(p, 'outside', 1)).toBe(true)
    expect(hallEntryNear(hallEntryPlaces.entry, 'outside', 4)).toBe(false)
    expect(hallEntryNear(hallEntryPlaces.entry, 'hall', 4)).toBe(true)
    const bad = { x: 300, y: 370 }; expect(moveHallEntryWalker(bad, 'up')).toBe(bad)
  })
  it('派生/前置/当前缺字段拒绝、防剧透封存，旧堂卷不绕过前置', () => {
    let state = firstHallEntryEligible()
    while (state.earlyTraining.firstHallEntry.stage < 9) {
      state = firstHallEntryStep(state)
      for (const key of Object.keys(state.earlyTraining.firstHallEntry)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstHallEntry, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
    const invalid = structuredClone(state); invalid.earlyTraining.firstRoadMeeting.stage = 11
    expect(() => validateState(invalid)).toThrow()
    expect(renderToStaticMarkup(<FirstHallEntry state={invalid} onBack={() => {}} />)).not.toContain('实际入堂地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={invalid} />)).not.toContain('接续实际入堂与东西分区')
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallEntry(sealed, hallEntryPlaces.entry, 'hall', firstHallEntryInput(sealed)).state).toBe(sealed)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续实际入堂与东西分区')
    expect(savePreviewSummary(state, hidden)).not.toContain('实际入堂')
    expect(firstHallEntrySaveSummary(state, hidden)).toContain('封存')
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstHallEntry
    expect(() => validateState(missing)).toThrow()
  })
  it('原子单字段保存，旧堂卷并发及重复拒绝，不写运行态', async () => {
    const state = firstHallEntryEligible(), action = firstHallEntryInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(saved.earlyTraining.firstHallEntry.stage).toBe(1) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstHallEntry(store, hallEntryPlaces.turn, 'outside', action)).toBe(true)
    expect(submitFirstHallEntry(store, hallEntryPlaces.turn, 'outside', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.hall.stage++
    expect(advanceFirstHallEntry(changed, hallEntryPlaces.turn, 'outside', action).state).toBe(changed)
  })
})
