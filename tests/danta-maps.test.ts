import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { mapCollides, mapForChapter } from '../src/content/maps'

describe('C7a-1 丹界、星域与魂殿场景基础', () => {
  it.each([20, 21, 22])('第%i章资源足够且营地、出口、所有资源与敌人可达', chapter => {
    const map = mapForChapter(chapter), c = chapterById(chapter)
    expect(map.style).not.toBe('legacy'); expect(map.herbs.length).toBeGreaterThanOrEqual(c.objectives.herbs)
    expect(map.enemies.length).toBeGreaterThanOrEqual(c.objectives.kills)
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies]) {
      expect(mapCollides(map, p), `阻挡点${p.x},${p.y}`).toBe(false)
      expect(queue.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 15), `不可达${p.x},${p.y}`).toBe(true)
    }
  })
})
