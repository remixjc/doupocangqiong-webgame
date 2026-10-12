import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { initialState } from '../src/core/model'
import { beginEarlyTraining, advanceEarlyTraining } from '../src/core/early-training'
import { morningCardAt, type MorningCardState } from '../src/core/early-morning-card-state'
import { mountainVisitorAt } from '../src/core/early-mountain-visitor-state'
import { advanceEarlyMorningCard, submitEarlyMorningCard, morningCardPlaces, morningCardStart, morningCardNear, moveMorningWalker, type MorningCardAction } from '../src/core/early-morning-card'
import { morningCardScenes } from '../src/content/early-morning-card'
import { morningEligible, morningInput, morningStep } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { earlyMorningCardSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { GameStore } from '../src/core/store'
import EarlyMorningCard from '../src/ui/EarlyMorningCard'
import EarlyMountainVisitor from '../src/ui/EarlyMountainVisitor'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4b1 次晨普通黑卡与唯一旧折算账本', () => {
  it('14断点JSON/自动/手动/备份，只在本人接卡同事务一次160；准备单未接不能接卡', async () => {
    let state = morningEligible(), before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.morningCard.stage < 14) {
      if (state.earlyTraining.morningCard.stage === 8) {
        const fail = advanceEarlyMorningCard(state, morningCardPlaces.door, morningInput(state))
        expect(fail.ok).toBe(false); expect(fail.state).toBe(state)
        expect(state.earlyTraining.morningCard.card).toBe('offered'); expect(state.earlyTraining.purse.borrowed).toBe(0)
        state = beginEarlyTraining(state).state; before = structuredClone(before); before.earlyTraining.started = true
        await saveSlot(0, state)
      }
      const previous = state; state = morningStep(state)
      await saveSlot(0, state); await saveSlot(2, state)
      const slots = await listSlots()
      for (const slot of [0, 2]) expect(parseSave(slots.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(r => r.slot === -1)!.text)).toEqual(previous)
      const comparison = structuredClone(state); comparison.earlyTraining.morningCard = before.earlyTraining.morningCard
      if (state.earlyTraining.morningCard.stage >= 9) comparison.earlyTraining.purse.borrowed = 0
      expect(comparison).toEqual(before)
      if (state.earlyTraining.morningCard.stage < 9) expect(state.earlyTraining.purse.borrowed).toBe(0)
      else expect(state.earlyTraining).toMatchObject({ purse: { borrowed: 160, spent: 0 }, morningCard: { card: 'yan', funds: 'credited' } })
    }
    expect(advanceEarlyTraining(state, { type: 'borrow', expectedSpent: 0 }).state).toBe(state)
    expect(advanceEarlyMorningCard(state, morningCardPlaces.door, morningInput(state)).state).toBe(state)
    expect(earlyMorningCardSaveSummary(state, state.settings)).toContain('入城待续')
  })
  it('旧未领/已领/已付/已调制耗尽档迁移与回补：已有账不重发、不复原材料', () => {
    const fresh = morningEligible()
    const started = beginEarlyTraining(fresh).state
    const borrowed = advanceEarlyTraining(started, { type: 'borrow', expectedSpent: 0 }).state
    const paid = advanceEarlyTraining(borrowed, { type: 'purchase', item: 'bluegrass', price: 30, expectedSpent: 0 }).state
    const spent = replayEarlyTraining(fresh, false, undefined, true, true, true, true, true, true)
    expect(spent.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [started, borrowed, paid, spent]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.45.0'; delete old.earlyTraining.morningCard
      let state = validateState(old); expect(state).toEqual(input)
      const before = structuredClone(state)
      while (state.earlyTraining.morningCard.stage < 14) state = morningStep(state)
      expect(state.earlyTraining.morningCard.funds).toBe(input.earlyTraining.purse.borrowed ? 'existing' : 'credited')
      const compare = structuredClone(state); compare.earlyTraining.morningCard = before.earlyTraining.morningCard
      compare.earlyTraining.purse.borrowed = before.earlyTraining.purse.borrowed
      expect(compare).toEqual(before)
      expect(advanceEarlyTraining(state, { type: 'borrow', expectedSpent: state.earlyTraining.purse.spent }).ok).toBe(false)
    }
  })
  it('整快照/人物/账本/次序/远处/重复和四越界全部零写', () => {
    let state = beginEarlyTraining(morningEligible()).state
    while (state.earlyTraining.morningCard.stage < 14) {
      const action = morningInput(state), scene = morningCardScenes[action.stage], place = morningCardPlaces[scene.place]
      for (const operation of ['claim-purple', 'claim-capacity', 'claim-savings', 'restore-supplies'] as const)
        expect(advanceEarlyMorningCard(state, place, { ...action, operation }).state).toBe(state)
      for (const key of Object.keys(action) as (keyof MorningCardAction)[])
        expect(advanceEarlyMorningCard(state, place, { ...action, [key]: 'stale' } as MorningCardAction).state).toBe(state)
      for (const far of [morningCardStart, { x: 180, y: 80 }, { x: Infinity, y: 220 }, { x: NaN, y: 220 }])
        expect(advanceEarlyMorningCard(state, far, action).state).toBe(state)
      state = morningStep(state)
      expect(advanceEarlyMorningCard(state, place, action).state).toBe(state)
    }
    let position = { ...morningCardStart }
    for (let i = 0; i < 6; i++) position = moveMorningWalker(position, 'up')
    expect(morningCardNear(position, 'room')).toBe(true)
    for (let i = 0; i < 7; i++) position = moveMorningWalker(position, 'right')
    expect(morningCardNear(position, 'chest')).toBe(true)
    for (let i = 0; i < 10; i++) position = moveMorningWalker(position, 'right')
    expect(morningCardNear(position, 'door')).toBe(true)
    expect(moveMorningWalker({ x: 180, y: 180 }, 'up')).toEqual({ x: 180, y: 180 })
  })
  it('新版缺字段、全部派生值、非法阶段、交卡前置和漏资金拒绝', () => {
    const state = beginEarlyTraining(morningEligible()).state
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.morningCard
    expect(() => validateState(missing)).toThrow()
    const records = Array.from({ length: 15 }, (_, stage) => morningCardAt(stage, stage >= 9 ? 'credited' : 'pending'))
    for (const task of records) {
      const next = structuredClone(state); next.earlyTraining.morningCard = task
      if (task.stage >= 9) next.earlyTraining.purse.borrowed = 160
      expect(parseSave(serializeSave(next))).toEqual(next)
      for (const key of Object.keys(task) as (keyof MorningCardState)[]) {
        if (key === 'stage' || key === 'funds') continue
        for (const value of new Set(records.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(next)); bad.earlyTraining.morningCard[key] = value
          expect(() => validateState(bad)).toThrow()
        }
      }
      const bad = structuredClone(next); bad.earlyTraining.morningCard.funds = task.stage < 9 ? 'credited' : 'pending'
      expect(() => validateState(bad)).toThrow()
      if (task.stage >= 9) {
        const bad = structuredClone(next); bad.earlyTraining.purse.borrowed = 0
        expect(() => validateState(bad)).toThrow()
      }
      if (task.stage) {
        const bad = structuredClone(next); bad.earlyTraining.mountainVisitor = mountainVisitorAt(25)
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (const stage of [-1, 15, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.morningCard.stage = stage
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('普通卡归属随递出/本人接而变，四拒绝可见，旧晚摘要跟随和剧透封存', () => {
    const state = morningEligible(), ui = () => renderToStaticMarkup(<EarlyMorningCard state={state} onBack={() => {}} onRoute={() => {}} />)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续晨间交卡')
    expect(ui()).toContain('门外浅绿衣的薰儿'); expect(ui()).not.toMatch(/已报名字的药老|五纹紫金卡/); expect(ui()).toContain('薰儿持有另一张普通黑卡')
    for (const [stage, text] of [[6, '尝试把旧积蓄新增为400金币'], [8, '尝试将普通黑卡登记为紫金卡'],
      [10, '尝试按普通卡容量领取5000'], [12, '尝试接卡复原已用材料与药液']] as const) {
      state.earlyTraining.morningCard = morningCardAt(stage, stage >= 9 ? 'credited' : 'pending'); expect(ui()).toContain(text)
    }
    state.earlyTraining.morningCard = morningCardAt(8)
    expect(ui()).toContain('记下重修准备 · 再接普通黑卡'); expect(ui()).toContain('薰儿递出待接的普通黑卡')
    state.earlyTraining.morningCard = morningCardAt(9, 'existing')
    expect(ui()).toContain('本人已接同一普通黑卡'); expect(ui()).not.toContain('薰儿递出待接的普通黑卡')
    expect(renderToStaticMarkup(<EarlyMountainVisitor state={state} onBack={() => {}} />)).toContain('本人接卡，旧账保持未重发')
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMorningCard state={limited} onBack={() => {}} onRoute={() => {}} />)).not.toMatch(/薰儿|黑卡|古戒|后山/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续晨间交卡')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|黑卡|古戒|后山/)
    expect(advanceEarlyMorningCard(limited, morningCardPlaces.door, morningInput(limited)).state).toBe(limited)
    expect(advanceEarlyMorningCard(initialState(), morningCardPlaces.room, morningInput(initialState())).ok).toBe(false)
  })
  it('store一次写档同时接卡/160，双击和陈旧账零写，运行态保持', async () => {
    let state = beginEarlyTraining(morningEligible()).state
    while (state.earlyTraining.morningCard.stage < 8) state = morningStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.morningCard.card).toBe('yan'); expect(saved.earlyTraining.purse.borrowed).toBe(160)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, action = morningInput(state)
    expect(submitEarlyMorningCard(store, morningCardPlaces.door, { ...action, expectedSpent: 30 })).toBe(false)
    expect(writes).toBe(0)
    expect(submitEarlyMorningCard(store, morningCardPlaces.door, action)).toBe(true)
    expect(submitEarlyMorningCard(store, morningCardPlaces.door, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
