import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyXunerVisit, earlyXunerVisitBlock, submitEarlyXunerVisit } from '../src/core/early-xuner-visit'
import { xunerVisitScenes } from '../src/content/early-xuner-visit'
import { earlyXunerVisitSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { xunerCardAt } from '../src/core/early-training-state'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyXunerVisit from '../src/ui/EarlyXunerVisit'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, false, false, false, false, false, false, false, false, true)
}
describe('薰儿来访与独自向家族交卡', () => {
  it('需要父亲来访归档和有效地点，第3章封存时不展开人物或金额', () => {
    const state = eligible(), action = { step: 0, card: 'xuner' as const, operation: 'appear' as const }
    expect(earlyXunerVisitBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyXunerVisit(state, position, 'room', action).state).toBe(state)
    const waiting = structuredClone(state); waiting.earlyTraining.fatherGift.stage = 5
    expect(earlyXunerVisitBlock(waiting, teacher)).toContain('收好')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyXunerVisit(state, teacher, 'room', action).state).toBe(state)
    expect(earlyXunerVisitSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyXunerVisit state={state} position={teacher} onBack={() => {}} />)).not.toMatch(/100000|紫金卡|三年之约/)
  })
  it('七步断点和自动/手动/备份保留，唯一卡先薰儿后家族，玩家所有财物与知识不代变', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of xunerVisitScenes) {
      const action = { step: scene.step, card: state.earlyTraining.xunerVisit.card, operation: scene.operation }
      expect(advanceEarlyXunerVisit(state, teacher, scene.station === 'room' ? 'council' : 'room', action).state).toBe(state)
      const result = advanceEarlyXunerVisit(state, teacher, scene.station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.xunerVisit.card).toBe(xunerCardAt(scene.step + 1))
      expect(advanceEarlyXunerVisit(state, teacher, scene.station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyXunerVisitSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state); comparison.earlyTraining.xunerVisit = { stage: 0, card: 'xuner' }
      expect(comparison).toEqual(before)
      const html = renderToStaticMarkup(<EarlyXunerVisit state={state} position={teacher} onBack={() => {}} />)
      if (scene.step === 4) {
        expect(state.earlyTraining.xunerVisit.card).toBe('xuner')
        expect(earlyXunerVisitSaveSummary(state, state.settings)).toContain('尚未交卡')
      }
      if (scene.step >= 3) expect(html).toContain('萧炎留在房中')
      if (scene.step === 5) expect(earlyXunerVisitSaveSummary(state, state.settings)).toContain('家族取得100000')
    }
    expect(state.earlyTraining.settlement.net).toBe(39200)
    expect(state.earlyTraining.consignment.owner).toBe('xiaoyan')
    expect(state.earlyTraining.recovery.energy).toBe('spent')
    expect(earlyXunerVisitSaveSummary(state, state.settings)).toContain('萧炎不知情')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待长老回应')
  })
  it('旧赠回档只补未参与，新版缺字段/非法阶段/卡归属/未完成前置不能导入', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.20.2'; delete old.earlyTraining.xunerVisit
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion; expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, .5, 8, NaN, Infinity, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.xunerVisit.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    let advanced = state
    for (const scene of xunerVisitScenes) {
      advanced = advanceEarlyXunerVisit(advanced, teacher, scene.station, { step: scene.step, card: advanced.earlyTraining.xunerVisit.card, operation: scene.operation }).state
      const bad = structuredClone(advanced); bad.earlyTraining.xunerVisit.card = advanced.earlyTraining.xunerVisit.card === 'xuner' ? 'elders' : 'xuner'
      expect(() => validateState(bad)).toThrow('重修')
      bad.earlyTraining.xunerVisit.card = advanced.earlyTraining.xunerVisit.card; bad.earlyTraining.fatherGift.stage = 5
      expect(() => validateState(bad)).toThrow('重修')
    }
    const bad = structuredClone(state); bad.earlyTraining.xunerVisit.card = 'elders'
    expect(() => validateState(bad)).toThrow('重修')
  })
  it('拒绝过期卡/步骤/操作/损坏组合，交卡和完成后重复不产生玩家奖励', () => {
    const state = eligible(), action = { step: 0, card: 'xuner' as const, operation: 'appear' as const }
    for (const change of [{ step: -1 }, { step: 7 }, { step: NaN }, { card: 'elders' as const }, { operation: 'give' as const }])
      expect(advanceEarlyXunerVisit(state, teacher, 'room', { ...action, ...change }).state).toBe(state)
    const bad = structuredClone(state); bad.earlyTraining.xunerVisit.card = 'elders'
    expect(advanceEarlyXunerVisit(bad, teacher, 'room', { ...action, card: 'elders' }).state).toBe(bad)
    let finished = state
    for (const scene of xunerVisitScenes) finished = advanceEarlyXunerVisit(finished, teacher, scene.station, { step: scene.step, card: finished.earlyTraining.xunerVisit.card, operation: scene.operation }).state
    expect(advanceEarlyXunerVisit(finished, teacher, 'council', { step: 7, card: 'elders', operation: 'accept' }).state).toBe(finished)
  })
  it('store使用最新快照，失败不落盘，合法步骤仅写事件且保留runtime', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = { step: 0, card: 'xuner' as const, operation: 'appear' as const }
    expect(submitEarlyXunerVisit(store, teacher, 'corner', action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyXunerVisit(store, teacher, 'room', action)).toBe(true)
    expect(submitEarlyXunerVisit(store, teacher, 'room', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.xunerVisit.stage = 1
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
