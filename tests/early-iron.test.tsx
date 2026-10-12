import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { ironAt, type IronState } from '../src/core/early-iron-state'
import { marketReturnAt } from '../src/core/early-market-return-state'
import { advanceEarlyIron, ironPlaces, ironStart, submitEarlyIron, type IronAction } from '../src/core/early-iron'
import { ironScenes } from '../src/content/early-iron'
import { ironEligible, ironInput, ironStep } from './helpers/iron-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import { earlyIronSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyIron from '../src/ui/EarlyIron'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4d2 同一铁片辨认、实际交接与能力限制', () => {
  it('18断点/全部槽与上一备份；仅历史变化，名称和愿望不发技能或奖励', async () => {
    let state = ironEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.iron.stage < 18) {
      const prior = state; state = ironStep(state)
      await saveSlot(0, state)
      for (const slot of [1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(prior)
      const same = structuredClone(state); same.earlyTraining.iron = before.earlyTraining.iron
      expect(same).toEqual(before)
    }
  })
  it('0.54.1已购尚存和已耗液/恢复迁移只补空；回补不能倒退后来练习', () => {
    const inputs = [ironEligible(), ironEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))]
    expect(inputs[1].earlyTraining.supplies.woodCore).toBe(0)
    for (const input of inputs) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.54.1'; delete old.earlyTraining.iron
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.iron.stage < 18) state = ironStep(state)
      const same = structuredClone(state); same.earlyTraining.iron = input.earlyTraining.iron
      expect(same).toEqual(input)
    }
  })
  it('每断点全任务/旧账/回族快照、不同人物、独立老师位置及错误拒绝零改', () => {
    let state = ironEligible()
    while (state.earlyTraining.iron.stage < 18) {
      const task = state.earlyTraining.iron, input = ironInput(state), p = task.stage === 12 ? ironPlaces.table : ironPlaces.teacher
      for (const key of Object.keys(task) as (keyof IronState)[])
        expect(advanceEarlyIron(state, p, { ...input, [key]: 'stale' } as IronAction).state).toBe(state)
      for (const key of Object.keys(input.expectedLedger))
        expect(advanceEarlyIron(state, p, { ...input, expectedLedger: { ...input.expectedLedger, [key]: 'stale' } } as IronAction).state).toBe(state)
      for (const key of Object.keys(input.expectedReturn))
        expect(advanceEarlyIron(state, p, { ...input, expectedReturn: { ...input.expectedReturn, [key]: 'stale' } } as IronAction).state).toBe(state)
      expect(advanceEarlyIron(state, p, { ...input, actor: input.actor === 'yan' ? 'teacher' : 'yan' }).state).toBe(state)
      for (const operation of ['learn', 'duplicate', 'refine'] as const)
        expect(advanceEarlyIron(state, p, { ...input, operation }).state).toBe(state)
      for (const teacherPosition of [ironPlaces.room, ironPlaces.table, { x: NaN, y: 370 }])
        expect(advanceEarlyIron(state, p, { ...input, teacherPosition }).state).toBe(state)
      for (const yan of [{ x: 380, y: 100 }, { x: NaN, y: 370 }, { x: 620, y: 230 }, { x: 220, y: 440 }])
        expect(advanceEarlyIron(state, yan, input).state).toBe(state)
      if (task.stage === 4 || task.stage === 12)
        expect(advanceEarlyIron(state, ironStart(task.stage), input).state).toBe(state)
      state = ironStep(state); expect(advanceEarlyIron(state, p, input).state).toBe(state)
    }
  })
  it('持有从包到本人/老师/桌面/本人/包严格派生；篡改/缺字段/前置拒绝', () => {
    let state = ironEligible()
    expect(() => validateState({ ...state, earlyTraining: { ...state.earlyTraining, iron: undefined } })).toThrow()
    const owners: string[] = []
    for (;;) {
      const t = state.earlyTraining.iron; owners.push(t.owner)
      expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(t) as (keyof IronState)[]) {
        const bad = structuredClone(state); (bad.earlyTraining.iron as unknown as Record<string, unknown>)[key] = key === 'owner' ? 'duplicate' : key === 'stage' ? 19 : !t[key]
        expect(() => validateState(bad)).toThrow()
      }
      if (t.stage > 0) { const bad = structuredClone(state); bad.earlyTraining.marketReturn = marketReturnAt(8); expect(() => validateState(bad)).toThrow() }
      if (t.stage === 18) break
      state = ironStep(state)
    }
    expect(owners[1]).toBe('bag'); expect(owners[2]).toBe('yan'); expect(owners[4]).toBe('yan')
    expect(owners[5]).toBe('teacher'); expect(owners[11]).toBe('teacher'); expect(owners[12]).toBe('table')
    expect(owners[13]).toBe('yan'); expect(owners[16]).toBe('yan'); expect(owners[17]).toBe('bag')
  })
  it('老师固定位置和刷新默认本人，老师步骤必须重选；上限1全部封存', () => {
    let state = ironEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续铁片辨认与限制')
    while (state.earlyTraining.iron.stage < 18) {
      const html = renderToStaticMarkup(<EarlyIron state={state} onBack={() => {}} />)
      expect(html).toContain('老师固定房中位置')
      expect(html.includes('先明确选择本步人物')).toBe(ironScenes[state.earlyTraining.iron.stage].actor === 'teacher')
      expect(html.includes(`铁片历史持有：${state.earlyTraining.iron.owner}`)).toBe(state.earlyTraining.iron.owner !== 'bag')
      state = ironStep(state)
    }
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyIron state={limited} onBack={() => {}} />)).not.toMatch(/老师|吸掌|铁片|玄阶/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续铁片辨认与限制')
    expect(earlyIronSaveSummary(state, limited.settings)).toContain('封存')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/铁片辨认|玄阶|吸掌/)
    expect(advanceEarlyIron(limited, ironPlaces.teacher, ironInput(limited)).state).toBe(limited)
  })
  it('老师实际接过成功一次写，原物资/技能/runtime保持，错人物/双击零写', async () => {
    let state = ironEligible(); while (state.earlyTraining.iron.stage < 4) state = ironStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.iron).toEqual(ironAt(5))
      const same = structuredClone(saved); same.earlyTraining.iron = state.earlyTraining.iron; expect(same).toEqual(state)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = ironInput(state)
    expect(submitEarlyIron(store, ironPlaces.room, input)).toBe(false)
    expect(submitEarlyIron(store, ironPlaces.teacher, { ...input, actor: 'yan' })).toBe(false)
    expect(submitEarlyIron(store, ironPlaces.teacher, input)).toBe(true)
    expect(submitEarlyIron(store, ironPlaces.teacher, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
