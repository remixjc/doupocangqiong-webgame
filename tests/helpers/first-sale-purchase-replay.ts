import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstSalePurchase, type FirstSalePurchaseAction } from '../../src/core/first-sale-purchase'
import { salePurchaseItem, salePurchaseRoutes } from '../../src/core/first-sale-purchase-state'
import { consignmentSupplies } from '../../src/core/early-training-state'
import { firstSalePurchaseScenes } from '../../src/content/first-sale-purchase'
import { earlySnapshots, salePurchaseSnapshotKeys } from '../../src/core/early-snapshots'
import { firstSaleDepartureEligible, firstSaleDepartureStep, recoveryEntrance } from './first-sale-departure-replay'
export { recoveryEntrance }
export function firstSalePurchaseEligible(): GameState {
  let state=firstSaleDepartureEligible()
  while (state.earlyTraining.firstSaleDeparture.stage<7) state=firstSaleDepartureStep(state)
  return state
}
export function firstSalePurchaseInput(state: GameState): FirstSalePurchaseAction {
  const t=state.earlyTraining.firstSalePurchase, scene=firstSalePurchaseScenes[t.stage]
  const direction=salePurchaseRoutes[t.stage]?.[t.walk],item=salePurchaseItem(t.stage)
  return {...t,...earlySnapshots(state,salePurchaseSnapshotKeys),expectedConsignment:structuredClone(state.earlyTraining.consignment),actor:'yan',
    operation:direction?`move-${direction}`:scene?.operation??'finish',...(item?{item,price:consignmentSupplies[item].price}:{})}
}
export function firstSalePurchaseStep(state: GameState): GameState {
  const t=state.earlyTraining.firstSalePurchase
  const result=advanceFirstSalePurchase(state,recoveryEntrance,t,t.location,firstSalePurchaseInput(state))
  expect(result.ok,result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
