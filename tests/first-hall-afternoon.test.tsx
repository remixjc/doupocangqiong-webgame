import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallAfternoon, submitFirstHallAfternoon } from '../src/core/first-hall-afternoon'
import { firstHallAfternoonEligible, firstHallAfternoonInput, firstHallAfternoonStep } from './helpers/first-hall-afternoon-replay'
import { firstHallAftermathEligible } from './helpers/first-hall-aftermath-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import FirstHallAfternoon from '../src/ui/FirstHallAfternoon'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'
describe('三个午后路段，暮色与天黑分存', () => {
  let base: GameState, checkpoints: GameState[]
  beforeAll(() => {
    base = firstHallAfternoonEligible(); checkpoints = [base]
    while (checkpoints.at(-1)!.earlyTraining.firstHallAfternoon.stage < 10) checkpoints.push(firstHallAfternoonStep(checkpoints.at(-1)!))
  })
  it('18次手动路步+10时段动作，每次可保存刷新，三段独立位置；只改新账', async () => {
    expect(checkpoints).toHaveLength(29)
    const endpoints = [[1, 220, 230, 'early'], [3, 140, 70, 'middle'], [5, 300, 150, 'late']] as const
    for (const [stage, x, y, period] of endpoints) {
      const t = checkpoints.find(s => s.earlyTraining.firstHallAfternoon.stage === stage)!.earlyTraining.firstHallAfternoon
      expect(t).toMatchObject({ stage, x, y, xunerX: x + 25, xunerY: y - 30, period, walk: 0 })
    }
    await saveSlot(0, base)
    for (let i = 1; i < checkpoints.length; i++) {
      const state = checkpoints[i], previous = checkpoints[i - 1], t = state.earlyTraining.firstHallAfternoon
      const same = structuredClone(state); same.earlyTraining.firstHallAfternoon = base.earlyTraining.firstHallAfternoon
      expect(same).toEqual(base); expect(t.record).toBe('current')
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const stale = firstHallAfternoonInput(previous)
      expect(advanceFirstHallAfternoon(state, t, t.location, stale).state).toBe(state)
      const html = renderToStaticMarkup(<FirstHallAfternoon state={state} onBack={() => {}} />)
      expect(html).toContain(`translate(${t.x} ${t.y})`); expect(html).toContain(`translate(${t.xunerX} ${t.xunerY})`)
      expect(html).toContain(`x="${t.x + 20}" y="${t.y - 5}"`); expect(html).toContain('回房另续')
      expect(t.period === 'dark').toBe(t.stage >= 8); expect(t.reviewed).toBe(t.stage >= 9)
    }
    expect(checkpoints.at(-1)!.earlyTraining.firstHallAfternoon).toMatchObject({ stage: 10, legs: 3, reviewed: true, location: 'mountain', period: 'dark', x: 300, y: 150 })
  })
  it('0.76.0/1/2只补空记录；旧在途stage0walk1也拒绝；当前逐字段缺失与派生错误拒绝', () => {
    for (const version of ['0.76.0', '0.76.1', '0.76.2']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      old.contentVersion = version; delete old.earlyTraining.firstHallAfternoon
      expect(validateState(old)).toEqual(base)
      for (const state of checkpoints.slice(1)) expect(() => validateState({ ...state, contentVersion: version })).toThrow('整个午后')
    }
    for (const state of checkpoints) {
      expect(validateState(state)).toEqual(state)
      for (const key of Object.keys(state.earlyTraining.firstHallAfternoon)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallAfternoon: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallAfternoon[key]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallAfternoon[key] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    const impossible = structuredClone(checkpoints[1]); impossible.earlyTraining.firstHallApproach = firstHallAftermathEligible().earlyTraining.firstHallApproach
    expect(() => validateState(impossible)).toThrow()
    const wrongRecord = structuredClone(checkpoints[1]); wrongRecord.earlyTraining.firstHallAfternoon.record = 'recalled'
    expect(() => validateState(wrongRecord)).toThrow()
    expect(advanceFirstHallAfternoon(wrongRecord, wrongRecord.earlyTraining.firstHallAfternoon, 'mountain', firstHallAfternoonInput(wrongRecord)).state).toBe(wrongRecord)
  })
  it('每个路步和断点均核14完整快照、坐标空间、人物与旧flags；禁止跳时段/偏路/传技', () => {
    for (const state of checkpoints) {
      const t = state.earlyTraining.firstHallAfternoon, action = firstHallAfternoonInput(state)
      for (const field of ['expectedApproach', 'expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallAfternoon(state, t, t.location, { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallAfternoon(state, t, t.location, { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation', 'aftermath'] as const)
        expect(advanceFirstHallAfternoon(state, t, t.location, { ...action, [flag]: true }).state).toBe(state)
      for (const operation of ['dark', 'time-early', 'arrive-late', 'room', 'attack', 'win', 'repay', 'learn', 'move-left', 'move-up', 'move-down', 'move-right']) if (operation !== action.operation)
        expect(advanceFirstHallAfternoon(state, t, t.location, { ...action, operation }).state).toBe(state)
      expect(advanceFirstHallAfternoon(state, t, t.location, { ...action, actor: 'xuner' }).state).toBe(state)
      expect(advanceFirstHallAfternoon(state, { x: t.x + 1, y: t.y }, t.location, action).state).toBe(state)
      expect(advanceFirstHallAfternoon(state, { x: t.xunerX, y: t.xunerY }, t.location, action).state).toBe(state)
      expect(advanceFirstHallAfternoon(state, t, t.location === 'outside' ? 'mountain' : 'outside', action).state).toBe(state)
    }
    const incomplete = firstHallAftermathEligible()
    expect(advanceFirstHallAfternoon(incomplete, incomplete.earlyTraining.firstHallAfternoon, 'outside', firstHallAfternoonInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续整个午后同行与天黑')
  })
  it('旧已结算/传技的更高保管只增加历史，旧堂外回顾不退新山上位置', () => {
    const legacy = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallAfternoonEligible(legacy), previous = structuredClone(state)
    while (state.earlyTraining.firstHallAfternoon.stage < 10) {
      state = firstHallAfternoonStep(state); expect(state.earlyTraining.firstHallAfternoon.record).toBe('recalled')
    }
    const old = renderToStaticMarkup(<FirstHallApproach aftermath state={state} onBack={() => {}} />)
    expect(old).toContain('明确回顾当时堂内外位置'); expect(old).toContain('离堂后萧宁反应 4/4')
    expect(old).toContain('translate(60 310)'); expect(old).toContain('translate(85 280)'); expect(old).toContain('translate(450 280)')
    const leaving = renderToStaticMarkup(<FirstHallApproach leaving state={state} onBack={() => {}} />)
    expect(leaving).toContain('同行与实际离堂 4/4')
    state.earlyTraining.firstHallAfternoon = previous.earlyTraining.firstHallAfternoon; expect(state).toEqual(previous)
  })
  it('同一旧快照并发仅一次自动存档，战斗运行态不变；chapter2防剧透', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, task = base.earlyTraining.firstHallAfternoon, action = firstHallAfternoonInput(base)
    expect(submitFirstHallAfternoon(store, task, task.location, action)).toBe(true)
    expect(submitFirstHallAfternoon(store, task, task.location, action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallAfternoon(sealed, task, task.location, action).state).toBe(sealed)
    expect(savePreviewSummary(checkpoints.at(-1)!, hidden)).not.toContain('整个午后')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续整个午后同行与天黑')
  })
})
