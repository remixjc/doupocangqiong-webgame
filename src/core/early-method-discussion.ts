import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { mountainRingNear } from './early-mountain-ring'
import { methodDiscussionAt, validMethodDiscussion, type MethodDiscussionState } from './early-method-discussion-state'
import { methodDiscussionScenes } from '../content/early-method-discussion'

export function earlyMethodDiscussionBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.apprentice.stage === 25 ? '' : '先完成援助交涉与本人拜师，再听功法说明。'
}
export type MethodDiscussionAction = MethodDiscussionState & {
  actor: typeof methodDiscussionScenes[number]['actor']
  operation: typeof methodDiscussionScenes[number]['operation'] | 'claim-scroll' | 'grant-evolution' | 'claim-profession' | 'claim-trial'
}
export function advanceEarlyMethodDiscussion(state: GameState, position: EarlyWalkPosition, action: MethodDiscussionAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyMethodDiscussionBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.methodDiscussion
  if (!validMethodDiscussion(task) || !fieldsMatch(action, task))
    return fail('功法说明记录已变化，请按当前步骤继续。')
  const scene = methodDiscussionScenes[task.stage]
  if (!scene) return fail('功法说明已归档，不重复记录或领取奖励。')
  if (!mountainRingNear(position, 'stone')) return fail('请先实际走近山顶青石。')
  if (action.operation === 'claim-scroll') return fail('请求或说明不等于授卷；老师表示斗者之后再传授，本段未给卷。')
  if (action.operation === 'grant-evolution') return fail('可进化只是老师说明，没有实际进化、异火、技能或奖励。')
  if (action.operation === 'claim-profession') return fail('火属性与斗者是炼药前置说明，不登记职业或改写现有境界。')
  if (action.operation === 'claim-trial') return fail('老师未亲试，也没有他人尝试；文字依据不能登记为实验证成。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state); next.earlyTraining.methodDiscussion = methodDiscussionAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 27 ? '功法说明归档；温和准备方案与返戒待续。'
    : '功法说明这一步已保存；未授卷，主线能力与已结算奖励保留。' }
}
export function submitEarlyMethodDiscussion(store: GameStore, position: EarlyWalkPosition, action: MethodDiscussionAction): boolean {
  const result = advanceEarlyMethodDiscussion(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'methodDiscussion')
}
