import 'fake-indexeddb/auto'
import {beforeAll,describe,expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import type {GameState} from '../src/core/model'
import {validateState,parseSave,saveSlot,listSlots} from '../src/core/save'
import {firstSaleAlleyAt} from '../src/core/first-sale-alley-state'
import {advanceFirstSaleAlley,submitFirstSaleAlley,firstSaleAlleyBlock} from '../src/core/first-sale-alley'
import {saleAlleySnapshotKeys} from '../src/core/early-snapshots'
import {firstSaleAlleySaveSummary} from '../src/core/save-preview'
import {advanceEarlyConsignment} from '../src/core/early-consignment'
import {consignmentSupplies,type ConsignmentSupplyId} from '../src/core/early-training-state'
import {advanceEarlyAppraisal} from '../src/core/early-appraisal'
import {appraisalScenes} from '../src/content/early-appraisal'
import {advanceEarlyAuction} from '../src/core/early-auction'
import {auctionScenes} from '../src/content/early-auction'
import {advanceEarlySettlement} from '../src/core/early-settlement'
import {settlementScenes} from '../src/content/early-settlement'
import {GameStore} from '../src/core/store'
import FirstSaleAlley from '../src/ui/FirstSaleAlley'
import {firstSaleAlleyEligible,firstSaleAlleyInput,firstSaleAlleyStep,recoveryEntrance} from './helpers/first-sale-alley-replay'
import {firstSaleDepartureEligible,firstSaleDepartureStep} from './helpers/first-sale-departure-replay'
import {firstSalePurchaseStep} from './helpers/first-sale-purchase-replay'
describe('首次寄售C隐巷处理、同瓶藏稳与实际离巷赴拍完整流程',()=>{
  let base:GameState,states:GameState[]
  beforeAll(()=>{
    base=firstSaleAlleyEligible();states=[base]
    while(states.at(-1)!.earlyTraining.firstSaleAlley.stage<14)states.push(firstSaleAlleyStep(states.at(-1)!))
  })
  function expectedAt(original:GameState,state:GameState){
    const expected=structuredClone(original),t=state.earlyTraining.firstSaleAlley,sale=expected.earlyTraining.consignment
    expected.earlyTraining.firstSaleAlley=t
    if(t.stage>=5&&sale.stage===2){sale.supplies.youngPrimary=0;sale.supplies.youngAuxiliary=0;sale.supplies.woodCore=0;sale.stage=3}
    if(t.stage>=7&&sale.stage===3){sale.product='mixture';sale.stage=4}
    if(t.stage>=10&&sale.stage===4){sale.supplies.jadeBottle=0;sale.product='sealed';sale.owner='xiaoyan';sale.stage=5}
    return expected
  }
  it('十四动作十二路步各自恢复，四槽及上一档，全state只新历史与许可同批处理',async()=>{
    expect(states).toHaveLength(27);await saveSlot(0,base)
    for(let i=0;i<states.length;i++){
      const state=states[i],t=state.earlyTraining.firstSaleAlley
      expect(t).toEqual(firstSaleAlleyAt(t.stage,t.walk,t.stage?'current':'none',t.stage?2:0))
      expect(state).toEqual(expectedAt(base,state))
      for(const slot of [0,1,2,3])await saveSlot(slot,state)
      const slots=await listSlots()
      for(const slot of [0,1,2,3])expect(parseSave(slots.find(row=>row.slot===slot)!.text)).toEqual(state)
      if(i){expect(parseSave(slots.find(row=>row.slot===-1)!.text)).toEqual(states[i-1])
        const old=states[i-1].earlyTraining.firstSaleAlley
        expect(advanceFirstSaleAlley(state,recoveryEntrance,old,old.location,firstSaleAlleyInput(states[i-1])).state).toBe(state)}
    }
    const at=(stage:number)=>states.filter(s=>s.earlyTraining.firstSaleAlley.stage===stage).map(s=>[s.earlyTraining.firstSaleAlley.x,s.earlyTraining.firstSaleAlley.y])
    expect(at(1)).toEqual([[540,410],[500,410],[460,410],[420,410],[420,460],[420,510]])
    expect(at(11)).toEqual([[420,550],[420,500]])
    expect(at(12)).toEqual([[420,460],[460,460],[500,460],[540,460],[540,410],[540,360],[540,310]])
    const final=states.at(-1)!
    expect(final.earlyTraining.consignment).toEqual({...base.earlyTraining.consignment,stage:5,product:'sealed',owner:'xiaoyan',
      supplies:{youngPrimary:0,youngAuxiliary:0,woodCore:0,jadeBottle:0}})
    expect(renderToStaticMarkup(<FirstSaleAlley state={final} position={recoveryEntrance} onBack={()=>{}}/>)).toContain('隐巷完整流程已归档')
  })
  it('三十完整快照、整原账、演员/空间/路步/动作/派生/旧API越级全部拒绝',()=>{
    expect(saleAlleySnapshotKeys).toHaveLength(30)
    for(const state of states){
      const t=state.earlyTraining.firstSaleAlley,a=firstSaleAlleyInput(state)
      const reject=(input:typeof a,p=t,space=t.location as string,entrance=recoveryEntrance)=>
        expect(advanceFirstSaleAlley(state,entrance,p,space,input).state).toBe(state)
      for(const label of saleAlleySnapshotKeys){
        const key=`expected${label}` as keyof typeof a,snap=a[key] as Record<string,unknown>;reject({...a,[key]:undefined})
        for(const field of Object.keys(snap)){reject({...a,[key]:{...snap,[field]:'stale'}});const missing={...snap};delete missing[field];reject({...a,[key]:missing})}
      }
      reject({...a,expectedConsignment:undefined} as unknown as typeof a)
      for(const [key,value] of Object.entries(a.expectedConsignment)){
        if(typeof value==='object')for(const field of Object.keys(value)){
          reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:{...value,[field]:'stale'}}})
          const missing={...value} as Record<string,unknown>;delete missing[field];reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:missing}})
        }else reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:'stale'}})
      }
      for(const key of Object.keys(t))reject({...a,[key]:'wrong'})
      reject({...a,actor:a.actor==='teacher'?'yan':'teacher'});reject(a,{...t,x:t.x+1});reject(a,{...t,y:NaN});reject(a,t,'wrong');reject(a,t,t.location,{x:0,y:0})
      for(const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath','item','price'])reject({...a,[flag]:true} as typeof a)
      for(const operation of ['give-batch','process-batch','seal-bottle','archive-arrival','move-left','move-up','move-right','move-down'])
        if(operation!==a.operation)reject({...a,operation})
      if(t.stage<14){
        const sale=state.earlyTraining.consignment
        expect(advanceEarlyConsignment(state,recoveryEntrance,'alley',{stage:sale.stage,spent:50,operation:'refine'}).state).toBe(state)
        const scene=appraisalScenes[0]
        expect(advanceEarlyAppraisal(state,recoveryEntrance,scene.station,{step:scene.step,owner:sale.owner,operation:scene.operation}).state).toBe(state)
      }
    }
  })
  it('旧版补空、当前缺坏拒绝，来源/前置/旧账回退或提前处理/跨版本及防剧透严格',()=>{
    const old=JSON.parse(JSON.stringify(base));old.contentVersion='0.92.0';delete old.earlyTraining.firstSaleAlley
    expect(validateState(old)).toEqual(base);expect(()=>validateState({...old,contentVersion:'0.93.0'})).toThrow()
    for(const state of states.slice(1)){
      for(const key of Object.keys(state.earlyTraining.firstSaleAlley))for(const value of [undefined,null,'wrong',-1,1.5,999]){
        const bad=JSON.parse(JSON.stringify(state));bad.earlyTraining.firstSaleAlley[key]=value;expect(()=>validateState(bad),key).toThrow()
      }
      const earlier=structuredClone(state);earlier.contentVersion='0.92.0';expect(()=>validateState(earlier)).toThrow('不属于此版本')
      const source=structuredClone(state);source.earlyTraining.firstSaleAlley.record='recalled';expect(()=>validateState(source)).toThrow()
      const prerequisite=structuredClone(state);prerequisite.earlyTraining.firstSalePurchase.stage=13;expect(()=>validateState(prerequisite)).toThrow()
      if(state.earlyTraining.firstSaleAlley.stage>=5){const rollback=structuredClone(state);rollback.earlyTraining.consignment=structuredClone(base.earlyTraining.consignment);expect(()=>validateState(rollback)).toThrow()}
      if(state.earlyTraining.firstSaleAlley.stage<5){
        const advance=structuredClone(state);advance.earlyTraining.consignment=structuredClone(states.at(-1)!.earlyTraining.consignment);expect(()=>validateState(advance)).toThrow()
      }
    }
    const hidden=structuredClone(base);hidden.settings.spoiler='anime';hidden.settings.animeLimit=2
    expect(firstSaleAlleyBlock(hidden,recoveryEntrance)).toContain('剧透')
    expect(renderToStaticMarkup(<FirstSaleAlley state={hidden} position={recoveryEntrance} onBack={()=>{}}/>)).not.toContain('斑驳绿色')
    expect(firstSaleAlleySaveSummary(states.at(-1)!,hidden.settings)).toContain('封存')
  })
  function legacy(level:number){
    let state=firstSaleDepartureEligible()
    for(const item of Object.keys(consignmentSupplies) as ConsignmentSupplyId[]){
      const sale=state.earlyTraining.consignment
      state=advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',{stage:1,spent:sale.spent,operation:'buy',item,price:consignmentSupplies[item].price}).state
    }
    for(const [stage,operation] of [[2,'deliver'],[3,'refine'],[4,'bottle']] as const)
      if(level>stage)state=advanceEarlyConsignment(state,recoveryEntrance,'alley',{stage,spent:50,operation}).state
    if(level===6){
      for(const scene of appraisalScenes)state=validateState(advanceEarlyAppraisal(state,recoveryEntrance,scene.station,{step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      for(const scene of auctionScenes)state=validateState(advanceEarlyAuction(state,recoveryEntrance,scene.station,{step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      for(const scene of settlementScenes)state=validateState(advanceEarlySettlement(state,recoveryEntrance,scene.station,
        {step:scene.step,net:state.earlyTraining.settlement.net,vip:state.earlyTraining.settlement.vip,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      expect(state.earlyTraining.settlement.net).toBe(39200)
    }
    while(state.earlyTraining.firstSaleDeparture.stage<7)state=firstSaleDepartureStep(state)
    while(state.earlyTraining.firstSalePurchase.stage<14)state=firstSalePurchaseStep(state)
    return state
  }
  it.each([2,3,4,5,6])('旧寄售/最终结算%d全过程不重扣；已做不重做，明确处理或装瓶才补缺项',level=>{
    let state=legacy(level);const original=structuredClone(state)
    while(state.earlyTraining.firstSaleAlley.stage<14){
      state=firstSaleAlleyStep(state);expect(state).toEqual(expectedAt(original,state));expect(state.earlyTraining.firstSaleAlley.record).toBe('recalled')
    }
    expect(state.earlyTraining.consignment.stage).toBe(5)
  })
  it.each(['story','normal','hard'] as const)('%s全断点、单次并发持久化与runtime保持',async difficulty=>{
    let state=structuredClone(base);state.settings.difficulty=difficulty
    while(state.earlyTraining.firstSaleAlley.stage<14)state=firstSaleAlleyStep(state)
    let writes=0
    const store=new GameStore({load:async()=>structuredClone(base),write:async saved=>{writes++;expect(validateState(saved)).toEqual(saved)}})
    await store.initialize();const runtime=store.getSnapshot().runtime,t=base.earlyTraining.firstSaleAlley,a=firstSaleAlleyInput(base)
    expect(submitFirstSaleAlley(store,recoveryEntrance,t,t.location,a)).toBe(true);expect(submitFirstSaleAlley(store,recoveryEntrance,t,t.location,a)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true);expect(writes).toBe(1);expect(store.getSnapshot().runtime).toBe(runtime);expect(store.getSnapshot().state).toEqual(states[1])
  })
})
