import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventsForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { chapterReady } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const escort = 'mountain-herb-escort', survival = 'lion-escape'
function mountain() {
  const s = initialState(); s.chapter = 5; s.completed = [1, 2, 3, 4]
  for (const id of s.completed) s.progress[id] = { ...blankProgress(id), herbs: 3, kills: 3, boss: true, events: migrateLegacyEvents(id, true) }
  s.progress[5] = blankProgress(5)
  return s
}
function event(s: GameState, action: EventAction, id = escort) { return advanceEvent(s, { ...action, eventId: id }) }
function escorted() {
  let s = event(mountain(), { type: 'begin' }).state
  for (const index of [0, 1, 2]) s = event(s, { type: 'seal', index }).state
  return s
}
function encounter() {
  let s = event(escorted(), { type: 'begin' }, survival).state
  s = event(s, { type: 'seal', index: 0 }, survival).state
  return s
}
function setup(start: GameState) {
  let s = start, notice = ''
  const world = new CombatWorld(chapterById(5), {
    state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: boss => { if (boss && chapterReady(s)) s.progress[5].boss = true },
    notify: text => { notice = text }, eventAction: action => { const r = advanceEvent(s, action); s = r.state; notice = r.message },
  })
  return { world, state: () => s, notice: () => notice }
}

