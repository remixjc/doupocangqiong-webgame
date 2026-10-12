import type { GameState } from './model'
import { isVisible } from './rules'
export function earlyHistoryBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return ''
}
