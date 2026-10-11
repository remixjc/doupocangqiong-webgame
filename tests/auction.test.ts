import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const id = 'black-corner-travel-auction'
function street(gold = 80) {
  const s = initialState(); s.chapter = 12; s.completed = Array.from({ length: 11 }, (_, n) => n + 1); s.flame = 'lotus'; s.gold = gold
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[12] = blankProgress(12)
  return s
}
function act(s: ReturnType<typeof street>, action: EventAction) { return advanceEvent(s, { ...action, eventId: id }) }
function enter(gold = 80) { return act(act(street(gold), { type: 'begin' }).state, { type: 'seal', index: 0 }).state }
function won() { return act(act(enter(), { type: 'bid', amount: 80 }).state, { type: 'resolve-bid' }).state }

describe('C5a 黑角域拍卖与托管', () => {
  it('先接取和读公告；缺款和非法出价保留原引用，不扣金币或材料', () => {
    let s = street()
    expect(act(s, { type: 'bid', amount: 40 }).state).toBe(s)
    s = act(s, { type: 'begin' }).state
    expect(act(s, { type: 'bid', amount: 40 }).state).toBe(s)
    s = enter(39)
    for (const amount of [40, 60, 80, NaN, Infinity, -1, 41]) expect(act(s, { type: 'bid', amount }).state).toBe(s)
    expect(s.gold).toBe(39)
  })
  it('40出价一次扣款，刷新保留托管；超价只退一次且能加价80', () => {
    let s = enter(), inventory = structuredClone(s.inventory)
    s = act(s, { type: 'bid', amount: 40 }).state
    expect(s.gold).toBe(40); expect(eventProgress(s)).toMatchObject({ stage: 2, quote: 40, attempts: 1 })
    expect(act(s, { type: 'bid', amount: 40 }).state).toBe(s)
    s = validateState(s); expect(s.gold).toBe(40); expect(eventProgress(s).quote).toBe(40)
    s = act(s, { type: 'resolve-bid' }).state
    expect(s.gold).toBe(80); expect(eventProgress(s)).toMatchObject({ stage: 3, quote: 0, score: 60 })
    expect(s.inventory).toEqual(inventory); expect(act(s, { type: 'resolve-bid' }).state).toBe(s)
    expect(act(s, { type: 'bid', amount: 60 }).state).toBe(s)
    s = act(s, { type: 'bid', amount: 80 }).state
    expect(s.gold).toBe(0); expect(eventProgress(validateState(s))).toMatchObject({ stage: 2, quote: 80, attempts: 2 })
    s = act(s, { type: 'resolve-bid' }).state
    expect(s.inventory.heal).toBe(inventory.heal + 2); expect(s.inventory.mana).toBe(inventory.mana + 2)
    expect(eventProgress(s).auctionOutcome).toBe('won'); expect(s.gold).toBe(0)
  })
  it('零金币旁观和被超价后退场都能推进，不领补给也不再退款', () => {
    let s = enter(0), before = structuredClone(s.inventory)
    s = act(s, { type: 'observe' }).state
    expect(s.gold).toBe(0); expect(s.inventory).toEqual(before)
    expect(eventProgress(validateState(s))).toMatchObject({ stage: 4, auctionOutcome: 'observed', quote: 0 })
    s = act(s, { type: 'deliver' }).state
    expect(chapterReady(s)).toBe(true)
    s = act(act(enter(60), { type: 'bid', amount: 60 }).state, { type: 'resolve-bid' }).state
    expect(s.gold).toBe(60)
    s = act(s, { type: 'observe' }).state
    expect(s.gold).toBe(60); expect(s.inventory).toEqual(before)
    expect(validateState(s)).toEqual(s); expect(act(s, { type: 'observe' }).state).toBe(s)
  })
  it('竞得补给只结算一次，回报30积累和首通分别幂等，不改变总炼药记录', () => {
    let s = won(), before = structuredClone(s), xp = s.xp
    expect(act(s, { type: 'resolve-bid' }).state).toBe(s)
    expect(finishChapter(s)).toBe(s)
    s = act(s, { type: 'deliver' }).state
    expect(eventDone(s)).toBe(true); expect(s.xp).toBe(xp + 30)
    expect(s.inventory).toEqual(before.inventory); expect(s.totalBrews).toBe(before.totalBrews)
    expect(act(validateState(s), { type: 'deliver' }).ok).toBe(false)
    s.progress[12].boss = true
    const next = finishChapter(s)
    expect(next.gold).toBe(chapterById(12).reward); expect(next.flame).toBe('lotus')
    expect(finishChapter(next)).toBe(next); expect(validateState(next)).toEqual(next)
  })
  it('托管中不能旁观或回报，未接拍卖交互提示不弹竞价面板', () => {
    const s = act(enter(), { type: 'bid', amount: 40 }).state
    expect(act(s, { type: 'observe' }).state).toBe(s); expect(act(s, { type: 'deliver' }).state).toBe(s)
    const fresh = street(), contexts: number[] = []
    const w = new CombatWorld(chapterById(12), { state: () => fresh, collect: () => {}, camp: () => {}, kill: () => {}, heal: () => false, notify: () => {},
      storyEvent: (_, checkpoint) => { if (checkpoint !== undefined) contexts.push(checkpoint) } })
    Object.assign(w.player, eventForChapter(12)!.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(contexts).toHaveLength(0)
  })
  it('严格拒绝不一致的托管 / 超价 / 结果和当前版缺事件', () => {
    const base = act(enter(), { type: 'bid', amount: 40 }).state
    for (const change of [{ quote: 0 }, { quote: 42 }, { score: 61 }, { attempts: 0 }, { auctionOutcome: 'won' }]) {
      const bad = structuredClone(base); Object.assign(bad.progress[12].events[id], change)
      expect(() => validateState(bad)).toThrow()
    }
    for (const change of [{ quote: 60 }, { auctionOutcome: 'observed' }, { auctionOutcome: undefined }, { score: 60 }]) {
      const bad = won(); Object.assign(bad.progress[12].events[id], change)
      expect(() => validateState(bad)).toThrow()
    }
    const missing = enter(); delete missing.progress[12].events[id]; expect(() => validateState(missing)).toThrow()
    const other = street(); other.progress[1].events['yao-training'].auctionOutcome = 'won'; expect(() => validateState(other)).toThrow()
  })
  it.each([1, 2, 3])('schema%i旧第十二章检查旧目标、保留奖励且不补竞拍补给', schema => {
    const old = JSON.parse(JSON.stringify(street())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.6.2'
    old.progress[12].events = {}; old.progress[12].herbs = 2; old.progress[12].kills = 3
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(12); old.progress[12].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[12].herbs = 3
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[12].kills = 4
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(eventProgress(done).auctionOutcome).toBe('observed')
    expect(done.inventory).toEqual(old.inventory); expect(done.gold).toBe(old.gold)
  })
  it('拍卖街区资源、公告、竞拍台及出口均可达', () => {
    const map = mapForChapter(12), e = eventForChapter(12)!
    const points = [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies, e.npc, ...e.checkpoints!]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
  })
})
