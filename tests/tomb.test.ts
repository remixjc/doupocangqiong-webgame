import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function tombState() {
  const s = initialState(); s.chapter = 23; s.completed = Array.from({ length: 22 }, (_, i) => i + 1); s.flame = 'star'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[23] = blankProgress(23); s.settings.difficulty = 'story'; s.armorUpgrade = 20
  return s
}
const act = (s: ReturnType<typeof tombState>, a: EventAction) => advanceEvent(s, a).state
function setup(stage = 1) {
  let s = act(tombState(), { type: 'begin' }), notice = ''
  for (let index = 0; index < stage; index++) s = act(s, { type: 'seal', index })
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    notify: (text: string) => { notice = text }, kill: () => { s.progress[23].kills++ },
    eventAction: (a: EventAction) => { s = act(s, a) } }
  return { world: new CombatWorld(chapterById(23), cb), state: () => s, notice: () => notice,
    act: (a: EventAction) => { s = act(s, a) },
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(23), cb) } }
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
describe('C8a-2 天墓限时分层探索', () => {
  it('三层按序记录，普通行囊不能代交、重复与提前报告无效，无事件资源奖励', () => {
    let s = act(tombState(), { type: 'begin' }), before = structuredClone(s)
    expect(act(s, { type: 'seal', index: 2 })).toBe(s); expect(act(s, { type: 'deliver' })).toBe(s)
    for (let index = 0; index <= 3; index++) {
      s = act(s, { type: 'seal', index }); expect(validateState(s)).toEqual(s)
      expect(act(s, { type: 'seal', index })).toBe(s)
    }
    expect(eventProgress(s)).toMatchObject({ stage: 4, attempts: 3 })
    s = act(s, { type: 'deliver' }); expect(eventDone(s, 23, 'heaven-tomb-timed-layers')).toBe(true)
    expect(act(s, { type: 'deliver' })).toBe(s); expect(s.inventory).toEqual(before.inventory)
    expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp)
  })
  it('守卫未清不可读路标，真实战斗完成后下一层重置时限', () => {
    const t = setup(), w = t.world, event = eventForChapter(23)!
    expect(w.enemies).toHaveLength(5); t.state().inventory.herb = 100
    Object.assign(w.player, event.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.notice()).toContain('守卫')
    clear(w, 'tomb-outer-brute'); Object.assign(w.player, event.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    w.step({ x: 0, y: 0 }); expect(w.runtime().tomb).toMatchObject({ stage: 2, remaining: 40, failed: false })
    expect(t.state().inventory.herb).toBe(100)
  })
  it.each([[1, 45], [2, 40], [3, 35]])('第%i层%d秒截止后不能推进，免费重試当前层而不清已完成进度', (stage, duration) => {
    const t = setup(stage), w = t.world
    Object.assign(w.player, w.map.camp); tick(w, duration * 60 + 1)
    expect(w.runtime().tomb).toEqual({ stage, remaining: 0, failed: true })
    Object.assign(w.player, eventForChapter(23)!.checkpoints![stage]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(stage); expect(t.notice()).toContain('超时')
    const before = structuredClone(t.state()); t.act({ type: 'restart' }); w.step({ x: 0, y: 0 })
    expect(w.tombRun).toMatchObject({ stage, failed: false, attempt: stage + 1 }); expect(w.tombRun!.elapsed).toBeLessThan(.02)
    expect(t.state().gold).toBe(before.gold); expect(t.state().inventory).toEqual(before.inventory)
  })
  it('清完外层但未读牌时重建守卫，截止同帧不可通过', () => {
    const t = setup(), w = t.world
    clear(w, 'tomb-outer-brute'); expect(t.reload().guardsRemaining(eventForChapter(23)!.id, 1)).toBe(1)
    Object.assign(w.player, eventForChapter(23)!.checkpoints![1])
    w.tombRun!.elapsed = 45 - 1 / 120; w.step({ x: 0, y: 0 }); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(w.tombRun!.failed).toBe(true)
  })
  it('重建回上一层路标、已记录层守卫不重建，深层完成后计时停止', () => {
    const t = setup(3), before = structuredClone(t.state()), w = t.reload()
    expect(w.player).toMatchObject(eventForChapter(23)!.checkpoints![2])
    expect(w.enemies.map(e => e.spawnId)).toEqual(['tomb-deep-hunter', 'tomb-deep-mage'])
    expect(w.tombRun).toMatchObject({ elapsed: 0, failed: false, stage: 3 })
    expect(t.state()).toEqual(before); t.act({ type: 'seal', index: 3 }); w.step({ x: 0, y: 0 })
    expect(w.runtime().tomb).toBeUndefined(); expect(eventProgress(t.state()).stage).toBe(4)
  })
  it('非法启动次数与无关得分拒绝导入，死亡不能读取当前牌', () => {
    for (const [stage, attempts, score] of [[0, 1, 0], [2, 1, 0], [4, 2, 0], [1, 1, 1]]) {
      const s = setup().state(); Object.assign(eventProgress(s), { stage, attempts, score })
      expect(() => validateState(s)).toThrow('天墓探索')
    }
    const t = setup(), w = t.world; w.player.hp = 0
    Object.assign(w.player, eventForChapter(23)!.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1)
  })
  it.each([1, 2, 3])('schema%i旧4草5战迁移不补奖励，完成探索事件和未完成资源各保留', schema => {
    const old = JSON.parse(JSON.stringify(tombState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.10.0'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[23].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[23].boss = true; old.completed.push(23); old.progress[23].herbs = 4; old.progress[23].kills = 4
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[23].kills = 5
    const done = validateState(old); expect(eventDone(done)).toBe(true)
    expect(eventProgress(done).attempts).toBe(3); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
