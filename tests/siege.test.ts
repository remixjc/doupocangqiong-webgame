import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides } from '../src/content/maps'
import { teacherSupport } from '../src/core/companions'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function siegeState() {
  const s = initialState(); s.chapter = 16; s.completed = Array.from({ length: 15 }, (_, n) => n + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[16] = blankProgress(16); s.settings.difficulty = 'story'; s.armorUpgrade = 20; s.attackUpgrade = 8
  return s
}
function setup(stage = 0) {
  let s = advanceEvent(siegeState(), { type: 'begin' }).state, notice = ''
  if (stage > 0) s = advanceEvent(s, { type: 'seal', index: 0 }).state
  for (let i = 1; i < Math.min(stage, 5); i++) s = advanceEvent(s, { type: 'breach', stage: i }).state
  if (stage === 5) s = advanceEvent(s, { type: 'deliver' }).state
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s); else s.progress[16].kills++ },
    notify: (text: string) => { notice = text }, eventAction: (action: EventAction) => { s = advanceEvent(s, action).state } }
  return { world: new CombatWorld(chapterById(16), callbacks), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(16), callbacks) } }
}
function tick(w: CombatWorld, frames: number) { for (let i = 0; i < frames; i++) w.step({ x: 0, y: 0 }) }
function clearGuards(w: CombatWorld) {
  for (const e of w.enemies.filter(e => e.type !== 'boss')) for (let frame = 0; frame < 1500 && e.hp > 0; frame++) {
    Object.assign(w.player, { x: e.x - 45, y: e.y })
    w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e })
    w.step({ x: 0, y: 0 })
  }
}

