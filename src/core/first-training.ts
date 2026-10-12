import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import { type Transaction } from './rules'
import { ironNear, ironPlaces } from './early-iron'
import { refiningWater } from './early-refining'
import { marketTradeLedger } from './early-market-trade'
import { fieldsMatch } from './state-guards'
import { firstTrainingAt, validFirstTraining, type FirstTrainingState } from './first-training-state'
import { firstTrainingScenes } from '../content/first-training'
import { commitEarlyResult } from './early-result'
export function firstTrainingNear(yan: EarlyWalkPosition, stage: number): boolean {
  return ironNear(yan, 0) && (stage <= 6 ? fieldsMatch(yan, refiningWater) : stage === 7 ? yan.x >= 160 : true)
}
export function firstTrainingBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.refining.stage === 22 ? '' : '先完成魔核入水与期限归档。'
}
export type FirstTrainingAction = FirstTrainingState & {
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedRefining: GameState['earlyTraining']['refining']
  expectedPractice: GameState['earlyTraining']['practice']
  expectedRecovery: GameState['earlyTraining']['recovery']
  teacherPosition: EarlyWalkPosition
  actor: 'yan' | 'teacher'
  operation: string
  marker?: number
}
export function advanceFirstTraining(state: GameState, yan: EarlyWalkPosition, action: FirstTrainingAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstTrainingBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstTraining, scene = firstTrainingScenes[task.stage]
  if (!validFirstTraining(task) || !fieldsMatch(action, task)
    || !action.expectedLedger || !fieldsMatch(action.expectedLedger, marketTradeLedger(state))
    || !action.expectedRefining || !fieldsMatch(action.expectedRefining, t.refining)
    || !action.expectedPractice || !fieldsMatch(action.expectedPractice, t.practice)
    || !action.expectedRecovery || !fieldsMatch(action.expectedRecovery, t.recovery))
    return fail('修炼断点或旧账已变化，请按当前记录继续。')
  if (!scene) return fail('当前一轮已归档，半月回顾仍待接续。')
  if (!action.teacherPosition || !fieldsMatch(action.teacherPosition, ironPlaces.teacher))
    return fail('老师保留自己的房中位置。')
  if (!firstTrainingNear(yan, task.stage)) return fail(task.stage <= 6 ? '先由本人走到容器正前坐定。' : '先由本人实际走离容器。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('由本人依次完成；不能口服、补药、挂机或提前签四段与五段。')
  let beats = task.beats, attempts = task.attempts, stage = task.stage + 1
  if (task.stage === 2) {
    const marker = action.marker
    if (typeof marker !== 'number' || !Number.isFinite(marker) || marker < 0 || marker > 1) return fail('请选择有效呼吸标记。')
    if (marker < .35 || marker > .65) {
      if (attempts >= 1_000_000) return fail('重试次数已达记录上限。')
      beats = 0; attempts++; stage = 2
    } else if (++beats < 3) stage = 2
  } else if (action.marker !== undefined) return fail('仅调息步骤接受呼吸标记。')
  const next = structuredClone(state)
  next.earlyTraining.firstTraining = firstTrainingAt(stage, beats, attempts)
  return { state: next, ok: true, message: stage === 2 && beats === 0 ? '偏离节奏，本轮免费重试，旧药液保持。' : '当前修炼断点已保存。' }
}
export function submitFirstTraining(store: GameStore, yan: EarlyWalkPosition, action: FirstTrainingAction): boolean {
  return commitEarlyResult(store, advanceFirstTraining(store.getSnapshot().state, yan, action), 'firstTraining')
}
