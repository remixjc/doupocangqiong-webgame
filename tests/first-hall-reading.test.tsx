import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstHallReadingAt } from '../src/core/first-hall-reading-state'
import { advanceFirstHallReading, hallReadingNear, hallReadingPlaces, submitFirstHallReading } from '../src/core/first-hall-reading'
import { moveHallEntryWalker } from '../src/core/first-hall-entry'
import { firstHallReadingEligible, firstHallReadingInput, firstHallReadingStep } from './helpers/first-hall-reading-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallReadingSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallReading from '../src/ui/FirstHallReading'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-2b2 东侧同一第一卷阅读', () => {
  let base: GameState
  beforeAll(() => { base = firstHallReadingEligible() })
  it('八断点、四槽和上一备份，practice0真实新路径只原子提高同一旧卷到2', async () => {
    let state = structuredClone(base)
    expect(state.earlyTraining.practice.phase).toBe(0)
    await saveSlot(0, state)
    while (state.earlyTraining.firstHallReading.stage < 8) {
      const previous = state; state = firstHallReadingStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state)
      same.earlyTraining.firstHallReading = base.earlyTraining.firstHallReading
      same.earlyTraining.hall = base.earlyTraining.hall
      expect(same).toEqual(base)
      expect(state.earlyTraining.hall).toEqual(state.earlyTraining.firstHallReading.picked ? { stage: 2, scroll: 'reading-first' } : base.earlyTraining.hall)
    }
    expect(firstHallReadingSaveSummary(state, state.settings)).toContain('西赛待续')
    expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', firstHallReadingInput(state)).state).toBe(state)
  })
  it('旧0.64.1仅补空，新历史不由旧第一卷、归架、第二卷、spent或五段自动补签', () => {
    const branches = new Map<number, GameState>()
    const old = replayEarlyTraining(morningEligible(), false, s => {
      if (s.earlyTraining.hall.stage >= 2) branches.set(s.earlyTraining.hall.stage, structuredClone(s))
    }, true, true, true, true, true, true)
    expect(old.earlyTraining.recovery.energy).toBe('spent')
    expect(old.earlyTraining.recovery.result).toBe('fifth-duan')
    for (const input of [base, ...[2, 5, 6, 7, 8, 9].map(n => firstHallReadingEligible(branches.get(n)!)!)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.64.1'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstHallReading
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstHallReading.stage < 8) state = firstHallReadingStep(state)
      const same = structuredClone(state); same.earlyTraining.firstHallReading = input.earlyTraining.firstHallReading
      same.earlyTraining.hall = input.earlyTraining.hall
      expect(same).toEqual(input)
      expect(state.earlyTraining.firstHallReading.record).toBe(input.earlyTraining.hall.stage >= 6 ? 'recalled' : 'current')
      if (input.earlyTraining.hall.stage >= 2) expect(state.earlyTraining.hall).toEqual(input.earlyTraining.hall)
    }
    const bad = firstHallReadingStep(base); bad.contentVersion = '0.64.1'
    expect(() => validateState(bad)).toThrow('首次东侧阅读')
  })
  it('完整历史、材料、修炼与堂卷快照/错人/错空间/授技第二卷及重复全部零写', () => {
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallReading.stage < 8) {
      const action = firstHallReadingInput(state)
      for (const key of Object.keys(state.earlyTraining.firstHallReading))
        expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', { ...action, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['learn', 'second', 'win', 'return', 'register', 'teleport'])
        expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', { ...action, actor: 'bystander' }).state).toBe(state)
      for (const p of [hallReadingPlaces.start, { x: NaN, y: 250 }, { x: 400, y: Infinity }])
        expect(advanceFirstHallReading(state, p, 'hall', action).state).toBe(state)
      state = firstHallReadingStep(state)
      expect(advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
    }
  })
  it('缺拿卷历史拒绝practice0旧hall伪造，更高旧hall仍要求旧practice4；所有派生/前置严格', () => {
    let state = firstHallReadingStep(firstHallReadingStep(base))
    for (const stage of [1, 3, 4, 5, 6, 7, 8, 9]) {
      const bad = structuredClone(state)
      bad.earlyTraining.hall = { stage, scroll: stage >= 8 ? 'borrowed-second' : stage === 7 ? 'selected-second' : stage >= 2 && stage <= 5 ? 'reading-first' : 'none' }
      expect(() => validateState(bad)).toThrow()
    }
    const forged = structuredClone(state); forged.earlyTraining.firstHallReading = firstHallReadingAt(0)
    expect(() => validateState(forged)).toThrow()
    const recalled = structuredClone(state); recalled.earlyTraining.firstHallReading.record = 'recalled'
    expect(() => validateState(recalled)).toThrow()
    while (state.earlyTraining.firstHallReading.stage < 8) {
      for (const key of Object.keys(state.earlyTraining.firstHallReading)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstHallReading, { [key]: 'invalid' })
        expect(() => validateState(bad)).toThrow()
      }
      state = firstHallReadingStep(state)
    }
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstHallReading
    expect(() => validateState(missing)).toThrow()
    const prerequisite = structuredClone(base); prerequisite.earlyTraining.firstHallEntry.stage = 8
    expect(renderToStaticMarkup(<FirstHallReading state={prerequisite} onBack={() => {}} />)).not.toContain('东侧阅读地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={prerequisite} />)).not.toContain('接续东侧同一第一卷阅读')
  })
  it('实际十三右三上到东架，刷新靠架保持东侧、防剧透和返回入口', () => {
    let p = { ...hallReadingPlaces.start }
    for (let i = 0; i < 13; i++) p = moveHallEntryWalker(p, 'right')
    for (let i = 0; i < 3; i++) p = moveHallEntryWalker(p, 'up')
    expect(p).toEqual(hallReadingPlaces.shelf); expect(hallReadingNear(p, 'hall')).toBe(true)
    expect(hallReadingNear(p, 'outside')).toBe(false)
    let state = structuredClone(base)
    for (let n = 0; n < 5; n++) state = firstHallReadingStep(state)
    const html = renderToStaticMarkup(<FirstHallReading state={state} onBack={() => {}} />)
    expect(html).toContain('translate(400 250)')
    expect(html).toContain('本人 · 靠架阅读')
    expect(html).not.toContain('阅读 · 向右')
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallReading(sealed, p, 'hall', firstHallReadingInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(state, hidden)).not.toContain('东侧阅读')
    expect(firstHallReadingSaveSummary(state, hidden)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续东侧同一第一卷阅读')
  })
  it('拿卷的双字段只有一次自动保存，旧入口并发不覆盖其他历史或运行态', async () => {
    const state = firstHallReadingStep(base), action = firstHallReadingInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallReading.stage).toBe(2)
      expect(saved.earlyTraining.hall).toEqual({ stage: 2, scroll: 'reading-first' })
      expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstHallReading(store, hallReadingPlaces.shelf, 'hall', action)).toBe(true)
    expect(submitFirstHallReading(store, hallReadingPlaces.shelf, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.hall.stage = 1
    expect(advanceFirstHallReading(changed, hallReadingPlaces.shelf, 'hall', action).state).toBe(changed)
  })
})
