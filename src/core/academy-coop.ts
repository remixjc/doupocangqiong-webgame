import type { GameState } from './model'
import type { AcademyCoop } from './academy-coop-state'
import { isVisible } from './rules'

export type CoopCommand =
  { type: 'begin' | 'dispatch' | 'rest' | 'retry' | 'report' } |
  { type: 'assign'; member: number; role: number } |
  { type: 'respond'; option: number }
export type CoopAction = { revision: number } & CoopCommand
export const coopAvailable = (s: GameState) => s.completed.includes(14) && isVisible(s, 14)

export function advanceAcademyCoop(s: GameState, action: CoopAction): { ok: boolean; message: string; coop?: AcademyCoop } {
  const no = (message: string) => ({ ok: false, message })
  if (!coopAvailable(s)) return no('需内院首通及剧透范围允许。')
  const previous = s.academyCoop
  if (action.revision !== (previous?.revision ?? 0)) return no('账本已更新，请重新操作。')
  if (!previous) return action.type === 'begin'
    ? { ok: true, message: '协作演练账本已建立。', coop: { revision: 1, completed: 0, merit: 0,
      supplies: 6, assignments: [3, 3, 3], phase: 'plan', step: 0, mistakes: 0 } }
    : no('先建立账本。')
  if (previous.revision >= 10_000_000 || previous.completed >= 1_000_000) return no('记录已满，请导出。')
  const p = { ...previous, assignments: [...previous.assignments], revision: previous.revision + 1 }
  let message = ''
  if (action.type === 'assign' && p.phase === 'plan') {
    if (![0, 1, 2].includes(action.member) || ![0, 1, 2, 3].includes(action.role) ||
      p.assignments[action.member] === action.role) return no('需不同的有效职责。')
    p.assignments[action.member] = action.role
    message = '职责草案已保存。'
  } else if (action.type === 'rest' && p.phase === 'plan' && p.supplies < 6) {
    p.supplies = 6; message = '免费整理，演练物资恢复至6。'
  } else if (action.type === 'dispatch' && p.phase === 'plan') {
    if (new Set(p.assignments).size !== 3 || p.assignments.includes(3)) return no('三项职责各安排一名学员。')
    if (p.supplies < 3) return no('需留1份现场物资，先整理。')
    p.supplies -= 2; p.phase = 'field'; message = '出发，物资-2。'
  } else if (action.type === 'respond' && p.phase === 'field') {
    if (![0, 1, 2].includes(action.option)) return no('请选择现场处理。')
    const need = (p.completed % 3 + p.step) % 3
    if (action.option !== need) {
      p.supplies = Math.max(0, p.supplies - 2); p.mistakes++
      message = '处理失误，物资-2，节点未完成。'
    } else {
      if (p.assignments[need] !== need) p.supplies = Math.max(0, p.supplies - 1)
      if (p.supplies > 0) p.step++
      message = p.assignments[need] === need ? '特长匹配，节点完成。' : '跨职物资-1，节点完成。'
    }
    if (p.supplies === 0) { p.phase = 'failed'; message = '物资耗尽，可免费整队。' }
    else if (p.step === 3) { p.phase = 'review'; message = '三步完成，请登记。' }
  } else if (action.type === 'retry' && p.phase === 'failed') {
    p.phase = 'plan'; p.step = 0; p.mistakes = 0; p.supplies = 6
    message = '免费整队，旧报告保留。'
  } else if (action.type === 'report' && p.phase === 'review') {
    const award = p.completed < 3 ? 3 : 0
    p.completed++; p.merit += award; p.phase = 'plan'; p.step = 0; p.mistakes = 0
    message = `已登记，协作章+${award}。`
  } else return no('当前节点不能进行此操作。')
  return { ok: true, message, coop: p }
}
