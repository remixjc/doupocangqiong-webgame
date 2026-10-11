import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const rescue = 'stone-desert-rescue'
function town() {
  const s = initialState(); s.chapter = 7; s.completed = [1, 2, 3, 4, 5, 6]
  for (const id of s.completed) s.progress[id] = { ...blankProgress(id), herbs: 3, kills: 3, brews: id === 6 ? 1 : 0, boss: true, events: migrateLegacyEvents(id, true) }
  s.progress[7] = blankProgress(7)
  return s
}
function act(s: ReturnType<typeof town>, action: EventAction) { return advanceEvent(s, { ...action, eventId: rescue }) }
function setup() {
  let s = act(town(), { type: 'begin' }).state
  s = act(s, { type: 'seal', index: 0 }).state
  let notice = ''
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: () => { s.progress[7].kills++ }, notify: (text: string) => { notice = text },
    eventAction: (action: EventAction) => { const r = advanceEvent(s, action); s = r.state; notice = r.message },
  }
  return { world: new CombatWorld(chapterById(7), callbacks), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(7), callbacks) } }
}

describe('C3a 沙城守卫与救援', () => {
  it('守卫存活时拒绝解救，真实攻击清除后才开囚栏并领取一次奖励', () => {
    const t = setup(), w = t.world, before = t.state().inventory.heal
    Object.assign(w.player, { x: 700, y: 400 })
    w.action('interact', { x: 0, y: 0 })
    expect(t.notice()).toContain('守卫尚有1名')
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.state().inventory.heal).toBe(before)
    const enemy = w.enemies.find(e => e.spawnId === 'sand-alley-guard')!
    for (let i = 0; i < 360 && enemy.hp > 0; i++) {
      w.action('attack', { x: 0, y: 0, aim: enemy }); w.action('strike', { x: 0, y: 0, aim: enemy })
      w.step({ x: 0, y: 0 })
    }
    expect(enemy.hp).toBe(0); expect(w.guardsRemaining(rescue, 1)).toBe(0)
    w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2); expect(t.state().inventory.heal).toBe(before + 1)
    expect(w.barrierClosed()).toBe(false)
    w.action('interact', { x: 0, y: 0 }); expect(t.state().inventory.heal).toBe(before + 1)
    const reload = t.reload()
    expect(reload.enemies.some(e => e.spawnId === 'sand-alley-guard')).toBe(false)
    expect(reload.guardsRemaining(rescue, 2)).toBe(2); expect(reload.barrierClosed()).toBe(false)
  })
  it('未解救守卫在重建后恢复，但已完成节点不复锁；两名守卫都清除才允许第二次救援', () => {
    const t = setup(), w = t.world
    Object.assign(w.player, { x: 700, y: 400 })
    const first = w.enemies[0]
    for (let i = 0; i < 600 && first.hp > 0 && w.player.hp > 0; i++) { w.action('attack', { x: 0, y: 0, aim: first }); w.step({ x: 0, y: 0 }) }
    expect(first.hp).toBe(0)
    expect(t.reload().guardsRemaining(rescue, 1)).toBe(1)
    w.action('interact', { x: 0, y: 0 })
    const reloaded = t.reload()
    Object.assign(reloaded.player, { x: 1060, y: 230 })
    reloaded.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2)
    for (let i = 0; i < 600 && reloaded.guardsRemaining(rescue, 2) > 0 && reloaded.player.hp > 0; i++) {
      reloaded.action('attack', { x: 0, y: 0 }); reloaded.action('strike', { x: 0, y: 0 }); reloaded.action('wave', { x: 0, y: 0 })
      reloaded.step({ x: 0, y: 0 })
    }
    expect(reloaded.guardsRemaining(rescue, 2)).toBe(0)
    reloaded.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(3)
    expect(t.reload().enemies).toHaveLength(0)
  })
  it('乱序和重复救援不发材料，回报一次50金币，刷新保留完成', () => {
    let s = act(town(), { type: 'begin' }).state, base = s.inventory.heal
    expect(act(s, { type: 'seal', index: 2 }).state).toBe(s)
    expect(act(s, { type: 'deliver' }).state).toBe(s)
    for (const index of [0, 1, 2]) s = act(s, { type: 'seal', index }).state
    expect(s.inventory.heal).toBe(base + 2)
    const gold = s.gold; s = act(s, { type: 'deliver' }).state
    expect(s.gold).toBe(gold + 50); expect(eventDone(s)).toBe(true)
    s = validateState(s); expect(act(s, { type: 'deliver' }).state).toBe(s)
  })
  it('旧第七章按内容版本补事件，已过关检查旧3草3战且不补发恢复丹或金币', () => {
    const old = JSON.parse(JSON.stringify(town())); old.contentVersion = '0.4.1'; old.progress[7].events = {}
    old.progress[7].kills = 3
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[7].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[7].herbs = 3; old.completed.push(7)
    const s = validateState(old)
    expect(eventDone(s)).toBe(true); expect(s.inventory).toEqual(old.inventory); expect(s.gold).toBe(old.gold)
    const bad = town(); delete bad.progress[7].events[rescue]
    expect(() => validateState(bad)).toThrow()
  })
  it('守卫ID唯一并与节点匹配，开放巷道后所有资源和交互节点可达', () => {
    const map = mapForChapter(7), e = eventForChapter(7)!, ids = map.enemies.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of e.checkpoints!.flatMap(p => p.guards ?? [])) expect(ids).toContain(id)
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
