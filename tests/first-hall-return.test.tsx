import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallMatch, submitFirstHallMatch } from '../src/core/first-hall-match'
import { firstHallMatchAt } from '../src/core/first-hall-match-state'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallMatchInput } from './helpers/first-hall-match-replay'
import { firstHallReturnEligible, firstHallReturnStep } from './helpers/first-hall-return-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallMatchSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallMatch from '../src/ui/FirstHallMatch'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'
describe('C1h-2c2 赛后独立走向东架', () => {
  let base: GameState
  beforeAll(() => { base = firstHallReturnEligible() })
  it('八新断点和四槽备份；全state只有比赛后半历史变化', async () => {
    let state = structuredClone(base)
    await saveSlot(0, state)
    while (state.earlyTraining.firstHallMatch.stage < 20) {
      const previous = state; state = firstHallReturnStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstHallMatch = base.earlyTraining.firstHallMatch
      expect(same).toEqual(base)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', firstHallMatchInput(previous)).state).toBe(state)
    }
    expect(firstHallMatchSaveSummary(state, state.settings)).toContain('问答待续')
    expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...firstHallMatchInput(state), continuation: true }).state).toBe(state)
  })
  it('旧0.66的12不能自动补后半；旧高卷/归架/选卷/spent/五段全部保持', () => {
    const branches = new Map<number, GameState>()
    const old = replayEarlyTraining(morningEligible(), false, s => {
      if (s.earlyTraining.hall.stage >= 2) branches.set(s.earlyTraining.hall.stage, structuredClone(s))
    }, true, true, true, true, true, true)
    expect(old.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [base, ...[4, 5, 6, 7, 8, 9].map(n => firstHallReturnEligible(branches.get(n)!))]) {
      const raw = structuredClone(input); raw.contentVersion = '0.66.1'
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstHallMatch.stage < 20) state = firstHallReturnStep(state)
      const same = structuredClone(state); same.earlyTraining.firstHallMatch = input.earlyTraining.firstHallMatch
      expect(same).toEqual(input)
    }
    const bad = firstHallReturnStep(base)
    for (const version of ['0.66.0', '0.66.1']) {
      bad.contentVersion = version
      expect(() => validateState(bad)).toThrow('赛后走向东架')
    }
  })
  it('没有比赛归档不能接后半，前半入口/错焦点/全快照/位置/重复和提前问答均拒绝', () => {
    const early = structuredClone(base); early.earlyTraining.firstHallMatch = firstHallMatchAt(11)
    expect(advanceFirstHallMatch(early, hallReadingPlaces.shelf, 'hall', { ...firstHallMatchInput(early), continuation: true }).state).toBe(early)
    expect(renderToStaticMarkup(<FirstHallMatch continuation state={early} onBack={() => {}} />)).not.toContain('东架旁观地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={early} />)).not.toContain('接续赛后返回与薰儿走向东架')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallMatch.stage < 20) {
      const action = { ...firstHallMatchInput(state), continuation: true }
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, continuation: false }).state).toBe(state)
      for (const field of ['expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const key of Object.keys(state.earlyTraining.firstHallReading))
        expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, [key]: 'stale' }).state).toBe(state)
      for (const operation of ['win', 'second', 'question', 'learn', 'repay', 'reward', 'leave'])
        expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...action, actor: action.actor === 'yan' ? 'spectator' : 'yan' }).state).toBe(state)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      for (const p of [{ x: 380, y: 250 }, { x: NaN, y: 250 }, { x: 400, y: Infinity }])
        expect(advanceFirstHallMatch(state, p, 'hall', action).state).toBe(state)
      state = firstHallReturnStep(state)
      expect(advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
    }
  })
  it('演员西到中到东，刷新以保存的实际动作恢复；本人始终靠架、防剧透', () => {
    let state = structuredClone(base)
    const xuner = new Map([[12, '190 244'], [13, '190 244'], [14, '190 244'], [15, '190 244'], [16, '320 244'], [17, '380 250'], [18, '380 250'], [19, '380 250'], [20, '380 250']])
    for (const [stage, p] of xuner) {
      const html = renderToStaticMarkup(<FirstHallMatch continuation state={state} onBack={() => {}} />)
      expect(state.earlyTraining.firstHallMatch.stage).toBe(stage)
      expect(html).toContain(`translate(${p})`); expect(html).toContain('translate(400 250)')
      expect(html).toContain(`translate(${stage === 12 ? 295 : 235} 244)`)
      if (stage < 20) state = firstHallReturnStep(state)
    }
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallMatch(sealed, hallReadingPlaces.shelf, 'hall', { ...firstHallMatchInput(sealed), continuation: true }).state).toBe(sealed)
    expect(savePreviewSummary(state, hidden)).not.toContain('赛后东架')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续赛后返回与薰儿走向东架')
    const original = renderToStaticMarkup(<FirstHallMatch state={state} onBack={() => {}} />)
    expect(original).not.toContain('20/12'); expect(original).not.toContain('旁观萧宁返回西场中央')
  })
  it('单次自动保存、并发旧卷账变化拒绝且完整状态严验', async () => {
    const action = { ...firstHallMatchInput(base), continuation: true }; let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallMatch.stage).toBe(13)
      expect(saved.earlyTraining.hall).toEqual(base.earlyTraining.hall); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstHallMatch(store, hallReadingPlaces.shelf, 'hall', action)).toBe(true)
    expect(submitFirstHallMatch(store, hallReadingPlaces.shelf, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(base); changed.earlyTraining.hall.stage = 5
    expect(advanceFirstHallMatch(changed, hallReadingPlaces.shelf, 'hall', action).state).toBe(changed)
    for (const field of Object.keys(base.earlyTraining.firstHallMatch)) {
      const bad = structuredClone(base); Object.assign(bad.earlyTraining.firstHallMatch, { [field]: 'invalid' })
      expect(() => validateState(bad)).toThrow()
    }
    const far = structuredClone(base); far.earlyTraining.firstHallMatch = firstHallMatchAt(21)
    expect(() => validateState(far)).toThrow()
  })
})
