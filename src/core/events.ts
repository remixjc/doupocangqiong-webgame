import { eventForChapter } from '../content/events'
import { blankEvent, type ChapterEventProgress, type GameState } from './model'

export type EventAction =
  | { type: 'begin' | 'strike' | 'dodge' | 'deliver' }
  | { type: 'seal'; index: number }
  | { type: 'quote'; amount: number }
export interface EventResult { state: GameState; ok: boolean; message: string }
export function eventDone(state: GameState, id = state.chapter): boolean {
  const event = eventForChapter(id)
  const progress = state.progress[id]?.event
  return !event || (!!progress?.started && progress.stage === event.stages.length - 1)
}
export function eventHint(state: GameState): string {
  const event = eventForChapter(state.chapter), progress = state.progress[state.chapter]?.event
  if (!event || !progress) return ''
  return progress.started ? event.stages[progress.stage] : `靠近${event.speaker}，按 E 接下「${event.title}」`
}
export function migrateLegacyEvent(id: number, bossPassed: boolean): ChapterEventProgress {
  const event = eventForChapter(id)
  return event && bossPassed ? { started: true, stage: event.stages.length - 1, quote: event.kind === 'trade' ? 60 : 0 } : blankEvent()
}
export function advanceEvent(state: GameState, action: EventAction): EventResult {
  const event = eventForChapter(state.chapter), progress = state.progress[state.chapter]?.event
  const fail = (message: string): EventResult => ({ state, ok: false, message })
  if (!event || !progress) return fail('此篇章没有该剧情事件。')
  if (eventDone(state)) return fail('本次事件已经完成，奖励不会重复发放。')
  const next = structuredClone(state), p = next.progress[state.chapter].event
  let message = ''
  if (action.type === 'begin') {
    if (progress.started) return fail('已接下任务，继续完成当前目标。')
    p.started = true
    message = event.stages[0]
  } else {
    if (!progress.started) return fail('先与本章人物交谈，接下剧情任务。')
    if (event.kind === 'training' && ((action.type === 'strike' && p.stage === 0) || (action.type === 'dodge' && p.stage === 1))) {
      p.stage++
      message = event.stages[p.stage]
    } else if (event.kind === 'vow' && action.type === 'seal' && action.index === p.stage) {
      message = event.checkpoints![p.stage].text
      p.stage++
    } else if (event.kind === 'trade' && action.type === 'quote' && p.stage === 0) {
      if (![42, 60].includes(action.amount)) return fail('报价超过买方预算，订单未签订，也没有消耗材料。')
      p.quote = action.amount
      p.stage = 1
      message = `订单议定 ${action.amount} 金币，备好材料后返回执事处交付。`
    } else if (event.kind === 'trade' && action.type === 'deliver' && p.stage === 1) {
      if (state.inventory.herb < 2 || state.inventory.crystal < 1) return fail('还缺供货材料：灵草 ×2、魔晶 ×1。采集、投影战或坊市均可补充。')
      next.inventory.herb -= 2; next.inventory.crystal--
      next.gold += p.quote
      p.stage = 2
      message = `供货完成 · 收到 ${p.quote} 金币。`
    } else return fail('这次操作不符合当前剧情目标。')
  }
  return { state: next, ok: true, message }
}
