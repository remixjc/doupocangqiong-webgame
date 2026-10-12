import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { firstHallTalkAt } from '../src/core/first-hall-talk-state'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallApproachEligible, firstHallApproachInput, firstHallApproachStep } from './helpers/first-hall-approach-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallApproachSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3b1 西侧整衣与实际靠近', () => {
  let base: GameState
  beforeAll(() => { base = firstHallApproachEligible() })
  it('十四实际断点四槽/上一备份，仅靠近历史变化，hall5不代签归架', async () => {
    let state = structuredClone(base)
    await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 14) {
      const previous = state, action = firstHallApproachInput(state)
      state = firstHallApproachStep(state)
      expect(state.earlyTraining.firstHallApproach).toEqual(firstHallApproachAt(action.stage + 1))
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach
      expect(same).toEqual(base)
      expect(state.earlyTraining.hall).toEqual({ stage: 5, scroll: 'reading-first' })
      expect(state.earlyTraining.practice.phase).toBe(0)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
    }
    expect(firstHallApproachSaveSummary(state, state.settings)).toContain('实际归架待续')
    expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', firstHallApproachInput(state)).state).toBe(state)
  })
  it('旧0.68字段仅补空；伪造旧版本新历史/当前缺字段/非法派生与缺前置拒绝', () => {
    for (const version of ['0.68.0', '0.68.1']) {
      const raw = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      raw.contentVersion = version; delete raw.earlyTraining.firstHallApproach
      expect(validateState(raw)).toEqual(base)
      const forged = firstHallApproachStep(base); forged.contentVersion = version
      expect(() => validateState(forged)).toThrow('首次整衣靠近')
    }
    const missing = structuredClone(base) as unknown as { earlyTraining: Record<string, unknown> }
    delete missing.earlyTraining.firstHallApproach
    expect(() => validateState(missing)).toThrow()
    for (const key of Object.keys(base.earlyTraining.firstHallApproach)) {
      const bad = structuredClone(base); Object.assign(bad.earlyTraining.firstHallApproach, { [key]: 'invalid' })
      expect(() => validateState(bad)).toThrow()
    }
    for (const stage of [-1, 15, 1.5, Infinity]) {
      const bad = structuredClone(base); bad.earlyTraining.firstHallApproach = firstHallApproachAt(stage)
      expect(() => validateState(bad)).toThrow()
    }
    const prerequisite = firstHallApproachStep(base); prerequisite.earlyTraining.firstHallTalk = firstHallTalkAt(19)
    expect(() => validateState(prerequisite)).toThrow()
  })
  it('全十三前置快照、本人位置、错人物与授技/归架/第二卷/战斗冒签均拒绝', () => {
    const incomplete = structuredClone(base); incomplete.earlyTraining.firstHallTalk = firstHallTalkAt(19)
    expect(advanceFirstHallApproach(incomplete, hallReadingPlaces.shelf, 'hall', firstHallApproachInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<FirstHallApproach state={incomplete} onBack={() => {}} />)).not.toContain('整衣靠近地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续整衣靠近与同卷收起')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage < 14) {
      const action = firstHallApproachInput(state)
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['repay', 'second', 'return', 'learn', 'win', 'leave', 'battle', 'reward'])
        expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      for (const actor of ['yan', 'ning', 'bystander'] as const)
        if (actor !== action.actor) expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', { ...action, actor }).state).toBe(state)
      for (const p of [{ x: 380, y: 250 }, { x: 235, y: 244 }, { x: NaN, y: 250 }, { x: 400, y: Infinity }])
        expect(advanceFirstHallApproach(state, p, 'hall', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      state = firstHallApproachStep(state)
    }
  })
  it('已归架/第二卷/已借/spent与五段只回顾，其他全state保持', () => {
    const branches = new Map<number, GameState>()
    const old = replayEarlyTraining(morningEligible(), false, s => {
      if (s.earlyTraining.hall.stage >= 5) branches.set(s.earlyTraining.hall.stage, structuredClone(s))
    }, true, true, true, true, true, true)
    expect(old.earlyTraining.recovery).toMatchObject({ energy: 'spent', result: 'fifth-duan' })
    for (const input of [...[5, 6, 7, 8, 9].map(n => firstHallApproachEligible(branches.get(n)!)), firstHallApproachEligible(old)]) {
      let state = structuredClone(input)
      while (state.earlyTraining.firstHallApproach.stage < 14) state = firstHallApproachStep(state)
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = input.earlyTraining.firstHallApproach
      expect(same).toEqual(input)
      if (input.earlyTraining.hall.stage >= 6)
        expect(renderToStaticMarkup(<FirstHallApproach state={state} onBack={() => {}} />)).toContain('明确回顾当时第一卷')
    }
  })
  it('整衣7/堂中8/东架9/卷起13才出现，三人和临时卷独立；防剧透', () => {
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage <= 14) {
      const stage = state.earlyTraining.firstHallApproach.stage
      const html = renderToStaticMarkup(<FirstHallApproach state={state} onBack={() => {}} />)
      expect(html).toContain('translate(400 250)'); expect(html).toContain('translate(380 250)')
      expect(html).toContain(stage >= 9 ? 'translate(450 280)' : stage >= 8 ? 'translate(320 244)' : 'translate(235 244)')
      expect(html.includes('萧宁握拳')).toBe([2, 4].includes(stage))
      expect(html.includes('萧宁 · 已整衣')).toBe(stage >= 7)
      expect(html.includes('同一第一卷已卷起尚未归架')).toBe(stage >= 13)
      expect(html).toContain('薰儿自己的临时阅读卷')
      if (stage === 14) break
      state = firstHallApproachStep(state)
    }
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallApproach(sealed, hallReadingPlaces.shelf, 'hall', firstHallApproachInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(state, hidden)).not.toContain('整衣靠近')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续整衣靠近与同卷收起')
  })
  it('一次写入/旧动作并发拒绝，保留combat runtime、旧hall与临时卷', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach.stage).toBe(1)
      expect(saved.earlyTraining.hall).toEqual(base.earlyTraining.hall)
      expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime, action = firstHallApproachInput(base)
    expect(submitFirstHallApproach(store, hallReadingPlaces.shelf, 'hall', action)).toBe(true)
    expect(submitFirstHallApproach(store, hallReadingPlaces.shelf, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state.earlyTraining.firstHallTalk.ownScroll).toBe('xuner')
  })
})
