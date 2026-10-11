import { describe, expect, it } from 'vitest'
import { teacherSupport } from '../src/core/companions'
import { initialState } from '../src/core/model'
import { chapterById } from '../src/content/chapters'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { CombatWorld } from '../src/game/combat'
import { eventForChapter } from '../src/content/events'

describe('C6a-1 回归与中州基础', () => {
  it.each([
    [0, false, 'learning'], [1, false, 'learning'], [2, true, 'travelling'],
    [15, true, 'travelling'], [16, false, 'away'], [21, false, 'away'],
    [22, true, 'returned'], [28, true, 'returned'],
  ])('完成%i章后的药老支援矩阵', (count, available, status) => {
    const s = initialState(); s.completed = Array.from({ length: Number(count) }, (_, i) => i + 1)
    expect(teacherSupport(s)).toMatchObject({ available, status })
  })
  it('支援不能用其他两章代替前两章', () => {
    const s = initialState(); s.completed = [3, 4]
    expect(teacherSupport(s).available).toBe(false)
  })
  it('真实支援回气、护体、25秒冷却，离队时均不改变', () => {
    const s = initialState(); s.completed = [1, 2]
    let notice = ''
    const w = new CombatWorld(chapterById(1), { state: () => s, collect: () => {}, kill: () => {},
      heal: () => false, camp: () => {}, notify: text => { notice = text } })
    w.player.qi = 0; w.action('support', { x: 0, y: 0 })
    expect(w.player.qi).toBe(45); expect(w.player.invincible).toBe(1.4); expect(w.cooldowns.support).toBe(25)
    w.action('support', { x: 0, y: 0 }); expect(w.player.qi).toBe(45)
    for (let i = 0; i < 1501; i++) w.step({ x: 0, y: 0 })
    expect(w.cooldowns.support).toBe(0)
    s.completed = Array.from({ length: 16 }, (_, i) => i + 1)
    w.player.qi = 0; const effects = w.effects.length
    w.action('support', { x: 0, y: 0 })
    expect(w.player.qi).toBe(0); expect(w.player.invincible).toBe(0)
    expect(w.cooldowns.support).toBe(0); expect(w.effects).toHaveLength(effects); expect(notice).toContain('暂时离队')
    s.completed = Array.from({ length: 22 }, (_, i) => i + 1)
    w.action('support', { x: 0, y: 0 })
    expect(w.player.qi).toBe(45); expect(w.cooldowns.support).toBe(25)
  })
  it.each([16, 17, 18, 19])('第%i章营地、首领、资源与敌人均可达且数量满足原目标', chapter => {
    const map = mapForChapter(chapter), c = chapterById(chapter)
    expect(map.style).not.toBe('legacy'); expect(map.herbs.length).toBeGreaterThanOrEqual(c.objectives.herbs)
    expect(map.enemies.length).toBeGreaterThanOrEqual(c.objectives.kills)
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    const event = eventForChapter(chapter)
    for (const p of [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies,
      ...(event ? [event.npc, ...(event.checkpoints ?? [])] : [])]) {
      expect(mapCollides(map, p), `阻挡点${p.x},${p.y}`).toBe(false)
      expect(queue.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 15), `不可达${p.x},${p.y}`).toBe(true)
    }
  })
})
