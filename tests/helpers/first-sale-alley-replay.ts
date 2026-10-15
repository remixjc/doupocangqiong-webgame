import {expect} from 'vitest'
import type {GameState} from '../../src/core/model'
import {parseSave,serializeSave} from '../../src/core/save'
import {advanceFirstSaleAlley,type FirstSaleAlleyAction} from '../../src/core/first-sale-alley'
import {saleAlleyRoutes} from '../../src/core/first-sale-alley-state'
import {firstSaleAlleyScenes} from '../../src/content/first-sale-alley'
import {earlySnapshots,saleAlleySnapshotKeys} from '../../src/core/early-snapshots'
import {firstSalePurchaseEligible,firstSalePurchaseStep,recoveryEntrance} from './first-sale-purchase-replay'
export {recoveryEntrance}
export function firstSaleAlleyEligible():GameState{
  let state=firstSalePurchaseEligible()
  while(state.earlyTraining.firstSalePurchase.stage<14)state=firstSalePurchaseStep(state)
  return state
}
export function firstSaleAlleyInput(state:GameState):FirstSaleAlleyAction{
  const t=state.earlyTraining.firstSaleAlley,scene=firstSaleAlleyScenes[t.stage],direction=saleAlleyRoutes[t.stage]?.[t.walk]
  return {...t,...earlySnapshots(state,saleAlleySnapshotKeys),expectedConsignment:structuredClone(state.earlyTraining.consignment),
    actor:direction?'yan':scene?.actor??'yan',operation:direction?`move-${direction}`:scene?.operation??'finish'}
}
export function firstSaleAlleyStep(state:GameState):GameState{
  const t=state.earlyTraining.firstSaleAlley,result=advanceFirstSaleAlley(state,recoveryEntrance,t,t.location,firstSaleAlleyInput(state))
  expect(result.ok,result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
