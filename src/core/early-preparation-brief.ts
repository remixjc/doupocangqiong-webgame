import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { mountainRingNear, mountainRingPlaces } from './early-mountain-ring'
import { preparationBriefAt, validPreparationBrief, type PreparationBriefState } from './early-preparation-brief-state'
import { preparationBriefScenes } from '../content/early-preparation-brief'
export function earlyPreparationBriefBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return state.earlyTraining.methodDiscussion.stage === 28 ? '' : '先完成青石前功法说明，再接温和方案、准备单和返戒。'
}
export type PreparationBriefAction = PreparationBriefState & {
  actor: typeof preparationBriefScenes[number]['actor']
  operation: typeof preparationBriefScenes[number]['operation'] | 'claim-materials' | 'wear-early' | 'claim-money' | 'claim-liquid'
}
export function advanceEarlyPreparationBrief(state: GameState, position: EarlyWalkPosition, action: PreparationBriefAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyPreparationBriefBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.preparationBrief
  if (!validPreparationBrief(task) || (Object.keys(task) as (keyof PreparationBriefState)[]).some(key => task[key] !== action[key]))
    return fail('准备说明记录已变化，请按当前步骤继续。')
  const scene = preparationBriefScenes[task.stage]
  if (!scene) return fail('准备说明与返戒已归档，不重发材料、资金或奖励。')
  if (!mountainRingNear(position, scene.place)) return fail(`请先走近${mountainRingPlaces[scene.place].label}。`)
  if (action.operation === 'claim-materials') return fail('三类准备要求不是采购完成，不发任务材料副本或清空旧收据。')
  if (action.operation === 'wear-early') return fail('老师入戒与同戒返手分开保存；返手之前仍浮空。')
  if (action.operation === 'claim-money') return fail('资金顾虑、借资打算与真正到账分开；本段不新增400或扣1000，不重发既有借资。')
  if (action.operation === 'claim-liquid') return fail('温和方案和材料单不等于调制完成；药液必须由已有采购与调制链接续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state); next.earlyTraining.preparationBrief = preparationBriefAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 19 ? '准备说明与正式返戒已归档；已有准备、资金和收据保留。'
    : '这一历史步骤已保存；没有派发材料、资金、药液或主线奖励。' }
}
export function submitEarlyPreparationBrief(store: GameStore, position: EarlyWalkPosition, action: PreparationBriefAction): boolean {
  const result = advanceEarlyPreparationBrief(store.getSnapshot().state, position, action)
  if (result.ok) store.update(state => { state.earlyTraining.preparationBrief = result.state.earlyTraining.preparationBrief })
  store.notify(result.message); return result.ok
}
