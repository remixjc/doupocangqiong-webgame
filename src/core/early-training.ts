import type { GameState } from './model'
import { isVisible, type Transaction } from './rules'
import { EARLY_LOAN, earlySupplies, type EarlySupplyId } from './early-training-state'
import { advanceEarlyQiScroll, type QiScrollAction } from './early-qi-scroll'

export function earlyTrainingBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '重修往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通结算后，可回顾拜师后的重修准备。'
  return ''
}
export type EarlyTrainingAction =
  | { type: 'borrow'; expectedSpent: number }
  | { type: 'purchase'; item: EarlySupplyId; price: number; expectedSpent: number }
  | { type: 'market'; step: number; expectedSpent: number }
  | { type: 'liquid'; step: number; operation: 'identify' | 'water' | 'primary' | 'auxiliary' | 'core' | 'dilute'; expectedSpent: number }
  | { type: 'practice'; operation: 'begin' | 'pulse' | 'attempt' | 'finish'; phase: number; pulse: number; attempts?: number; marker?: number; expectedSpent: number }
  | (QiScrollAction & { type: 'qi-scroll'; expectedSpent: number })

export function advanceEarlyTraining(state: GameState, action: EarlyTrainingAction): Transaction {
  if (action.type === 'qi-scroll') return advanceEarlyQiScroll(state, action)
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyTrainingBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining
  if (!task.started) return fail('先记下重修准备。')
  if (action.expectedSpent !== task.purse.spent) return fail('采购记录已变化，请按当前清单重新操作。')
  const next = structuredClone(state)
  if (action.type === 'practice') {
    if (!task.liquid.ready) return fail('先请老师调制并加水，才能开始这次初期练习。')
    const practice = task.practice
    if (action.phase !== practice.phase || action.pulse !== practice.pulse
      || (action.attempts ?? 0) !== practice.attempts || practice.phase === 4)
      return fail('当前练习已变化或结束，请按当前提示继续。')
    const updated = next.earlyTraining.practice
    if (action.operation === 'begin' && practice.phase === 0) updated.phase = 1
    else if (action.operation === 'pulse' && practice.phase === 1) {
      if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1
        || practice.attempts >= 1_000_000) return fail('调息输入无效，没有消耗药液或材料。')
      updated.score += Math.round(100 - Math.abs(action.marker - .5) * 200)
      updated.pulse++
      if (updated.pulse === 3) {
        if (updated.score >= 180) updated.phase = 2
        else { updated.attempts++; updated.pulse = 0; updated.score = 0 }
      }
    } else if (action.operation === 'attempt' && practice.phase === 2) updated.phase = 3
    else if (action.operation === 'finish' && practice.phase === 3) updated.phase = 4
    else return fail('当前练习的操作次序无效。')
    return { state: next, ok: true, message: updated.phase === 4 ? '初期重修与斗技尝试已记下，继续踏实修炼。' : '这一步练习已记录；节奏失误可免费重来。' }
  }
  if (action.type === 'liquid') {
    if (!task.receipts.woodCore || task.market.stage !== 4) return fail('先备齐材料，完成坊市交涉并带回黑铁片。')
    if (action.step !== task.liquid.stage || task.liquid.stage === 6) return fail('此步骤已完成，或调制次序无效。')
    const operations = ['identify', 'water', 'primary', 'auxiliary', 'core', 'dilute']
    if (action.operation !== operations[action.step]) return fail('请按老师指导完成当前步骤，材料没有被消耗。')
    if (action.step === 1) next.earlyTraining.liquid.water = true
    const consumed = ({ 2: 'bluegrass', 3: 'boneflower', 4: 'woodCore' } as const)[action.step as 2 | 3 | 4]
    if (consumed) {
      if (task.supplies[consumed] !== earlySupplies[consumed].quantity) return fail('当前步骤需要的任务材料不齐。')
      next.earlyTraining.supplies[consumed] = 0
    }
    next.earlyTraining.liquid.stage++
    if (action.step === 5) next.earlyTraining.liquid.ready = true
    return { state: next, ok: true, message: action.step === 5 ? '药老将药液加入清水，修炼准备已经完成。' : '当前准备与观察已记下，可关闭后继续。' }
  }
  if (action.type === 'market') {
    if (!task.receipts.bluegrass || !task.receipts.boneflower) return fail('先买齐药草，再回顾坊市采购。')
    if (action.step !== task.market.stage || task.market.stage === 4) return fail('坊市这一段已读过，或操作次序无效。')
    if (action.step === 3 && !task.receipts.woodCore) return fail('先付清魔核采购订单，再核对附物交付。')
    next.earlyTraining.market.stage++
    if (action.step === 3) next.earlyTraining.market.blackIron = 1
    return { state: next, ok: true, message: action.step === 3 ? '魔核交易附物已核对：黑铁片由任务袋保管，未再次付账。' : '坊市往事已记下，继续交涉。' }
  }
  if (action.type === 'borrow') {
    if (task.purse.borrowed !== 0) return fail('借资已经记账，不能重复领取。')
    next.earlyTraining.purse.borrowed = EARLY_LOAN
    return { state: next, ok: true, message: '薰儿借出的采购资金已单独记账。' }
  }
  if (action.type !== 'purchase' || !Object.hasOwn(earlySupplies, action.item)) return fail('采购项目无效。')
  const item = earlySupplies[action.item]
  if (task.receipts[action.item]) return fail('该项材料已购入，无需再次付账。')
  if (action.price !== item.price) return fail('报价已失效，未扣除采购资金。')
  if (action.item === 'woodCore' && (!task.receipts.bluegrass || !task.receipts.boneflower))
    return fail('先在药铺买齐两种药草，再去坊市寻找指定魔核。')
  if (task.purse.borrowed - task.purse.spent < item.price) return fail('采购资金不足，先向薰儿借资。')
  next.earlyTraining.purse.spent += item.price
  next.earlyTraining.supplies[action.item] = item.quantity
  next.earlyTraining.receipts[action.item] = true
  return { state: next, ok: true, message: `${item.label}已由药铺或摊主交付，任务袋与货款同步记账。` }
}
export function beginEarlyTraining(state: GameState): Transaction {
  const blocked = earlyTrainingBlock(state)
  if (blocked) return { state, ok: false, message: blocked }
  if (state.earlyTraining.started) return { state, ok: false, message: '重修准备单已经记下。' }
  const next = structuredClone(state)
  next.earlyTraining.started = true
  return { state: next, ok: true, message: '重修准备单已记下。材料和资金仍需另行取得。' }
}
