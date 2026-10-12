import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstTechniqueAt } from '../src/core/first-technique-state'
import { advanceFirstTechnique, firstTechniqueBed, submitFirstTechnique } from '../src/core/first-technique'
import { firstTechniqueEligible, firstTechniqueInput, firstTechniqueStep } from './helpers/first-technique-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstTechniqueSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstTechnique from '../src/ui/FirstTechnique'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

describe('C1h-1b1 同一铁片研究与本人感知', () => {
  it('九断点跨四槽/上一备份；全部其他state保持且闭眼时禁行走', async () => {
    let state = firstTechniqueEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.firstTechnique.stage < 9) {
      const previous = state
      state = firstTechniqueStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstTechnique = before.earlyTraining.firstTechnique
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstTechnique
      expect(task).toEqual(firstTechniqueAt(task.stage))
      const html = renderToStaticMarkup(<FirstTechnique state={state} onBack={() => {}} />)
      expect(html.includes('铁片研究向左走')).toBe(task.stage < 9 && task.eyes !== 'closed')
      expect(html).toContain('同一铁片：本人持有')
      expect(html.includes('夹片 · 闭眼感知')).toBe(task.eyes === 'closed')
    }
    expect(firstTechniqueSaveSummary(state, state.settings)).toContain('有限试瓶待续')
    expect(advanceFirstTechnique(state, firstTechniqueBed, firstTechniqueInput(state)).state).toBe(state)
  })
  it('旧0.59.1只有未参与；旧spent/五段、iron18/practice4/hall8和后期两瓶不能代签', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    for (const input of [firstTechniqueEligible(), firstTechniqueEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.59.1'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstTechnique
      let state = validateState(raw)
      expect(state).toEqual(input); expect(state.earlyTraining.firstTechnique.stage).toBe(0)
      while (state.earlyTraining.firstTechnique.stage < 9) state = firstTechniqueStep(state)
      const same = structuredClone(state); same.earlyTraining.firstTechnique = input.earlyTraining.firstTechnique
      expect(same).toEqual(input)
    }
    const bad = firstTechniqueStep(firstTechniqueEligible()); bad.contentVersion = '0.59.1'
    expect(() => validateState(bad)).toThrow('首次铁片研究')
  })
  it('完整快照、老师/演员/坐标、重复与越界全部拒绝零写', () => {
    let state = firstTechniqueEligible()
    while (state.earlyTraining.firstTechnique.stage < 9) {
      const action = firstTechniqueInput(state)
      for (const key of Object.keys(state.earlyTraining.firstTechnique))
        expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedLedger', 'expectedTraining', 'expectedIron', 'expectedPractice', 'expectedRecovery'] as const) {
        expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field]))
          expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['duplicate', 'learn', 'absorb-person', 'battle', 'restore', 'finish', 'wait'])
        expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, operation }).state).toBe(state)
      expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, actor: 'teacher' }).state).toBe(state)
      expect(advanceFirstTechnique(state, firstTechniqueBed, { ...action, teacherPosition: firstTechniqueBed }).state).toBe(state)
      for (const pos of [{ x: NaN, y: 370 }, { x: 140, y: Infinity }, { x: 140, y: 420 }, { x: 360, y: 100 }])
        expect(advanceFirstTechnique(state, pos, action).state).toBe(state)
      expect(advanceFirstTechnique(state, { x: 260, y: 370 }, action).state).toBe(state)
      state = firstTechniqueStep(state)
      expect(advanceFirstTechnique(state, firstTechniqueBed, action).state).toBe(state)
    }
  })
  it('所有派生字段/前置/版本校验严格；防剧透隐藏入口与完整摘要', () => {
    let state = firstTechniqueEligible()
    for (let stage = 0; stage <= 9; stage++) {
      if (stage) state = firstTechniqueStep(state)
      for (const key of Object.keys(state.earlyTraining.firstTechnique)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstTechnique, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
    for (const mode of ['chapter', 'training', 'iron', 'hidden'] as const) {
      const bad = structuredClone(state)
      if (mode === 'chapter') bad.completed = bad.completed.filter(id => id !== 2)
      if (mode === 'training') bad.earlyTraining.firstTraining.stage = 16
      if (mode === 'iron') bad.earlyTraining.iron.stage = 17
      if (mode === 'hidden') { bad.settings.spoiler = 'anime'; bad.settings.animeLimit = 1 }
      expect(advanceFirstTechnique(bad, firstTechniqueBed, firstTechniqueInput(bad)).state).toBe(bad)
      expect(renderToStaticMarkup(<FirstTechnique state={bad} onBack={() => {}} />)).not.toContain('铁片研究房中地图')
      if (mode === 'hidden' || mode === 'training') expect(renderToStaticMarkup(<EarlyTrainingPanel state={bad} />)).not.toContain('接续同一铁片研究与感知')
      if (mode !== 'hidden') expect(() => validateState(bad)).toThrow()
    }
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }
    expect(firstTechniqueSaveSummary(state, hidden)).toContain('封存')
    expect(savePreviewSummary(state, hidden)).not.toContain('首次铁片研究')
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstTechnique
    expect(() => validateState(missing)).toThrow()
  })
  it('单历史字段原子保存、双击与旧入口并发快照拒绝，不改运行态', async () => {
    const state = firstTechniqueEligible(), action = firstTechniqueInput(state)
    let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => { writes++; expect(saved.earlyTraining.firstTechnique.stage).toBe(1) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstTechnique(store, firstTechniqueBed, action)).toBe(true)
    expect(submitFirstTechnique(store, firstTechniqueBed, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.practice.phase = 1
    expect(advanceFirstTechnique(changed, firstTechniqueBed, action).state).toBe(changed)
  })
})
