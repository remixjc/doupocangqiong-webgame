import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstTrainingAt } from '../src/core/first-training-state'
import { advanceFirstTraining, submitFirstTraining } from '../src/core/first-training'
import { refiningWater } from '../src/core/early-refining'
import { ironPlaces } from '../src/core/early-iron'
import { firstTrainingEligible, firstTrainingInput, firstTrainingPosition, firstTrainingStep } from './helpers/first-training-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstTrainingSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstTraining from '../src/ui/FirstTraining'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'

describe('C1h-1a1 当前一轮持续调息与预计', () => {
  it('全部断点及三次呼吸跨四槽/上一备份；只有新历史改变', async () => {
    let state = firstTrainingEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    let failed = false
    while (state.earlyTraining.firstTraining.stage < 10) {
      const previous = state
      const marker = state.earlyTraining.firstTraining.stage === 2 && !failed ? 0 : .5
      if (marker === 0) failed = true
      state = firstTrainingStep(state, marker)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstTraining = before.earlyTraining.firstTraining
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstTraining
      const html = renderToStaticMarkup(<FirstTraining state={state} onBack={() => {}} />)
      expect(html.includes('持续调息呼吸标记')).toBe(task.stage === 2)
      expect(html.includes('持续调息向左走')).toBe(task.stage < 10 && !task.seated)
      expect(html).toContain('衣着剪影与容器遮挡')
      expect(task.result).toBe('none')
    }
    expect(state.earlyTraining.firstTraining).toEqual(firstTrainingAt(10, 3, 1))
    expect(firstTrainingSaveSummary(state, state.settings)).toContain('预计五段尚非实际结果')
    expect(advanceFirstTraining(state, firstTrainingPosition(state), firstTrainingInput(state)).state).toBe(state)
  })
  it('旧未参与及旧已恢复spent/五段只补空；旧进度不代签新一轮', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    expect(old.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [firstTrainingEligible(), firstTrainingEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.57.2'
      delete (raw.earlyTraining as Partial<typeof raw.earlyTraining>).firstTraining
      let state = validateState(raw)
      expect(state).toEqual(input)
      while (state.earlyTraining.firstTraining.stage < 10) state = firstTrainingStep(state)
      const same = structuredClone(state); same.earlyTraining.firstTraining = input.earlyTraining.firstTraining
      expect(same).toEqual(input)
    }
    const bad = firstTrainingStep(firstTrainingEligible()); bad.contentVersion = '0.57.2'
    expect(() => validateState(bad)).toThrow('首次持续调息')
  })
  it('完整快照/演员/老师位置/合法本人位置/顺序/禁止奖励动作全部零写', () => {
    let state = firstTrainingEligible()
    while (state.earlyTraining.firstTraining.stage < 10) {
      const input = firstTrainingInput(state), position = firstTrainingPosition(state)
      for (const key of Object.keys(state.earlyTraining.firstTraining))
        expect(advanceFirstTraining(state, position, { ...input, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedLedger', 'expectedRefining', 'expectedPractice', 'expectedRecovery'] as const)
        for (const key of Object.keys(input[field]))
          expect(advanceFirstTraining(state, position, { ...input, [field]: { ...input[field], [key]: 'stale' } }).state).toBe(state)
      for (const operation of ['wait', 'restore', 'drink', 'fourth', 'fifth', 'finish'])
        expect(advanceFirstTraining(state, position, { ...input, operation }).state).toBe(state)
      expect(advanceFirstTraining(state, position, { ...input, actor: 'teacher' }).state).toBe(state)
      expect(advanceFirstTraining(state, position, { ...input, teacherPosition: refiningWater }).state).toBe(state)
      for (const pos of [{ x: NaN, y: 370 }, { x: 120, y: Infinity }, { x: 120, y: 420 }, { x: 360, y: 100 }])
        expect(advanceFirstTraining(state, pos, input).state).toBe(state)
      if (state.earlyTraining.firstTraining.stage <= 6)
        expect(advanceFirstTraining(state, ironPlaces.table, input).state).toBe(state)
      if (state.earlyTraining.firstTraining.stage === 7)
        expect(advanceFirstTraining(state, refiningWater, input).state).toBe(state)
      state = firstTrainingStep(state)
      expect(advanceFirstTraining(state, position, input).state).toBe(state)
    }
  })
  it('手动节奏免费复位、端点有效/非法标记零写；所有派生字段严格', () => {
    let state = firstTrainingEligible()
    let checked = false
    while (state.earlyTraining.firstTraining.stage < 10) {
      if (state.earlyTraining.firstTraining.stage === 2 && !checked) {
        checked = true
        const input = firstTrainingInput(state)
        for (const marker of [undefined, NaN, Infinity, -1, 1.1])
          expect(advanceFirstTraining(state, refiningWater, { ...input, marker }).state).toBe(state)
        state = firstTrainingStep(state, .35); expect(state.earlyTraining.firstTraining.beats).toBe(1)
        state = firstTrainingStep(state, 1); expect(state.earlyTraining.firstTraining.beats).toBe(0)
        state = firstTrainingStep(state, .65)
        const cap = structuredClone(state); cap.earlyTraining.firstTraining.attempts = 1_000_000
        expect(advanceFirstTraining(cap, refiningWater, firstTrainingInput(cap, 0)).state).toBe(cap)
      }
      state = firstTrainingStep(state)
      for (const key of Object.keys(state.earlyTraining.firstTraining)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstTraining, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
    const early = firstTrainingEligible()
    for (const mutation of [{ beats: 1 }, { attempts: 1 }, { stage: 2, beats: 3 }, { stage: 3, beats: 2 }]) {
      const bad = structuredClone(early); Object.assign(bad.earlyTraining.firstTraining, mutation)
      expect(() => validateState(bad)).toThrow()
    }
  })
  it('前置/防剧透/摘要封存，不签四段、五段或主线境界', () => {
    const state = firstTrainingEligible()
    for (const mode of ['chapter', 'refining', 'hidden'] as const) {
      const bad = structuredClone(state)
      if (mode === 'chapter') bad.completed = bad.completed.filter(id => id !== 2)
      if (mode === 'refining') bad.earlyTraining.refining.stage = 21
      if (mode === 'hidden') { bad.settings.spoiler = 'anime'; bad.settings.animeLimit = 1 }
      expect(advanceFirstTraining(bad, refiningWater, firstTrainingInput(bad)).state).toBe(bad)
      expect(renderToStaticMarkup(<FirstTraining state={bad} onBack={() => {}} />)).not.toContain('持续调息房中地图')
      expect(renderToStaticMarkup(<EarlyTrainingPanel state={bad} />)).not.toContain('接续当前一轮持续调息')
    }
    let done = state; while (done.earlyTraining.firstTraining.stage < 10) done = firstTrainingStep(done)
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 1 }
    expect(savePreviewSummary(done, hidden)).not.toMatch(/持续调息|五段/)
    expect(firstTrainingSaveSummary(done, hidden)).toContain('封存')
    const invalid = structuredClone(done); invalid.earlyTraining.refining.stage = 21
    expect(() => validateState(invalid)).toThrow()
    const missing = structuredClone(state); delete (missing.earlyTraining as Partial<typeof missing.earlyTraining>).firstTraining
    expect(() => validateState(missing)).toThrow()
  })
  it('单字段原子保存/双击拒绝/旧入口并发零写及运行态保持', async () => {
    let state = firstTrainingEligible(); while (state.earlyTraining.firstTraining.stage < 2) state = firstTrainingStep(state)
    const input = firstTrainingInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstTraining.beats).toBe(1)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstTraining(store, refiningWater, input)).toBe(true)
    expect(submitFirstTraining(store, refiningWater, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.practice.phase = 1
    expect(advanceFirstTraining(changed, refiningWater, input).state).toBe(changed)
  })
})
