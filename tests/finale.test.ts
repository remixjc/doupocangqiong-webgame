import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { canEnter, chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { teacherSupport } from '../src/core/companions'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'
import { finalPhaseMaps, mapCollides } from '../src/content/maps'

function finaleState() {
  const s = initialState(); s.chapter = 28; s.completed = Array.from({ length: 27 }, (_, i) => i + 1); s.flame = 'pure'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[28] = blankProgress(28)
  return s
}
const act = (s: ReturnType<typeof finaleState>, a: EventAction) => advanceEvent(s, a).state
function setup(phase = 1) {
  let s = act(finaleState(), { type: 'begin' }), notice = ''
  for (const index of [0, 1, 2]) s = act(s, { type: 'seal', index })
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: (message: string) => { notice = message },
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) }, eventAction: (a: EventAction) => { s = act(s, a) } }
  const w = new CombatWorld(chapterById(28), cb)
  Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
  const e = w.enemies[0]
  for (let next = 2; next <= phase; next++) { e.hp = Math.floor(e.maxHp * (next === 2 ? 2 / 3 : 1 / 3)); w.step({ x: 0, y: 0 }) }
  return { world: w, boss: e, state: () => s, notice: () => notice, reload: () => { s = validateState(s); return new CombatWorld(chapterById(28), cb) } }
}
describe('C9c-1 终战约碑与三阶段首领', () => {
  it('三处约碑顺序前置，未完成不能开战，记录不发资源且支援归队', () => {
    let s = finaleState(), notice = ''
    const w = new CombatWorld(chapterById(28), { state: () => s, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false,
      notify: text => { notice = text }, eventAction: a => { s = act(s, a) } })
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(w.enemies).toHaveLength(0)
    expect(notice).toContain('先完成')
    s = act(s, { type: 'begin' }); expect(act(s, { type: 'seal', index: 1 })).toBe(s)
    const before = structuredClone(s)
    for (const index of [0, 1, 2]) {
      Object.assign(w.player, eventForChapter(28)!.checkpoints![index]); w.action('interact', { x: 0, y: 0 })
      expect(eventProgress(s).stage).toBe(index + 1)
    }
    expect(eventDone(s)).toBe(true); expect(chapterReady(s)).toBe(true)
    expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp); expect(s.inventory).toEqual(before.inventory)
    expect(teacherSupport(s).status).toBe('returned')
  })
  it.each([[1, 3, 55], [2, 6, 55], [3, 5, 65]])('第%i阶段锁定%d处半径%d预警，目标不追踪后续移动', (phase, count, radius) => {
    const t = setup(phase), w = t.world, e = t.boss
    Object.assign(w.player, { x: 1000, y: 320 }); e.timer = 0; w.step({ x: 0, y: 0 })
    expect([e.target, ...e.secondary!]).toHaveLength(count); expect(e.radius).toBe(radius)
    const targets = structuredClone([e.target, ...e.secondary!]); w.step({ x: 1, y: 0 })
    expect([e.target, ...e.secondary!]).toEqual(targets); expect(w.runtime().finale).toMatchObject({ phase, shield: true })
  })
  it('阶段变化解除旧预警，不生成普通storm增援，血环与帝炎状态可读', () => {
    const t = setup(), w = t.world, e = t.boss
    e.timer = 0; w.step({ x: 0, y: 0 }); expect(e.windup).toBeGreaterThan(0)
    e.hp = e.maxHp * .6; w.step({ x: 0, y: 0 }); expect(e.windup).toBe(0); expect(e.secondary).toEqual([])
    expect(w.runtime().finale).toMatchObject({ phase: 2, move: '六点血环' })
    e.hp = e.maxHp * .3; w.step({ x: 0, y: 0 }); expect(w.runtime().finale).toMatchObject({ phase: 3, move: '交叉帝炎' })
    expect(w.enemies).toHaveLength(1); expect(t.notice()).toContain('旧预警解除')
  })
  it('预警实际伤害、护体闪避免伤，攻击结束才出现收招窗口', () => {
    const t = setup(), w = t.world, e = t.boss
    e.target = { ...w.player }; e.secondary = []; e.windup = .001
    const hp = w.player.hp; w.step({ x: 0, y: 0 }); expect(w.player.hp).toBeLessThan(hp)
    expect(w.runtime().finale).toMatchObject({ shield: false, recovery: true })
    e.finale!.recovery = 0; e.windup = .001; e.target = { ...w.player }; w.player.invincible = 2
    const after = w.player.hp; w.step({ x: 0, y: 0 }); expect(w.player.hp).toBe(after)
  })
  it('蓄势减伤40%，收招反击提高35%', () => {
    const hit = (mode: 'normal' | 'shield' | 'recovery') => {
      const t = setup(), w = t.world, e = t.boss; Object.assign(w.player, { x: e.x - 45, y: e.y })
      if (mode === 'shield') e.windup = 1
      if (mode === 'recovery') e.finale!.recovery = 1
      const hp = e.hp; w.action('attack', { x: 0, y: 0, aim: e }); return hp - e.hp
    }
    const normal = hit('normal'); expect(normal).toBeGreaterThan(0)
    expect(hit('shield')).toBe(Math.round(normal * .6)); expect(hit('recovery')).toBe(Math.round(normal * 1.35))
  })
  it('战斗期间边界封闭，死亡不能结算，免费重建保留约碑而首领重新满血', () => {
    const t = setup(), w = t.world, e = t.boss, arena = w.map.finalArena!
    Object.assign(w.player, { x: arena.x + 23, y: 320 })
    for (let frame = 0; frame < 120; frame++) w.step({ x: -1, y: 0 })
    expect(w.player.x).toBeGreaterThanOrEqual(arena.x + 22)
    w.player.hp = 1; w.player.invincible = 0; e.target = { ...w.player }; e.secondary = []; e.radius = 65; e.windup = .001
    w.step({ x: 0, y: 0 }); expect(w.player.hp).toBe(0); expect(finishChapter(t.state())).toBe(t.state())
    const before = structuredClone(t.state()), restored = t.reload()
    expect(restored.enemies).toHaveLength(0); expect(eventDone(t.state())).toBe(true); expect(t.state()).toEqual(before)
    Object.assign(restored.player, restored.map.gate); restored.action('interact', { x: 0, y: 0 })
    expect(restored.enemies[0].hp).toBe(restored.enemies[0].maxHp); expect(restored.enemies[0].finale!.phase).toBe(1)
  })
  it('真实最后一击登记胜利，正式终局首通一次，重返不会重发奖励', () => {
    const t = setup(3), w = t.world, e = t.boss, before = structuredClone(t.state())
    e.hp = 1; Object.assign(w.player, { x: e.x - 45, y: e.y }); w.action('attack', { x: 0, y: 0, aim: e })
    expect(t.state().progress[28].boss).toBe(true); expect(t.state().completed).toHaveLength(27)
    const done = finishChapter(t.state()); expect(done.completed).toHaveLength(28); expect(done.gold).toBe(before.gold + chapterById(28).reward)
    expect(finishChapter(done)).toBe(done); expect(done.flame).toBe('pure'); expect(validateState(done)).toEqual(done)
    expect([1, 14, 28].every(id => canEnter(done, id))).toBe(true)
  })
  it.each([1, 2, 3])('schema%i旧终局4草5战门槛保留，补约碑不补奖励', schema => {
    const old = JSON.parse(JSON.stringify(finaleState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.11.3'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[28].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[28].boss = true; old.completed.push(28); old.progress[28].herbs = 4; old.progress[28].kills = 4
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[28].kills = 5
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
describe('C9c-2 终战跨场景与归途', () => {
  it.each([2, 3])('第%i段同步地图/碰撞/落点，保留生命资源冷却并解除旧预警', phase => {
    const t = setup(phase - 1), w = t.world, e = t.boss
    w.player.hp = 300; w.player.qi = 40; w.player.stamina = 30; w.player.roll = .2
    w.cooldowns.lotus = 5; w.attackCooldown = .3
    w.effects.push({ x: 1000, y: 300, radius: 50, time: 1, maxTime: 1, color: 0, kind: 'ring' })
    e.windup = 1; e.secondary = [{ x: 880, y: 330 }]; e.hp = Math.floor(e.maxHp * (phase === 2 ? 2 / 3 : 1 / 3))
    const before = structuredClone(t.state()), hp = e.hp, id = e.id, herbs = structuredClone(w.herbs)
    w.step({ x: 0, y: 0 }, 0)
    expect(w.map.id).toBe(finalPhaseMaps[phase - 1].id); expect(w.runtime().finale?.arena).toBe(w.map.finalLabel)
    expect(w.collisionMap().obstacles).toEqual(finalPhaseMaps[phase - 1].obstacles)
    expect(w.player).toMatchObject({ ...w.map.spawn, hp: 300, qi: 40, stamina: 30, roll: 0 })
    expect(w.cooldowns.lotus).toBe(5); expect(w.attackCooldown).toBe(.3); expect(w.player.invincible).toBeGreaterThanOrEqual(1.5)
    expect(e).toMatchObject({ ...w.map.bossSpawn, hp, id, windup: 0, secondary: [] })
    expect(w.effects).toEqual([]); expect(w.herbs).toEqual(herbs); expect(t.state()).toEqual(before)
    expect(mapCollides(w.map, w.player, 22)).toBe(false); expect(mapCollides(w.map, e, 22)).toBe(false)
  })
  it('换段后的实体裂石阻挡移动，第一段原位置可通行', () => {
    const first = setup().world, second = setup(2).world
    for (const w of [first, second]) {
      Object.assign(w.player, { x: 860, y: 225 }); w.player.roll = 0
      for (let i = 0; i < 20; i++) w.step({ x: 1, y: 0 })
    }
    expect(first.player.x).toBeGreaterThan(900); expect(second.player.x).toBeLessThan(884)
    expect(mapCollides(second.map, { x: 930, y: 225 })).toBe(true)
  })
  it('连续攻击不能跨过未进入阶段的生命门槛，每个空间依序进入', () => {
    const t = setup(), w = t.world, e = t.boss
    for (const phase of [1, 2, 3]) {
      const floor = phase < 3 ? Math.floor(e.maxHp * (3 - phase) / 3) : 0
      Object.assign(w.player, { x: e.x - 45, y: e.y })
      for (let hit = 0; hit < 100; hit++) { w.attackCooldown = 0; w.action('attack', { x: 0, y: 0, aim: e }) }
      expect(e.hp).toBe(floor); expect(e.finale!.phase).toBe(phase)
      if (phase < 3) {
        expect(t.state().progress[28].boss).toBe(false)
        w.step({ x: 0, y: 0 }, 0); expect(w.map.id).toBe(finalPhaseMaps[phase].id)
      }
    }
    expect(t.state().progress[28].boss).toBe(true)
  })
  it.each([2, 3])('第%i空间退出重建回到第一段，保留三约而不记首通', phase => {
    const t = setup(phase), w = t.world, e = t.boss
    w.player.hp = 0; e.windup = .001; e.target = { ...w.player }; w.step({ x: 0, y: 0 })
    const reloaded = t.reload()
    expect(reloaded.map.id).toBe(finalPhaseMaps[0].id); expect(reloaded.enemies).toHaveLength(0)
    expect(eventDone(t.state())).toBe(true); expect(t.state().progress[28].boss).toBe(false)
    expect(finishChapter(t.state())).toBe(t.state())
  })
  it('终战真实胜利恢复大陆地图与返营路径，首通尾声可保存并重返各章', () => {
    const t = setup(3), w = t.world, e = t.boss
    e.hp = 1; Object.assign(w.player, { x: e.x - 45, y: e.y }); w.action('attack', { x: 0, y: 0, aim: e })
    expect(w.map.id).toBe(finalPhaseMaps[0].id); expect(w.runtime().finale).toBeUndefined()
    for (const target of [{ x: 600, y: w.player.y }, { x: 600, y: 650 }, w.map.camp]) {
      for (let frame = 0; frame < 600 && Math.hypot(w.player.x - target.x, w.player.y - target.y) > 5; frame++) {
        const dx = target.x - w.player.x, dy = target.y - w.player.y, d = Math.hypot(dx, dy)
        w.step({ x: dx / d, y: dy / d })
      }
      expect(Math.hypot(w.player.x - target.x, w.player.y - target.y)).toBeLessThanOrEqual(5)
    }
    const before = structuredClone(t.state()), done = finishChapter(before)
    expect(done.completed).toHaveLength(28); expect(done.gold - before.gold).toBe(chapterById(28).reward)
    expect(validateState(done)).toEqual(done); expect(finishChapter(done)).toBe(done)
    expect(Array.from({ length: 28 }, (_, i) => canEnter(done, i + 1)).every(Boolean)).toBe(true)
    const reloaded = new CombatWorld(chapterById(28), { state: () => done, collect: () => {}, kill: () => {}, heal: () => false, camp: () => {}, notify: () => {} })
    expect(reloaded.map.id).toBe(finalPhaseMaps[0].id)
  })
})
