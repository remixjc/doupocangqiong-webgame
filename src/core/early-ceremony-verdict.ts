import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyNingSecondBlock } from './early-ning-second'
import { ningPlaces } from './early-ning-first'
import { validCeremonialPosition } from './early-ceremonial-test'
import { validCeremonyVerdict, ceremonyVerdictAt, type CeremonyVerdictState } from './early-training-state'
import { ceremonyVerdictScenes } from '../content/early-ceremony-verdict'
export const verdictPlaces = { waiting: ningPlaces.waiting, stairs: ningPlaces.stairs,
  outside: { x: 676, y: 280, label: '场外 · 萧宁交接' }, exit: { x: 160, y: 340, label: '场口 · 离场同行' } } as const
export function nearVerdictPlace(position: EarlyWalkPosition, place: keyof typeof verdictPlaces): boolean {
  const target = verdictPlaces[place]
  return validCeremonialPosition(position, 2) && Math.hypot(position.x - target.x, position.y - target.y) <= 38
}
export type CeremonyVerdictAction = CeremonyVerdictState & {
  actor: typeof ceremonyVerdictScenes[number]['actor']
  operation: typeof ceremonyVerdictScenes[number]['operation'] | 'fight' | 'take-method' | 'take-technique'
}
export function earlyCeremonyVerdictBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyNingSecondBlock(state, position)
    || (state.earlyTraining.ningSecond.stage !== 8 ? '先记录违规再攻与追加拳击出场，再接正式裁定。' : '')
}
export function advanceEarlyCeremonyVerdict(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: CeremonyVerdictAction): Transaction {
  const blocked = earlyCeremonyVerdictBlock(state, entryPosition)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.ceremonyVerdict, scene = ceremonyVerdictScenes[task.stage]
  if (!scene || !validCeremonyVerdict(task) || (Object.keys(task) as (keyof CeremonyVerdictState)[]).some(key => task[key] !== action[key]))
    return { state, ok: false, message: '正式裁定记录已变化，请按当前步骤继续。' }
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return { state, ok: false, message: '当前人物或步骤不符；不得再开第三场、接受未传授物品或提前裁定。' }
  if (!nearVerdictPlace(position, scene.place))
    return { state, ok: false, message: `请先走近${verdictPlaces[scene.place].label}。` }
  const next = structuredClone(state), stage = task.stage + 1
  next.earlyTraining.ceremonyVerdict = { stage, ...ceremonyVerdictAt(stage) }
  return { state: next, ok: true, message: stage >= 7 ? '正式胜负已宣布；后续礼程与离场按序保存，不重复发奖。' : '请求与处分步骤已保存，胜负尚未宣布。' }
}
export function submitEarlyCeremonyVerdict(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: CeremonyVerdictAction): boolean {
  const result = advanceEarlyCeremonyVerdict(store.getSnapshot().state, entryPosition, position, action)
  return commitEarlyResult(store, result)
}
