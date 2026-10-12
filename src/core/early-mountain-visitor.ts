import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { mountainRingNear, mountainRingPlaces } from './early-mountain-ring'
import { mountainVisitorAt, validMountainVisitor, type MountainVisitorState } from './early-mountain-visitor-state'
import { mountainVisitorScenes } from '../content/early-mountain-visitor'
export function earlyMountainVisitorBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.preparationBrief.stage === 20 ? '' : '先完成准备说明与正式返戒，再接紫衣来访与当晚借资问答。'
}
export type MountainVisitorView = { kind: 'yan'; position: EarlyWalkPosition } | { kind: 'observer'; place: keyof typeof mountainRingPlaces }
export type MountainVisitorAction = MountainVisitorState & {
  actor: typeof mountainVisitorScenes[number]['actor']
  operation: typeof mountainVisitorScenes[number]['operation'] | 'claim-money' | 'take-purple' | 'claim-rank' | 'clear-debt' | 'claim-victory'
}
export function advanceEarlyMountainVisitor(state: GameState, view: MountainVisitorView, action: MountainVisitorAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyMountainVisitorBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.mountainVisitor
  if (!validMountainVisitor(task) || !fieldsMatch(action, task))
    return fail('当晚来访记录已变化，请按当前步骤继续。')
  const scene = mountainVisitorScenes[task.stage]
  if (!scene) return fail('当晚问答已归档，不重复写档或领取资金。')
  if (task.yan === 'left') {
    if (view.kind !== 'observer' || view.place !== scene.place) return fail('本人已离山，请用薰儿留山的旁观焦点接续。')
  } else if (view.kind !== 'yan' || !mountainRingNear(view.position, scene.place)) return fail(`请本人先走近${mountainRingPlaces[scene.place].label}。`)
  if (action.operation === 'claim-money') return fail('当晚只是借资提议，普通黑卡待次晨交付，本段不派采购资金。')
  if (action.operation === 'take-purple') return fail('紫金卡只由薰儿展示并收回，没有交给本人；普通黑卡不是这张卡。')
  if (action.operation === 'claim-rank') return fail('特殊卡说明不能据此授本人或薰儿斗灵境界、技能或身份。')
  if (action.operation === 'clear-debt') return fail('日后归还承诺与不必还的回应不执行还款，也不清空旧独立采购账。')
  if (action.operation === 'claim-victory') return fail('薰儿的判断不等于未来三年战斗已经获胜，不发胜利奖励。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state); next.earlyTraining.mountainVisitor = mountainVisitorAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 25 ? '当晚问答已归档；次晨普通黑卡交付与账本衔接待续。'
    : task.stage === 22 ? '本人已离山；后续切换薰儿留山的旁观焦点。' : '当晚这一步已保存；未到账，旧主线和采购账本保留。' }
}
export function submitEarlyMountainVisitor(store: GameStore, view: MountainVisitorView, action: MountainVisitorAction): boolean {
  const result = advanceEarlyMountainVisitor(store.getSnapshot().state, view, action)
  return commitEarlyResult(store, result, 'mountainVisitor')
}
