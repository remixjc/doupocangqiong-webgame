import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function academy() {
  const s = initialState(); s.chapter = 13; s.completed = Array.from({ length: 12 }, (_, n) => n + 1); s.flame = 'ember'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[13] = blankProgress(13); s.settings.difficulty = 'story'; s.armorUpgrade = 20
  return s
}
function setup(stage = 0) {
  let s = advanceEvent(academy(), { type: 'begin' }).state, notice = ''
  for (let index = 0; index < stage; index++) s = advanceEvent(s, { type: 'seal', index }).state
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: (boss: boolean) => { if (boss && chapterReady(s)) s.progress[13].boss = true },
    notify: (text: string) => { notice = text }, eventAction: (action: EventAction) => { s = advanceEvent(s, action).state } }
  return { world: new CombatWorld(chapterById(13), callbacks), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(13), callbacks) } }
}
function tick(w: CombatWorld, frames: number) { for (let n = 0; n < frames; n++) w.step({ x: 0, y: 0 }) }
function clearGuards(w: CombatWorld) {
  for (const e of w.enemies) {
    for (let n = 0; n < 600 && e.hp > 0; n++) {
      Object.assign(w.player, { x: e.x + 45, y: e.y })
      w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e }); w.action('wave', { x: 0, y: 0, aim: e })
      w.step({ x: 0, y: 0 })
    }
    expect(e.hp).toBe(0)
  }
}

describe('C5b 外院双阵协作', () => {
  it('同伴远离时等待，尚未到达不能集合，实际跟进后才允许交互', () => {
    const t = setup(), w = t.world, e = eventForChapter(13)!
    Object.assign(w.player, e.checkpoints![0]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(0); expect(t.notice()).toContain('尚未到达')
    tick(w, 60); expect(w.squad?.waiting).toBe(true); expect(w.squad?.x).toBe(e.npc.x)
    Object.assign(w.player, { x: 380, y: 570 }); tick(w, 180)
    expect(w.squad?.x).toBeGreaterThan(480)
    Object.assign(w.player, e.checkpoints![0]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1)
    const reload = t.reload()
    expect(reload.squad).toMatchObject({ x: 500, y: 520, hp: 140, holding: false })
  })
  it('没有西阵守护不能东阵共鸣，阵位离开即中断，满3秒才完成', () => {
    const early = setup(1)
    Object.assign(early.world.player, eventForChapter(13)!.checkpoints![2]); tick(early.world, 200)
    expect(eventProgress(early.state()).stage).toBe(1)
    const t = setup(2), w = t.world; clearGuards(w)
    Object.assign(w.player, eventForChapter(13)!.checkpoints![2]); tick(w, 120)
    expect(w.squad?.channel).toBeCloseTo(2); expect(eventProgress(t.state()).stage).toBe(2)
    Object.assign(w.player, { x: 900, y: 400 }); tick(w, 1)
    expect(w.squad?.channel).toBe(0)
    Object.assign(w.player, eventForChapter(13)!.checkpoints![2]); tick(w, 182)
    expect(eventProgress(t.state()).stage).toBe(3)
  })
  it('敌人实际攻击守阵同伴；倒下不能共鸣，重建保留守阵阶段而恢复生命', () => {
    const t = setup(2), w = t.world, inventory = structuredClone(t.state().inventory)
    Object.assign(w.player, { x: 1180, y: 700 }); tick(w, 900)
    expect(w.squad?.hp).toBe(0); expect(w.runtime().squad?.failed).toBe(true)
    Object.assign(w.player, eventForChapter(13)!.checkpoints![2]); tick(w, 240)
    expect(eventProgress(t.state()).stage).toBe(2); expect(w.squad?.channel).toBe(0)
    const reload = t.reload()
    expect(reload.player).toMatchObject({ x: 700, y: 400 })
    expect(reload.squad).toMatchObject({ holding: true, hp: 140, channel: 0, x: 700, y: 400 })
    expect(t.state().inventory).toEqual(inventory)
  })
  it('同一帧最后一次共鸣和同伴受击以存活结果为准，阵外不继续积累', () => {
    const t = setup(2), w = t.world
    clearGuards(w)
    Object.assign(w.player, eventForChapter(13)!.checkpoints![2]); tick(w, 170)
    expect(eventProgress(t.state()).stage).toBe(2)
    // Isolate the final-frame failure boundary: a fallen ally cannot complete a nearly full channel.
    w.squad!.hp = 0; tick(w, 30)
    expect(eventProgress(t.state()).stage).toBe(2); expect(w.squad?.channel).toBe(0)
  })
  it('完成后回报一次40积累，审核不生成首领，首通幂等', () => {
    const t = setup(2), w = t.world; clearGuards(w)
    Object.assign(w.player, eventForChapter(13)!.checkpoints![2]); tick(w, 182)
    let s = t.state(), before = structuredClone(s)
    expect(eventDone(s)).toBe(false)
    s = advanceEvent(s, { type: 'deliver' }).state
    expect(s.xp).toBe(before.xp + 40); expect(s.inventory).toEqual(before.inventory); expect(eventDone(s)).toBe(true)
    expect(advanceEvent(s, { type: 'deliver' }).state).toBe(s)
    const review = new CombatWorld(chapterById(13), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      kill: boss => { if (boss && chapterReady(s)) s.progress[13].boss = true } })
    Object.assign(review.player, review.map.gate); review.action('interact', { x: 0, y: 0 })
    expect(review.enemies.some(e => e.type === 'boss')).toBe(false)
    const next = finishChapter(s)
    expect(next.gold).toBe(s.gold + chapterById(13).reward); expect(next.flame).toBe(s.flame)
    expect(finishChapter(next)).toBe(next); expect(validateState(next)).toEqual(next)
  })
  it.each([1, 2, 3])('schema%i旧第十三章按旧3草3战迁移，不追加登记奖励', schema => {
    const old = JSON.parse(JSON.stringify(academy())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.7.0'
    old.progress[13].events = {}; old.progress[13].herbs = 3; old.progress[13].kills = 2
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(13); old.progress[13].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[13].kills = 3
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.inventory).toEqual(old.inventory); expect(done.xp).toBe(old.xp)
    const bad = academy(); bad.progress[13].events = {}; expect(() => validateState(bad)).toThrow()
  })
  it('节点、资源和审核可达，同伴两段直线路径不会碰撞', () => {
    const map = mapForChapter(13), e = eventForChapter(13)!
    const points = [map.spawn, map.camp, map.gate, ...map.herbs, ...map.enemies, e.npc, ...e.checkpoints!]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
    for (const [a, b] of [[e.npc, e.checkpoints![0]], [e.checkpoints![0], e.checkpoints![1]]])
      for (let f = 0; f < 1; f += .01) expect(mapCollides(map, { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })).toBe(false)
  })
})
