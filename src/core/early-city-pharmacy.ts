import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import { advanceEarlyTraining } from './early-training'
import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'
import { cityPharmacyAt, validCityPharmacy, type CityPharmacyState } from './early-city-pharmacy-state'
import { cityPharmacyScenes } from '../content/early-city-pharmacy'
export const cityPharmacyPlaces = {
  clan: { x: 140, y: 310, label: '族内同行路' }, gate: { x: 300, y: 310, label: '离族门前' },
  street: { x: 460, y: 310, label: '城中街道' }, stalls: { x: 540, y: 170, label: '街边摊位' },
  pharmacy: { x: 200, y: 170, label: '药铺柜前' },
} as const
export const cityPharmacyStart = { x: 140, y: 370 }
export function cityPositionValid(p: EarlyWalkPosition): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 24 && p.x <= 696 && p.y >= 24 && p.y <= 396
    && !(p.x > 288 && p.x < 472 && p.y > 38 && p.y < 212)
}
export function moveCityWalker(p: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!cityPositionValid(p)) return { ...cityPharmacyStart }
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return p
  const next = { x: p.x + delta[0], y: p.y + delta[1] }
  return cityPositionValid(next) ? next : p
}
export function cityPharmacyNear(p: EarlyWalkPosition, place: keyof typeof cityPharmacyPlaces): boolean {
  const target = cityPharmacyPlaces[place]
  return cityPositionValid(p) && Math.hypot(p.x - target.x, p.y - target.y) <= 38
}
export function earlyCityPharmacyBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return state.earlyTraining.morningCard.stage === 14 ? '' : '先完成晨间普通黑卡与同一采购账归档。'
}
export type CityPharmacyAction = CityPharmacyState & {
  actor: typeof cityPharmacyScenes[number]['actor']
  operation: typeof cityPharmacyScenes[number]['operation'] | 'claim-items' | 'charge-900' | 'claim-core' | 'restore-liquid'
  expectedStarted: boolean; expectedBorrowed: number; expectedSpent: number; expectedLiquid: number
  expectedPrimary: boolean; expectedAuxiliary: boolean; expectedCore: boolean
}
export function advanceEarlyCityPharmacy(state: GameState, p: EarlyWalkPosition, action: CityPharmacyAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyCityPharmacyBlock(state)
  if (blocked) return fail(blocked)
  const ledger = state.earlyTraining, task = ledger.cityPharmacy
  if (!validCityPharmacy(task) || (Object.keys(task) as (keyof CityPharmacyState)[]).some(key => task[key] !== action[key])
    || ledger.started !== action.expectedStarted || ledger.purse.borrowed !== action.expectedBorrowed || ledger.purse.spent !== action.expectedSpent
    || ledger.liquid.stage !== action.expectedLiquid || ledger.receipts.bluegrass !== action.expectedPrimary
    || ledger.receipts.boneflower !== action.expectedAuxiliary || ledger.receipts.woodCore !== action.expectedCore)
    return fail('同行、材料或采购账已变化，请按当前记录继续。')
  const scene = cityPharmacyScenes[task.stage]
  if (!scene) return fail('同行药铺已归档，不重复买药或领取材料。')
  if (!cityPharmacyNear(p, scene.place)) return fail(`本人先走近${cityPharmacyPlaces[scene.place].label}。`)
  if (action.operation === 'claim-items') return fail('逛摊与年份说明不发材料，实际药草订单必须核账。')
  if (action.operation === 'charge-900') return fail('两药沿原30与20折算收据，不追加原著900扣款。')
  if (action.operation === 'claim-core') return fail('这次药铺只有两药，不代签木核或黑铁片交付，旧收据保持。')
  if (action.operation === 'restore-liquid') return fail('补药铺历史不复原已用材料或药液。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  let next = structuredClone(state), primary = task.primaryOrder, auxiliary = task.auxiliaryOrder
  const item = scene.operation === 'purchase-primary' ? 'bluegrass' : scene.operation === 'purchase-auxiliary' ? 'boneflower' : undefined
  if (item) {
    const existing = ledger.receipts[item]
    if (!existing) {
      const bought = advanceEarlyTraining(state, { type: 'purchase', item, price: item === 'bluegrass' ? 30 : 20, expectedSpent: ledger.purse.spent })
      if (!bought.ok) return bought
      next = bought.state
    }
    if (item === 'bluegrass') primary = existing ? 'existing' : 'new'
    else auxiliary = existing ? 'existing' : 'new'
  }
  next.earlyTraining.cityPharmacy = cityPharmacyAt(task.stage + 1, primary, auxiliary)
  return { state: next, ok: true, message: item ? ledger.receipts[item] ? '旧药草收据只补历史，没有重复扣款或恢复库存。'
    : '药草与原唯一订单已一并保存。' : task.stage === 14 ? '同行药铺归档；坊市木核与附物另段接续。' : '同行药铺这一步已存，其他主线与物品保持。' }
}
export function submitEarlyCityPharmacy(store: GameStore, p: EarlyWalkPosition, action: CityPharmacyAction): boolean {
  const result = advanceEarlyCityPharmacy(store.getSnapshot().state, p, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message); return result.ok
}
