import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { validateState,parseSave,saveSlot,listSlots } from '../src/core/save'
import { firstSalePurchaseAt,salePurchaseMask } from '../src/core/first-sale-purchase-state'
import { saleReceiptsMask } from '../src/core/first-sale-departure-state'
import { advanceFirstSalePurchase,submitFirstSalePurchase,firstSalePurchaseBlock } from '../src/core/first-sale-purchase'
import { salePurchaseSnapshotKeys } from '../src/core/early-snapshots'
import { firstSalePurchaseSaveSummary,savePreviewSummary } from '../src/core/save-preview'
import { advanceEarlyConsignment } from '../src/core/early-consignment'
import { consignmentSupplies,type ConsignmentSupplyId } from '../src/core/early-training-state'
import { advanceEarlyAppraisal } from '../src/core/early-appraisal'
import { appraisalScenes } from '../src/content/early-appraisal'
import { advanceEarlyAuction } from '../src/core/early-auction'
import { auctionScenes } from '../src/content/early-auction'
import { advanceEarlySettlement } from '../src/core/early-settlement'
import { settlementScenes } from '../src/content/early-settlement'
import { GameStore } from '../src/core/store'
import FirstSalePurchase from '../src/ui/FirstSalePurchase'
import { firstSalePurchaseEligible,firstSalePurchaseInput,firstSalePurchaseStep,recoveryEntrance } from './helpers/first-sale-purchase-replay'
import { firstSaleDepartureEligible,firstSaleDepartureStep } from './helpers/first-sale-departure-replay'

