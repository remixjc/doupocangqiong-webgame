import {boundedInteger,fieldsMatch,historyRecordMatches} from './state-guards'
import type {EarlyWalkDirection} from './early-walk'
import type {EarlyTrainingState} from './early-training-state'
export const FIRST_SALE_ALLEY_VERSION='0.93.0'
export const saleAlleyRoutes: Readonly<Record<number,readonly EarlyWalkDirection[]>>={
  1:['left','left','left','down','down'],11:['up'],12:['right','right','right','up','up','up'],
}
export interface FirstSaleAlleyState {
  stage:number
  walk:number
  priorStage:number
  record:'none'|'current'|'recalled'
  location:'street'|'mouth'|'alley'|'auction-door'
  x:number
  y:number
  delivered:boolean
  processing:boolean
  color:'unseen'|'mottled-green'
  effect:'unseen'|'weaker'
  bottled:boolean
  hidden:boolean
  archived:boolean
}
export function saleAlleySource(purchase:string,prior:number):'current'|'recalled'{
  return purchase==='recalled'||prior>2?'recalled':'current'
}
export function firstSaleAlleyAt(stage:number,walk=0,record:FirstSaleAlleyState['record']='current',priorStage=0):FirstSaleAlleyState{
  let x=stage>=13?540:stage>=2?420:540,y=stage>=13?310:stage===12?460:stage>=3?550:stage===2?510:410
  for(const direction of (saleAlleyRoutes[stage]??[]).slice(0,walk)){
    if(direction==='left')x-=40
    else if(direction==='right')x+=40
    else if(direction==='up')y-=50
    else y+=50
  }
  return {stage,walk,priorStage,record:stage?record:'none',location:stage>=13?'auction-door':stage===2?'mouth':stage>=3&&stage<=11?'alley':'street',
    x,y,delivered:stage>=5,processing:stage===6,color:stage>=8?'mottled-green':'unseen',effect:stage>=9?'weaker':'unseen',
    bottled:stage>=10,hidden:stage>=11,archived:stage>=14}
}
export function validFirstSaleAlley(t:Record<string,unknown>|FirstSaleAlleyState):t is FirstSaleAlleyState{
  return boundedInteger(t.stage,14)&&boundedInteger(t.walk,saleAlleyRoutes[t.stage]?.length??0)
    &&boundedInteger(t.priorStage,t.stage?5:0)&&(!t.stage||t.priorStage>=2)&&historyRecordMatches(t.record,t.stage)
    &&fieldsMatch(t,firstSaleAlleyAt(t.stage,t.walk,t.record as FirstSaleAlleyState['record'],t.priorStage))
}
export function saleAlleyLedgerMatches(t:FirstSaleAlleyState,sale:EarlyTrainingState['consignment']):boolean{
  const needed=t.stage>=10?5:t.stage>=7?4:t.stage>=5?3:2
  // A recalled old object can already be in the auction house; never recreate its bottle or contents.
  const minimum=Math.max(t.priorStage,needed)
  return !t.stage||sale.stage>=minimum&&(t.archived||sale.stage===minimum)
}