describe('C6a-2 三阵宗门攻防', () => {
  it('破阵事件按序推进，过期、跳序、E替代计时和提前报告均无效', () => {
    let s = setup().state()
    expect(advanceEvent(s, { type: 'breach', stage: 1 }).state).toBe(s)
    s = advanceEvent(s, { type: 'seal', index: 0 }).state
    for (let i = 1; i <= 3; i++) {
      for (const action of [{ type: 'deliver' }, { type: 'breach', stage: i + 1 }, { type: 'seal', index: i }] as EventAction[])
        expect(advanceEvent(s, action).state).toBe(s)
      const next = advanceEvent(s, { type: 'breach', stage: i }).state
      expect(advanceEvent(next, { type: 'breach', stage: i }).state).toBe(next)
      expect(validateState(next)).toEqual(next); s = next
    }
    expect(eventProgress(s).stage).toBe(4); expect(eventDone(s)).toBe(false)
    const before = structuredClone(s), done = advanceEvent(s, { type: 'deliver' }).state
    expect(eventDone(done)).toBe(true); expect(done.gold).toBe(before.gold); expect(done.inventory).toEqual(before.inventory)
    expect(advanceEvent(done, { type: 'deliver' }).state).toBe(done)
  })
  it('守卫存活阻止破阵，其他阵眼与区外不计时，离阵清零', () => {
    const t = setup(1), w = t.world, e = eventForChapter(16)!
    Object.assign(w.player, e.checkpoints![1]); tick(w, 20)
    expect(w.runtime().siege?.guards).toBe(2); expect(w.siegeRun?.channel).toBe(0)
    w.action('interact', { x: 0, y: 0 }); expect(t.notice()).toContain('守卫')
    clearGuards(w); expect(w.enemies.every(enemy => enemy.hp === 0)).toBe(true)
    Object.assign(w.player, e.checkpoints![2]); tick(w, 200); expect(eventProgress(t.state()).stage).toBe(1)
    Object.assign(w.player, e.checkpoints![1]); tick(w, 60); expect(w.siegeRun!.channel).toBeGreaterThan(.9)
    w.action('interact', { x: 0, y: 0 }); expect(t.notice()).toContain('E不能')
    Object.assign(w.player, { x: 300, y: 430 }); tick(w, 1); expect(w.siegeRun?.channel).toBe(0)
    Object.assign(w.player, e.checkpoints![1]); tick(w, 181)
    expect(eventProgress(t.state()).stage).toBe(2); expect(w.siegeRun?.channel).toBe(0)
  })
  it('真实受击在最后帧优先中断，死亡不通过阵眼', () => {
    const t = setup(3), w = t.world, point = eventForChapter(16)!.checkpoints![3]
    clearGuards(w); Object.assign(w.player, point); tick(w, 1)
    w.siegeRun!.channel = 5 - 1 / 120
    w.spawn('mage', point.x + 100, point.y)
    const attacker = w.enemies.at(-1)!; attacker.windup = 1 / 120; attacker.target = { ...point }; attacker.radius = 85
    w.player.invincible = 0; const hp = w.player.hp; w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBeLessThan(hp); expect(w.siegeRun?.channel).toBe(0); expect(eventProgress(t.state()).stage).toBe(3)
    w.siegeRun!.channel = 5 - 1 / 120; w.player.hp = 1; w.player.invincible = 0; attacker.windup = 1 / 120
    w.step({ x: 0, y: 0 }); expect(w.player.hp).toBe(0); expect(eventProgress(t.state()).stage).toBe(3)
  })
  it('刷新保留已破阵节点并重建未通过守卫，当前计时重置且免费', () => {
    const t = setup(2), before = structuredClone(t.state()), w = t.reload()
    expect(w.player).toMatchObject(eventForChapter(16)!.checkpoints![1])
    expect(w.siegeRun).toEqual({ stage: 2, channel: 0 })
    expect(w.enemies.map(e => e.spawnId)).toEqual(['sect-court-mage', 'sect-hall-hunter'])
    expect(t.state()).toEqual(before); expect(w.barrierClosed()).toBe(true)
  })
  it('实体山门不能提前穿越，三阵通过后打开但未报告仍不能决战', () => {
    const locked = setup(3), w = locked.world
    expect(mapCollides(w.collisionMap(), { x: 1020, y: 250 })).toBe(true)
    Object.assign(w.player, { x: 970, y: 250 })
    for (let i = 0; i < 60; i++) w.step({ x: 1, y: 0 })
    expect(w.player.x).toBeLessThanOrEqual(983)
    const opened = setup(4)
    expect(opened.world.barrierClosed()).toBe(false); expect(mapCollides(opened.world.collisionMap(), { x: 1020, y: 250 })).toBe(false)
    Object.assign(opened.world.player, opened.world.map.gate); opened.world.action('interact', { x: 0, y: 0 })
    expect(opened.world.enemies.some(e => e.type === 'boss')).toBe(false)
  })
  it('云盾蓄势减伤、收招增伤，真实攻击触发三阶段和五点云阵', () => {
    const t = setup(5), w = t.world
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); const boss = w.enemies.find(e => e.type === 'boss')!
    expect(boss.sect?.phase).toBe(1)
    Object.assign(w.player, { x: boss.x - 45, y: boss.y })
    const strike = () => { w.attackCooldown = 0; const hp = boss.hp; w.action('attack', { x: 0, y: 0, aim: boss }); return hp - boss.hp }
    const normal = strike(); boss.windup = 1; const shield = strike(); boss.windup = 0; boss.sect!.recovery = 1; const recovery = strike()
    expect(shield).toBeLessThan(normal); expect(recovery).toBeGreaterThan(normal)
    while (boss.hp > boss.maxHp * .6) strike()
    boss.sect!.recovery = 0; boss.timer = 0; w.step({ x: 0, y: 0 })
    expect(boss.sect?.phase).toBe(2); expect(boss.secondary).toHaveLength(2)
    boss.windup = 0
    while (boss.hp > boss.maxHp * .3) strike()
    boss.sect!.recovery = 0; boss.timer = 0; w.step({ x: 0, y: 0 })
    expect(boss.sect?.phase).toBe(3); expect(boss.secondary).toHaveLength(4)
    expect(w.runtime().sect).toMatchObject({ phase: 3, shield: true })
  })
  it('实际决战后首通只奖620金币且支援由可用变离队', () => {
    const t = setup(5), w = t.world, before = structuredClone(t.state())
    expect(teacherSupport(before).available).toBe(true)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); const boss = w.enemies.find(e => e.type === 'boss')!
    for (let frame = 0; frame < 3600 && boss.hp > 0 && w.player.hp > 0; frame++) {
      Object.assign(w.player, { x: boss.x - 45, y: boss.y })
      for (const action of ['attack', 'strike', 'wave', 'lotus'] as const) w.action(action, { x: 0, y: 0, aim: boss })
      w.step({ x: 0, y: 0 })
    }
    expect(boss.hp).toBe(0); expect(t.state().progress[16].boss).toBe(true)
    expect(teacherSupport(t.state()).available).toBe(true)
    const done = finishChapter(t.state()); expect(done.gold).toBe(before.gold + 620)
    expect(done.flame).toBe('fallen'); expect(teacherSupport(done).status).toBe('away')
    expect(validateState(done)).toEqual(done); expect(finishChapter(done)).toBe(done)
  })
  it.each([1, 2, 3])('schema%i旧第16章按3草4战迁移，不补奖励', schema => {
    const old = JSON.parse(JSON.stringify(siegeState())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.8.0'
    old.progress[16].events = {}; old.progress[16].herbs = 3; old.progress[16].kills = 3
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(16); old.progress[16].boss = true
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[16].kills = 4
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold)
    expect(done.inventory).toEqual(old.inventory); expect(done.flame).toBe('fallen')
  })
})
