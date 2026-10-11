import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlySettlement, earlySettlementBlock, submitEarlySettlement } from '../src/core/early-settlement'
import { settlementScenes } from '../src/content/early-settlement'
import { earlySettlementSaveSummary, earlyAuctionSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlySettlement from '../src/ui/EarlySettlement'
import EarlyConsignment from '../src/ui/EarlyConsignment'
import EarlyAuction from '../src/ui/EarlyAuction'
import EarlyAppraisal from '../src/ui/EarlyAppraisal'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true, true, true, true, true, true)
}
function actionAt(state: ReturnType<typeof eligible>, step: number) {
  return { step, ...state.earlyTraining.settlement, owner: state.earlyTraining.consignment.owner, operation: settlementScenes[step].operation }
}
describe('贵宾凭据先于2%结算，独立储款只收一次', () => {
  it('入场/拍卖/位置/范围保护，首通章节不能代签收款', () => {
    const state = eligible(), action = actionAt(state, 0)
    expect(earlySettlementBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlySettlement(state, position, 'entrance', action).state).toBe(state)
    const waiting = structuredClone(state); waiting.earlyTraining.auction.stage = 6
    expect(earlySettlementBlock(waiting, teacher)).toContain('下一拍品介绍')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlySettlement(state, teacher, 'entrance', action).state).toBe(state)
    expect(earlySettlementSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlySettlement state={state} position={teacher} onBack={() => {}} />)).not.toContain('39200')
  })
  it('每步断点/自动手动备份；领贵宾卡、核账、收款三步分开且不增主线钱', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of settlementScenes) {
      const action = actionAt(state, scene.step)
      expect(advanceEarlySettlement(state, teacher, scene.station === 'meeting' ? 'desk' : 'meeting', action).state).toBe(state)
      const result = advanceEarlySettlement(state, teacher, scene.station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(advanceEarlySettlement(state, teacher, scene.station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlySettlementSaveSummary(state, state.settings))
      }
      const comparison = structuredClone(state); comparison.earlyTraining.settlement = before.earlyTraining.settlement
      expect(comparison).toEqual(before)
      if (scene.step === 3) {
        expect(state.earlyTraining.settlement).toEqual({ stage: 4, vip: true, net: 0 })
        expect(earlySettlementSaveSummary(state, state.settings)).toContain('尚未收款')
      }
      if (scene.step === 4) {
        expect(state.earlyTraining.settlement.net).toBe(0)
        const html = renderToStaticMarkup(<EarlySettlement state={state} position={teacher} onBack={() => {}} />)
        expect(html).toContain('手续费 800'); expect(html).toContain('储款卡还未接收')
      }
      if (scene.step === 5) expect(state.earlyTraining.settlement).toEqual({ stage: 6, vip: true, net: 39200 })
    }
    expect(state.earlyTraining.consignment.owner).toBe('auction')
    expect(state.earlyTraining.consignment.funds - state.earlyTraining.consignment.spent).toBe(40)
    expect(earlyAuctionSaveSummary(state, state.settings)).toContain('净款已收')
    expect(renderToStaticMarkup(<EarlyConsignment state={state} position={teacher} onBack={() => {}} />)).toContain('寄售净款与贵宾卡已在独立手续中记录')
    expect(renderToStaticMarkup(<EarlyAuction state={state} position={teacher} onBack={() => {}} />)).toContain('净款已收')
    expect(renderToStaticMarkup(<EarlyAppraisal state={state} position={teacher} onBack={() => {}} />)).toContain('寄售净款已在独立收款记录中保存')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('待离场')
  })
  it('过期净款/贵宾卡/owner/操作快照与收款后重复均无增款', () => {
    let state = eligible()
    for (const scene of settlementScenes.slice(0, 5)) state = advanceEarlySettlement(state, teacher, scene.station, actionAt(state, scene.step)).state
    const action = actionAt(state, 5)
    for (const changed of [{ step: 4 }, { step: NaN }, { net: 39200 }, { vip: false }, { owner: 'xiaoyan' as const }, { operation: 'vip' as const }])
      expect(advanceEarlySettlement(state, teacher, 'desk', { ...action, ...changed }).state).toBe(state)
    const paid = advanceEarlySettlement(state, teacher, 'desk', action).state
    expect(paid.earlyTraining.settlement.net).toBe(39200)
    expect(advanceEarlySettlement(paid, teacher, 'desk', action).state).toBe(paid)
    const bad = structuredClone(state); bad.earlyTraining.consignment.owner = 'xiaoyan'
    expect(advanceEarlySettlement(bad, teacher, 'desk', action).state).toBe(bad)
  })
  it('旧拍卖档未收款迁移，新版缺字段/金额/凭据/阶段/前置组合拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.20.0'; delete old.earlyTraining.settlement
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion; expect(() => validateState(old)).toThrow('重修')
    for (const change of [{ stage: -1 }, { stage: .5 }, { stage: 8 }, { net: 39200 }, { vip: true }]) {
      const bad = structuredClone(state); Object.assign(bad.earlyTraining.settlement, change)
      expect(() => validateState(bad)).toThrow('重修')
    }
    let advanced = state
    for (const scene of settlementScenes) {
      advanced = advanceEarlySettlement(advanced, teacher, scene.station, actionAt(advanced, scene.step)).state
      const bad = structuredClone(advanced); bad.earlyTraining.settlement.net = 40000
      expect(() => validateState(bad)).toThrow('重修')
      bad.earlyTraining.settlement = advanced.earlyTraining.settlement; bad.earlyTraining.auction.stage = 6
      expect(() => validateState(bad)).toThrow('重修')
    }
  })
  it('store合法更新和原runtime保存，失败/重复没有写入', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = actionAt(before, 0)
    expect(submitEarlySettlement(store, teacher, 'desk', action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlySettlement(store, teacher, 'entrance', action)).toBe(true)
    expect(submitEarlySettlement(store, teacher, 'entrance', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.settlement.stage = 1
    expect(store.getSnapshot().state).toEqual(before); expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
