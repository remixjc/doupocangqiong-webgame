import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyFatherGift, earlyFatherGiftBlock, submitEarlyFatherGift } from '../src/core/early-father-gift'
import { fatherGiftScenes } from '../src/content/early-father-gift'
import { earlyFatherGiftSaveSummary, earlyConsignmentSaveSummary, earlyAppraisalSaveSummary, earlyAuctionSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { consignmentOwnerAt } from '../src/core/early-training-state'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyFatherGift from '../src/ui/EarlyFatherGift'
import EarlyConsignment from '../src/ui/EarlyConsignment'
import EarlyAuction from '../src/ui/EarlyAuction'
import EarlyAppraisal from '../src/ui/EarlyAppraisal'
import EarlySettlement from '../src/ui/EarlySettlement'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true, true, true, true, true, true, true)
}
describe('父亲买得原瓶，再赠回同一实例', () => {
  it('寄售离场/地点/范围保护，首通不迁移赠回', () => {
    const state = eligible(), action = { step: 0, owner: 'auction' as const, operation: 'return' as const }
    expect(earlyFatherGiftBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyFatherGift(state, position, 'door', action).state).toBe(state)
    const waiting = structuredClone(state); waiting.earlyTraining.settlement.stage = 6
    expect(earlyFatherGiftBlock(waiting, teacher)).toContain('离场')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyFatherGift(state, teacher, 'door', action).state).toBe(state)
    expect(earlyFatherGiftSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyFatherGift state={state} position={teacher} onBack={() => {}} />)).not.toContain('萧战')
  })
  it('六步逐断点/自动手动备份，父亲先持再赠回，不复制瓶/净款/耗尽自用液', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of fatherGiftScenes) {
      const action = { step: scene.step, owner: state.earlyTraining.consignment.owner, operation: scene.operation }
      expect(advanceEarlyFatherGift(state, teacher, scene.station === 'meeting' ? 'cabinet' : 'meeting', action).state).toBe(state)
      const result = advanceEarlyFatherGift(state, teacher, scene.station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(state.earlyTraining.consignment.owner).toBe(consignmentOwnerAt(8, scene.step + 1))
      expect(advanceEarlyFatherGift(state, teacher, scene.station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyFatherGiftSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state)
      comparison.earlyTraining.fatherGift.stage = 0; comparison.earlyTraining.consignment.owner = 'auction'
      expect(comparison).toEqual(before)
      if (scene.step === 1) {
        expect(state.earlyTraining.consignment.owner).toBe('xiaozhan')
        expect(earlyFatherGiftSaveSummary(state, state.settings)).toContain('待赠回')
      }
      if (scene.step === 3) expect(state.earlyTraining.consignment.owner).toBe('xiaoyan')
    }
    expect(state.earlyTraining.settlement.net).toBe(39200)
    expect(state.earlyTraining.recovery.energy).toBe('spent')
    expect(state.earlyTraining.consignment.supplies.jadeBottle).toBe(0)
    expect(earlyConsignmentSaveSummary(state, state.settings)).toContain('赠回')
    expect(earlyAppraisalSaveSummary(state, state.settings)).toContain('已赠回萧炎')
    expect(earlyAuctionSaveSummary(state, state.settings)).toContain('赠回')
    expect(renderToStaticMarkup(<EarlyConsignment state={state} position={teacher} onBack={() => {}} />)).toContain('当前由萧炎保管')
    for (const Ui of [EarlyAuction, EarlyAppraisal, EarlySettlement]) {
      const html = renderToStaticMarkup(<Ui state={state} position={teacher} onBack={() => {}} />)
      expect(html).not.toContain('同瓶拍卖方保管')
    }
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待归档')
  })
  it('旧净款档只补未赠回，新版缺字段/阶段/前置/owner组合拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.20.1'; delete old.earlyTraining.fatherGift
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion; expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, .5, 7, NaN, Infinity, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.fatherGift.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    let advanced = state
    for (const scene of fatherGiftScenes) {
      advanced = advanceEarlyFatherGift(advanced, teacher, scene.station, { step: scene.step, owner: advanced.earlyTraining.consignment.owner, operation: scene.operation }).state
      const bad = structuredClone(advanced); bad.earlyTraining.consignment.owner = advanced.earlyTraining.consignment.owner === 'auction' ? 'xiaoyan' : 'auction'
      expect(() => validateState(bad)).toThrow('重修')
      bad.earlyTraining.consignment.owner = advanced.earlyTraining.consignment.owner; bad.earlyTraining.settlement.stage = 6
      expect(() => validateState(bad)).toThrow('重修')
    }
  })
  it('错误/过期保管人/操作/步骤与完成后重复不能再次转瓶', () => {
    const state = eligible(), action = { step: 0, owner: 'auction' as const, operation: 'return' as const }
    for (const change of [{ step: -1 }, { step: 6 }, { step: NaN }, { owner: 'xiaozhan' as const }, { operation: 'keep' as const }])
      expect(advanceEarlyFatherGift(state, teacher, 'door', { ...action, ...change }).state).toBe(state)
    const bad = structuredClone(state); bad.earlyTraining.consignment.owner = 'xiaoyan'
    expect(advanceEarlyFatherGift(bad, teacher, 'door', { ...action, owner: 'xiaoyan' }).state).toBe(bad)
    let finished = state
    for (const scene of fatherGiftScenes) finished = advanceEarlyFatherGift(finished, teacher, scene.station, { step: scene.step, owner: finished.earlyTraining.consignment.owner, operation: scene.operation }).state
    expect(advanceEarlyFatherGift(finished, teacher, 'cabinet', { step: 6, owner: 'xiaoyan', operation: 'keep' }).state).toBe(finished)
  })
  it('store只写合法当前动作，runtime和主线保留', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = { step: 0, owner: 'auction' as const, operation: 'return' as const }
    expect(submitEarlyFatherGift(store, teacher, 'cabinet', action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyFatherGift(store, teacher, 'door', action)).toBe(true)
    expect(submitEarlyFatherGift(store, teacher, 'door', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.fatherGift.stage = 1
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
