import { chapters } from '../content/chapters'
import type { Dialogue, GameState } from './model'
import { canEnter } from './rules'

export interface ChapterRecap {
  id: number
  title: string
  location: string
  opening: readonly Dialogue[]
  closing: readonly Dialogue[]
  completed: boolean
  note: string
}

// Reading a recap never enters a chapter, advances an event, or changes a save.
export function chapterRecaps(state: GameState): ChapterRecap[] {
  return chapters.filter(chapter => canEnter(state, chapter.id)
    && (state.progress[chapter.id]?.intro || state.completed.includes(chapter.id))).map(chapter => {
    const completed = state.completed.includes(chapter.id)
    return {
      id: chapter.id, title: chapter.title, location: chapter.location,
      opening: chapter.opening, closing: completed ? chapter.closing : [],
      completed, note: chapter.trialNote ?? '对白与历练为游戏压缩改编。',
    }
  })
}
