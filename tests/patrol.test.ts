import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { hasLineOfSight, mapCollides, mapForChapter } from '../src/content/maps'
import { migrateLegacyEvents } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function setup() {
  const s = initialState(); s.chapter = 8; s.completed = [1, 2, 3, 4, 5, 6, 7]
  for (const id of s.completed) s.progress[id] = { ...blankProgress(id), herbs: 3, kills: 3, brews: id === 6 ? 1 : 0, boss: true, events: migrateLegacyEvents(id, true) }
  s.progress[8] = blankProgress(8)
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, kill: () => {}, heal: () => false, notify: () => {} }
  return { s, world: new CombatWorld(chapterById(8), callbacks), reload: () => new CombatWorld(chapterById(8), { ...callbacks, state: () => validateState(s) }) }
}

describe('C3b-1 巡逻警戒基础', () => {
  it('守卫沿路线走动，视线内持续暴露逐渐积累警戒，达到阈值后进入追击', () => {
    const { world: w } = setup(), e = w.enemies[0]
    Object.assign(w.player, { x: 610, y: 390 })
    for (let i = 0; i < 60; i++) w.step({ x: 0, y: 0 })
    expect(e.x).toBeGreaterThan(550)
    expect(e.alert).toBeGreaterThan(.7); expect(e.alert).toBeLessThan(1)
    expect(w.runtime().patrol?.alerted).toBe(false)
    for (let i = 0; i < 120; i++) w.step({ x: 0, y: 0 })
    expect(e.alert).toBe(1); expect(w.runtime().patrol?.alerted).toBe(true)
    expect(w.player.hp).toBeLessThan(w.runtime().maxHp)
  })
  it('岩壁遮挡感知，即使距离在圈内也不增长警戒，失去视线后警戒衰减', () => {
    const { world: w } = setup(), e = w.enemies[0]
    Object.assign(w.player, { x: 380, y: 250 }); Object.assign(e, { x: 550, y: 250, alert: .6 })
    expect(hasLineOfSight(w.map, e, w.player)).toBe(false)
    expect(Math.hypot(e.x - w.player.x, e.y - w.player.y)).toBeLessThan(e.patrol!.detectionRadius)
    for (let i = 0; i < 120; i++) w.step({ x: 0, y: 0 })
    expect(e.alert).toBe(0)
    expect(mapCollides(w.map, w.player)).toBe(false)
  })
  it('主动攻击立刻警戒；退回安全营地解除；场景重建不保存运行态警戒', () => {
    const t = setup(), w = t.world, e = w.enemies[0]
    Object.assign(w.player, { x: 610, y: 390 })
    w.action('attack', { x: 0, y: 0, aim: e })
    expect(e.hp).toBeLessThan(e.maxHp); expect(e.alert).toBe(1)
    const reload = t.reload()
    expect(reload.enemies[0].alert).toBe(0); expect(reload.enemies[0].x).toBe(550)
    Object.assign(w.player, w.map.camp); w.step({ x: 0, y: 0 })
    expect(e.alert).toBe(0); expect(e.windup).toBe(0)
    expect(t.s.flame).toBe('ember'); expect(t.s.completed).not.toContain(8)
  })
  it('地图所有资源可达，巡逻路线每段无碰撞，掩体能阻挡视线', () => {
    const map = mapForChapter(8)
    expect(map.id).toBe('lotus-fire-cavern')
    const points = [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies]
    for (const enemy of map.enemies) if (enemy.patrol) {
      const route = enemy.patrol.route
      for (let i = 0; i < route.length; i++) {
        const a = route[i], b = route[(i + 1) % route.length]
        for (let f = 0; f <= 1; f += .01) expect(mapCollides(map, { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) })).toBe(false)
      }
    }
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
    expect(hasLineOfSight(map, { x: 380, y: 250 }, { x: 550, y: 250 })).toBe(false)
    expect(hasLineOfSight(map, { x: 550, y: 350 }, { x: 780, y: 350 })).toBe(true)
  })
})
