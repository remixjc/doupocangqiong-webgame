import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallTalk, submitFirstHallTalk } from '../src/core/first-hall-talk'
import { firstHallTalkAt } from '../src/core/first-hall-talk-state'
import { firstHallMatchAt } from '../src/core/first-hall-match-state'
import { hallReadingPlaces } from '../src/core/first-hall-reading'
import { firstHallTalkEligible, firstHallTalkInput, firstHallTalkStep } from './helpers/first-hall-talk-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstHallTalkSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstHallTalk from '../src/ui/FirstHallTalk'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'

describe('C1h-3a 东架会面与她自己的临时卷', () => {
  let base: GameState
  beforeAll(() => { base = firstHallTalkEligible() })
  it('二十断点四槽与上一备份；只有会面和实际确认后的旧hall5改变', async () => {
    let state = structuredClone(base)
    await saveSlot(0, state)
    while (state.earlyTraining.firstHallTalk.stage < 20) {
      const previous = state, action = firstHallTalkInput(state)
      state = firstHallTalkStep(state)
      const stage = state.earlyTraining.firstHallTalk.stage
      expect(state.earlyTraining.hall).toEqual({ stage: stage >= 9 ? 5 : 4, scroll: 'reading-first' })
      expect(state.earlyTraining.firstHallTalk).toEqual(firstHallTalkAt(stage))
      const same = structuredClone(state)
      same.earlyTraining.firstHallTalk = base.earlyTraining.firstHallTalk
      same.earlyTraining.hall = base.earlyTraining.hall
      expect(same).toEqual(base)
      expect(state.earlyTraining.purse).toEqual(base.earlyTraining.purse)
      expect(state.earlyTraining.practice.phase).toBe(0)
      expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
    }
    expect(firstHallTalkSaveSummary(state, state.settings)).toContain('两卷交涉待续')
    expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', firstHallTalkInput(state)).state).toBe(state)
  })
  it('缺失旧0.67字段仅补空；伪造旧版本的新历史/缺失当前字段均拒绝', () => {
    for (const version of ['0.67.0', '0.67.1']) {
      const raw = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      raw.contentVersion = version
      delete raw.earlyTraining.firstHallTalk
      expect(validateState(raw)).toEqual(base)
      const forged = firstHallTalkStep(base)
      forged.contentVersion = version
      expect(() => validateState(forged)).toThrow('首次东架会面')
    }
    const missing = structuredClone(base) as unknown as { earlyTraining: Record<string, unknown> }
    delete missing.earlyTraining.firstHallTalk
    expect(() => validateState(missing)).toThrow()
    for (const key of Object.keys(base.earlyTraining.firstHallTalk)) {
      const bad = structuredClone(base)
      Object.assign(bad.earlyTraining.firstHallTalk, { [key]: 'invalid' })
      expect(() => validateState(bad)).toThrow()
    }
    for (const stage of [-1, 21, 1.5, Infinity]) {
      const bad = structuredClone(base); bad.earlyTraining.firstHallTalk = firstHallTalkAt(stage)
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('未完成赛后不能进入；全快照/本人位置/顺序/错人物与不实操作拒绝', () => {
    const incomplete = structuredClone(base); incomplete.earlyTraining.firstHallMatch = firstHallMatchAt(19)
    expect(advanceFirstHallTalk(incomplete, hallReadingPlaces.shelf, 'hall', firstHallTalkInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<FirstHallTalk state={incomplete} onBack={() => {}} />)).not.toContain('东架会面地图')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续东架会面与半月问答')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallTalk.stage < 20) {
      const action = firstHallTalkInput(state)
      for (const field of ['expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['repay', 'second', 'learn', 'win', 'leave', 'battle', 'reward'])
        expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', { ...action, operation }).state).toBe(state)
      for (const actor of ['yan', 'xuner', 'bystander'] as const)
        if (actor !== action.actor) expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', { ...action, actor }).state).toBe(state)
      for (const p of [{ x: 380, y: 250 }, { x: 235, y: 244 }, { x: NaN, y: 250 }, { x: 400, y: Infinity }])
        expect(advanceFirstHallTalk(state, p, 'hall', action).state).toBe(state)
      expect(advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'outside', action).state).toBe(state)
      state = firstHallTalkStep(state)
    }
  })
  it('归架/第二卷/已借/spent/五段与更高奖励分支全state保持', () => {
    const branches = new Map<number, GameState>()
    const old = replayEarlyTraining(morningEligible(), false, s => {
      if (s.earlyTraining.hall.stage >= 4) branches.set(s.earlyTraining.hall.stage, structuredClone(s))
    }, true, true, true, true, true, true)
    expect(old.earlyTraining.recovery.energy).toBe('spent')
    expect(old.earlyTraining.recovery.result).toBe('fifth-duan')
    for (const input of [...[4, 5, 6, 7, 8, 9].map(n => firstHallTalkEligible(branches.get(n)!)), firstHallTalkEligible(old)]) {
      let state = structuredClone(input)
      while (state.earlyTraining.firstHallTalk.stage < 20) state = firstHallTalkStep(state)
      const same = structuredClone(state)
      same.earlyTraining.firstHallTalk = input.earlyTraining.firstHallTalk
      same.earlyTraining.hall = input.earlyTraining.hall
      expect(same).toEqual(input)
      expect(state.earlyTraining.hall.stage).toBe(Math.max(5, input.earlyTraining.hall.stage))
      if (input.earlyTraining.hall.stage >= 6)
        expect(renderToStaticMarkup(<FirstHallTalk state={state} onBack={() => {}} />)).toContain('明确回顾当时第一卷')
    }
  })
  it('她自己的卷只在实际拿取后显示，三人位置独立且防剧透', () => {
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallTalk.stage <= 20) {
      const html = renderToStaticMarkup(<FirstHallTalk state={state} onBack={() => {}} />)
      expect(html).toContain('translate(400 250)')
      expect(html).toContain('translate(380 250)')
      expect(html).toContain('translate(235 244)')
      expect(html.includes('aria-label="薰儿自己的临时阅读卷"')).toBe(state.earlyTraining.firstHallTalk.stage >= 5)
      expect(html.includes('aria-label="薰儿已坐旁边"')).toBe(state.earlyTraining.firstHallTalk.stage >= 4)
      if (state.earlyTraining.firstHallTalk.stage === 20) break
      state = firstHallTalkStep(state)
    }
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...state, settings: hidden }
    expect(advanceFirstHallTalk(sealed, hallReadingPlaces.shelf, 'hall', firstHallTalkInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(state, hidden)).not.toContain('东架会面')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续东架会面与半月问答')
  })
  it('实际确认当时四段同次更新会面与旧hall5；并发旧卷动作拒绝', async () => {
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallTalk.stage < 8) state = firstHallTalkStep(state)
    const action = firstHallTalkInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++
      expect(saved.earlyTraining.firstHallTalk.stage).toBe(9)
      expect(saved.earlyTraining.hall).toEqual({ stage: 5, scroll: 'reading-first' })
      expect(saved.earlyTraining.practice).toEqual(base.earlyTraining.practice)
      expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize()
    const runtime = store.getSnapshot().runtime
    expect(submitFirstHallTalk(store, hallReadingPlaces.shelf, 'hall', action)).toBe(true)
    expect(submitFirstHallTalk(store, hallReadingPlaces.shelf, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.hall = { stage: 6, scroll: 'none' }
    expect(advanceFirstHallTalk(changed, hallReadingPlaces.shelf, 'hall', action).state).toBe(changed)
    for (const stage of [0, 4, 5, 8]) {
      const premature = structuredClone(base)
      premature.earlyTraining.firstHallTalk = firstHallTalkAt(stage)
      premature.earlyTraining.hall = { stage: 5, scroll: 'reading-first' }
      expect(() => validateState(premature)).toThrow()
    }
    const below = structuredClone(base)
    below.earlyTraining.firstHallTalk = firstHallTalkAt(9)
    expect(() => validateState(below)).toThrow()
  })
})
