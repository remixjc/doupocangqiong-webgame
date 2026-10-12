import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'
import { EARLY_LOAN } from './early-training-state'
import { morningCardAt, validMorningCard, type MorningCardState } from './early-morning-card-state'
import { morningCardScenes } from '../content/early-morning-card'
export const morningCardPlaces = {
  room: { x: 180, y: 220, label: '房内调息处' },
  chest: { x: 320, y: 220, label: '旧积蓄抽屉' },
  door: { x: 520, y: 220, label: '门前交接处' },
} as const
export const morningCardStart = { x: 180, y: 340 }
export function morningPositionValid(p: EarlyWalkPosition): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 24 && p.x <= 696 && p.y >= 170 && p.y <= 396
}
export function moveMorningWalker(p: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!morningPositionValid(p)) return { ...morningCardStart }
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return p
  const next = { x: p.x + delta[0], y: p.y + delta[1] }
  return morningPositionValid(next) ? next : p
}
export function morningCardNear(p: EarlyWalkPosition, place: keyof typeof morningCardPlaces): boolean {
  const target = morningCardPlaces[place]
  return morningPositionValid(p) && Math.hypot(p.x - target.x, p.y - target.y) <= 38
}
export function earlyMorningCardBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return state.earlyTraining.mountainVisitor.stage === 26 ? '' : '先完成当晚来访与本人离山归档。'
}
export type MorningCardAction = MorningCardState & {
  actor: typeof morningCardScenes[number]['actor']
  operation: typeof morningCardScenes[number]['operation'] | 'claim-purple' | 'claim-capacity' | 'claim-savings' | 'restore-supplies'
  expectedStarted: boolean; expectedBorrowed: number; expectedSpent: number
}
export function advanceEarlyMorningCard(state: GameState, p: EarlyWalkPosition, action: MorningCardAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyMorningCardBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.morningCard, ledger = state.earlyTraining
  if (!validMorningCard(task) || (Object.keys(task) as (keyof MorningCardState)[]).some(key => task[key] !== action[key])
    || ledger.started !== action.expectedStarted || ledger.purse.borrowed !== action.expectedBorrowed || ledger.purse.spent !== action.expectedSpent)
    return fail('晨间交卡或采购账已变化，请按当前记录继续。')
  const scene = morningCardScenes[task.stage]
  if (!scene) return fail('晨间交卡已归档，不能重领资金。')
  if (!morningCardNear(p, scene.place)) return fail(`本人先走近${morningCardPlaces[scene.place].label}。`)
  if (action.operation === 'claim-purple') return fail('当晚紫金卡仍由薰儿保管；本次是另一张普通黑卡。')
  if (action.operation === 'claim-capacity') return fail('普通卡容量不是余额，不能据此领取5000或追加采购资金。')
  if (action.operation === 'claim-savings') return fail('积蓄盒仅记历史动作，不新增400或改变采购自有资金。')
  if (action.operation === 'restore-supplies') return fail('接卡不复原已用材料或药液，不清除已付收据。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或次序不符，请按当前提示继续。')
  if (scene.operation === 'receive-black' && !ledger.started) return fail('先明确记下独立重修准备单，再本人接卡同步采购账。')
  const next = structuredClone(state)
  let link = task.funds
  if (scene.operation === 'receive-black') {
    const result = ledger.purse.borrowed === 0
    link = result ? 'credited' : 'existing'
    if (result) next.earlyTraining.purse.borrowed = EARLY_LOAN
  }
  next.earlyTraining.morningCard = morningCardAt(task.stage + 1, link)
  return { state: next, ok: true, message: scene.operation === 'receive-black'
    ? link === 'credited' ? '本人接普通黑卡与唯一160折算借资已在同一存档事务保存。' : '本人接卡历史已补；既有借资、收据和材料保持，没有重发160。'
    : task.stage === 13 ? '晨间交卡归档；实际入城和采购待续。' : '晨间这一步已存；主线与其他材料不变。' }
}
export function submitEarlyMorningCard(store: GameStore, p: EarlyWalkPosition, action: MorningCardAction): boolean {
  const result = advanceEarlyMorningCard(store.getSnapshot().state, p, action)
  if (result.ok) store.update(state => { state.earlyTraining.morningCard = result.state.earlyTraining.morningCard; state.earlyTraining.purse.borrowed = result.state.earlyTraining.purse.borrowed })
  store.notify(result.message); return result.ok
}
