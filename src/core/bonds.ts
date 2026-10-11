import { bondEvents, bondLines } from '../content/bonds'
import { eventBlockReason, eventDone, eventProgress } from './events'
import type { GameState } from './model'
import { canEnter, isVisible } from './rules'

export function bondJournal(state: GameState) {
  return bondLines.flatMap(line => {
    const entries = bondEvents.filter(item => item.event.bond!.lineId === line.id && isVisible(state, item.chapter)).map(({ chapter, event }) => {
      const progress = eventProgress(state, chapter, event.id), done = eventDone(state, chapter, event.id)
      const response = event.bond!.options.find(option => option.choice === progress.choice)
      return {
        chapter, eventId: event.id, title: event.title, stage: progress.stage, total: event.stages.length - 1,
        done, canVisit: canEnter(state, chapter), response: response?.response, choice: response?.label,
        hint: !canEnter(state, chapter) ? '篇章尚未解锁。' : eventBlockReason(state, chapter, event) ||
          (done ? '记录已完成，可回访阅读；补给不会重复发放。' : progress.started ? event.stages[progress.stage] : `回访${event.speaker}，按E接取可选卷页。`),
      }
    })
    return entries.length ? [{ ...line, entries, completed: entries.filter(entry => entry.done).length }] : []
  })
}
