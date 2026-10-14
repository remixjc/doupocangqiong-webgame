import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import type { FirstAwakeningAction } from './first-awakening'
import type { FirstAwakeningState } from './first-awakening-state'
import { firstAwakeningBlock } from './first-awakening'
import { firstSalePlanAt, salePlanRoute, validFirstSalePlan, type FirstSalePlanState } from './first-sale-plan-state'
import { firstSalePlanScenes } from '../content/first-sale-plan'
import { earlySnapshotsMatch, salePlanSnapshotKeys, hasHallMode } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { CONSIGNMENT_FUNDS } from './early-training-state'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
export type FirstSalePlanAction = Omit<FirstAwakeningAction, keyof FirstAwakeningState | 'actor'>
  & FirstSalePlanState & { actor: 'yan' | 'teacher'; expectedAwakening: FirstAwakeningState; expectedConsignment: GameState['earlyTraining']['consignment'] }
export function firstSalePlanBlock(state: GameState, position: EarlyWalkPosition): string {
  return firstAwakeningBlock(state, position)
    || (state.earlyTraining.firstAwakening.stage !== 11 ? '先归档醒后耗尽与五段感知，再走到床边筹备。' : '')
}
export function advanceFirstSalePlan(state: GameState, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstSalePlanAction) {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstSalePlan, scene = firstSalePlanScenes[t.stage]
  const sale = state.earlyTraining.consignment, expected = action.expectedConsignment
  const prior = t.stage ? t.priorStage : sale.stage
  const source = prior > 0 || state.earlyTraining.firstAwakening.record === 'recalled' ? 'recalled' : 'current'
  const direction = t.stage === 1 && t.walk < 5 ? salePlanRoute[t.walk] : undefined
  if (firstSalePlanBlock(state, entrance) || !scene || !validFirstSalePlan(t)
    || t.stage > 0 && t.record !== source || !fieldsMatch(action, t)
    || !earlySnapshotsMatch(state, action, salePlanSnapshotKeys) || hasHallMode(action)
    || !expected || !expected.receipts || !expected.supplies
    || !fieldsMatch(expected, { stage: sale.stage, funds: sale.funds, spent: sale.spent, product: sale.product, owner: sale.owner })
    || !fieldsMatch(expected.receipts, sale.receipts) || !fieldsMatch(expected.supplies, sale.supplies)
    || action.actor !== (direction ? 'yan' : scene.actor)
    || action.operation !== (direction ? `move-${direction}` : scene.operation)
    || space !== t.location || !fieldsMatch(p, { x: t.x, y: t.y }))
    return fail('按人物、床边位置与问答断点继续。')
  const next = structuredClone(state), updated = firstSalePlanAt(direction ? t.stage : t.stage + 1, direction ? t.walk + 1 : 0, source, prior)
  next.earlyTraining.firstSalePlan = updated
  if (updated.agreed && sale.stage === 0) {
    next.earlyTraining.consignment.stage = 1
    next.earlyTraining.consignment.funds = CONSIGNMENT_FUNDS
  }
  return successfulTransaction(next, '床边断点已保存，故事余额与主线奖励分账。')
}
export function submitFirstSalePlan(store: GameStore, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstSalePlanAction): boolean {
  return submitEarlyTransaction(store, advanceFirstSalePlan, [entrance, p, space, action], ['firstSalePlan', 'consignment'])
}
