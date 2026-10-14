import { nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { familyVisitPlaces, familyVisitPositionValid } from './early-family-visit'
import { familyContractAt, validFamilyContract, type FamilyContractState } from './early-family-contract-state'
import { familyContractScenes } from '../content/early-family-contract'

export const familyContractExtraPlaces = {
  writing: { x: 390, y: 110, label: '文书桌' },
  outside: { x: 180, y: 270, label: '接待厅外' },
} as const
export const familyContractPlaces = { ...familyVisitPlaces, ...familyContractExtraPlaces }
export type FamilyContractView = { kind: 'yan'; position: EarlyWalkPosition }
  | { kind: 'observer'; place: keyof typeof familyContractPlaces }
export function familyContractNear(position: EarlyWalkPosition, place: keyof typeof familyContractPlaces): boolean {
  const target = familyContractPlaces[place]
  return !!target && familyVisitPositionValid(position) && nearWalkPoint(position, target, 38)
}
export function earlyFamilyContractBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.familyCompensation.stage === 15 ? '' : '先完成补偿交涉，再面对三年条件与本人文书。'
}
export type FamilyContractAction = FamilyContractState & {
  actor: typeof familyContractScenes[number]['actor']
  operation: typeof familyContractScenes[number]['operation'] | 'start-duel' | 'take-box' | 'give-paper-father' | 'claim-victory'
}
export function advanceEarlyFamilyContract(state: GameState, view: FamilyContractView, action: FamilyContractAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyFamilyContractBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.familyContract
  if (!validFamilyContract(task) || !fieldsMatch(action, task))
    return fail('文书与离厅记录已变化，请按当前场景继续。')
  const scene = familyContractScenes[task.stage]
  if (!scene) return fail('文书与双方离厅已归档，不重复记录或领奖。')
  if (task.yan === 'hall') {
    if (view.kind !== 'yan') return fail('本人尚在厅内，请实际走近当前地点。')
    if (!familyContractNear(view.position, scene.place)) return fail(`请先走近${familyContractPlaces[scene.place].label}。`)
  } else {
    if (view.kind !== 'observer') return fail('萧炎已经离厅；请切换旁观视角，不让本人返回厅内。')
    if (view.place !== scene.place) return fail(`请将旁观焦点转到${familyContractPlaces[scene.place].label}。`)
  }
  if (action.operation === 'start-duel' || action.operation === 'claim-victory')
    return fail('这是三年后的约定，今日没有进行决斗，不登记胜负或领取奖励。')
  if (action.operation === 'take-box') return fail('补偿没有接取；同一玉匣由来客保管，不加入行囊。')
  if (action.operation === 'give-paper-father') return fail('文书置桌后由纳兰持有；父亲接的是本人致意与承诺。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state)
  next.earlyTraining.familyContract = familyContractAt(task.stage + 1)
  return successfulTransaction(next, task.stage === 23 ? '萧炎已实际离厅，后续片段切为旁观。'
    : task.stage === 32 ? '文书、三年赴约与双方离厅已归档，接下来独自上后山。'
    : '文书与离厅这一步已保存；不改变主线能力、行囊或已结算奖励。')
}
export function submitEarlyFamilyContract(store: GameStore, view: FamilyContractView, action: FamilyContractAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyFamilyContract, [view, action], 'familyContract')
}
