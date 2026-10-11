import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function towerState() {
  const s = initialState(); s.chapter = 15; s.completed = Array.from({ length: 14 }, (_, n) => n + 1); s.flame = 'lotus'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[15] = blankProgress(15); s.settings.difficulty = 'story'; s.armorUpgrade = 20; s.attackUpgrade = 8
  return s
}
function setup(stage = 0) {
  let s = advanceEvent(towerState(), { type: 'begin' }).state, notice = ''
  if (stage >= 1) s = advanceEvent(s, { type: 'seal', index: 0 }).state
  for (let floor = 1; floor < Math.min(stage, 5); floor++) s = advanceEvent(s, { type: 'descend', stage: floor }).state
  if (stage === 5) s = advanceEvent(s, { type: 'deliver' }).state
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) },
    notify: (text: string) => { notice = text }, eventAction: (action: EventAction) => { s = advanceEvent(s, action).state } }
  return { world: new CombatWorld(chapterById(15), callbacks), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(15), callbacks) } }
}
function tick(w: CombatWorld, frames: number) { for (let n = 0; n < frames; n++) w.step({ x: 0, y: 0 }) }
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('C5d 火塔楼层与塔底心炎', () => {
  it('退路与层数按序推进，错误/过期降层及提前报告不改变状态', () => {
    let s = setup().state()
    expect(advanceEvent(s, { type: 'descend', stage: 1 }).state).toBe(s)
    expect(advanceEvent(s, { type: 'seal', index: 1 }).state).toBe(s)
    s = advanceEvent(s, { type: 'seal', index: 0 }).state
    for (let floor = 1; floor <= 3; floor++) {
      expect(advanceEvent(s, { type: 'deliver' }).state).toBe(s)
      expect(advanceEvent(s, { type: 'descend', stage: floor + 1 }).state).toBe(s)
      const next = advanceEvent(s, { type: 'descend', stage: floor }).state
      expect(next).not.toBe(s); expect(advanceEvent(next, { type: 'descend', stage: floor }).state).toBe(next)
      expect(validateState(next)).toEqual(next); s = next
    }
    expect(eventProgress(s).stage).toBe(4); expect(eventDone(s)).toBe(false)
  })
  it('只有当前阵眼内计时，E不能代替镇炎，其他层和区外均暂停', () => {
    const t = setup(1), w = t.world
    tick(w, 600); expect(w.towerRun?.elapsed).toBe(0)
    Object.assign(w.player, w.map.towerFloors![2].center); tick(w, 600)
    expect(w.towerRun?.elapsed).toBe(0); expect(eventProgress(t.state()).stage).toBe(1)
    Object.assign(w.player, w.map.towerFloors![0].center)
    w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.notice()).toContain('E不能')
    tick(w, 30); const elapsed = w.towerRun!.elapsed
    Object.assign(w.player, { x: 500, y: 650 }); tick(w, 180)
    expect(w.towerRun?.elapsed).toBe(elapsed)
  })
  it('镇心石降热但不计时，实际落焰受击会同时增加热量', () => {
    const t = setup(3), w = t.world, floor = w.map.towerFloors![2]
    Object.assign(w.player, floor.center); const hp = w.player.hp
    tick(w, 80)
    expect(w.player.hp).toBeLessThan(hp); expect(w.towerRun!.heat).toBeGreaterThan(20)
    const elapsed = w.towerRun!.elapsed, heat = w.towerRun!.heat
    Object.assign(w.player, floor.cooling); tick(w, 60)
    expect(w.towerRun!.heat).toBeLessThan(heat); expect(w.towerRun!.elapsed).toBe(elapsed)
    expect(w.runtime().tower).toMatchObject({ cooling: true, inZone: false })
  })
  it('心炎满格失控，免费重建保留已完成层数、资源和火焰', () => {
    const t = setup(3), w = t.world, before = structuredClone(t.state())
    Object.assign(w.player, w.map.towerFloors![2].center); tick(w, 1200)
    expect(w.towerRun?.failed).toBe(true); expect(eventProgress(t.state()).stage).toBe(3)
    const reload = t.reload()
    expect(reload.player).toMatchObject(eventForChapter(15)!.checkpoints![2])
    expect(reload.towerRun).toMatchObject({ phase: 3, elapsed: 0, heat: 0, failed: false })
    expect(t.state().inventory).toEqual(before.inventory); expect(t.state().gold).toBe(before.gold)
    expect(t.state().fireEnergy).toBe(before.fireEnergy); expect(t.state().flame).toBe('lotus')
  })
  it('末帧热量失控先于楼层通过；不能同时失败又记录安全点', () => {
    const t = setup(3), w = t.world, floor = w.map.towerFloors![2]
    Object.assign(w.player, floor.center)
    // Isolate the last-frame boundary without manufacturing chapter completion.
    w.towerRun!.elapsed = floor.duration - 1 / 120; w.towerRun!.heat = 99.99
    w.step({ x: 0, y: 0 })
    expect(w.towerRun?.failed).toBe(true); expect(eventProgress(t.state()).stage).toBe(3)
  })
  it('通过实际移动/闪避/镇心逐层完成，保持层数并清空新层运行态', () => {
    const t = setup(1), w = t.world
    for (let frame = 0; frame < 12000 && eventProgress(t.state()).stage < 4 && !w.towerRun?.failed; frame++) {
      const run = w.towerRun!, floor = w.map.towerFloors![run.phase - 1]
      let target = run.heat > 55 || (w.towerCooling() && run.heat > 10) ? floor.cooling : floor.center
      const warning = run.warnings.find(point => dist(w.player, point) < point.radius + 25)
      if (warning) target = { x: w.player.x, y: w.player.y + (w.player.y < warning.y ? -150 : 150) }
      const dx = target.x - w.player.x, dy = target.y - w.player.y, length = Math.hypot(dx, dy)
      const input = length > 4 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 }
      if (warning) w.action('dodge', input)
      w.step(input)
    }
    expect(eventProgress(t.state()).stage).toBe(4)
    expect(t.state().flame).toBe('lotus'); expect(t.state().fireEnergy).toBe(0)
    expect(validateState(t.state())).toEqual(t.state())
  })
  it('报告不发异火，塔底实际击败韩枫投影后只有首通事务取得陨落心炎', () => {
    const blocked = setup(4)
    Object.assign(blocked.world.player, blocked.world.map.gate); blocked.world.action('interact', { x: 0, y: 0 })
    expect(blocked.world.enemies).toHaveLength(0)
    const t = setup(5), w = t.world, before = structuredClone(t.state())
    expect(eventDone(before)).toBe(true); expect(before.flame).toBe('lotus')
    expect(before.inventory).toEqual(blocked.state().inventory); expect(before.fireEnergy).toBe(0)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    const boss = w.enemies.find(e => e.type === 'boss')!
    for (let frame = 0; frame < 3600 && boss.hp > 0 && w.player.hp > 0; frame++) {
      Object.assign(w.player, { x: boss.x + 45, y: boss.y })
      w.action('attack', { x: 0, y: 0, aim: boss }); w.action('strike', { x: 0, y: 0, aim: boss }); w.action('wave', { x: 0, y: 0, aim: boss })
      w.step({ x: 0, y: 0 })
    }
    expect(boss.hp).toBe(0); expect(t.state().progress[15].boss).toBe(true)
    expect(t.state().flame).toBe('lotus')
    const done = finishChapter(t.state())
    expect(done.flame).toBe('fallen'); expect(done.gold).toBe(before.gold + chapterById(15).reward)
    expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it.each([1, 2, 3])('schema%i旧塔底按3草4战检查，迁移不重复发异火或奖励', schema => {
    const old = JSON.parse(JSON.stringify(towerState())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.7.2'
    old.progress[15].events = {}; old.progress[15].herbs = 3; old.progress[15].kills = 3
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(15); old.progress[15].boss = true; old.flame = 'fallen'
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[15].kills = 4
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.flame).toBe('fallen'); expect(done.inventory).toEqual(old.inventory)
    expect(done.gold).toBe(old.gold); expect(done.xp).toBe(old.xp); expect(done.fireEnergy).toBe(old.fireEnergy)
  })
  it('安全台阶、镇心石、阵眼与塔底可达', () => {
    const map = mapForChapter(15), e = eventForChapter(15)!
    const points = [map.spawn, map.camp, map.gate, map.bossSpawn, e.npc, ...e.checkpoints!, ...map.towerFloors!.map(f => f.cooling)]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => dist(q, p) < 15)).toBe(true)
  })
})
