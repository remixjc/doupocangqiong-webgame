import { certificationTargets, eventsForChapter, findEvent, type ChapterEvent } from '../content/events'
import { blankEvent, type ChapterEventProgress, type GameState } from './model'

export type EventAction = ({ type: 'begin' | 'strike' | 'dodge' | 'deliver' | 'test' | 'survive' }
  | { type: 'seal'; index: number } | { type: 'quote'; amount: number }
  | { type: 'strategy'; choice: 'steady' | 'premium' }
  | { type: 'rune'; symbol: 'leaf' | 'moon' | 'fire'; step: number }
  | { type: 'pulse'; marker: number; stage: number }) & { eventId?: string }
export interface EventResult { state: GameState; ok: boolean; message: string }
export function eventProgress(state: GameState, chapter = state.chapter, eventId?: string): ChapterEventProgress {
  const event = findEvent(chapter, eventId)
  return (event && state.progress[chapter]?.events[event.id]) || blankEvent()
}
export function eventDone(state: GameState, chapter = state.chapter, eventId?: string): boolean {
  const events = eventId ? [findEvent(chapter, eventId)].filter((e): e is ChapterEvent => !!e) : eventsForChapter(chapter).filter(e => !e.optional)
  if (eventId && !events.length) return false
  return events.every(e => { const p = eventProgress(state, chapter, e.id); return p.started && p.stage === e.stages.length - 1 })
}
export function nextEvent(state: GameState, includeOptional = false): ChapterEvent | undefined {
  return eventsForChapter(state.chapter).find(e => (includeOptional || !e.optional) && !eventDone(state, state.chapter, e.id))
}
export function eventHint(state: GameState, eventId?: string): string {
  const event = eventId ? findEvent(state.chapter, eventId) : nextEvent(state)
  if (!event) return ''
  const p = eventProgress(state, state.chapter, event.id)
  return p.started ? event.stages[p.stage] : `靠近${event.speaker}，按 E 接下「${event.title}」`
}
export function migrateLegacyEvent(chapter: number, bossPassed: boolean, eventId?: string): ChapterEventProgress {
  const event = findEvent(chapter, eventId)
  return event && bossPassed ? { ...blankEvent(), started: true, stage: event.stages.length - 1,
    quote: event.kind === 'trade' ? 60 : 0, score: ['stone', 'certification'].includes(event.kind) ? 300 : 0,
    attempts: ['stone', 'certification'].includes(event.kind) ? 1 : 0, choice: event.kind === 'competition' ? 'steady' : 'none' } : blankEvent()
}
export function migrateLegacyEvents(chapter: number, bossPassed: boolean): Record<string, ChapterEventProgress> {
  return Object.fromEntries(eventsForChapter(chapter).map(e => [e.id, migrateLegacyEvent(chapter, bossPassed, e.id)]))
}
export function pulseMarker(elapsedMs: number): number {
  const phase = ((elapsedMs % 3600) + 3600) % 3600 / 1800
  return phase <= 1 ? phase : 2 - phase
}
export function advanceEvent(state: GameState, action: EventAction): EventResult {
  const event = findEvent(state.chapter, action.eventId), progress = eventProgress(state, state.chapter, event?.id)
  const fail = (message: string): EventResult => ({ state, ok: false, message })
  if (!event) return fail('此篇章没有该剧情事件。')
  if (eventDone(state, state.chapter, event.id)) return fail('本次事件已经完成，奖励不会重复发放。')
  if (event.requires?.some(id => !eventDone(state, state.chapter, id))) return fail('先完成前置历练，再接下此项任务。')
  const next = structuredClone(state), p = next.progress[state.chapter].events[event.id] ??= blankEvent()
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
    } else if (event.kind === 'cave' && action.type === 'seal' && action.index === 0 && p.stage <= 1) {
      p.stage = 1
      message = event.checkpoints![0].text
    } else if (event.kind === 'cave' && action.type === 'rune' && p.stage === 1) {
      if (action.step !== p.score || !['leaf', 'moon', 'fire'].includes(action.symbol)) return fail('机关输入已更新，请按当前步骤继续。')
      if (action.symbol !== ['leaf', 'moon', 'fire'][p.score]) {
        p.score = 0; p.attempts++
        message = '符文顺序不对，机关复位。没有消耗材料；可回到石刻重新查看线索。'
      } else {
        p.score++
        message = `符文响应 · 已解开 ${p.score} / 3 道封印。`
        if (p.score === 3) { p.stage = 2; p.score = 0; message = '三符相合，石门已经开启。穿过通道，前往宝匣。' }
      }
    } else if (event.kind === 'cave' && action.type === 'seal' && action.index === 2 && p.stage === 2) {
      next.inventory.herb += 3; next.inventory.crystal += 2; next.inventory.heal++
      p.stage = 3; message = event.checkpoints![2].text
    } else if (event.kind === 'cave' && action.type === 'deliver' && p.stage === 3) {
      p.stage = 4; message = '已与小医仙会合，洞穴探索完成。现在可前往试炼碑完成本章历练。'
    } else if (event.kind === 'escort' && action.type === 'seal' && action.index === p.stage && p.stage < 3) {
      if (p.stage < 2) next.inventory.herb++
      message = event.checkpoints![p.stage].text; p.stage++
    } else if (event.kind === 'survival' && action.type === 'seal' && action.index === 0 && p.stage === 0) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'survival' && action.type === 'survive' && p.stage === 1) {
      p.stage = 2; message = '撤离窗口已开。前往西侧撤离标记，按 E 安全离开。'
    } else if (event.kind === 'survival' && action.type === 'seal' && action.index === 1 && p.stage === 2) {
      p.stage = 3; message = event.checkpoints![1].text
    } else if (event.kind === 'certification' && action.type === 'seal' && action.index === 0 && p.stage <= 1) {
      p.stage = 1; message = event.checkpoints![0].text
    } else if (event.kind === 'certification' && action.type === 'test' && p.stage === 1) {
      p.stage = 2; p.score = 0; message = '公会已提供本次练习材料。先提炼，再融合，最后凝丹。'
    } else if (event.kind === 'certification' && action.type === 'pulse' && p.stage >= 2 && p.stage <= 4) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('这一步火候已锁定或输入无效。')
      p.score += Math.max(0, Math.round(100 - Math.abs(action.marker - certificationTargets[p.stage - 2]) * 200))
      p.stage++; message = `本步控火记录完成 · 累计 ${p.score} / 300 分。`
      if (p.stage === 5) {
        p.attempts++
        if (p.score < 210) { message = `本次 ${p.score} 分，未达到210分。公会材料已回收，可免费重试。`; p.stage = 1; p.score = 0 }
        else message = `三步控火通过 · ${p.score} / 300 分。返回认证执事处登记。`
      }
    } else if (event.kind === 'certification' && action.type === 'deliver' && p.stage === 5) {
      next.gold += 40; next.xp += 50; p.stage = 6
      message = '控火认证已经登记 · 40金币、50修炼积累。练习不另生成丹药，继续前往审核台。'
    } else if (event.kind === 'trade' && action.type === 'quote' && p.stage === 0) {
      if (![42, 60].includes(action.amount)) return fail('报价超过买方预算，订单未签订，也没有消耗材料。')
      p.quote = action.amount
      p.stage = 1
      message = `订单议定 ${action.amount} 金币，备好材料后返回执事处交付。`
    } else if (event.kind === 'stone' && action.type === 'test' && p.stage === 0) {
      p.stage = 1; p.score = 0; message = '指针靠近中央时锁定斗气，三次合计需 180 分。'
    } else if (event.kind === 'stone' && action.type === 'pulse' && p.stage >= 1 && p.stage <= 3) {
      if (action.stage !== p.stage || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('此道斗气已锁定或输入无效。')
      p.score += Math.round(100 - Math.abs(action.marker - .5) * 200); p.stage++
      message = `已锁定 · 累计 ${p.score} / 300 分。`
      if (p.stage === 4) {
        p.attempts++
        if (p.score < 180) { message = `本次 ${p.score} 分，未达到 180 分。未消耗材料，可免费重新测试。`; p.stage = 0; p.score = 0 }
        else message = `控气测试通过 · ${p.score} / 300 分。评估不改变原著境界。`
      }
    } else if (event.kind === 'competition' && action.type === 'strategy' && p.stage === 0) {
      if (!['steady', 'premium'].includes(action.choice)) return fail('委托策略无效。')
      p.choice = action.choice; p.stage = action.choice === 'steady' ? 4 : 1
      message = event.stages[p.stage]
    } else if (event.kind === 'competition' && action.type === 'seal' && p.choice === 'premium' && p.stage >= 1 && p.stage <= 3 && action.index === p.stage - 1) {
      message = event.checkpoints![action.index].text; p.stage++
    } else if (action.type === 'deliver' && ((event.kind === 'trade' && p.stage === 1) || (event.kind === 'competition' && p.stage === 4))) {
      const premium = p.choice === 'premium', herbs = premium ? 4 : 2, crystals = premium ? 2 : 1
      if (state.inventory.herb < herbs || state.inventory.crystal < crystals) return fail(`还缺供货材料：灵草 ×${herbs}、魔晶 ×${crystals}。失败不扣材料。`)
      next.inventory.herb -= herbs; next.inventory.crystal -= crystals
      const gold = event.kind === 'trade' ? p.quote : premium ? 135 : 70
      next.gold += gold
      if (event.kind === 'competition' && premium) next.inventory.elixir++
      p.stage = event.stages.length - 1
      message = `供货完成 · 收到 ${gold} 金币${premium ? '与修炼丹 ×1' : ''}。`
    } else return fail('这次操作不符合当前剧情目标。')
  }
  return { state: next, ok: true, message }
}
