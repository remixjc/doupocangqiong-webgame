import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlySnapshotsMatch } from './early-snapshots'
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
import { firstBottleScenes } from '../content/first-bottle'
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
  marker?: number
}
export function advanceFirstTechnique(state: GameState, yan: EarlyWalkPosition, action: FirstTechniqueAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = firstTechniqueBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstTechnique
  const scene = task.stage < 9 ? firstTechniqueScenes[task.stage] : firstBottleScenes[task.stage - 9]
  if (!validFirstTechnique(task) || !fieldsMatch(action, task)
    || !earlySnapshotsMatch(state, action, ['Ledger', 'Training', 'Iron', 'Practice', 'Recovery']))
    return fail('铁片研究或旧修炼账已变化，请按当前断点继续。')
  if (!scene) return fail('有限瓷瓶试招已归档，实际出门待接续。')
  if (!action.teacherPosition || !fieldsMatch(action.teacherPosition, ironPlaces.teacher))
    return fail('老师保留自己的房中位置，不能替本人感知。')
  if (!firstTechniqueNear(yan)) return fail(task.stage >= 9 ? '本人保持床边位置，面对桌上瓷瓶；起身和出门由后段完成。' : '先由本人实际走到床边取片，再按当前地点继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('按本人动作依次继续；没有发第二铁片、授新技、吸人或战斗奖励。')
  let stage = task.stage + 1, beats = task.beats, attempts = task.attempts
  if (task.stage === 11) {
    const marker = action.marker
    if (typeof marker !== 'number' || !Number.isFinite(marker) || marker < 0 || marker > 1) return fail('请选择有效的有限吸力标记。')
    if (marker < .35 || marker > .65) {
      if (attempts >= 1_000_000) return fail('重试次数已达记录上限。')
      beats = 0; attempts++; stage = 11
    } else if (++beats < 2) stage = 11
  } else if (action.marker !== undefined) return fail('只有有限吸力步骤接受标记。')
  const next = structuredClone(state)
  next.earlyTraining.firstTechnique = firstTechniqueAt(stage, beats, attempts)
  return successfulTransaction(next, stage === 11 && beats === 0 ? '偏离节奏，有限吸力标记免费复位，瓷瓶仍完整。' : '本人铁片研究断点已保存，原材料与后期修炼保持。')
}
export function submitFirstTechnique(store: GameStore, yan: EarlyWalkPosition, action: FirstTechniqueAction): boolean {
  return commitEarlyResult(store, advanceFirstTechnique(store.getSnapshot().state, yan, action), 'firstTechnique')
}
