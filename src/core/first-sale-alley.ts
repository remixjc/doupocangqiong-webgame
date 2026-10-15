import type {GameState} from './model'
import type {GameStore} from './store'
import type {EarlyWalkPosition} from './early-walk'
import type {FirstSalePurchaseAction} from './first-sale-purchase'
import type {FirstSalePurchaseState} from './first-sale-purchase-state'
import {firstSalePurchaseBlock} from './first-sale-purchase'
import {firstSaleAlleyAt,saleAlleyRoutes,saleAlleySource,saleAlleyLedgerMatches,validFirstSaleAlley,type FirstSaleAlleyState} from './first-sale-alley-state'
import {firstSaleAlleyScenes} from '../content/first-sale-alley'
import {earlySnapshotsMatch,saleAlleySnapshotKeys,hasHallMode} from './early-snapshots'
import {fieldsMatch} from './state-guards'
import {rejectTransaction,successfulTransaction,submitEarlyTransaction} from './early-result'
export type FirstSaleAlleyAction=Omit<FirstSalePurchaseAction,keyof FirstSalePurchaseState|'item'|'price'>&FirstSaleAlleyState
  &{expectedSalePurchase:FirstSalePurchaseState}
export function firstSaleAlleyBlock(state:GameState,position:EarlyWalkPosition):string{
  return firstSalePurchaseBlock(state,position)||(state.earlyTraining.firstSalePurchase.stage!==14?'先归档实际到店采购及同批保管，再进入隐巷。':'')
}
export function advanceFirstSaleAlley(state:GameState,entrance:EarlyWalkPosition,p:EarlyWalkPosition,space:string,action:FirstSaleAlleyAction){
  const fail=rejectTransaction(state),t=state.earlyTraining.firstSaleAlley,scene=firstSaleAlleyScenes[t.stage]
  const sale=state.earlyTraining.consignment,expected=action.expectedConsignment,prior=t.stage?t.priorStage:sale.stage
  const extra=action as FirstSaleAlleyAction&{item?:unknown;price?:unknown}
  const source=saleAlleySource(state.earlyTraining.firstSalePurchase.record,prior),direction=saleAlleyRoutes[t.stage]?.[t.walk]
  if(firstSaleAlleyBlock(state,entrance)||!scene||!validFirstSaleAlley(t)||!saleAlleyLedgerMatches(t,sale)
    ||t.stage>0&&t.record!==source||!fieldsMatch(action,t)||!earlySnapshotsMatch(state,action,saleAlleySnapshotKeys)||hasHallMode(action)
    ||!expected||!expected.receipts||!expected.supplies
    ||!fieldsMatch(expected,{stage:sale.stage,funds:sale.funds,spent:sale.spent,product:sale.product,owner:sale.owner})
    ||!fieldsMatch(expected.receipts,sale.receipts)||!fieldsMatch(expected.supplies,sale.supplies)
    ||action.actor!==(direction?'yan':scene.actor)||action.operation!==(direction?`move-${direction}`:scene.operation)
    ||space!==t.location||!fieldsMatch(p,{x:t.x,y:t.y})||extra.item!==undefined||extra.price!==undefined)
    return fail('按当前巷口、本人或老师的实际步骤继续，同批旧账保持。')
  const next=structuredClone(state),updated=next.earlyTraining.consignment
  next.earlyTraining.firstSaleAlley=firstSaleAlleyAt(direction?t.stage:t.stage+1,direction?t.walk+1:0,source,prior)
  if(!direction){
    if(t.stage===4&&sale.stage===2){
      if(sale.supplies.youngPrimary!==1||sale.supplies.youngAuxiliary!==1||sale.supplies.woodCore!==1)return fail('原同批材料未齐，交料未发生。')
      updated.supplies.youngPrimary=0;updated.supplies.youngAuxiliary=0;updated.supplies.woodCore=0;updated.stage=3
    }else if(t.stage===6&&sale.stage===3){updated.product='mixture';updated.stage=4}
    else if(t.stage===9&&sale.stage===4){
      if(sale.supplies.jadeBottle!==1||sale.product!=='mixture')return fail('原白瓶与待售混合物不符，保管未变化。')
      updated.supplies.jadeBottle=0;updated.product='sealed';updated.owner='xiaoyan';updated.stage=5
    }
  }
  return successfulTransaction(next,'隐巷完整流程断点已保存，同批材料与白瓶不重复生成。')
}
export function submitFirstSaleAlley(store:GameStore,entrance:EarlyWalkPosition,p:EarlyWalkPosition,space:string,action:FirstSaleAlleyAction):boolean{
  return submitEarlyTransaction(store,advanceFirstSaleAlley,[entrance,p,space,action],['firstSaleAlley','consignment'])
}
