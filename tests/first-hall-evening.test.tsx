import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallEvening, submitFirstHallEvening } from '../src/core/first-hall-evening'
import { firstHallEveningEligible, firstHallEveningInput, firstHallEveningStep } from './helpers/first-hall-evening-replay'
import { firstHallAfternoonEligible } from './helpers/first-hall-afternoon-replay'
import { firstHallEveningAt } from '../src/core/first-hall-evening-state'
import { hallEveningSnapshotKeys } from '../src/core/early-snapshots'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import FirstHallEvening from '../src/ui/FirstHallEvening'
import FirstHallAfternoon from '../src/ui/FirstHallAfternoon'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'
describe('夜路、分路、本人跨门与同卷放桌', () => {
  let base: GameState, checkpoints: GameState[]
  beforeAll(() => {
    base = firstHallEveningEligible(); checkpoints = [base]
    while (checkpoints.at(-1)!.earlyTraining.firstHallEvening.stage < 9) checkpoints.push(firstHallEveningStep(checkpoints.at(-1)!))
  })
  it('八个实际路步与九个动作可逐步保存，室内外及同卷保管严格；全部旧账保持', async () => {
    expect(checkpoints).toHaveLength(18)
    await saveSlot(0, base)
    for (let i = 1; i < checkpoints.length; i++) {
      const state = checkpoints[i], previous = checkpoints[i - 1], t = state.earlyTraining.firstHallEvening
      const same = structuredClone(state); same.earlyTraining.firstHallEvening = base.earlyTraining.firstHallEvening
      expect(same).toEqual(base); expect(t.record).toBe('current')
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      expect(advanceFirstHallEvening(state, t, t.location, firstHallEveningInput(previous)).state).toBe(state)
      const html = renderToStaticMarkup(<FirstHallEvening state={state} onBack={() => {}} />)
      expect(html).toContain(`translate(${t.x} ${t.y})`)
      expect(t.location === 'room').toBe(t.stage >= 3)
      expect(t.xuner === 'departed').toBe(t.stage >= 2)
      expect(t.door === 'closed').toBe(t.stage >= 4)
      expect(t.tired).toBe(t.stage >= 5); expect(t.scroll === 'table').toBe(t.stage >= 6)
      expect(t.tea).toBe(t.stage >= 7); expect(t.remark).toBe(t.stage >= 8)
      if (t.scroll === 'table') expect(html).toContain('x="320" y="255"')
      else expect(html).toContain(`x="${t.x + 20}" y="${t.y - 5}"`)
      if (t.location === 'room') expect(html).not.toContain('aria-label="夜间薰儿位置"')
    }
    expect(checkpoints.at(-1)!.earlyTraining.firstHallEvening).toEqual(firstHallEveningAt(9))
    const gate = checkpoints.find(s => s.earlyTraining.firstHallEvening.stage === 2)!.earlyTraining.firstHallEvening
    expect(gate).toMatchObject({ x: 220, y: 310, location: 'courtyard', xuner: 'departed', scroll: 'held' })
    const inside = checkpoints.find(s => s.earlyTraining.firstHallEvening.stage === 3)!.earlyTraining.firstHallEvening
    expect(inside).toMatchObject({ x: 220, y: 270, location: 'room', door: 'open', tired: false })
  })
  it('旧0.77只补空，首夜路也查版本，当前缺字段或错误派生和来源不接受', () => {
    for (const version of ['0.77.0', '0.77.1']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      old.contentVersion = version; delete old.earlyTraining.firstHallEvening
      expect(validateState(old)).toEqual(base)
      for (const state of checkpoints.slice(1)) expect(() => validateState({ ...state, contentVersion: version })).toThrow('夜间回房')
    }
    for (const state of checkpoints) {
      expect(validateState(state)).toEqual(state)
      for (const key of Object.keys(state.earlyTraining.firstHallEvening)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallEvening: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallEvening[key]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallEvening[key] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    const impossible = structuredClone(checkpoints[1]); impossible.earlyTraining.firstHallAfternoon = firstHallAfternoonEligible().earlyTraining.firstHallAfternoon
    expect(() => validateState(impossible)).toThrow()
    const wrongRecord = structuredClone(checkpoints[1]); wrongRecord.earlyTraining.firstHallEvening.record = 'recalled'
    expect(() => validateState(wrongRecord)).toThrow()
    expect(advanceFirstHallEvening(wrongRecord, wrongRecord.earlyTraining.firstHallEvening, 'path', firstHallEveningInput(wrongRecord)).state).toBe(wrongRecord)
  })
  it('15完整旧快照、每个任务字段、坐标空间、人物和旧flags逐断点校验；跳饮茶/提前老师/换卷拒绝', () => {
    expect(hallEveningSnapshotKeys).toHaveLength(15)
    for (const state of checkpoints) {
      const t = state.earlyTraining.firstHallEvening, action = firstHallEveningInput(state)
      for (const label of hallEveningSnapshotKeys) {
        const field = `expected${label}` as keyof typeof action, snapshot = action[field] as Record<string, unknown>
        expect(advanceFirstHallEvening(state, t, t.location, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(snapshot)) expect(advanceFirstHallEvening(state, t, t.location, { ...action, [field]: { ...snapshot, [key]: 'stale' } }).state).toBe(state)
      }
      for (const key of Object.keys(t)) expect(advanceFirstHallEvening(state, t, t.location, { ...action, [key]: 'stale' }).state).toBe(state)
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation', 'aftermath'] as const)
        expect(advanceFirstHallEvening(state, t, t.location, { ...action, [flag]: true }).state).toBe(state)
      for (const operation of ['arrive', 'part', 'enter', 'close', 'relax', 'table', 'tea', 'remark', 'archive', 'teacher', 'learn', 'first-scroll', 'repay', 'move-left', 'move-up', 'move-down', 'move-right']) if (operation !== action.operation)
        expect(advanceFirstHallEvening(state, t, t.location, { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallEvening(state, t, t.location, { ...action, actor: 'xuner' }).state).toBe(state)
      expect(advanceFirstHallEvening(state, { x: t.x + 1, y: t.y }, t.location, action).state).toBe(state)
      expect(advanceFirstHallEvening(state, { x: t.xunerX, y: t.xunerY }, t.location, action).state).toBe(state)
      expect(advanceFirstHallEvening(state, t, t.location === 'room' ? 'courtyard' : 'room', action).state).toBe(state)
    }
    const incomplete = firstHallAfternoonEligible()
    expect(advanceFirstHallEvening(incomplete, incomplete.earlyTraining.firstHallEvening, 'mountain', firstHallEveningInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续夜间回房与同卷放桌')
  })
  it('旧高传技和奖励仅添历史，不退旧保管；午后地图明确历史山上断点', () => {
    const legacy = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallEveningEligible(legacy), previous = structuredClone(state)
    while (state.earlyTraining.firstHallEvening.stage < 9) {
      state = firstHallEveningStep(state); expect(state.earlyTraining.firstHallEvening.record).toBe('recalled')
    }
    const old = renderToStaticMarkup(<FirstHallAfternoon state={state} onBack={() => {}} />)
    expect(old).toContain('回顾当时山上位置'); expect(old).toContain('translate(300 150)'); expect(old).toContain('translate(325 120)')
    expect(renderToStaticMarkup(<FirstHallEvening state={state} onBack={() => {}} />)).toContain('详细历史回顾')
    state.earlyTraining.firstHallEvening = previous.earlyTraining.firstHallEvening; expect(state).toEqual(previous)
  })
  it('每次事务只写新字段并发仅一次自动存档；防剧透chapter2仍生效', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, task = base.earlyTraining.firstHallEvening, action = firstHallEveningInput(base)
    expect(submitFirstHallEvening(store, task, task.location, action)).toBe(true)
    expect(submitFirstHallEvening(store, task, task.location, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallEvening(sealed, task, task.location, action).state).toBe(sealed)
    expect(savePreviewSummary(checkpoints.at(-1)!, hidden)).not.toContain('夜间回房')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续夜间回房与同卷放桌')
  })
})
