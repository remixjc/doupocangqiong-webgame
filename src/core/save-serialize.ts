import type { GameState } from './model'

export function serializeSave(state: GameState): string {
  return JSON.stringify({ game: 'doupocangqiong-webgame', savedAt: Date.now(), state }, null, 2)
}
