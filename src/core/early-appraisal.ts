import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyConsignmentBlock } from './early-consignment'
import { appraisalOwnerAt } from './early-training-state'
import { appraisalScenes } from '../content/early-appraisal'

export type AppraisalStation = typeof appraisalScenes[number]['station']
export type AppraisalAction = { step: number; owner: GameState['earlyTraining']['consignment']['owner']; operation: typeof appraisalScenes[number]['operation'] }
export function earlyAppraisalBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyConsignmentBlock(state, position)
    || (state.earlyTraining.consignment.stage !== 5 || state.earlyTraining.consignment.product !== 'sealed'
      ? '先完成独立备料与老师调制，将待售药液装瓶，再前往鉴定。' : '')
}
export function advanceEarlyAppraisal(state: GameState, position: EarlyWalkPosition, station: AppraisalStation, action: AppraisalAction): Transaction {
  const blocked = earlyAppraisalBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.appraisal, scene = appraisalScenes[task.stage]
  if (!scene || scene.step !== action.step || scene.operation !== action.operation
    || action.owner !== state.earlyTraining.consignment.owner || action.owner !== appraisalOwnerAt(task.stage))
    return { state, ok: false, message: '鉴定或玉瓶交接记录已变化，请按当前步骤继续。' }
  if (station !== scene.station) return { state, ok: false, message: '请到当前鉴定步骤对应的地点。' }
  const next = structuredClone(state), updated = next.earlyTraining.appraisal
  updated.stage++; updated.cloaked = true
  updated.speaker = updated.stage >= 4 ? 'yaolao' : 'self'
  updated.tier = updated.stage >= 6 ? 2 : 0; updated.card = updated.stage >= 7 ? 'black-entry' : 'none'
  next.earlyTraining.consignment.owner = appraisalOwnerAt(updated.stage)
  return { state: next, ok: true, message: updated.stage === 8
    ? '已凭黑卡进入第一拍卖室，待售药液由拍卖方保管；主持与结算待接续。' : '鉴定这一步已记下，同瓶保管与身份记录保留。' }
}
export function submitEarlyAppraisal(store: GameStore, position: EarlyWalkPosition, station: AppraisalStation, action: AppraisalAction): boolean {
  const result = advanceEarlyAppraisal(store.getSnapshot().state, position, station, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