describe('寄售B2真实店位行走、四种同单物资与保管',()=>{
  let base:GameState,states:GameState[]
  beforeAll(()=>{
    base=firstSalePurchaseEligible();states=[base]
    while(states.at(-1)!.earlyTraining.firstSalePurchase.stage<14)states.push(firstSalePurchaseStep(states.at(-1)!))
  })
  function expectedAt(original:GameState,state:GameState,mask:number){
    const expected=structuredClone(original),t=state.earlyTraining.firstSalePurchase
    expected.earlyTraining.firstSalePurchase=t
    if(original.earlyTraining.consignment.stage===1){
      const c=expected.earlyTraining.consignment,newMask=mask|salePurchaseMask(t.stage)
      for(const [index,item] of (Object.keys(consignmentSupplies) as ConsignmentSupplyId[]).entries())
        if(newMask&(1<<index)&&!c.receipts[item]){c.receipts[item]=true;c.supplies[item]=1;c.spent+=consignmentSupplies[item].price}
      if(newMask===15)c.stage=2
    }
    return expected
  }
  it('14动作11路步逐点恢复四槽和上一档，原90专款花50，物资未交料未炼制',async()=>{
    expect(states).toHaveLength(26)
    await saveSlot(0,base)
    for(let i=0;i<states.length;i++){
      const s=states[i],t=s.earlyTraining.firstSalePurchase
      expect(t).toEqual(firstSalePurchaseAt(t.stage,t.walk,t.stage?'current':'none',t.stage?1:0,0))
      expect(s).toEqual(expectedAt(base,s,0))
      for(const slot of [0,1,2,3])await saveSlot(slot,s)
      const slots=await listSlots()
      for(const slot of [0,1,2,3])expect(parseSave(slots.find(r=>r.slot===slot)!.text)).toEqual(s)
      if(i){
        expect(parseSave(slots.find(r=>r.slot===-1)!.text)).toEqual(states[i-1])
        const p=states[i-1].earlyTraining.firstSalePurchase
        expect(advanceFirstSalePurchase(s,recoveryEntrance,p,p.location,firstSalePurchaseInput(states[i-1])).state).toBe(s)
      }
    }
    const at=(stage:number)=>states.filter(s=>s.earlyTraining.firstSalePurchase.stage===stage).map(s=>[s.earlyTraining.firstSalePurchase.x,s.earlyTraining.firstSalePurchase.y])
    expect(at(1)).toEqual([[380,460],[340,460],[300,460],[300,410],[300,360]])
    expect(at(6)).toEqual([[300,360],[340,360],[380,360],[420,360],[460,360]])
    expect(at(9)).toEqual([[460,360],[500,360],[540,360],[540,410]])
    expect(states.at(-1)!.earlyTraining.consignment).toEqual({stage:2,funds:90,spent:50,product:'none',owner:'none',
      receipts:{youngPrimary:true,youngAuxiliary:true,woodCore:true,jadeBottle:true},supplies:{youngPrimary:1,youngAuxiliary:1,woodCore:1,jadeBottle:1}})
    expect(renderToStaticMarkup(<FirstSalePurchase state={states.at(-1)!} position={recoveryEntrance} onBack={()=>{}}/>)).toContain('街巷同单采购已归档')
  })
  it('29完整快照、整原账、价格/对象/派生/位置/来源/方向及越级操作严格拒绝',()=>{
    expect(salePurchaseSnapshotKeys).toHaveLength(29)
    for(const state of states){
      const t=state.earlyTraining.firstSalePurchase,a=firstSalePurchaseInput(state)
      const reject=(input:typeof a,p=t,space=t.location as string,entrance=recoveryEntrance)=>
        expect(advanceFirstSalePurchase(state,entrance,p,space,input).state).toBe(state)
      for(const label of salePurchaseSnapshotKeys){
        const key=`expected${label}` as keyof typeof a,snap=a[key] as Record<string,unknown>
        reject({...a,[key]:undefined})
        for(const field of Object.keys(snap)){
          reject({...a,[key]:{...snap,[field]:'stale'}})
          const missing={...snap};delete missing[field];reject({...a,[key]:missing})
        }
      }
      reject({...a,expectedConsignment:undefined} as unknown as typeof a)
      for(const [key,value] of Object.entries(a.expectedConsignment)){
        if(typeof value==='object'){
          reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:undefined}})
          for(const field of Object.keys(value)){
            reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:{...value,[field]:'stale'}}})
            const missing={...value} as Record<string,unknown>;delete missing[field]
            reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:missing}})
          }
        }else reject({...a,expectedConsignment:{...a.expectedConsignment,[key]:'stale'}})
      }
      for(const key of Object.keys(t))reject({...a,[key]:'wrong'})
      reject({...a,actor:'teacher'});reject(a,{...t,x:t.x+1});reject(a,{...t,y:NaN});reject(a,t,'alley');reject(a,t,t.location,{x:150,y:310})
      for(const flag of ['continuation','conflict','threat','exitResponse','checkout','leaving','aftermath'])reject({...a,[flag]:true} as typeof a)
      for(const operation of ['move-left','move-right','move-up','move-down','enter-street','buy-primary','buy-core','buy-bottle','archive-purchase','deliver','refine'])
        if(operation!==a.operation)reject({...a,operation})
      for(const item of Object.keys(consignmentSupplies) as ConsignmentSupplyId[])if(item!==a.item)reject({...a,item,price:consignmentSupplies[item].price})
      reject({...a,price:-1});reject({...a,price:NaN})
      if(a.item){reject({...a,item:undefined});reject({...a,price:undefined});reject({...a,price:a.price!+1})}
      const c=state.earlyTraining.consignment
      expect(advanceEarlyConsignment(state,recoveryEntrance,c.stage===1?'pharmacy':'alley',
        c.stage===1?{stage:1,spent:c.spent,operation:'buy',item:'woodCore',price:25}:{stage:c.stage,spent:c.spent,operation:'deliver'}).state).toBe(state)
    }
  })
  it('版本、前置、所有派生、伪来源与已购收据/旧stage回退拒绝；防剧透封存',()=>{
    const old=JSON.parse(JSON.stringify(base));old.contentVersion='0.91.0';delete old.earlyTraining.firstSalePurchase
    expect(validateState(old)).toEqual(base);expect(()=>validateState({...old,contentVersion:'0.92.0'})).toThrow()
    for(const state of states.slice(1)){
      for(const key of Object.keys(state.earlyTraining.firstSalePurchase))for(const value of [undefined,null,'wrong',-1,1.5,999]){
        const bad=JSON.parse(JSON.stringify(state));bad.earlyTraining.firstSalePurchase[key]=value;expect(()=>validateState(bad),key).toThrow()
      }
      const earlier=structuredClone(state);earlier.contentVersion='0.91.0';expect(()=>validateState(earlier)).toThrow('不属于此版本')
      const source=structuredClone(state);source.earlyTraining.firstSalePurchase.record='recalled';expect(()=>validateState(source)).toThrow()
      const prerequisite=structuredClone(state);prerequisite.earlyTraining.firstSaleDeparture.stage=6;expect(()=>validateState(prerequisite)).toThrow()
      if(state.earlyTraining.firstSalePurchase.confirmedReceipts){
        const rollback=structuredClone(state);rollback.earlyTraining.consignment=structuredClone(base.earlyTraining.consignment);expect(()=>validateState(rollback)).toThrow()
      }
    }
    const hidden=structuredClone(base);hidden.settings.spoiler='anime';hidden.settings.animeLimit=2
    expect(firstSalePurchaseBlock(hidden,recoveryEntrance)).toContain('剧透')
    expect(renderToStaticMarkup(<FirstSalePurchase state={hidden} position={recoveryEntrance} onBack={()=>{}}/>)).not.toContain('Green Wood Mouse')
    expect(firstSalePurchaseSaveSummary(states.at(-1)!,hidden.settings)).toContain('封存')
    expect(savePreviewSummary(states.at(-1)!,hidden.settings)).not.toContain('寄售街巷采购')
  })
  function oldPurchase(mask:number){
    let state=firstSaleDepartureEligible()
    for(const [index,item] of (Object.keys(consignmentSupplies) as ConsignmentSupplyId[]).entries())if(mask&(1<<index)){
      const c=state.earlyTraining.consignment
      state=advanceEarlyConsignment(state,recoveryEntrance,'pharmacy',{stage:1,spent:c.spent,operation:'buy',item,price:consignmentSupplies[item].price}).state
    }
    return validateState(state)
  }
  function exit(state:GameState){while(state.earlyTraining.firstSaleDeparture.stage<7)state=firstSaleDepartureStep(state);return state}
  it.each(Array.from({length:16},(_,i)=>i))('初始收据位图%d只买缺项，来源固定，最终总支出仍50',mask=>{
    let state=exit(oldPurchase(mask)),original=structuredClone(state)
    while(state.earlyTraining.firstSalePurchase.stage<14){
      state=firstSalePurchaseStep(state)
      expect(state).toEqual(expectedAt(original,state,mask))
      expect(state.earlyTraining.firstSalePurchase).toMatchObject({record:mask?'recalled':'current',priorReceipts:mask,priorStage:mask===15?2:1})
    }
    expect(state.earlyTraining.consignment.spent).toBe(50)
    expect(saleReceiptsMask(state.earlyTraining.consignment.receipts)).toBe(15)
  })
  it.each([2,3,4,5,6])('更高旧寄售/鉴定/拍卖/39200结算%d整账与所有凭据保持',level=>{
    let state=oldPurchase(15)
    for(const [stage,operation] of [[2,'deliver'],[3,'refine'],[4,'bottle']] as const)
      if(level>stage)state=advanceEarlyConsignment(state,recoveryEntrance,'alley',{stage,spent:50,operation}).state
    if(level===6){
      for(const scene of appraisalScenes)state=validateState(advanceEarlyAppraisal(state,recoveryEntrance,scene.station,
        {step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      for(const scene of auctionScenes)state=validateState(advanceEarlyAuction(state,recoveryEntrance,scene.station,
        {step:scene.step,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      for(const scene of settlementScenes)state=validateState(advanceEarlySettlement(state,recoveryEntrance,scene.station,
        {step:scene.step,net:state.earlyTraining.settlement.net,vip:state.earlyTraining.settlement.vip,owner:state.earlyTraining.consignment.owner,operation:scene.operation}).state)
      expect(state.earlyTraining.settlement.net).toBe(39200)
    }
    state=exit(validateState(state));const original=structuredClone(state)
    while(state.earlyTraining.firstSalePurchase.stage<14){
      state=firstSalePurchaseStep(state);const expected=structuredClone(original);expected.earlyTraining.firstSalePurchase=state.earlyTraining.firstSalePurchase
      expect(state).toEqual(expected);expect(state.earlyTraining.firstSalePurchase.record).toBe('recalled')
    }
  })
  it.each(['story','normal','hard'] as const)('%s全断点与一次并发写入、runtime保持',async difficulty=>{
    let state=structuredClone(base);state.settings.difficulty=difficulty
    while(state.earlyTraining.firstSalePurchase.stage<14)state=firstSalePurchaseStep(state)
    let writes=0
    const store=new GameStore({load:async()=>structuredClone(base),write:async saved=>{writes++;expect(validateState(saved)).toEqual(saved)}})
    await store.initialize();const runtime=store.getSnapshot().runtime,t=base.earlyTraining.firstSalePurchase,a=firstSalePurchaseInput(base)
    expect(submitFirstSalePurchase(store,recoveryEntrance,t,t.location,a)).toBe(true);expect(submitFirstSalePurchase(store,recoveryEntrance,t,t.location,a)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true);expect(writes).toBe(1);expect(store.getSnapshot().runtime).toBe(runtime);expect(store.getSnapshot().state).toEqual(states[1])
  })
})
