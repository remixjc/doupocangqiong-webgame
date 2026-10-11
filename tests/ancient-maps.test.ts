import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { eventsForChapter } from '../src/content/events'

describe('C8a-1 古族天墓、菩提与妖火地图基础', () => {
  it.each([23, 24, 25])('第%i章营地、试炼、资源、敌人及事件点可达且满足现有目标', chapter => {
    const map = mapForChapter(chapter), c = chapterById(chapter)
    expect(map.style).not.toBe('legacy')
    expect(map.herbs.length).toBeGreaterThanOrEqual(c.objectives.herbs)
    expect(map.enemies.length).toBeGreaterThanOrEqual(c.objectives.kills)
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies,
      ...eventsForChapter(chapter).flatMap(e => [e.npc, ...(e.checkpoints ?? [])])]) {
      expect(mapCollides(map, p), `阻挡点${p.x},${p.y}`).toBe(false)
      expect(queue.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 15), `不可达${p.x},${p.y}`).toBe(true)
    }
  })
})
