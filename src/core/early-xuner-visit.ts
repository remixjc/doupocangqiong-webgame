import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyFatherGiftBlock } from './early-father-gift'
import { xunerCardAt } from './early-training-state'
import { xunerVisitScenes } from '../content/early-xuner-visit'

export type XunerVisitStation = typeof xunerVisitScenes[number]['station']
export type XunerVisitAction = { step: number; card: GameState['earlyTraining']['xunerVisit']['card']; operation: typeof xunerVisitScenes[number]['operation'] }
export function earlyXunerVisitBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyFatherGiftBlock(state, position)
    || (state.earlyTraining.fatherGift.stage !== 6 ? '先接续父亲来访并收好同瓶，再展开薰儿来访。' : '')
}
export function advanceEarlyXunerVisit(state: GameState, position: EarlyWalkPosition, station: XunerVisitStation, action: XunerVisitAction): Transaction {
  const blocked = earlyXunerVisitBlock(state, position)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.xunerVisit, scene = xunerVisitScenes[task.stage]
  if (!scene || action.step !== scene.step || action.operation !== scene.operation
    || action.card !== task.card || task.card !== xunerCardAt(task.stage))
    return failedTransaction(state, '来访或紫金卡交接记录已变化，请按当前步骤继续。')
  if (station !== scene.station) return failedTransaction(state, '请到当前人物事件对应的位置。')
  const next = structuredClone(state)
  next.earlyTraining.xunerVisit.stage++
  next.earlyTraining.xunerVisit.card = xunerCardAt(next.earlyTraining.xunerVisit.stage)
  return successfulTransaction(next, next.earlyTraining.xunerVisit.stage === 6
    ? '薰儿的紫金卡已交家族；萧炎不在场，玩家的钱账保持原状。'
    : '人物事件已记下，当前视角和各自所知沿故事继续。')
}
export function submitEarlyXunerVisit(store: GameStore, position: EarlyWalkPosition, station: XunerVisitStation, action: XunerVisitAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyXunerVisit, [position, station, action])
}