describe('C2b 采药保护与强敌生存', () => {
  it('同伴等待过远的玩家，双方到达才采药，错误节点和重复节点不发材料', () => {
    const t = setup(event(mountain(), { type: 'begin' }).state), w = t.world
    Object.assign(w.player, { x: 500, y: 580 })
    for (let i = 0; i < 60; i++) w.step({ x: 0, y: 0 })
    expect(w.escort).toMatchObject({ x: 280, y: 625, waiting: true })
    w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(0); expect(t.state().inventory.herb).toBe(0)
    Object.assign(w.player, { x: 360, y: 610 })
    for (let i = 0; i < 120; i++) { w.action('attack', { x: 0, y: 0 }); w.step({ x: 0, y: 0 }) }
    Object.assign(w.player, { x: 500, y: 580 })
    w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.state().inventory.herb).toBe(1)
    w.action('interact', { x: 0, y: 0 })
    expect(t.state().inventory.herb).toBe(1)
    expect(event(t.state(), { type: 'seal', index: 2 }).state).toBe(t.state())
  })
  it('同伴受伤后无法结算节点，重建从已完成安全节点恢复生命且不重复发药', () => {
    let s = event(mountain(), { type: 'begin' }).state
    s = event(s, { type: 'seal', index: 0 }).state
    const t = setup(s), w = t.world
    Object.assign(w.player, { x: 550, y: 580 })
    const enemy = w.enemies[0]
    for (let i = 0; i < 5; i++) {
      enemy.target = { x: w.escort!.x, y: w.escort!.y }; enemy.radius = 90; enemy.windup = .001
      w.step({ x: 0, y: 0 })
    }
    expect(w.runtime().escort?.failed).toBe(true)
    Object.assign(w.player, { x: 820, y: 420 }); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1)
    const retry = setup(validateState(t.state())).world
    expect(retry.escort).toMatchObject({ hp: 120, x: 500, y: 580, stage: 1 })
    expect(t.state().inventory.herb).toBe(1)
  })
  it('撤离必须完成保护与24秒警戒，区外不计时，刷新从本段重新计时', () => {
    expect(event(mountain(), { type: 'begin' }, survival).ok).toBe(false)
    const t = setup(encounter()), w = t.world
    for (let i = 0; i < 300; i++) w.step({ x: 0, y: 0 })
    expect(w.survival?.elapsed).toBe(0)
    Object.assign(w.player, { x: 920, y: 230 })
    for (let i = 0; i < 30; i++) w.step({ x: 1, y: 0 })
    expect(w.survival!.elapsed).toBeGreaterThan(0)
    expect(w.runtime().survival?.remaining).toBe(24)
    const retry = setup(validateState(t.state())).world
    expect(retry.survival?.elapsed).toBe(0)
    Object.assign(w.player, { x: 400, y: 450 }); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state(), 5, survival).stage).toBe(1); expect(t.state().progress[5].boss).toBe(false)
    expect(w.enemies.some(e => e.type === 'boss')).toBe(false)
  })
  it('落焰预警伤害站立玩家，死亡不推进撤离；完成后撤离一次、不生成狮王战斗单位', () => {
    const t = setup(encounter()), w = t.world
    Object.assign(w.player, { x: 920, y: 230 })
    for (let i = 0; i < 60 * 24 && w.player.hp > 0; i++) w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBe(0)
    expect(eventProgress(t.state(), 5, survival).stage).toBe(1)
    expect(t.state().progress[5].boss).toBe(false)
    const passed = event(t.state(), { type: 'survive' }, survival).state, retreat = setup(passed)
    Object.assign(retreat.world.player, { x: 400, y: 450 })
    retreat.world.action('interact', { x: 0, y: 0 })
    expect(eventDone(retreat.state())).toBe(true); expect(retreat.state().progress[5].boss).toBe(true)
    const before = structuredClone(retreat.state().inventory)
    retreat.world.action('interact', { x: 0, y: 0 })
    expect(retreat.state().inventory).toEqual(before); expect(retreat.world.enemies.some(e => e.type === 'boss')).toBe(false)
  })
  it('旧0.3.2正在探索的第五章补空事件，旧过关校验旧目标且不增加奖励', () => {
    const old = JSON.parse(JSON.stringify(mountain())); old.contentVersion = '0.3.2'; old.progress[5].events = {}
    old.progress[5].herbs = 2; old.progress[5].kills = 3
    const s = validateState(old)
    expect(eventProgress(s).started).toBe(false); expect(s.progress[5].herbs).toBe(2)
    old.progress[5].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[5].herbs = 3; old.completed.push(5)
    const passed = validateState(old)
    expect(eventDone(passed)).toBe(true); expect(passed.inventory).toEqual(old.inventory)
    expect(passed.gold).toBe(old.gold)
    const missing = mountain(); delete missing.progress[5].events[survival]
    expect(() => validateState(missing)).toThrow()
  })
  it('独立山谷交互点无碰撞，同伴每段直线路线可走通', () => {
    const map = mapForChapter(5), definitions = eventsForChapter(5)
    expect(map.id).toBe('purple-crystal-valley')
    for (const p of [map.spawn, map.camp, ...map.herbs, ...map.enemies, ...definitions.flatMap(e => [e.npc, ...e.checkpoints!])])
      expect(mapCollides(map, p)).toBe(false)
    const points = [definitions[0].npc, ...definitions[0].checkpoints!]
    for (let i = 1; i < points.length; i++) for (let f = 0; f <= 1; f += .01)
      expect(mapCollides(map, { x: points[i - 1].x + f * (points[i].x - points[i - 1].x), y: points[i - 1].y + f * (points[i].y - points[i - 1].y) })).toBe(false)
  })
  it('schema 2 已完成的旧第四、五章不会被旧空主事件覆盖迁移结果', () => {
    const old = JSON.parse(JSON.stringify(mountain())); old.schemaVersion = 2; old.contentVersion = '0.2.0'
    old.progress[5].boss = true; old.progress[5].herbs = 3; old.progress[5].kills = 3; old.completed.push(5)
    for (const [id, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      const primary = eventsForChapter(Number(id))[0]
      p.event = Number(id) <= 3 ? (p.events as Record<string, unknown>)[primary.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    const s = validateState(old)
    expect(eventDone(s, 4)).toBe(true); expect(eventDone(s, 5)).toBe(true)
    expect(s.inventory).toEqual(old.inventory)
  })
})
