import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { chapterById } from '../src/content/chapters'
import { eventsForChapter, findEvent } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { bondJournal } from '../src/core/bonds'
import { advanceEvent, eventBlockReason, eventDone, eventProgress, migrateLegacyEvents, nextEvent, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function cleared(count = 28) {
  const s = initialState(); s.chapter = count; s.completed = Array.from({ length: count }, (_, i) => i + 1); s.flame = count >= 25 ? 'pure' : 'ember'
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), herbs: 4, kills: 5, brews: [6, 9, 20].includes(chapter) ? 2 : 0,
    boss: true, events: migrateLegacyEvents(chapter, true) }
  return s
}
function act(s: ReturnType<typeof cleared>, id: string, action: EventAction) { return advanceEvent(s, { ...action, eventId: id }) }
function complete(s: ReturnType<typeof cleared>, id: string, choice: 'steady' | 'premium' = 'steady') {
  for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice }, { type: 'deliver' }] as EventAction[]) {
    const result = act(s, id, action); expect(result.ok, result.message).toBe(true); s = result.state
  }
  return s
}
describe('C10a 小医仙跨章回访与伙伴手札', () => {
  it('四页前置图无缺失或环，末页只能在终战正式首通后开放', () => {
    const visited = new Set<string>(), stack = new Set<string>()
    function visit(chapter: number, id: string) {
      const key = `${chapter}/${id}`, e = findEvent(chapter, id); expect(e).toBeDefined(); expect(stack.has(key)).toBe(false)
      if (visited.has(key)) return
      stack.add(key)
      for (const dep of e!.requires ?? []) visit(chapter, dep)
      for (const dep of e!.requiresHistory ?? []) visit(dep.chapter, dep.eventId)
      stack.delete(key); visited.add(key)
    }
    for (const { chapter, event } of bondEvents) visit(chapter, event.id)
    expect(bondEvents.filter(item => item.event.bond?.lineId === 'little-doctor')).toHaveLength(4)
    const s = cleared(27); s.chapter = 28; s.progress[28] = blankProgress(28)
    expect(act(s, bondEvents[3].event.id, { type: 'begin' }).message).toContain('正式首通')
  })
  it('本章前置与跨章前页阻止接取，但可选卷页不阻止首通或奖励', () => {
    const s = cleared(17), first = bondEvents[0], second = bondEvents[1]
    expect(chapterReady(s)).toBe(true); expect(nextEvent(s, true)).toBeUndefined()
    expect(act(s, second.event.id, { type: 'begin' }).state).toBe(s)
    expect(eventBlockReason(s, 17, second.event)).toContain('第4章')
    s.chapter = 4; s.progress[4].events[findEvent(4)!.id] = { ...s.progress[4].events[first.event.requires![0]], stage: 0, started: false }
    expect(act(s, first.event.id, { type: 'begin' }).message).toContain('本章前置')
  })
  it.each(['steady', 'premium'] as const)('%s回应只在报告时领奖，四页保留选择与奖励幂等', choice => {
    let s = cleared(), xp = s.xp, inventory = structuredClone(s.inventory), gold = s.gold
    for (const { chapter, event } of bondEvents) {
      s.chapter = chapter
      s = act(s, event.id, { type: 'begin' }).state
      expect(act(s, event.id, { type: 'deliver' }).state).toBe(s)
      expect(act(s, event.id, { type: 'seal', index: 1 }).state).toBe(s)
      s = act(s, event.id, { type: 'seal', index: 0 }).state; s = validateState(s)
      s = act(s, event.id, { type: 'strategy', choice }).state; s = validateState(s)
      expect(s.xp).toBe(xp); expect(s.inventory).toEqual(inventory)
      expect(act(s, event.id, { type: 'strategy', choice: choice === 'steady' ? 'premium' : 'steady' }).state).toBe(s)
      s = act(s, event.id, { type: 'deliver' }).state
      const reward = event.bond!.options.find(option => option.choice === choice)!.reward
      xp += reward.xp; inventory.heal += reward.heal ?? 0; inventory.mana += reward.mana ?? 0
      expect(s.xp).toBe(xp); expect(s.inventory).toEqual(inventory); expect(s.gold).toBe(gold)
      expect(eventDone(s, chapter, event.id)).toBe(true)
      expect(act(s, event.id, { type: 'deliver' }).state).toBe(s); expect(finishChapter(s)).toBe(s)
      expect(validateState(s)).toEqual(s)
    }
    const journal = bondJournal(s)[0]; expect(journal.completed).toBe(4)
    expect(journal.entries.every(entry => entry.choice && entry.response && entry.done)).toBe(true)
    expect(bondJournal(s).every(line => line.completed === line.entries.length)).toBe(true)
  })
  it('只在正确路标触发阅读或回应面板，远处E不能推进记录', () => {
    let s = cleared(4), opened: [string, number | undefined] | undefined
    const event = bondEvents[0].event
    s = act(s, event.id, { type: 'begin' }).state
    const w = new CombatWorld(chapterById(4), { state: () => s, collect: () => {}, kill: () => {}, heal: () => false, camp: () => {}, notify: () => {},
      eventAction: action => { s = advanceEvent(s, action).state }, storyEvent: (id, checkpoint) => { opened = [id, checkpoint] } })
    w.action('interact', { x: 0, y: 0 }); expect(eventProgress(s, 4, event.id).stage).toBe(0)
    Object.assign(w.player, event.checkpoints![0]); w.action('interact', { x: 0, y: 0 }); expect(eventProgress(s, 4, event.id).stage).toBe(1)
    Object.assign(w.player, event.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(opened).toEqual([event.id, 1]); expect(eventProgress(s, 4, event.id).stage).toBe(1)
    Object.assign(w.player, event.npc); expect(w.nearEvent()?.id).toBe(event.id)
  })
  it('交互点无碰撞且可达，离普通药草与其他事件点至少100像素', () => {
    for (const { chapter, event } of bondEvents) {
      const map = mapForChapter(chapter), points = [event.npc, ...event.checkpoints!]
      const existing = eventsForChapter(chapter).filter(other => other.id !== event.id).flatMap(other => [other.npc, ...(other.checkpoints ?? [])])
      const seen = new Set<string>(), queue = [{ x: 210, y: 630 }]; seen.add('210,630')
      for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
        const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
        if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || seen.has(key) || mapCollides(map, p, 22)) continue
        seen.add(key); queue.push(p)
      }
      for (const p of points) {
        expect(mapCollides(map, p, 22), `${chapter}/${p.x},${p.y}`).toBe(false)
        expect(queue.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 16)).toBe(true)
        for (const q of [...map.herbs, ...existing]) expect(Math.hypot(q.x - p.x, q.y - p.y), `${chapter}/${p.x},${p.y}`).toBeGreaterThanOrEqual(100)
      }
    }
  })
  it('防剧透手札不显示超出范围的伙伴/卷页/回应，主线解锁与卷页前置分别显示', () => {
    const s = cleared(4); s.settings.spoiler = 'anime'; s.settings.animeLimit = 3
    expect(bondJournal(s)).toEqual([])
    s.settings.animeLimit = 4
    const visible = bondJournal(s); expect(visible[0].entries).toHaveLength(1)
    expect(JSON.stringify(visible)).not.toContain('毒体'); expect(JSON.stringify(visible)).not.toContain('归途来信')
    s.settings.spoiler = 'novel'; expect(bondJournal(s)[0].entries[1].hint).toContain('尚未解锁')
  })
  it('导入拒绝无前页的跨章开始、提前尾声、伪造选择和无选择完成', () => {
    const first = bondEvents[0].event, second = bondEvents[1].event, last = bondEvents[3].event
    for (const choice of ['none', 'unknown']) {
      const s = cleared(4); s.progress[4].events[first.id] = { ...s.progress[4].events[first.id], started: true, stage: 3, choice: choice as 'none' }
      expect(() => validateState(s)).toThrow()
    }
    const missing = cleared(17); missing.progress[17].events[second.id].started = true
    expect(() => validateState(missing)).toThrow('跨章前置')
    const early = cleared(27); early.chapter = 28; early.progress[28] = blankProgress(28); early.progress[28].events[last.id].started = true
    expect(() => validateState(early)).toThrow('跨章前置')
    let reordered = cleared()
    for (const { chapter, event } of bondEvents) { reordered.chapter = chapter; reordered = complete(reordered, event.id) }
    reordered.progress = Object.fromEntries(Object.entries(reordered.progress).reverse())
    expect(validateState(reordered)).toEqual(reordered)
  })
  it.each([1, 2, 3])('schema%i旧通关不伪造伙伴记录、不补资源，可重返补做', schema => {
    const old = JSON.parse(JSON.stringify(cleared(4))); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.11.5'
    for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema < 3) {
        if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[findEvent(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
        delete p.events
      } else delete (p.events as Record<string, unknown>)[bondEvents[0].event.id]
    }
    const migrated = validateState(old); expect(eventProgress(migrated, 4, bondEvents[0].event.id).started).toBe(false)
    expect(migrated.gold).toBe(old.gold); expect(migrated.xp).toBe(old.xp); expect(migrated.inventory).toEqual(old.inventory)
    expect(complete(migrated, bondEvents[0].event.id).completed).toEqual(old.completed)
  })
})
