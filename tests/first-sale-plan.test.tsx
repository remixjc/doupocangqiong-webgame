import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState, parseSave, saveSlot, listSlots } from '../src/core/save'
import { firstSalePlanAt } from '../src/core/first-sale-plan-state'
import { advanceFirstSalePlan, submitFirstSalePlan, firstSalePlanBlock } from '../src/core/first-sale-plan'
import { salePlanSnapshotKeys } from '../src/core/early-snapshots'
import { firstSalePlanSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import { advanceEarlyConsignment } from '../src/core/early-consignment'
import { consignmentSupplies, type ConsignmentSupplyId } from '../src/core/early-training-state'
import { GameStore } from '../src/core/store'
import FirstSalePlan from '../src/ui/FirstSalePlan'
import { advanceEarlyAppraisal } from '../src/core/early-appraisal'
import { appraisalScenes } from '../src/content/early-appraisal'
import { advanceEarlyAuction } from '../src/core/early-auction'
import { auctionScenes } from '../src/content/early-auction'
import { advanceEarlySettlement } from '../src/core/early-settlement'
import { settlementScenes } from '../src/content/early-settlement'
import { firstSalePlanEligible, firstSalePlanInput, firstSalePlanStep, recoveryEntrance } from './helpers/first-sale-plan-replay'

describe('床边时段、完整方案问答与明确同意', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstSalePlanEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstSalePlan.stage < 21) states.push(firstSalePlanStep(states.at(-1)!))
  })
  it('21动作与5路步逐点恢复四槽和上一档，仅明确同意单调接取90专款', async () => {
    expect(states).toHaveLength(27)
    await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const s = states[i], t = s.earlyTraining.firstSalePlan, expected = structuredClone(base)
      expect(t).toEqual(firstSalePlanAt(t.stage,t.walk,'current',0))
      expected.earlyTraining.firstSalePlan = t
      if (t.agreed) { expected.earlyTraining.consignment.stage = 1; expected.earlyTraining.consignment.funds = 90 }
      expect(s).toEqual(expected)
      for (const slot of [0,1,2,3]) await saveSlot(slot,s)
      const slots = await listSlots()
      for (const slot of [0,1,2,3]) expect(parseSave(slots.find(r => r.slot === slot)!.text)).toEqual(s)
      expect(parseSave(slots.find(r => r.slot === -1)!.text)).toEqual(states[i-1])
      const previous = states[i-1].earlyTraining.firstSalePlan
      expect(advanceFirstSalePlan(s,recoveryEntrance,previous,previous.location,firstSalePlanInput(states[i-1])).state).toBe(s)
    }
    expect(states.slice(1,7).map(s => [s.earlyTraining.firstSalePlan.x,s.earlyTraining.firstSalePlan.y]))
      .toEqual([[180,370],[220,370],[260,370],[300,370],[300,320],[300,270]])
    const seated = states.find(s => s.earlyTraining.firstSalePlan.stage === 3)!
    expect(seated.earlyTraining.firstSalePlan).toMatchObject({ seated:true,balance:0,teacher:'ring-voice' })
    const proposed = states.find(s => s.earlyTraining.firstSalePlan.stage === 19)!
    expect(proposed.earlyTraining.firstSalePlan).toMatchObject({ balance:900,proposed:true,agreed:false })
    expect(proposed.earlyTraining.consignment).toEqual(base.earlyTraining.consignment)
    expect(states.at(-1)!.earlyTraining.firstSalePlan).toMatchObject({ archived:true,prediction:'conditional-seven',explanation:5 })
    expect(renderToStaticMarkup(<FirstSalePlan state={states.at(-1)!} position={recoveryEntrance} onBack={() => {}} />))
      .toContain('床边方案全过程已归档')
  })
  it('27完整快照、整寄售账、人物/空间/位置/动作/来源和所有派生字段严格拒绝', () => {
    expect(salePlanSnapshotKeys).toHaveLength(27)
    for (const state of states) {
      const t = state.earlyTraining.firstSalePlan, action = firstSalePlanInput(state)
      const reject = (input: typeof action, p = t, space = t.location as string, entrance = recoveryEntrance) =>
        expect(advanceFirstSalePlan(state,entrance,p,space,input).state).toBe(state)
      for (const label of salePlanSnapshotKeys) {
        const key = `expected${label}` as keyof typeof action, snapshot = action[key] as Record<string,unknown>
        reject({ ...action,[key]:undefined })
        for (const field of Object.keys(snapshot)) {
          reject({ ...action,[key]:{ ...snapshot,[field]:'stale' } })
          const missing = { ...snapshot }; delete missing[field]
          reject({ ...action,[key]:missing })
        }
      }
      reject({ ...action,expectedConsignment:undefined } as unknown as typeof action)
      for (const [key,value] of Object.entries(action.expectedConsignment)) {
        if (typeof value === 'object') {
          reject({ ...action,expectedConsignment:{ ...action.expectedConsignment,[key]:undefined } })
          for (const field of Object.keys(value)) {
            reject({ ...action,expectedConsignment:{ ...action.expectedConsignment,[key]:{ ...value,[field]:'stale' } } })
            const missing = { ...value } as Record<string,unknown>; delete missing[field]
            reject({ ...action,expectedConsignment:{ ...action.expectedConsignment,[key]:missing } })
          }
        } else reject({ ...action,expectedConsignment:{ ...action.expectedConsignment,[key]:'stale' } })
      }
      for (const key of Object.keys(t)) reject({ ...action,[key]:'wrong' })
      reject({ ...action,actor:action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action,{ ...t,x:t.x+1 }); reject(action,{ ...t,y:NaN }); reject(action,t,'alley')
      reject(action,t,t.location,{ x:150,y:310 })
      for (const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath'])
        reject({ ...action,[flag]:true } as typeof action)
      for (const operation of ['move-left','move-right','move-up','move-down','buy','refine','archive','agree','borrow','wait'])
        if (operation !== action.operation) reject({ ...action,operation })
      if (t.stage > 0 && t.stage < 21) {
        const c = state.earlyTraining.consignment
        const legacy = c.stage ? { stage:c.stage,spent:c.spent,operation:'buy' as const,item:'youngPrimary' as const,price:10 }
          : { stage:0,spent:0,operation:'plan' as const }
        expect(advanceEarlyConsignment(state,recoveryEntrance,c.stage?'pharmacy':'plan',legacy).state).toBe(state)
      }
    }
  })
  it('旧版只补空；新版缺字段、旧版带新记录、未醒后、伪来源和桥接倒退拒绝；防剧透封存', () => {
    const old = JSON.parse(JSON.stringify(base))
    old.contentVersion = '0.89.1'; delete old.earlyTraining.firstSalePlan
    expect(validateState(old)).toEqual(base)
    expect(() => validateState({ ...old,contentVersion:'0.90.0' })).toThrow()
    for (const state of states.slice(1)) {
      for (const key of Object.keys(state.earlyTraining.firstSalePlan)) {
        const bad = JSON.parse(JSON.stringify(state)); delete bad.earlyTraining.firstSalePlan[key]
        expect(() => validateState(bad)).toThrow()
      }
      const earlier = structuredClone(state); earlier.contentVersion = '0.89.1'
      expect(() => validateState(earlier)).toThrow('不属于此版本')
      const wrong = structuredClone(state); wrong.earlyTraining.firstSalePlan.record = 'recalled'
      expect(() => validateState(wrong)).toThrow()
      const premature = structuredClone(state); premature.earlyTraining.firstAwakening.archived = false
      expect(() => validateState(premature)).toThrow()
      if (state.earlyTraining.firstSalePlan.agreed) {
        const rollback = structuredClone(state); rollback.earlyTraining.consignment = base.earlyTraining.consignment
        expect(() => validateState(rollback)).toThrow()
      }
    }
    const hidden = structuredClone(base); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 2
    expect(firstSalePlanBlock(hidden,recoveryEntrance)).toContain('剧透')
    expect(renderToStaticMarkup(<FirstSalePlan state={hidden} position={recoveryEntrance} onBack={() => {}} />)).not.toContain('900')
    expect(firstSalePlanSaveSummary(states.at(-1)!,hidden.settings)).toContain('封存')
    expect(savePreviewSummary(states.at(-1)!,hidden.settings)).not.toContain('床边寄售方案')
  })
  it.each([1,2,3,4,5])('合法旧寄售%d全账回顾保持，不重发/回退或签已有奖励', prior => {
    let state = structuredClone(base)
    state = advanceEarlyConsignment(state,recoveryEntrance,'plan',{stage:0,spent:0,operation:'plan'}).state
    if (prior >= 2) for (const item of Object.keys(consignmentSupplies) as ConsignmentSupplyId[])
      state = advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',{stage:1,spent:state.earlyTraining.consignment.spent,
        operation:'buy',item,price:consignmentSupplies[item].price}).state
    for (const [stage,operation] of [[2,'deliver'],[3,'refine'],[4,'bottle']] as const)
      if (prior > stage) state = advanceEarlyConsignment(state,recoveryEntrance,'alley',
        {stage,spent:50,operation}).state
    state = validateState(state); expect(state.earlyTraining.consignment.stage).toBe(prior)
    const original = structuredClone(state)
    while (state.earlyTraining.firstSalePlan.stage < 21) {
      state = firstSalePlanStep(state)
      expect(state.earlyTraining.firstSalePlan).toMatchObject({ record:'recalled',priorStage:prior })
      const expected = structuredClone(original); expected.earlyTraining.firstSalePlan = state.earlyTraining.firstSalePlan
      expect(state).toEqual(expected)
    }
  })
  it('已发生旧醒后回顾沿来源保持，不因新桥接变更current来源', () => {
    const old = structuredClone(base); old.earlyTraining.firstAwakening.record = 'recalled'
    old.earlyTraining.firstAwakening.priorStage = 7
    let state = validateState(old)
    while (state.earlyTraining.firstSalePlan.stage < 21) state = firstSalePlanStep(state)
    expect(state.earlyTraining.firstSalePlan).toMatchObject({ record:'recalled',priorStage:0 })
  })
  it('实际旧API完成鉴定/拍卖/39200结算后，完整新问答只回顾而保持全部凭据与款项', () => {
    let state = advanceEarlyConsignment(base,recoveryEntrance,'plan',{stage:0,spent:0,operation:'plan'}).state
    for (const item of Object.keys(consignmentSupplies) as ConsignmentSupplyId[])
      state = advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',{stage:1,spent:state.earlyTraining.consignment.spent,
        operation:'buy',item,price:consignmentSupplies[item].price}).state
    for (const [stage,operation] of [[2,'deliver'],[3,'refine'],[4,'bottle']] as const)
      state = advanceEarlyConsignment(state,recoveryEntrance,'alley',{stage,spent:50,operation}).state
    for (const scene of appraisalScenes) {
      const result = advanceEarlyAppraisal(state,recoveryEntrance,scene.station,
        {step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation})
      expect(result.ok,result.message).toBe(true); state = validateState(result.state)
    }
    for (const scene of auctionScenes) {
      const result = advanceEarlyAuction(state,recoveryEntrance,scene.station,
        {step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation})
      expect(result.ok,result.message).toBe(true); state = validateState(result.state)
    }
    for (const scene of settlementScenes) {
      const t = state.earlyTraining.settlement
      const result = advanceEarlySettlement(state,recoveryEntrance,scene.station,
        {step:scene.step,net:t.net,vip:t.vip,owner:state.earlyTraining.consignment.owner,operation:scene.operation})
      expect(result.ok,result.message).toBe(true); state = validateState(result.state)
    }
    expect(state.earlyTraining.settlement.net).toBe(39200)
    const original = structuredClone(state)
    while (state.earlyTraining.firstSalePlan.stage < 21) {
      state = firstSalePlanStep(state)
      const expected = structuredClone(original); expected.earlyTraining.firstSalePlan = state.earlyTraining.firstSalePlan
      expect(state).toEqual(expected)
      expect(state.earlyTraining.firstSalePlan).toMatchObject({record:'recalled',priorStage:5})
    }
  })
  it.each(['story','normal','hard'] as const)('%s完整前期接续26操作、一次并发提交和runtime保持', async difficulty => {
    let state = structuredClone(base); state.settings.difficulty = difficulty
    while (state.earlyTraining.firstSalePlan.stage < 21) state = firstSalePlanStep(state)
    expect(state.earlyTraining.firstSalePlan.archived).toBe(true)
    let writes = 0
    const store = new GameStore({load:async () => structuredClone(base),write:async saved => { writes++; expect(validateState(saved)).toEqual(saved) }})
    await store.initialize()
    const runtime = store.getSnapshot().runtime, t = base.earlyTraining.firstSalePlan, action = firstSalePlanInput(base)
    expect(submitFirstSalePlan(store,recoveryEntrance,t,t.location,action)).toBe(true)
    expect(submitFirstSalePlan(store,recoveryEntrance,t,t.location,action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true)
    expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    expect(store.getSnapshot().state).toEqual(states[1])
  })
})
