import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { marketStandoffAt, type MarketStandoffState } from '../src/core/early-market-standoff-state'
import { marketBraceletsAt } from '../src/core/early-market-bracelets-state'
import { advanceEarlyMarketStandoff, submitEarlyMarketStandoff, standoffPlaces, type MarketStandoffAction } from '../src/core/early-market-standoff'
import { standoffEligible, standoffInput, standoffStep, standoffView } from './helpers/market-standoff-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { GameStore } from '../src/core/store'
import { earlyMarketBraceletsSaveSummary, earlyMarketStandoffSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketStandoff from '../src/ui/EarlyMarketStandoff'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4c4 围堵、呼叫、拒绝单挑与实际离场', () => {
  it('34断点JSON/自动/手动/备份，前后整state仅本历史变化，无战利品或采购', async () => {
    let state = standoffEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.marketStandoff.stage < 34) {
      const previous = state; state = standoffStep(state); await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const compare = structuredClone(state); compare.earlyTraining.marketStandoff = before.earlyTraining.marketStandoff
      expect(compare).toEqual(before)
      const task = state.earlyTraining.marketStandoff
      expect(task.called).toBe(task.stage >= 4)
      expect(task.guards).toBe(task.stage >= 28 ? 'left' : task.stage >= 6 ? 'surrounding' : task.stage >= 5 ? 'approaching' : 'absent')
      expect(task.opponent).toBe(task.stage >= 21 ? 'left' : task.stage >= 20 ? 'paused' : task.stage >= 19 ? 'withdrawing' : 'present')
      expect(task.chase).toBe(task.stage >= 23 ? 'stopped' : task.stage >= 22 ? 'intended' : 'none')
      expect(task.walkedDeep).toBe(task.stage >= 33)
    }
    expect(earlyMarketBraceletsSaveSummary(state, state.settings)).toContain('发现成交待续')
    expect(advanceEarlyMarketStandoff(state, { kind: 'yan', position: standoffPlaces.deep }, standoffInput(state)).state).toBe(state)
  })
  it('0.50未购及已耗药液旧档补未参与，护卫历史不恢复材料/队伍/奖励', () => {
    for (const input of [standoffEligible(), standoffEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.50.0'; delete old.earlyTraining.marketStandoff
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.marketStandoff.stage < 34) state = standoffStep(state)
      const compare = structuredClone(state); compare.earlyTraining.marketStandoff = input.earlyTraining.marketStandoff; expect(compare).toEqual(input)
    }
  })
  it('完整快照/演员/动作/人物与旁观焦点不可互代，非法坐标/四错误/重复均零写', () => {
    let state = standoffEligible()
    while (state.earlyTraining.marketStandoff.stage < 34) {
      const action = standoffInput(state), view = standoffView(state)
      for (const key of Object.keys(action) as (keyof MarketStandoffAction)[])
        expect(advanceEarlyMarketStandoff(state, view, { ...action, [key]: 'stale' } as MarketStandoffAction).state).toBe(state)
      for (const operation of ['fight', 'loot', 'recruit', 'claim-core'] as const)
        expect(advanceEarlyMarketStandoff(state, view, { ...action, operation }).state).toBe(state)
      if (view.kind === 'observer') {
        expect(advanceEarlyMarketStandoff(state, { kind: 'yan', position: standoffPlaces.street }, action).state).toBe(state)
        for (const focus of ['opponent', 'underlings', 'crowd', 'guards', 'captain'] as const) if (focus !== view.focus)
          expect(advanceEarlyMarketStandoff(state, { ...view, focus }, action).state).toBe(state)
        expect(advanceEarlyMarketStandoff(state, { ...view, place: view.place === 'exit' ? 'street' : 'exit' }, action).state).toBe(state)
      } else {
        expect(advanceEarlyMarketStandoff(state, { ...view, kind: view.kind === 'yan' ? 'xuner' : 'yan' }, action).state).toBe(state)
        expect(advanceEarlyMarketStandoff(state, { kind: 'observer', focus: 'guards', place: 'street' }, action).state).toBe(state)
        for (const position of [{ x: 80, y: 370 }, { x: 380, y: 100 }, { x: NaN, y: 310 }, { x: 800, y: 310 }])
          expect(advanceEarlyMarketStandoff(state, { ...view, position }, action).state).toBe(state)
      }
      state = standoffStep(state); expect(advanceEarlyMarketStandoff(state, view, action).state).toBe(state)
    }
  })
  it('派生字段/缺字段/非法阶段/手链前置拒绝，所有合法阶段可往返', () => {
    let state = standoffEligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.marketStandoff; expect(() => validateState(missing)).toThrow()
    const all = Array.from({ length: 35 }, (_, stage) => marketStandoffAt(stage))
    for (;;) {
      const task = state.earlyTraining.marketStandoff; expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(task) as (keyof MarketStandoffState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.marketStandoff[key] = value; expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(state); bad.earlyTraining.marketBracelets = marketBraceletsAt(27); expect(() => validateState(bad)).toThrow()
      }
      if (task.stage === 34) break
      state = standoffStep(state)
    }
    for (const stage of [-1, 35, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.marketStandoff.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('旁观无方向、停步仍可见/真正离开才隐藏、护卫到场与围住/离场分存，防剧透1全封存', () => {
    let state = standoffEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续围堵与非战斗离场')
    for (;;) {
      const task = state.earlyTraining.marketStandoff, html = renderToStaticMarkup(<EarlyMarketStandoff state={state} onBack={() => {}} />)
      expect(html).not.toContain('aria-label="围堵向上走"')
      expect(html.includes('来人停步尚未离开')).toBe(task.stage === 20)
      expect(html.includes('来人正向外走')).toBe(task.stage === 19)
      expect(html.includes('护卫已到场尚未外层围住')).toBe(task.stage === 5)
      expect(html.includes('护卫在外层控制局面')).toBe(task.stage >= 6 && task.stage < 28)
      expect(html.includes('随从围堵尚未解除')).toBe(task.stage >= 2 && task.stage < 21)
      if (task.stage === 34) break
      expect(html).toContain('本步请明确选择'); state = standoffStep(state)
    }
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMarketStandoff state={limited} onBack={() => {}} />)).not.toMatch(/薰儿|围堵|加列奥|木核/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续围堵与非战斗离场')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|围堵|加列奥|木核/)
    expect(earlyMarketStandoffSaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyMarketStandoff(limited, { kind: 'yan', position: standoffPlaces.deep }, standoffInput(limited)).state).toBe(limited)
  })
  it('本人呼叫仅一写、到场不提前补签，错旁观和双击零写、runtime保持', async () => {
    let state = standoffEligible(); while (state.earlyTraining.marketStandoff.stage < 3) state = standoffStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.marketStandoff).toMatchObject({ stage: 4, called: true, guards: 'absent' })
      const compare = structuredClone(saved); compare.earlyTraining.marketStandoff = state.earlyTraining.marketStandoff; expect(compare).toEqual(state)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = standoffInput(state)
    expect(submitEarlyMarketStandoff(store, { kind: 'observer', focus: 'guards', place: 'street' }, input)).toBe(false)
    expect(writes).toBe(0); expect(submitEarlyMarketStandoff(store, standoffView(state), input)).toBe(true)
    expect(submitEarlyMarketStandoff(store, standoffView(state), input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
  })
})
