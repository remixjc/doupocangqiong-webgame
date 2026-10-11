import { describe, expect, it } from 'vitest'
import { chapters } from '../src/content/chapters'
import { eventsForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'

describe('C9a-1 终局三图基础', () => {
  it('28章均有稳定的专属地图ID，终局不会回退到基础竞技图', () => {
    expect(new Set(chapters.map(c => mapForChapter(c.id).id)).size).toBe(28)
    expect(chapters.every(c => mapForChapter(c.id).style !== 'legacy')).toBe(true)
  })
  it.each([26, 27, 28])('第%i章资源、敌人、出生/首领/出口与事件点可达', id => {
    const map = mapForChapter(id), c = chapters[id - 1]
    expect(map.herbs.length).toBeGreaterThanOrEqual(c.objectives.herbs)
    expect(map.enemies.length).toBeGreaterThanOrEqual(c.objectives.kills)
    expect(new Set(map.enemies.map(e => e.id)).size).toBe(map.enemies.length)
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies,
      ...eventsForChapter(id).flatMap(e => [e.npc, ...(e.checkpoints ?? [])])]) {
      expect(mapCollides(map, p)).toBe(false)
      expect(queue.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 15), `第${id}章不可达${p.x},${p.y}`).toBe(true)
    }
  })
})
