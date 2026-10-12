import type { GameState } from './model'
import { earlyTrainingBlock } from './early-training'
import { isVisible } from './rules'

// The shared prerequisite must not pull the deferred entry scene into startup.
export function earlyQiPavilionBlock(state: GameState): string {
  if (!isVisible(state, 3)) return '这段往事超出当前剧透范围。'
  return earlyTrainingBlock(state)
    || (state.earlyTraining.ceremonyVerdict.stage !== 16 ? '先归档成人礼的正式裁定与离场，再赴五天后的功法阁。' : '')
}
