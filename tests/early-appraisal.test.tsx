import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyAppraisal, earlyAppraisalBlock, submitEarlyAppraisal } from '../src/core/early-appraisal'
import { appraisalScenes } from '../src/content/early-appraisal'
import { appraisalOwnerAt } from '../src/core/early-training-state'
import { earlyAppraisalSaveSummary, earlyConsignmentSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyAppraisal from '../src/ui/EarlyAppraisal'
import EarlyConsignment from '../src/ui/EarlyConsignment'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true, true, true, true)
}
describe('黑袍代言、谷尼鉴定与黑卡入场', () => {
  it('封瓶/地点/范围保护，旧首通不能迁移鉴定或入场', () => {
    const state = eligible(), scene = appraisalScenes[0]
    const action = { step: 0, owner: 'xiaoyan' as const, operation: scene.operation }
    expect(earlyAppraisalBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyAppraisal(state, position, 'alley', action).state).toBe(state)
    const unfinished = structuredClone(state); unfinished.earlyTraining.consignment.stage = 4; unfinished.earlyTraining.consignment.product = 'mixture'
    expect(earlyAppraisalBlock(unfinished, teacher)).toContain('装瓶')
    expect(earlyAppraisalBlock(initialState(), teacher)).toContain('第2章')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyAppraisal(state, teacher, 'alley', action).state).toBe(state)
    expect(earlyAppraisalSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyAppraisal state={state} position={teacher} onBack={() => {}} />)).not.toContain('谷尼')
  })
  it('八步独立断点/保管链与自动/手动/备份，样品归原瓶不产生物资或品阶奖励', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of appraisalScenes) {
      const action = { step: scene.step, owner: state.earlyTraining.consignment.owner, operation: scene.operation }
      expect(advanceEarlyAppraisal(state, teacher, scene.station === 'desk' ? 'alley' : 'desk', action).state).toBe(state)
      for (const step of [-1, NaN, .5, Infinity, scene.step + 1])
        expect(advanceEarlyAppraisal(state, teacher, scene.station, { ...action, step }).state).toBe(state)
      expect(advanceEarlyAppraisal(state, teacher, scene.station, { ...action, operation: 'bad' as 'cloak' }).state).toBe(state)
      const result = advanceEarlyAppraisal(state, teacher, scene.station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.consignment.owner).toBe(appraisalOwnerAt(scene.step + 1))
      expect(advanceEarlyAppraisal(state, teacher, scene.station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyAppraisalSaveSummary(state, state.settings))
      }
      if (scene.step === 4) expect(state.earlyTraining.appraisal.tier).toBe(0)
      if (scene.step === 5) {
        expect(state.earlyTraining.appraisal.tier).toBe(2)
        expect(state.earlyTraining.appraisal.card).toBe('none')
      }
    }
    before.earlyTraining.appraisal = { stage: 8, cloaked: true, speaker: 'yaolao', tier: 2, card: 'black-entry' }
    before.earlyTraining.consignment.owner = 'auction'
    expect(state).toEqual(before)
    expect(earlyConsignmentSaveSummary(state, state.settings)).toContain('拍卖方保管')
    const html = renderToStaticMarkup(<EarlyConsignment state={state} position={teacher} onBack={() => {}} />)
    expect(html).toContain('当前由拍卖方保管')
    expect(html).not.toContain('待售 · 萧炎保管')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待入场')
  })
  it('物品保管快照/丢失封瓶/已完成和非法动作均不可重复交接', () => {
    const state = eligible(), scene = appraisalScenes[0], action = { step: 0, owner: 'xiaoyan' as const, operation: scene.operation }
    expect(advanceEarlyAppraisal(state, teacher, 'alley', { ...action, owner: 'guni' }).state).toBe(state)
    const mismatch = structuredClone(state); mismatch.earlyTraining.consignment.owner = 'auction'
    expect(advanceEarlyAppraisal(mismatch, teacher, 'alley', { ...action, owner: 'auction' }).state).toBe(mismatch)
    mismatch.earlyTraining.consignment.product = 'none'
    expect(advanceEarlyAppraisal(mismatch, teacher, 'alley', action).state).toBe(mismatch)
    let finished = state
    for (const s of appraisalScenes) finished = advanceEarlyAppraisal(finished, teacher, s.station,
      { step: s.step, owner: finished.earlyTraining.consignment.owner, operation: s.operation }).state
    expect(advanceEarlyAppraisal(finished, teacher, 'entrance', { step: 8, owner: 'auction', operation: 'enter' }).state).toBe(finished)
  })
  it('旧封瓶档只补空鉴定，新版缺字段/黑袍/代言/品阶/卡/保管及前置异常拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.19.0'; delete old.earlyTraining.appraisal
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const changed of [{ stage: -1 }, { stage: .5 }, { stage: 9 }, { stage: NaN },
      { cloaked: true }, { speaker: 'yaolao' }, { tier: 2 }, { card: 'black-entry' }]) {
      const bad = structuredClone(state); Object.assign(bad.earlyTraining.appraisal, changed)
      expect(() => validateState(bad)).toThrow('重修')
    }
    const cloaked = advanceEarlyAppraisal(state, teacher, 'alley', { step: 0, owner: 'xiaoyan', operation: 'cloak' }).state
    cloaked.earlyTraining.consignment.stage = 4; cloaked.earlyTraining.consignment.product = 'mixture'; cloaked.earlyTraining.consignment.owner = 'none'
    expect(() => validateState(cloaked)).toThrow('重修')
    let step = state
    for (const s of appraisalScenes) {
      step = advanceEarlyAppraisal(step, teacher, s.station, { step: s.step, owner: step.earlyTraining.consignment.owner, operation: s.operation }).state
      const bad = structuredClone(step); bad.earlyTraining.consignment.owner = step.earlyTraining.consignment.owner === 'xiaoyan' ? 'auction' : 'xiaoyan'
      expect(() => validateState(bad)).toThrow('重修')
    }
  })
  it('store最新记录与保存，失败不写，身份和唯一保管目标更新，runtime保留', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = { step: 0, owner: 'xiaoyan' as const, operation: 'cloak' as const }
    expect(submitEarlyAppraisal(store, teacher, 'desk', action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyAppraisal(store, teacher, 'alley', action)).toBe(true)
    expect(submitEarlyAppraisal(store, teacher, 'alley', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.appraisal.stage = 1; before.earlyTraining.appraisal.cloaked = true
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
