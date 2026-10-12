import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyHistoryBlock } from './early-history-block'
import { fieldsMatch } from './state-guards'
import { ironNear, ironPlaces } from './early-iron'
import { marketTradeLedger } from './early-market-trade'
import { firstTechniqueAt, validFirstTechnique, type FirstTechniqueState } from './first-technique-state'
import { firstTechniqueScenes } from '../content/first-technique'
import { commitEarlyResult } from './early-result'

export const firstTechniqueBed = { x: 140, y: 370 }
export function firstTechniqueNear(yan: EarlyWalkPosition): boolean {
  return ironNear(yan, 0) && fieldsMatch(yan, firstTechniqueBed)
}
export function firstTechniqueBlock(state: GameState): string {
  return earlyHistoryBlock(state) || (state.earlyTraining.firstTraining.stage === 17 && state.earlyTraining.iron.stage === 18
    ? '' : '先完成半月回顾与同一铁片辨认归档。')
}
export type FirstTechniqueAction = FirstTechniqueState & {
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedTraining: GameState['earlyTraining']['firstTraining']
  expectedIron: GameState['earlyTraining']['iron']
  expectedPractice: GameState['earlyTraining']['practice']
  expectedRecovery: GameState['earlyTraining']['recovery']
  teacherPosition: EarlyWalkPosition
  actor: 'yan' | 'teacher'
  operation: string
}
export function advanceFirstTechnique(state: GameState, yan: EarlyWalkPosition, action: FirstTechniqueAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstTechniqueBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstTechnique, scene = firstTechniqueScenes[task.stage]
  if (!validFirstTechnique(task) || !fieldsMatch(action, task)
    || !action.expectedLedger || !fieldsMatch(action.expectedLedger, marketTradeLedger(state))
    || !action.expectedTraining || !fieldsMatch(action.expectedTraining, t.firstTraining)
    || !action.expectedIron || !fieldsMatch(action.expectedIron, t.iron)
    || !action.expectedPractice || !fieldsMatch(action.expectedPractice, t.practice)
    || !action.expectedRecovery || !fieldsMatch(action.expectedRecovery, t.recovery))
    return fail('铁片研究或旧修炼账已变化，请按当前断点继续。')
  if (!scene) return fail('铁片研究与感知已归档，有限瓷瓶试招待接续。')
  if (!action.teacherPosition || !fieldsMatch(action.teacherPosition, ironPlaces.teacher))
    return fail('老师保留自己的房中位置，不能替本人感知。')
  if (!firstTechniqueNear(yan)) return fail('先由本人实际走到床边取片，再按当前地点继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('按本人动作依次继续；没有发第二铁片、授新技、吸人或战斗奖励。')
  const next = structuredClone(state)
  next.earlyTraining.firstTechnique = firstTechniqueAt(task.stage + 1)
  return { state: next, ok: true, message: '本人铁片研究断点已保存，原材料与后期修炼保持。' }
}
export function submitFirstTechnique(store: GameStore, yan: EarlyWalkPosition, action: FirstTechniqueAction): boolean {
  return commitEarlyResult(store, advanceFirstTechnique(store.getSnapshot().state, yan, action), 'firstTechnique')
}
