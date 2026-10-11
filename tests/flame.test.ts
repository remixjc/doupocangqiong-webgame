import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, unlockedFlames } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const id = 'lotus-fire-attunement'
function cavern() {
  const s = initialState(); s.chapter = 8; s.completed = [1, 2, 3, 4, 5, 6, 7]
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[8] = blankProgress(8)
  return s
}
function act(s: ReturnType<typeof cavern>, action: EventAction) { return advanceEvent(s, { ...action, eventId: id }) }
function ready() {
  let s = act(cavern(), { type: 'begin' }).state
  s = act(s, { type: 'seal', index: 0 }).state
  return act(s, { type: 'test' }).state
}
function setup(stage = 2) {
  let s = ready(), notice = ''
  while (eventProgress(s).stage < stage) s = act(s, { type: 'stabilize', stage: eventProgress(s).stage }).state
  // Durable character stats let this fixture isolate heat from ordinary combat damage.
  s.armorUpgrade = 20
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: (boss: boolean) => { if (boss && chapterReady(s)) s.progress[8].boss = true },
    notify: (text: string) => { notice = text },
    eventAction: (action: EventAction) => { const r = advanceEvent(s, action); s = r.state },
  }
  return { world: new CombatWorld(chapterById(8), callbacks), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(8), callbacks) } }
}
function tick(w: CombatWorld, frames: number) { for (let n = 0; n < frames; n++) w.step({ x: 0, y: 0 }) }

describe('C3b-2 青莲控火与收服结算', () => {
  it('先接取、确认入口、启动控火，乱序与过期输入不推进也不扣材料', () => {
    let s = cavern(), inventory = structuredClone(s.inventory)
    expect(act(s, { type: 'test' }).state).toBe(s)
    s = act(s, { type: 'begin' }).state
    expect(act(s, { type: 'stabilize', stage: 2 }).state).toBe(s)
    expect(act(s, { type: 'test' }).state).toBe(s)
    s = act(s, { type: 'seal', index: 0 }).state; s = act(s, { type: 'test' }).state
    s = act(s, { type: 'stabilize', stage: 2 }).state
    expect(act(s, { type: 'stabilize', stage: 2 }).state).toBe(s)
    expect(act(s, { type: 'stabilize', stage: 4 }).state).toBe(s)
    expect(s.inventory).toEqual(inventory)
    expect(validateState(s)).toEqual(s)
  })
  it('区外不计时，热量只在火域上升，冷却点降温；刷新只重建当前安全阶段', () => {
    const t = setup(), w = t.world
    tick(w, 120); expect(w.flameRun?.elapsed).toBe(0)
    Object.assign(w.player, { x: 1160, y: 640 }); tick(w, 180)
    expect(w.flameRun?.heat).toBeCloseTo(18)
    Object.assign(w.player, w.map.heatZone!.cooling[1]); tick(w, 60)
    expect(w.flameRun?.heat).toBe(0); expect(w.runtime().heatChallenge?.cooling).toBe(true)
    const rebuilt = t.reload()
    expect(eventProgress(t.state()).stage).toBe(2)
    expect(rebuilt.flameRun).toMatchObject({ phase: 2, heat: 0, elapsed: 0, failed: false })
    expect(rebuilt.player).toMatchObject(w.map.spawn)
  })
  it('跨阶段累积热量到100会失控，休整重建可重试，不扣材料或跳过阶段', () => {
    const t = setup(), w = t.world, inventory = structuredClone(t.state().inventory)
    Object.assign(w.player, { x: 1160, y: 640 }); tick(w, 1100)
    expect(w.flameRun?.failed).toBe(true)
    expect(w.flameRun?.heat).toBe(100); expect(w.flameRun?.warnings).toHaveLength(0)
    expect(eventProgress(t.state()).stage).toBe(3); expect(t.notice()).toContain('失控')
    tick(w, 900); expect(eventProgress(t.state()).stage).toBe(3)
    const rebuilt = t.reload()
    expect(rebuilt.flameRun).toMatchObject({ phase: 3, failed: false, heat: 0, elapsed: 0 })
    expect(t.state().inventory).toEqual(inventory)
  })
  it.each([2, 3, 4])('阶段%i产生独立预警，死亡不能完成这一阶段', stage => {
    const t = setup(stage), w = t.world
    Object.assign(w.player, { x: 1160, y: 640 }); tick(w, 1)
    const warnings = w.flameRun!.warnings
    expect(warnings).toHaveLength(stage === 3 ? 4 : 1)
    expect(warnings[0].radius).toBe(stage === 2 ? 80 : stage === 3 ? 72 : 120)
    if (stage === 3) expect(warnings.map(p => p.x)).toEqual([650, 830, 1010, 1190])
    else expect(warnings[0]).toMatchObject({ x: 1160, y: 640 })
    w.player.hp = 0; tick(w, 900)
    expect(eventProgress(t.state()).stage).toBe(stage)
  })
  it('事件和收服台都不提前取得异火；营地首通事务才解锁且只结算一次', () => {
    const t = setup(4)
    let s = act(t.state(), { type: 'stabilize', stage: 4 }).state
    s = act(s, { type: 'deliver' }).state
    expect(eventDone(s)).toBe(true); expect(chapterReady(s)).toBe(true)
    expect(s.flame).toBe('ember'); expect(unlockedFlames(s)).toHaveLength(1)
    expect(finishChapter(s)).toBe(s)
    const w = new CombatWorld(chapterById(8), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      kill: boss => { if (boss && chapterReady(s)) s.progress[8].boss = true } })
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(s.progress[8].boss).toBe(true); expect(s.flame).toBe('ember')
    const gold = s.gold, next = finishChapter(s)
    expect(next.flame).toBe('lotus'); expect(next.gold).toBe(gold + chapterById(8).reward)
    expect(finishChapter(next)).toBe(next); expect(validateState(next)).toEqual(next)
  })
  it.each([1, 2, 3])('schema%i旧档校验旧3草3战，保留已过关奖励及未过关计数', schema => {
    const old = JSON.parse(JSON.stringify(cavern())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.5.1'
    old.progress[8].events = {}; old.progress[8].herbs = 3; old.progress[8].kills = 2
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    const pending = validateState(old)
    expect(eventProgress(pending).started).toBe(false); expect(pending.progress[8].kills).toBe(2)
    old.progress[8].boss = true; old.completed.push(8); old.flame = 'lotus'
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[8].kills = 3
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.flame).toBe('lotus')
    expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
  it('当前档缺失事件或带入无关分数拒绝；入口、控火坛及冷却点可达', () => {
    const s = ready(), bad = structuredClone(s)
    bad.progress[8].events[id].score = 1; expect(() => validateState(bad)).toThrow()
    delete s.progress[8].events[id]; expect(() => validateState(s)).toThrow()
    const map = mapForChapter(8), e = eventForChapter(8)!
    const points = [map.spawn, map.camp, map.gate, e.npc, ...e.checkpoints!, ...map.heatZone!.cooling]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
  })
})
