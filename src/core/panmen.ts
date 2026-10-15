import type { GameState } from './model'
import { isVisible } from './rules'

export interface PanmenFounding {
  revision: number
  stage: number
  place: number
  duties: number[]
}

export const panmenAvailable = (s: GameState) => s.completed.includes(14) && isVisible(s, 14)

export function parsePanmenFounding(value: unknown): PanmenFounding {
  const fail = () => { throw new Error('磐门筹议记录无效。') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const p = value as PanmenFounding
  const integer = (v: unknown, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max
  if (Object.keys(p).sort().join() !== 'duties,place,revision,stage' ||
    !integer(p.revision, 10_000_000) || !integer(p.stage, 5) ||
    p.revision < [1, 3, 5, 10, 11, 13][p.stage] || !integer(p.place, 3) ||
    !Array.isArray(p.duties) || p.duties.length !== 3 || !p.duties.every(v => integer(v, 2)) ||
    (p.stage < 2 && p.duties.some(v => v !== 2)) ||
    (p.stage === 2 && p.revision < 5 + p.duties.filter(v => v !== 2).length) ||
    (p.stage >= 3 && p.duties.join() !== '0,1,1') ||
    (p.stage === 5 && p.place !== 1)) return fail()
  return { ...p, duties: [...p.duties] }
}

export type PanmenCommand =
  { type: 'begin' | 'confirm' } |
  { type: 'walk'; place: number } |
  { type: 'answer'; option: number } |
  { type: 'assign'; member: number; duty: number }
export type PanmenAction = PanmenCommand & { revision: number }

// Optional, separate history. Neither main clears nor the anonymous exercise sign it.
export function advancePanmen(s: GameState, action: PanmenAction): { ok: boolean; message: string; founding?: PanmenFounding } {
  const no = (message: string) => ({ ok: false, message })
  if (!panmenAvailable(s)) return no('需内院首通及剧透范围允许。')
  const old = s.panmenFounding
  if (action.revision !== (old?.revision ?? 0)) return no('筹议已更新，请重新操作。')
  if (!old) return action.type === 'begin' ? { ok: true, message: '进入新生院落。',
    founding: { revision: 1, stage: 0, place: 0, duties: [2, 2, 2] } } : no('先进入院落。')
  if (old.stage === 5 || old.revision >= 10_000_000) return no('筹议已归档，请查看记录。')
  const p = { ...old, duties: [...old.duties], revision: old.revision + 1 }
  let message = ''
  if (action.type === 'walk') {
    if (![0, 1, 2, 3].includes(action.place) || p.place === action.place) return no('请选择另一处院落位置。')
    p.place = action.place; message = '已走到会面处。'
  } else if (action.type === 'assign' && p.stage === 2 && p.place === 3) {
    if (![0, 1, 2].includes(action.member) || ![0, 1, 2].includes(action.duty) ||
      p.duties[action.member] === action.duty) return no('请选择不同的有效分工。')
    p.duties[action.member] = action.duty; message = '分工草案已保存。'
  } else if (action.type === 'answer' && p.stage === 0 && p.place === 1) {
    if (action.option !== 0) return no('新生请求互助自保；再听一听，不扣资源。')
    p.stage = 1; message = '互助的请求已听取，去与薰儿商议。'
  } else if (action.type === 'confirm' && p.stage === 1 && p.place === 2) {
    p.stage = 2; message = '管理提议已听取，到议事处整理职责。'
  } else if (action.type === 'confirm' && p.stage === 2 && p.place === 3) {
    if (p.duties.join() !== '0,1,1') return no('萧炎带头，薰儿与琥嘉管理。请调整草案，不扣资源。')
    p.stage = 3; message = '分工核对通过，请为新生组织定名。'
  } else if (action.type === 'answer' && p.stage === 3 && p.place === 3) {
    if (action.option !== 1) return no('取意坚如磐石，请重新选择，不扣资源。')
    p.stage = 4; message = '名称已定为磐门，回到新生处共同确认。'
  } else if (action.type === 'confirm' && p.stage === 4 && p.place === 1) {
    p.stage = 5; message = '磐门筹议已归档。'
  } else return no('请按当前筹议前往相应位置。')
  return { ok: true, message, founding: p }
}
