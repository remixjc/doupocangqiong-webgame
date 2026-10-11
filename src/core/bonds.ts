import { bondEvents, bondLines } from '../content/bonds'
import { findEvent, type ChapterEvent } from '../content/events'
import { eventBlockReason, eventDone, eventProgress } from './events'
import type { GameState } from './model'
import { canEnter, isVisible } from './rules'

export type BondStatus = 'done' | 'locked' | 'blocked' | 'available' | 'reading' | 'report'
export const bondStatusLabels: Record<BondStatus, string> = {
  done: '已完成', locked: '未解锁', blocked: '待补前置', available: '可接取', reading: '进行中', report: '待确认',
}

function missingPage(state: GameState, event: ChapterEvent) {
  let pending = event
  const seen = new Set<string>()
  let result: { chapter: number; eventId: string; title: string; canVisit: boolean } | undefined
  while (true) {
    const dep = pending.requiresHistory?.find(item => !eventDone(state, item.chapter, item.eventId))
    if (!dep || !isVisible(state, dep.chapter) || seen.has(`${dep.chapter}/${dep.eventId}`)) return result
    seen.add(`${dep.chapter}/${dep.eventId}`)
    const prior = findEvent(dep.chapter, dep.eventId)
    if (!prior?.bond) return result
    result = { ...dep, title: prior.title, canVisit: canEnter(state, dep.chapter) }
    pending = prior
  }
}

export function bondJournal(state: GameState) {
  return bondLines.flatMap(line => {
    const entries = bondEvents.filter(item => item.event.bond!.lineId === line.id && isVisible(state, item.chapter)).map(({ chapter, event }) => {
      const progress = eventProgress(state, chapter, event.id), done = eventDone(state, chapter, event.id)
      const response = event.bond!.options.find(option => option.choice === progress.choice)
      const canVisit = canEnter(state, chapter), blocked = eventBlockReason(state, chapter, event)
      const status: BondStatus = done ? 'done' : !canVisit ? 'locked' : blocked ? 'blocked' :
        !progress.started ? 'available' : progress.stage === 2 ? 'report' : 'reading'
      return {
        chapter, eventId: event.id, title: event.title, stage: progress.stage, total: event.stages.length - 1,
        done, canVisit, status, statusLabel: bondStatusLabels[status], prerequisite: missingPage(state, event),
        response: response?.response, choice: response?.label,
        destination: !progress.started || progress.stage === 2 || done ? event.speaker : event.checkpoints![progress.stage].label,
        hint: !canVisit ? '篇章尚未解锁。' : blocked ||
          (done ? '记录已完成，可回访阅读；补给不会重复发放。' : progress.started ? event.stages[progress.stage] : `回访${event.speaker}，按E接取可选卷页。`),
      }
    })
    return entries.length ? [{ ...line, entries, completed: entries.filter(entry => entry.done).length }] : []
  })
}

export function bondVisitQueue(state: GameState) {
  const priority: Partial<Record<BondStatus, number>> = { report: 0, reading: 1, available: 2 }
  return bondJournal(state).flatMap(line => line.entries
    .filter(entry => entry.status in priority)
    .map(entry => ({ ...entry, lineId: line.id, name: line.name })))
    .sort((a, b) => priority[a.status]! - priority[b.status]! ||
      Number(b.chapter === state.chapter) - Number(a.chapter === state.chapter) || a.chapter - b.chapter)
}
