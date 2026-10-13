import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { familyVisitPlaces, nearFamilyVisitPlace } from './early-family-visit'
import { familyCompensationAt, validFamilyCompensation, type FamilyCompensationState } from './early-family-compensation-state'
import { familyCompensationScenes } from '../content/early-family-compensation'

export function earlyFamilyCompensationBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.familyVisit.stage === 17 ? '' : '先完成来访前半程，再接补偿与本人发言。'
}
export type FamilyCompensationAction = FamilyCompensationState & {
  actor: typeof familyCompensationScenes[number]['actor']
  operation: typeof familyCompensationScenes[number]['operation'] | 'take-extra' | 'join-now' | 'claim-alchemist'
}
export function advanceEarlyFamilyCompensation(state: GameState, position: EarlyWalkPosition, action: FamilyCompensationAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyFamilyCompensationBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.familyCompensation
  if (!validFamilyCompensation(task) || !fieldsMatch(action, task))
    return fail('交涉记录已变化，请按当前场景继续。')
  const scene = familyCompensationScenes[task.stage]
  if (!scene) return fail('补偿交涉前段已归档，不重复登记。')
  if (!nearFamilyVisitPlace(position, scene.place)) return fail(`请先走近${familyVisitPlaces[scene.place].label}。`)
  if (action.operation === 'take-extra') return fail('追加三枚只是提议，没有交付；不能加入行囊。')
  if (action.operation === 'join-now') return fail('入宗学功法仍是提议，本人尚未接受，不登记入宗或发卷。')
  if (action.operation === 'claim-alchemist') return fail('读懂条件不等于已经成为炼药师；知识、资格和实际炼制分别记录。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('发言人物或次序不符，请按当前提示继续。')
  const next = structuredClone(state)
  next.earlyTraining.familyCompensation = familyCompensationAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 14 ? '补偿交涉前段已归档，文书与三年约定待续。' : '交涉这一步已保存；没有领取补偿或改变主线奖励。' }
}
export function submitEarlyFamilyCompensation(store: GameStore, position: EarlyWalkPosition, action: FamilyCompensationAction): boolean {
  const result = advanceEarlyFamilyCompensation(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'familyCompensation')
}
