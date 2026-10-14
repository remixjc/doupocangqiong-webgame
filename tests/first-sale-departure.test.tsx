import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState, parseSave, saveSlot, listSlots } from '../src/core/save'
import { firstSaleDepartureAt, saleReceiptsMask } from '../src/core/first-sale-departure-state'
import { advanceFirstSaleDeparture, submitFirstSaleDeparture, firstSaleDepartureBlock } from '../src/core/first-sale-departure'
import { saleDepartureSnapshotKeys } from '../src/core/early-snapshots'
import { firstSaleDepartureSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { advanceEarlyConsignment } from '../src/core/early-consignment'
import { consignmentSupplies, type ConsignmentSupplyId } from '../src/core/early-training-state'
import { advanceEarlyAppraisal } from '../src/core/early-appraisal'
import { appraisalScenes } from '../src/content/early-appraisal'
import { advanceEarlyAuction } from '../src/core/early-auction'
import { auctionScenes } from '../src/content/early-auction'
import { advanceEarlySettlement } from '../src/core/early-settlement'
import { settlementScenes } from '../src/content/early-settlement'
import { GameStore } from '../src/core/store'
import FirstSaleDeparture from '../src/ui/FirstSaleDeparture'
import { firstSaleDepartureEligible, firstSaleDepartureInput, firstSaleDepartureStep, recoveryEntrance } from './helpers/first-sale-departure-replay'

describe('寄售B1拿物、实际到门、正常离房', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstSaleDepartureEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstSaleDeparture.stage < 7) states.push(firstSaleDepartureStep(states.at(-1)!))
  })
  it('七动作与五路步逐点保存四槽和上一档，只改变独立离房历史', async () => {
    expect(states).toHaveLength(13)
    await saveSlot(0, base)
    for (let i = 0; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstSaleDeparture, expected = structuredClone(base)
      expected.earlyTraining.firstSaleDeparture = t
      expect(state).toEqual(expected)
      expect(t).toEqual(firstSaleDepartureAt(t.stage,t.walk,t.stage ? 'current' : 'none',t.stage ? 1 : 0,0))
      for (const slot of [0,1,2,3]) await saveSlot(slot,state)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(row => row.slot === slot)!.text)).toEqual(state)
      if (i) {
        expect(parseSave(slots.find(row => row.slot === -1)!.text)).toEqual(states[i-1])
        const previous = states[i-1].earlyTraining.firstSaleDeparture
        expect(advanceFirstSaleDeparture(state,recoveryEntrance,previous,previous.location,firstSaleDepartureInput(states[i-1])).state).toBe(state)
      }
    }
    expect(states.filter(s => s.earlyTraining.firstSaleDeparture.stage === 3).map(s => {
      const t = s.earlyTraining.firstSaleDeparture; return [t.x,t.y]
    })).toEqual([[300,270],[340,270],[380,270],[380,320],[380,370],[380,420]])
    expect(states.at(-3)!.earlyTraining.firstSaleDeparture).toMatchObject({stage:5,location:'room',doorOpen:true})
    expect(states.at(-2)!.earlyTraining.firstSaleDeparture).toMatchObject({stage:6,location:'outside',x:380,y:460,archived:false})
    expect(states.at(-1)!.earlyTraining.consignment).toMatchObject({stage:1,spent:0,funds:90,product:'none'})
    expect(renderToStaticMarkup(<FirstSaleDeparture state={states.at(-1)!} position={recoveryEntrance} onBack={() => {}} />))
      .toContain('拿物与正常离房已归档')
  })
  it('28全前置快照、整寄售账、人物、空间、位置、操作、派生字段和并发拒绝', () => {
    expect(saleDepartureSnapshotKeys).toHaveLength(28)
    for (const state of states) {
      const t = state.earlyTraining.firstSaleDeparture, action = firstSaleDepartureInput(state)
      const reject = (input: typeof action, p = t, space = t.location as string, entrance = recoveryEntrance) =>
        expect(advanceFirstSaleDeparture(state,entrance,p,space,input).state).toBe(state)
      for (const label of saleDepartureSnapshotKeys) {
        const key = `expected${label}` as keyof typeof action, snapshot = action[key] as Record<string,unknown>
        reject({...action,[key]:undefined})
        for (const field of Object.keys(snapshot)) {
          reject({...action,[key]:{...snapshot,[field]:'stale'}})
          const missing = {...snapshot}; delete missing[field]
          reject({...action,[key]:missing})
        }
      }
      reject({...action,expectedConsignment:undefined} as unknown as typeof action)
      for (const [key,value] of Object.entries(action.expectedConsignment)) {
        if (typeof value === 'object') {
          reject({...action,expectedConsignment:{...action.expectedConsignment,[key]:undefined}})
          for (const field of Object.keys(value)) {
            reject({...action,expectedConsignment:{...action.expectedConsignment,[key]:{...value,[field]:'stale'}}})
            const missing = {...value} as Record<string,unknown>; delete missing[field]
            reject({...action,expectedConsignment:{...action.expectedConsignment,[key]:missing}})
          }
        } else reject({...action,expectedConsignment:{...action.expectedConsignment,[key]:'stale'}})
      }
      for (const key of Object.keys(t)) reject({...action,[key]:'wrong'})
      reject({...action,actor:'teacher'}); reject(action,{...t,x:t.x+1}); reject(action,{...t,y:NaN})
      reject(action,t,t.location === 'room' ? 'outside' : 'room'); reject(action,t,t.location,{x:150,y:310})
      for (const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath'])
        reject({...action,[flag]:true} as typeof action)
      for (const operation of ['move-left','move-right','move-up','move-down','stand','keep-ring','take-purse','reach-door','open-door','leave-room','archive-exit','buy','refine'])
        if (operation !== action.operation) reject({...action,operation})
      if (t.stage) expect(advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',
        {stage:1,spent:0,operation:'buy',item:'youngPrimary',price:10}).state).toBe(state)
    }
  })
  it('旧档只补空；当前缺坏字段、旧版本新历史、伪来源、前置回退和所有派生伪造拒绝', () => {
    const old = JSON.parse(JSON.stringify(base)); old.contentVersion = '0.90.3'; delete old.earlyTraining.firstSaleDeparture
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({...old,contentVersion:'0.91.0'})).toThrow()
    for (const state of states.slice(1)) {
      for (const key of Object.keys(state.earlyTraining.firstSaleDeparture)) {
        for (const value of [undefined,null,'invalid',-1,1.5,999]) {
          const bad = JSON.parse(JSON.stringify(state)); bad.earlyTraining.firstSaleDeparture[key] = value
          expect(() => validateState(bad),key).toThrow()
        }
      }
      const earlier = structuredClone(state); earlier.contentVersion = '0.90.3'
      expect(() => validateState(earlier)).toThrow('不属于此版本')
      const wrong = structuredClone(state); wrong.earlyTraining.firstSaleDeparture.record = 'recalled'
      expect(() => validateState(wrong)).toThrow()
      const prerequisite = structuredClone(state); prerequisite.earlyTraining.firstSalePlan.stage = 20
      expect(() => validateState(prerequisite)).toThrow()
      const rollback = structuredClone(state); rollback.earlyTraining.consignment.stage = 0
      expect(() => validateState(rollback)).toThrow()
    }
    const hidden = structuredClone(base); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 2
    expect(firstSaleDepartureBlock(hidden,recoveryEntrance)).toContain('剧透')
    expect(renderToStaticMarkup(<FirstSaleDeparture state={hidden} position={recoveryEntrance} onBack={() => {}} />)).not.toContain('90')
    expect(firstSaleDepartureSaveSummary(states.at(-1)!,hidden.settings)).toContain('封存')
    expect(savePreviewSummary(states.at(-1)!,hidden.settings)).not.toContain('寄售拿物离房')
  })
  it.each([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15])('既有收据位图%d不重扣、不补发，来源固定', mask => {
    let state = structuredClone(base)
    const items = Object.keys(consignmentSupplies) as ConsignmentSupplyId[]
    for (let i=0;i<items.length;i++) if (mask & 1<<i) {
      const item=items[i], c=state.earlyTraining.consignment
      state=advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',{stage:1,spent:c.spent,operation:'buy',item,price:consignmentSupplies[item].price}).state
    }
    const original=validateState(state)
    expect(saleReceiptsMask(original.earlyTraining.consignment.receipts)).toBe(mask)
    while (state.earlyTraining.firstSaleDeparture.stage < 7) {
      state=firstSaleDepartureStep(state)
      const expected=structuredClone(original); expected.earlyTraining.firstSaleDeparture=state.earlyTraining.firstSaleDeparture
      expect(state).toEqual(expected)
      expect(state.earlyTraining.firstSaleDeparture).toMatchObject({record:mask ? 'recalled' : 'current',priorReceipts:mask,priorStage:mask===15?2:1})
      if (mask) {
        const rollback=structuredClone(state); rollback.earlyTraining.consignment=structuredClone(base.earlyTraining.consignment)
        expect(() => validateState(rollback)).toThrow()
      }
    }
  })
  it('仅有新桥接stage1不误判回顾；A自身回顾的来源继续固定', () => {
    const recalled=structuredClone(base)
    recalled.earlyTraining.firstAwakening.priorStage=7; recalled.earlyTraining.firstAwakening.record='recalled'
    recalled.earlyTraining.firstSalePlan.record='recalled'
    let state=validateState(recalled)
    while (state.earlyTraining.firstSaleDeparture.stage<7) {
      state=firstSaleDepartureStep(state)
      expect(state.earlyTraining.firstSaleDeparture).toMatchObject({record:'recalled',priorStage:1,priorReceipts:0})
      const expected=structuredClone(recalled); expected.earlyTraining.firstSaleDeparture=state.earlyTraining.firstSaleDeparture
      expect(state).toEqual(expected)
    }
  })
  it.each([2,3,4,5,6])('更高旧寄售/鉴定/拍卖/39200结算场景%d完整保持', level => {
    let state=structuredClone(base)
    for (const item of Object.keys(consignmentSupplies) as ConsignmentSupplyId[]) {
      const c=state.earlyTraining.consignment
      state=advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',{stage:1,spent:c.spent,operation:'buy',item,price:consignmentSupplies[item].price}).state
    }
    for (const [stage,operation] of [[2,'deliver'],[3,'refine'],[4,'bottle']] as const)
      if (level > stage) state=advanceEarlyConsignment(state,recoveryEntrance,'alley',{stage,spent:50,operation}).state
    if (level===6) {
      for (const scene of appraisalScenes) state=validateState(advanceEarlyAppraisal(state,recoveryEntrance,scene.station,
        {step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      for (const scene of auctionScenes) state=validateState(advanceEarlyAuction(state,recoveryEntrance,scene.station,
        {step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      for (const scene of settlementScenes) state=validateState(advanceEarlySettlement(state,recoveryEntrance,scene.station,
        {step:scene.step,net:state.earlyTraining.settlement.net,vip:state.earlyTraining.settlement.vip,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      expect(state.earlyTraining.settlement.net).toBe(39200)
    }
    const original=validateState(state)
    while (state.earlyTraining.firstSaleDeparture.stage<7) {
      state=firstSaleDepartureStep(state)
      const expected=structuredClone(original); expected.earlyTraining.firstSaleDeparture=state.earlyTraining.firstSaleDeparture
      expect(state).toEqual(expected)
      expect(state.earlyTraining.firstSaleDeparture.record).toBe('recalled')
    }
  })
  it.each(['story','normal','hard'] as const)('%s全部断点可达且并发只写一次、runtime保持', async difficulty => {
    let state=structuredClone(base); state.settings.difficulty=difficulty
    while (state.earlyTraining.firstSaleDeparture.stage<7) state=firstSaleDepartureStep(state)
    let writes=0
    const store=new GameStore({load:async()=>structuredClone(base),write:async saved=>{writes++;expect(validateState(saved)).toEqual(saved)}})
    await store.initialize()
    const runtime=store.getSnapshot().runtime,t=base.earlyTraining.firstSaleDeparture,action=firstSaleDepartureInput(base)
    expect(submitFirstSaleDeparture(store,recoveryEntrance,t,t.location,action)).toBe(true)
    expect(submitFirstSaleDeparture(store,recoveryEntrance,t,t.location,action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime); expect(store.getSnapshot().state).toEqual(states[1])
  })
})
