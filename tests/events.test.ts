import { describe, expect, it } from 'vitest'
import { advanceEvent, eventDone, migrateLegacyEvent } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { chapterEvents } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { chapterById } from '../src/content/chapters'
import { CombatWorld } from '../src/game/combat'

function fixture(chapter: number) {
  const s = initialState(); s.chapter = chapter; s.progress[chapter] = blankProgress(chapter)
  return s
}
function legacy() {
  const s = initialState()
  const old = JSON.parse(JSON.stringify(s))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'
  delete old.progress[1].events["yao-training"]
  return old
}
describe('剧情事件事务与场景', () => {
  it('立约必须先接下任务，并按三个路标顺序操作', () => {
    let s = fixture(2)
    expect(advanceEvent(s, { type: 'seal', index: 0 }).state).toBe(s)
    s = advanceEvent(s, { type: 'begin' }).state
    expect(advanceEvent(s, { type: 'seal', index: 1 }).state).toBe(s)
    for (let index = 0; index < 3; index++) s = advanceEvent(s, { type: 'seal', index }).state
    expect(eventDone(s)).toBe(true)
    expect(advanceEvent(s, { type: 'seal', index: 2 }).state).toBe(s)
  })
  it.each([42, 60])('供货以 %i 金币报价，材料与货款一次结算', amount => {
    let s = advanceEvent(fixture(3), { type: 'begin' }).state
    expect(advanceEvent(s, { type: 'quote', amount: 90 }).state).toBe(s)
    s = advanceEvent(s, { type: 'quote', amount }).state
    expect(advanceEvent(s, { type: 'deliver' }).state).toBe(s)
    s.inventory.herb = 2; s.inventory.crystal = 1
    const gold = s.gold, result = advanceEvent(s, { type: 'deliver' })
    expect(result.state.gold).toBe(gold + amount)
    expect(result.state.inventory.herb).toBe(0); expect(result.state.inventory.crystal).toBe(0)
    expect(advanceEvent(result.state, { type: 'deliver' }).state).toBe(result.state)
  })
  it('教学只认范围内命中的八极崩及成功消耗体力的闪避', () => {
    let s = advanceEvent(fixture(1), { type: 'begin' }).state
    const world = new CombatWorld(chapterById(1), { state: () => s, collect: () => {}, kill: () => {},
      camp: () => {}, heal: () => false, notify: () => {}, eventAction: action => { s = advanceEvent(s, action).state } })
    world.action('strike', { x: 0, y: 0 }); expect(s.progress[1].events["yao-training"].stage).toBe(1)
    world.player.stamina = 0; world.action('dodge', { x: 0, y: 0 }); expect(eventDone(s)).toBe(false)
    world.player.stamina = 100; world.action('dodge', { x: 0, y: 0 }); expect(eventDone(s)).toBe(true)
    expect(world.player.stamina).toBe(72)
  })
  it('明确指向木桩外的攻击不能完成教学', () => {
    let s = advanceEvent(fixture(1), { type: 'begin' }).state
    const world = new CombatWorld(chapterById(1), { state: () => s, collect: () => {}, kill: () => {},
      camp: () => {}, heal: () => false, notify: () => {}, eventAction: action => { s = advanceEvent(s, action).state } })
    world.action('strike', { x: 0, y: 0, aim: { x: 0, y: 615 } })
    expect(s.progress[1].events["yao-training"].stage).toBe(0)
  })
  it('前三章的出生点、首领点和所有交互点处于可达空间', () => {
    const ids = new Set<string>()
    for (const id of [1, 2, 3]) {
      const map = mapForChapter(id), event = chapterEvents[id]; ids.add(map.id)
      const points = [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies, event.npc, ...(event.checkpoints ?? []), ...(event.dummy ? [event.dummy] : [])]
      for (const point of points) expect(mapCollides(map, point), `${id}: ${point.x},${point.y}`).toBe(false)
      // Flood fill at 10px resolution, using the same player collision radius.
      const visited = new Set<string>(), queue = [{ x: Math.round(map.spawn.x / 10) * 10, y: Math.round(map.spawn.y / 10) * 10 }]
      visited.add(`${queue[0].x},${queue[0].y}`)
      for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
        const next = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${next.x},${next.y}`
        if (next.x < 40 || next.x > 1240 || next.y < 50 || next.y > 760 || visited.has(key) || mapCollides(map, next)) continue
        visited.add(key); queue.push(next)
      }
      for (const point of points) expect(queue.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 15)).toBe(true)
    }
    expect(ids.size).toBe(3)
  })
})
describe('旧存档迁移与事件校验', () => {
  it('未过首领的旧存档保留资源，并从未接取事件继续', () => {
    const old = legacy(); old.progress[1].herbs = 2; old.gold = 333
    const s = validateState(old)
    expect(s.schemaVersion).toBe(3); expect(s.gold).toBe(333)
    expect(s.progress[1].herbs).toBe(2); expect(s.progress[1].events["yao-training"].started).toBe(false)
  })
  it('保留旧存档已完成三章的记录，拒绝伪造的旧目标完成', () => {
    const old = legacy(); old.chapter = 3; old.completed = [1, 2, 3]
    for (const id of [1, 2, 3]) old.progress[id] = { herbs: 3, kills: 3, brews: 0, boss: true, intro: true }
    const s = validateState(old)
    expect(s.completed).toEqual([1, 2, 3])
    for (const id of [1, 2, 3]) expect(eventDone(s, id)).toBe(true)
    old.progress[2].kills = 0
    expect(() => validateState(old)).toThrow('条件不完整')
  })
  it('完整28章旧存档迁移后可继续重返', () => {
    const old = legacy(); old.chapter = 28; old.completed = Array.from({ length: 28 }, (_, i) => i + 1)
    for (const id of old.completed) old.progress[id] = { ...chapterById(id).objectives, ...(id <= 10 ? { herbs: 3, kills: 3, brews: id === 6 ? 1 : id === 9 ? 2 : 0 } : {}), boss: true, intro: true }
    expect(validateState(old).completed).toHaveLength(28)
  })
  it('拒绝事件越界、未开始已完成、非法报价及过关缺事件', () => {
    for (const event of [{ started: true, stage: 3, quote: 0 }, { started: false, stage: 2, quote: 0 }, { started: true, stage: 0, quote: 60 }]) {
      const s = initialState(); s.progress[1].events["yao-training"] = { score: 0, attempts: 0, choice: "none", ...event }
      expect(() => validateState(s)).toThrow()
    }
    const s = initialState(); s.progress[1] = { ...blankProgress(), herbs: 3, kills: 3, boss: true }
    expect(() => validateState(s)).toThrow('剧情事件不完整')
    s.progress[1].events["yao-training"] = migrateLegacyEvent(1, true)
    expect(validateState(s)).toEqual(s)
  })
})
