import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { braceletMinimum, marketBraceletsAt, type MarketBraceletsState } from '../src/core/early-market-bracelets-state'
import { marketSearchAt } from '../src/core/early-market-search-state'
import { marketSearchPlaces } from '../src/core/early-market-search'
import { advanceEarlyMarketBracelets, submitEarlyMarketBracelets, type MarketBraceletsAction } from '../src/core/early-market-bracelets'
import { marketBraceletsScenes } from '../src/content/early-market-bracelets'
import { braceletsEligible, braceletsInput, braceletsStep } from './helpers/market-bracelets-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { advanceEarlyBracelet } from '../src/core/early-bracelet'
import { earlyWalkPlaces } from '../src/core/early-walk'
import { GameStore } from '../src/core/store'
import { earlyMarketSearchSaveSummary, earlyMarketBraceletsSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyMarketBracelets from '../src/ui/EarlyMarketBracelets'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4c3 让路、未交蓝金与唯一普通绿链', () => {
  it('28步JSON/自动/手动/备份全断点，接物/戴上/道谢各存，其他state全同', async () => {
    let state = braceletsEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.marketBracelets.stage < 28) {
      const previous = state; state = braceletsStep(state); await saveSlot(0, state); await saveSlot(1, state)
      const records = await listSlots()
      for (const slot of [0, 1]) expect(parseSave(records.find(r => r.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(r => r.slot === -1)!.text)).toEqual(previous)
      const compare = structuredClone(state)
      compare.earlyTraining.marketBracelets = before.earlyTraining.marketBracelets; compare.earlyTraining.bracelet = before.earlyTraining.bracelet
      expect(compare).toEqual(before)
      const task = state.earlyTraining.marketBracelets
      expect(state.earlyTraining.bracelet).toEqual({ stage: braceletMinimum(task.stage), gift: task.stage >= 20 ? 'xuner' : 'none' })
      expect(task.identity).toBe(task.stage >= 3 ? 'named' : 'anonymous')
      expect(task.expensive).toBe(task.stage >= 13 ? 'retained' : task.stage >= 6 ? 'offered' : 'unoffered')
      expect(task.green).toBe(task.stage >= 21 ? 'worn' : task.stage >= 20 ? 'received' : task.stage >= 17 ? 'shown' : 'unshown')
      expect(task.thanked).toBe(task.stage >= 22)
    }
    expect(earlyMarketSearchSaveSummary(state, state.settings)).toContain('围堵待续')
    expect(advanceEarlyMarketBracelets(state, { kind: 'xuner', position: marketSearchPlaces.voice }, braceletsInput(state)).state).toBe(state)
  })
  it('0.49未赠/七种旧断点/已耗药液只补空，新历史按已见里程碑提高唯一旧记录', () => {
    const base = braceletsEligible()
    const consumed = braceletsEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))
    expect(consumed.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [...Array.from({ length: 7 }, (_, stage) => {
      const copy = structuredClone(base); copy.earlyTraining.bracelet = { stage, gift: stage >= 5 ? 'xuner' : 'none' }; return copy
    }), consumed]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.49.1'; delete old.earlyTraining.marketBracelets
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.marketBracelets.stage < 28) {
        state = braceletsStep(state)
        expect(state.earlyTraining.bracelet.stage).toBe(Math.max(input.earlyTraining.bracelet.stage, braceletMinimum(state.earlyTraining.marketBracelets.stage)))
      }
      const compare = structuredClone(state); compare.earlyTraining.marketBracelets = input.earlyTraining.marketBracelets; compare.earlyTraining.bracelet = input.earlyTraining.bracelet
      expect(compare).toEqual(input)
    }
  })
  it('完整新旧快照、人物/操作/远处/墙内/四错误及重复动作均零写', () => {
    let state = braceletsEligible()
    while (state.earlyTraining.marketBracelets.stage < 28) {
      const action = braceletsInput(state), scene = marketBraceletsScenes[action.stage], view = { kind: scene.view, position: marketSearchPlaces.voice }
      for (const key of Object.keys(action) as (keyof MarketBraceletsAction)[])
        expect(advanceEarlyMarketBracelets(state, view, { ...action, [key]: 'stale' } as MarketBraceletsAction).state).toBe(state)
      expect(advanceEarlyMarketBracelets(state, { ...view, kind: scene.view === 'yan' ? 'xuner' : 'yan' }, action).state).toBe(state)
      for (const operation of ['take-blue', 'claim-core', 'pay-extra', 'claim-rank'] as const)
        expect(advanceEarlyMarketBracelets(state, view, { ...action, operation }).state).toBe(state)
      for (const position of [{ x: 540, y: 310 }, { x: 380, y: 100 }, { x: NaN, y: 310 }, { x: 800, y: 310 }])
        expect(advanceEarlyMarketBracelets(state, { ...view, position }, action).state).toBe(state)
      state = braceletsStep(state); expect(advanceEarlyMarketBracelets(state, view, action).state).toBe(state)
    }
  })
  it('新版缺字段、派生变造/非法阶段/寻核前置/旧交付倒退拒绝', () => {
    let state = braceletsEligible()
    const missing = JSON.parse(JSON.stringify(state)); delete missing.earlyTraining.marketBracelets
    expect(() => validateState(missing)).toThrow()
    const all = Array.from({ length: 29 }, (_, stage) => marketBraceletsAt(stage))
    for (;;) {
      const task = state.earlyTraining.marketBracelets
      expect(parseSave(serializeSave(state))).toEqual(state)
      for (const key of Object.keys(task) as (keyof MarketBraceletsState)[]) {
        if (key === 'stage') continue
        for (const value of new Set(all.map(other => other[key]))) if (value !== task[key]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.marketBracelets[key] = value; expect(() => validateState(bad)).toThrow()
        }
      }
      if (task.stage) {
        const bad = structuredClone(state); bad.earlyTraining.marketSearch = marketSearchAt(19); expect(() => validateState(bad)).toThrow()
        const reversed = structuredClone(state), stage = braceletMinimum(task.stage) - 1
        reversed.earlyTraining.bracelet = { stage, gift: stage >= 5 ? 'xuner' : 'none' }; expect(() => validateState(reversed)).toThrow()
      }
      if (task.stage === 28) break
      state = braceletsStep(state)
    }
    for (const stage of [-1, 29, .5, NaN, Infinity]) {
      const bad = structuredClone(state); bad.earlyTraining.marketBracelets.stage = stage; expect(() => validateState(bad)).toThrow()
    }
  })
  it('地图匿名→揭名、两礼物分持、默认未选/独立位置/防剧透1与入口封存', () => {
    let state = braceletsEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续让路与两条手链')
    for (;;) {
      const task = state.earlyTraining.marketBracelets, html = renderToStaticMarkup(<EarlyMarketBracelets state={state} onBack={() => {}} />)
      expect(html).toContain('萧炎独立行走位置'); expect(html).toContain('薰儿独立行走位置')
      expect(html).not.toContain('aria-label="手链向上走"')
      expect(html.includes('已在对话揭名的加列奥')).toBe(task.stage >= 3)
      expect(html.includes('蓝金手链与木核仍由来人持有')).toBe(task.stage >= 6)
      expect(html.includes('薰儿收到但尚未戴上普通绿链')).toBe(task.stage === 20)
      expect(html.includes('薰儿已戴普通绿链')).toBe(task.stage >= 21)
      if (task.stage === 28) break
      expect(html).toContain('本步请明确选择'); state = braceletsStep(state)
    }
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyMarketBracelets state={limited} onBack={() => {}} />)).not.toMatch(/薰儿|手链|加列奥|木核/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续让路与两条手链')
    expect(savePreviewSummary(state, limited.settings)).not.toMatch(/薰儿|手链|加列奥|木核/)
    expect(earlyMarketBraceletsSaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyMarketBracelets(limited, { kind: 'xuner', position: marketSearchPlaces.voice }, braceletsInput(limited)).state).toBe(limited)
  })
  it('实际接取与旧gift同一次store写；双击/旧简略动作变更后的陈旧快照零写', async () => {
    let state = braceletsEligible(); while (state.earlyTraining.marketBracelets.stage < 19) state = braceletsStep(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.marketBracelets.green).toBe('received')
      expect(saved.earlyTraining.bracelet).toEqual({ stage: 5, gift: 'xuner' })
      expect(saved.earlyTraining.purse).toEqual(state.earlyTraining.purse)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, input = braceletsInput(state)
    expect(submitEarlyMarketBracelets(store, { kind: 'yan', position: marketSearchPlaces.voice }, input)).toBe(false)
    expect(writes).toBe(0); expect(submitEarlyMarketBracelets(store, { kind: 'xuner', position: marketSearchPlaces.voice }, input)).toBe(true)
    expect(submitEarlyMarketBracelets(store, { kind: 'xuner', position: marketSearchPlaces.voice }, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const old = advanceEarlyBracelet(state, earlyWalkPlaces.find(p => p.id === 'market')!, { stage: 4, operation: 'accept' })
    expect(old.ok).toBe(true)
    expect(advanceEarlyMarketBracelets(old.state, { kind: 'xuner', position: marketSearchPlaces.voice }, input).state).toBe(old.state)
    const renewed = braceletsStep(old.state); expect(renewed.earlyTraining.bracelet).toEqual({ stage: 5, gift: 'xuner' })
  })
})
