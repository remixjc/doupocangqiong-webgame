import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstHallMatchAt, hallMatchMinimum } from '../src/core/first-hall-match-state'
import { advanceFirstHallMatch, submitFirstHallMatch } from '../src/core/first-hall-match'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallMatchEligible, firstHallMatchInput, firstHallMatchStep } from './helpers/first-hall-match-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallMatchSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallMatch from '../src/ui/FirstHallMatch'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-2c1 东架旁观西赛', () => {
  let base: GameState
  beforeAll(() => { base = firstHallMatchEligible() })
  it('十二断点四槽备份；仅实际挡招提升hall3、喝彩提升hall4，不补旧修炼或本人胜利', async () => {
    let state = structuredClone(base)
    await saveSlot(0, state)
    while (state.earlyTraining.firstHallMatch.stage < 12) {
      const previous = state; state = firstHallMatchStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      expect(state.earlyTraining.hall).toEqual({ stage: hallMatchMinimum(state.earlyTraining.firstHallMatch.stage), scroll: 'reading-first' })
      const same = structuredClone(state); same.earlyTraining.firstHallMatch = base.earlyTraining.firstHallMatch
      same.earlyTraining.hall = base.earlyTraining.hall
      expect(same).toEqual(base)
    }
    expect(state.earlyTraining.practice.phase).toBe(0)
    expect(firstHallMatchSaveSummary(state, state.settings)).toContain('走向东架待续')
    expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', firstHallMatchInput(state)).state).toBe(state)
  })
  it('0.65补空，不由旧成人礼或hall代签；旧更高卷账、spent和五段保持', () => {
    const branches = new Map<number, GameState>()
    const old = replayEarlyTraining(morningEligible(), false, s => {
      if (s.earlyTraining.hall.stage >= 2) branches.set(s.earlyTraining.hall.stage, structuredClone(s))
    }, true, true, true, true, true, true)
    expect(old.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [base, ...[2, 3, 4, 5, 6, 7, 8, 9].map(n => firstHallMatchEligible(branches.get(n)!)!)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.65.0'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstHallMatch
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstHallMatch.stage < 12) state = firstHallMatchStep(state)
      const same = structuredClone(state); same.earlyTraining.firstHallMatch = input.earlyTraining.firstHallMatch
      same.earlyTraining.hall = input.earlyTraining.hall
      expect(same).toEqual(input)
      expect(state.earlyTraining.hall.stage).toBe(Math.max(4, input.earlyTraining.hall.stage))
    }
    const bad = firstHallMatchStep(base); bad.contentVersion = '0.65.0'
    expect(() => validateState(bad)).toThrow('首次东架旁观')
  })
  it('全快照/焦点/位置/顺序/重复严格零写', () => {
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallMatch.stage < 12) {
      const action = firstHallMatchInput(state)
      for (const field of ['expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const key of Object.keys(state.earlyTraining.firstHallReading))
        expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, [key]: 'stale' }).state).toBe(state)
      for (const operation of ['win', 'second', 'return', 'learn', 'teleport', 'reward'])
        expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, actor: action.actor === 'yan' ? 'spectator' : 'yan' }).state).toBe(state)
      for (const p of [{ x: 200, y: 244 }, { x: NaN, y: 250 }, { x: 400, y: Infinity }])
        expect(advanceFirstHallMatch(state, p, 'hall', action).state).toBe(state)
      state = firstHallMatchStep(state)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
    }
  })
  it('派生/前置/卷账下限及未走到的旧hall5+不能伪造；当前新版缺字段拒绝', () => {
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallMatch.stage < 12) {
      for (const key of Object.keys(state.earlyTraining.firstHallMatch)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstHallMatch, { [key]: 'invalid' })
        expect(() => validateState(bad)).toThrow()
      }
      for (const stage of [1, 3, 4, 5, 6, 7, 8, 9]) {
        const bad = structuredClone(state)
        bad.earlyTraining.hall = { stage, scroll: stage >= 8 ? 'borrowed-second' : stage === 7 ? 'selected-second' : stage >= 2 && stage <= 5 ? 'reading-first' : 'none' }
        if (stage === hallMatchMinimum(state.earlyTraining.firstHallMatch.stage)) expect(validateState(bad)).toEqual(bad)
        else expect(() => validateState(bad)).toThrow()
      }
      state = firstHallMatchStep(state)
    }
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstHallMatch
    expect(() => validateState(missing)).toThrow()
    const forged = structuredClone(state); forged.earlyTraining.firstHallMatch = firstHallMatchAt(0)
    expect(() => validateState(forged)).toThrow()
    const pre = structuredClone(state); pre.earlyTraining.firstHallReading.stage = 7
    expect(() => validateState(pre)).toThrow()
    expect(renderToStaticMarkup(<FirstHallMatch state={pre} onBack={() => {}} />)).not.toContain('东架旁观地图')
  })
  it('东西独立位置/当前才辨认身份/封存/导航；新入口不靠旧hall', () => {
    const initial = renderToStaticMarkup(<FirstHallMatch state={base} onBack={() => {}} />)
    expect(initial).toContain('场中对手'); expect(initial).toContain('translate(400 250)')
    let state = structuredClone(base)
    for (let i = 0; i < 10; i++) state = firstHallMatchStep(state)
    const html = renderToStaticMarkup(<FirstHallMatch state={state} onBack={() => {}} />)
    expect(html).toContain('translate(190 244)'); expect(html).toContain('translate(295 244)')
    expect(html).toContain('translate(400 250)')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续东架旁观西侧比赛')
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallMatch(sealed, hallReadingPlaces.shelf, 'hall', firstHallMatchInput(sealed)).state).toBe(sealed)
    expect(firstHallMatchSaveSummary(state, hidden)).toContain('封存')
    expect(savePreviewSummary(state, hidden)).not.toContain('东架旁观')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续东架旁观西侧比赛')
  })
  it('挡招和结果的历史/旧hall双字段一次自动保存，重复和并发拒绝保持运行态', async () => {
    let state = structuredClone(base)
    for (let i = 0; i < 3; i++) state = firstHallMatchStep(state)
    for (const target of [4, 11]) {
      while (state.earlyTraining.firstHallMatch.stage < target - 1) state = firstHallMatchStep(state)
      const input = firstHallMatchInput(state); let writes = 0
      const store = new GameStore({ load: async () => state, write: async saved => {
        writes++; expect(saved.earlyTraining.firstHallMatch.stage).toBe(target)
        expect(saved.earlyTraining.hall.stage).toBe(target === 4 ? 3 : 4)
        expect(validateState(saved)).toEqual(saved)
      } })
      await store.initialize(); const runtime = store.getSnapshot().runtime
      expect(submitFirstHallMatch(store, hallReadingPlaces.shelf, 'hall', input)).toBe(true)
      expect(submitFirstHallMatch(store, hallReadingPlaces.shelf, 'hall', input)).toBe(false)
      expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
      expect(store.getSnapshot().runtime).toBe(runtime)
      state = store.getSnapshot().state
      const changed = structuredClone(state); changed.earlyTraining.hall.stage++
      expect(advanceFirstHallMatch(changed, hallReadingPlaces.shelf, 'hall', firstHallMatchInput(state)).state).toBe(changed)
    }
  })
})
