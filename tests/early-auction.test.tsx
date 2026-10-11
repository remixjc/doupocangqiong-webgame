import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState, blankProgress } from '../src/core/model'
import { validateState, parseSave, serializeSave, saveSlot, listSlots } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { advanceEarlyAuction, earlyAuctionBlock, submitEarlyAuction } from '../src/core/early-auction'
import { auctionScenes, auctionBidAt } from '../src/content/early-auction'
import { earlyAuctionSaveSummary, saveRecordSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import EarlyAuction from '../src/ui/EarlyAuction'
import EarlyAppraisal from '../src/ui/EarlyAppraisal'

const teacher = { x: 575, y: 310 }
function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return replayEarlyTraining(validateState(old), false, undefined, false, false, true, true, true, true, true, true)
}
describe('雅妃主持、寄售旁观与萧战成交', () => {
  it('入场/地点/范围保护，老章节完成不代签拍卖', () => {
    const state = eligible(), scene = auctionScenes[0]
    const action = { step: 0, owner: 'auction' as const, operation: scene.operation }
    expect(earlyAuctionBlock(state, teacher)).toBe('')
    for (const position of [{ x: NaN, y: 310 }, { x: 150, y: 310 }])
      expect(advanceEarlyAuction(state, position, 'entrance', action).state).toBe(state)
    const waiting = structuredClone(state); waiting.earlyTraining.appraisal.stage = 7
    expect(earlyAuctionBlock(waiting, teacher)).toContain('进入第一拍卖室')
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 2
    expect(advanceEarlyAuction(state, teacher, 'entrance', action).state).toBe(state)
    expect(earlyAuctionSaveSummary(state, state.settings)).toContain('封存')
    expect(renderToStaticMarkup(<EarlyAuction state={state} position={teacher} onBack={() => {}} />)).not.toContain('雅妃')
  })
  it('七步存档与竞价/落槌分离，同瓶和全部资金/技能始终不复制', async () => {
    let state = eligible()
    const before = structuredClone(state)
    for (const scene of auctionScenes) {
      const action = { step: scene.step, owner: 'auction' as const, operation: scene.operation }
      expect(advanceEarlyAuction(state, teacher, scene.station === 'seat' ? 'stage' : 'seat', action).state).toBe(state)
      const result = advanceEarlyAuction(state, teacher, scene.station, action)
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      expect(advanceEarlyAuction(state, teacher, scene.station, action).state).toBe(state)
      await saveSlot(0, state); await saveSlot(3, state)
      for (const record of (await listSlots()).filter(entry => [0, 3].includes(entry.slot))) {
        expect(parseSave(record.text)).toEqual(state)
        expect(saveRecordSummary(record, state.settings)).toContain(earlyAuctionSaveSummary(state, state.settings))
      }
      expect(state.earlyTraining.consignment).toEqual(before.earlyTraining.consignment)
      const comparison = structuredClone(state); comparison.earlyTraining.auction.stage = 0
      expect(comparison).toEqual(before)
      if (state.earlyTraining.auction.stage === 5) {
        expect(auctionBidAt(5)).toBe(40000)
        expect(earlyAuctionSaveSummary(state, state.settings)).toContain('待落槌')
        const html = renderToStaticMarkup(<EarlyAuction state={state} position={teacher} onBack={() => {}} />)
        expect(html).toContain('报价40000 · 尚未成交'); expect(html).not.toContain('买方萧战')
      }
      if (state.earlyTraining.auction.stage === 6) {
        expect(earlyAuctionSaveSummary(state, state.settings)).toContain('成交归萧战')
        expect(renderToStaticMarkup(<EarlyAppraisal state={state} position={teacher} onBack={() => {}} />)).toContain('雅妃已敲槌')
      }
    }
    expect(auctionBidAt(0)).toBe(0); expect(auctionBidAt(3)).toBe(23000); expect(auctionBidAt(4)).toBe(31000)
    expect(state.earlyTraining.appraisal.card).toBe('black-entry')
    expect(state.earlyTraining.consignment.owner).toBe('auction')
    expect(saveRecordSummary((await listSlots()).find(entry => entry.slot === -1)!, state.settings)).toContain('成交归萧战')
  })
  it('过期/非法步骤/操作/保管快照与已完成重做无效', () => {
    const state = eligible(), action = { step: 0, owner: 'auction' as const, operation: 'seat' as const }
    for (const step of [-1, NaN, .5, Infinity, 7, 1])
      expect(advanceEarlyAuction(state, teacher, 'entrance', { ...action, step }).state).toBe(state)
    expect(advanceEarlyAuction(state, teacher, 'entrance', { ...action, operation: 'bad' as 'seat' }).state).toBe(state)
    expect(advanceEarlyAuction(state, teacher, 'entrance', { ...action, owner: 'xiaoyan' }).state).toBe(state)
    const bad = structuredClone(state); bad.earlyTraining.consignment.owner = 'xiaoyan'
    expect(advanceEarlyAuction(bad, teacher, 'entrance', action).state).toBe(bad)
    state.earlyTraining.auction.stage = 7
    expect(advanceEarlyAuction(state, teacher, 'stage', { ...action, step: 7 }).state).toBe(state)
  })
  it('旧入场只补未参与，新版缺字段/非法阶段/前置/保管异常拒绝', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.19.2'; delete old.earlyTraining.auction
    expect(validateState(old)).toEqual(state)
    old.contentVersion = initialState().contentVersion
    expect(() => validateState(old)).toThrow('重修')
    for (const stage of [-1, .5, 8, NaN, Infinity, '1']) {
      const bad = structuredClone(state); bad.earlyTraining.auction.stage = stage as number
      expect(() => validateState(bad)).toThrow('重修')
    }
    const bad = structuredClone(state); bad.earlyTraining.auction.stage = 1
    bad.earlyTraining.appraisal.stage = 7
    expect(() => validateState(bad)).toThrow('重修')
    bad.earlyTraining.appraisal.stage = 8; bad.earlyTraining.consignment.owner = 'xiaoyan'
    expect(() => validateState(bad)).toThrow('重修')
  })
  it('store只写有效观察，重复和错误无写入，原runtime保留', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => eligible(), write: async () => { writes++ } })
    await store.initialize()
    const before = structuredClone(store.getSnapshot().state), runtime = store.getSnapshot().runtime
    const action = { step: 0, owner: 'auction' as const, operation: 'seat' as const }
    expect(submitEarlyAuction(store, teacher, 'stage', action)).toBe(false); expect(writes).toBe(0)
    expect(submitEarlyAuction(store, teacher, 'entrance', action)).toBe(true)
    expect(submitEarlyAuction(store, teacher, 'entrance', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    before.earlyTraining.auction.stage = 1
    expect(store.getSnapshot().state).toEqual(before)
    expect(store.getSnapshot().runtime).toBe(runtime); expect(writes).toBe(1)
  })
})
