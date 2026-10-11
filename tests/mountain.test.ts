import { describe, expect, it } from 'vitest'
import { mapCollides, mapForChapter } from '../src/content/maps'

describe('C2a 洞穴地图基础', () => {
  it('出生与资源没有碰撞，山径经石室缺口可达洞穴深处', () => {
    const map = mapForChapter(4)
    expect(map.id).toBe('qingshan-hidden-cave')
    const points = [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies]
    for (const p of points) expect(mapCollides(map, p)).toBe(false)
    const visited = new Set<string>(), queue = [{ x: 210, y: 630 }]
    visited.add('210,630')
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const next = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${next.x},${next.y}`
      if (next.x < 40 || next.x > 1240 || next.y < 50 || next.y > 760 || visited.has(key) || mapCollides(map, next)) continue
      visited.add(key); queue.push(next)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
    expect(mapCollides(map, { x: 830, y: 400 })).toBe(false)
    expect(mapCollides(map, { x: 830, y: 300 })).toBe(true)
    expect(mapCollides(map, { x: 830, y: 500 })).toBe(true)
  })
})
