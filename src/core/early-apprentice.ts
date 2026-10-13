import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { mountainRingNear, mountainRingPlaces } from './early-mountain-ring'
import { apprenticeAt, validApprentice, type ApprenticeState } from './early-apprentice-state'
import { apprenticeScenes } from '../content/early-apprentice'

export function earlyApprenticeBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.mountainRing.stage === 21 ? '' : '先完成后山声音与古戒前段，再接今后取气答复与本人拜师。'
}
export type ApprenticeAction = ApprenticeState & {
  actor: typeof apprenticeScenes[number]['actor']
  operation: typeof apprenticeScenes[number]['operation'] | 'claim-seven' | 'claim-profession' | 'skip-bow' | 'wear-ring' | 'grant-permission'
}
export function advanceEarlyApprentice(state: GameState, position: EarlyWalkPosition, action: ApprenticeAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyApprenticeBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.apprentice
  if (!validApprentice(task) || !fieldsMatch(action, task))
    return fail('援助与拜师记录已变化，请按当前步骤继续。')
  const scene = apprenticeScenes[task.stage]
  if (!scene) return fail('援助与本人拜师已归档，不重复登记或领取奖励。')
  if (!mountainRingNear(position, scene.place)) return fail(`请先走近${mountainRingPlaces[scene.place].label}。`)
  if (action.operation === 'claim-seven') return fail('一年七段只是故事目标，不登记当前达成、加境界或重发奖励。')
  if (action.operation === 'claim-profession') return fail('具备资质或愿意学，不等于取得职业、技能或炼成丹药。')
  if (action.operation === 'skip-bow') return fail('本人必须在青石前正式行礼，不能由愿学或他人回应代签；名字在行礼之后才听。')
  if (action.operation === 'wear-ring') return fail('同一古戒仍在老人处浮空；本段没有正式返戒，不登记重新佩戴。')
  if (action.operation === 'grant-permission') return fail('老人承诺遵守许可边界，并不等于本人授予取气许可或永久免耗。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state); next.earlyTraining.apprentice = apprenticeAt(task.stage + 1)
  return successfulTransaction(next, task.stage === 24
    ? '援助与本人拜师已归档，功法说明与正式返戒待续。'
    : task.stage === 22 ? '本人拜师礼已保存；接下来才听老师名字。'
    : '援助与拜师这一步已保存；主线资源、职业与已结算奖励保留。')
}
export function submitEarlyApprentice(store: GameStore, position: EarlyWalkPosition, action: ApprenticeAction): boolean {
  const result = advanceEarlyApprentice(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'apprentice')
}
