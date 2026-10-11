import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { teacherSupport } from '../src/core/companions'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function prisonState() {
  const s = initialState(); s.chapter = 22; s.completed = Array.from({ length: 21 }, (_, i) => i + 1); s.flame = 'star'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[22] = blankProgress(22); s.settings.difficulty = 'story'; s.armorUpgrade = 20
  return s
}
const act = (s: ReturnType<typeof prisonState>, a: EventAction) => advanceEvent(s, a).state
function setup(stage = 1) {
  let s = act(prisonState(), { type: 'begin' }), notice = '', reports = 0
  for (let index = 0; index < stage; index++) s = act(s, { type: 'seal', index })
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    notify: (text: string) => { notice = text },
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s); else s.progress[22].kills++ },
    eventAction: (a: EventAction) => { s = act(s, a) },
    storyEvent: () => { reports++; s = act(s, { type: 'deliver' }) } }
  return { world: new CombatWorld(chapterById(22), cb), state: () => s, notice: () => notice, reports: () => reports,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(22), cb) } }
}
function tick(w: CombatWorld, n: number) { for (let i = 0; i < n; i++) w.step({ x: 0, y: 0 }) }
function clear(w: CombatWorld, id: string) {
  const e = w.enemies.find(e => e.spawnId === id)!
  for (let i = 0; i < 1200 && e.hp > 0 && w.player.hp > 0; i++) {
    Object.assign(w.player, { x: e.x - 45, y: e.y })
    w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e }); w.action('wave', { x: 0, y: 0, aim: e })
    w.step({ x: 0, y: 0 })
  }
  expect(e.hp).toBe(0)
}
describe('C7c 魂殿破禁与药老撤离', () => {
  it('退路与三处破禁依序推进，提前、重复操作和提前报告无效', () => {
    let s = act(prisonState(), { type: 'begin' }), before = structuredClone(s)
    expect(act(s, { type: 'seal', index: 1 })).toBe(s); expect(act(s, { type: 'deliver' })).toBe(s)
    for (let index = 0; index < 4; index++) {
      s = act(s, { type: 'seal', index }); expect(act(s, { type: 'seal', index })).toBe(s)
      expect(validateState(s)).toEqual(s)
    }
    expect(eventProgress(s).stage).toBe(4); expect(chapterReady(s)).toBe(false)
    expect(s.inventory).toEqual(before.inventory); expect(s.xp).toBe(before.xp); expect(s.gold).toBe(before.gold)
  })
  it('外廊守卫存活不能开门，真实战斗后开门，重建不复锁已完成节点', () => {
    const t = setup(), w = t.world, e = eventForChapter(22)!
    expect(w.barrierClosed()).toBe(true); expect(w.enemies).toHaveLength(4)
    Object.assign(w.player, e.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.notice()).toContain('守卫')
    clear(w, 'prison-outer-brute'); Object.assign(w.player, e.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2); expect(w.barrierClosed()).toBe(false)
    const rebuilt = t.reload()
    expect(rebuilt.barrierClosed()).toBe(false); expect(rebuilt.enemies.some(e => e.spawnId === 'prison-outer-brute')).toBe(false)
    expect(rebuilt.player).toMatchObject(e.checkpoints![1]); expect(rebuilt.guardsRemaining(e.id, 2)).toBe(2)
  })
  it('内封两名守卫都须清理；囚牢守卫通过后才生成护送者及两名追击者', () => {
    const t = setup(2), w = t.world, e = eventForChapter(22)!
    clear(w, 'prison-inner-hunter'); Object.assign(w.player, e.checkpoints![2]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2)
    clear(w, 'prison-inner-mage'); Object.assign(w.player, e.checkpoints![2]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(3); expect(w.prisonEscort).toBeUndefined()
    clear(w, 'prison-cell-mage'); Object.assign(w.player, e.checkpoints![3]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(4); expect(w.prisonEscort?.hp).toBe(200)
    expect(w.enemies.filter(e => e.spawnId?.startsWith('prison-pursuit'))).toHaveLength(2)
    w.action('interact', { x: 0, y: 0 }); expect(w.enemies.filter(e => e.spawnId?.startsWith('prison-pursuit'))).toHaveLength(2)
    expect(teacherSupport(t.state()).available).toBe(false)
  })
  it('玩家距离过远时药老等待，返回会合点前不能报告', () => {
    const t = setup(4), w = t.world, origin = { x: w.prisonEscort!.x, y: w.prisonEscort!.y }
    Object.assign(w.player, eventForChapter(22)!.npc); w.action('interact', { x: 0, y: 0 })
    expect(t.reports()).toBe(0); expect(eventProgress(t.state()).stage).toBe(4)
    tick(w, 20); expect(w.prisonEscort).toMatchObject({ ...origin, waiting: true })
    Object.assign(w.player, origin); w.step({ x: 0, y: 0 })
    expect(w.prisonEscort!.x).toBeLessThan(origin.x); expect(w.prisonEscort!.waiting).toBe(false)
  })
  it('实际追击瞄准护送者并造成独立伤害，倒下后不能报告或继续移动', () => {
    const t = setup(4), w = t.world, hp = w.prisonEscort!.hp
    Object.assign(w.player, { x: 1000, y: 700 }); tick(w, 100)
    expect(w.prisonEscort!.hp).toBeLessThan(hp)
    w.prisonEscort!.hp = 1; tick(w, 300)
    expect(w.prisonEscort!.hp).toBe(0); expect(w.runtime().prisonEscort?.failed).toBe(true)
    const point = { x: w.prisonEscort!.x, y: w.prisonEscort!.y }
    Object.assign(w.player, point); tick(w, 60); expect(w.prisonEscort).toMatchObject(point)
    Object.assign(w.player, eventForChapter(22)!.npc); w.action('interact', { x: 0, y: 0 })
    expect(t.reports()).toBe(0); expect(eventProgress(t.state()).stage).toBe(4)
  })
  it('死亡重建只重试撤离，200生命与追击者恢复，破禁和资源保持', () => {
    const t = setup(4), w = t.world, before = structuredClone(t.state())
    w.prisonEscort!.hp = 0; const rebuilt = t.reload()
    expect(rebuilt.prisonEscort?.hp).toBe(200); expect(rebuilt.player).toMatchObject(eventForChapter(22)!.checkpoints![3])
    expect(rebuilt.enemies.map(e => e.spawnId)).toEqual(['prison-pursuit-hunter', 'prison-pursuit-mage'])
    expect(rebuilt.barrierClosed()).toBe(false); expect(t.state()).toEqual(before)
  })
  it('双方存活返回后报告、出口确认不提前恢复支援；正式首通归队一次', () => {
    const t = setup(4), w = t.world, npc = eventForChapter(22)!.npc
    clear(w, 'prison-pursuit-hunter'); clear(w, 'prison-pursuit-mage')
    for (let i = 0; i < 600 && !w.prisonArrived(); i++) {
      Object.assign(w.player, { x: w.prisonEscort!.x - 25, y: w.prisonEscort!.y }); w.step({ x: 0, y: 0 })
    }
    expect(w.prisonArrived()).toBe(true)
    Object.assign(w.player, npc); const before = structuredClone(t.state())
    w.action('interact', { x: 0, y: 0 }); expect(eventDone(t.state())).toBe(true)
    expect(teacherSupport(t.state()).available).toBe(false)
    expect(t.state().inventory).toEqual(before.inventory); expect(t.state().xp).toBe(before.xp); expect(t.state().gold).toBe(before.gold)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(t.state().progress[22].boss).toBe(true); expect(w.enemies.some(e => e.type === 'boss')).toBe(false)
    expect(teacherSupport(t.state()).available).toBe(false)
    const done = finishChapter(t.state())
    expect(teacherSupport(done)).toMatchObject({ available: true, status: 'returned' })
    expect(done.gold).toBe(before.gold + chapterById(22).reward); expect(finishChapter(done)).toBe(done)
    expect(validateState(done)).toEqual(done)
  })
  it.each([1, 2, 3])('schema%i旧4草4战迁移保留归队和奖励；未完成不提前解锁', schema => {
    const old = JSON.parse(JSON.stringify(prisonState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.9.3'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[22].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[22].boss = true; old.completed.push(22); old.progress[22].herbs = 4; old.progress[22].kills = 3
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[22].kills = 4
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(teacherSupport(done).status).toBe('returned')
    expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
