import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { teacherSupport } from '../src/core/companions'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function lineageState() {
  const s = initialState(); s.chapter = 19; s.completed = Array.from({ length: 18 }, (_, n) => n + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[19] = blankProgress(19); s.settings.difficulty = 'story'; s.armorUpgrade = 20; s.gold = 0
  return s
}
const apply = (s: ReturnType<typeof initialState>, action: EventAction) => advanceEvent(s, action).state
function setup() {
  let s = apply(apply(lineageState(), { type: 'begin' }), { type: 'seal', index: 0 }), notice = '', audits = 0
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: (text: string) => { notice = text },
    kill: (boss: boolean) => { if (boss) { const next = registerBossVictory(s); if (next !== s) audits++; s = next } else s.progress[19].kills++ },
    eventAction: (action: EventAction) => { s = apply(s, action) } }
  return { world: new CombatWorld(chapterById(19), cb), state: () => s, notice: () => notice, audits: () => audits,
    act: (action: EventAction) => { s = apply(s, action) }, reload: () => { s = validateState(s); return new CombatWorld(chapterById(19), cb) } }
}
describe('C6d 星陨师门联络', () => {
  it.each([[1, 2], [2, 1]])('两份记录可以按%j顺序取得，单份重复不发资源且不能提前校对', (...order) => {
    let s = setup().state(), before = structuredClone(s)
    expect(apply(s, { type: 'lead', destination: 'danta' })).toBe(s)
    s = apply(s, { type: 'seal', index: order[0] })
    expect(eventProgress(s).stage).toBe(1); expect(validateState(s)).toEqual(s)
    expect(apply(s, { type: 'seal', index: order[0] })).toBe(s)
    s = apply(s, { type: 'seal', index: order[1] })
    expect(eventProgress(s)).toMatchObject({ stage: 2, score: 3 }); expect(validateState(s)).toEqual(s)
    expect(s.gold).toBe(before.gold); expect(s.inventory).toEqual(before.inventory)
  })
  it('错误校对免费重试，记录保留，正确丹塔方向后一次登记50积累', () => {
    let s = setup().state(); s = apply(apply(s, { type: 'seal', index: 1 }), { type: 'seal', index: 2 })
    const before = structuredClone(s)
    for (const destination of ['rescue', 'thunder'] as const) {
      s = apply(s, { type: 'lead', destination }); expect(eventProgress(s)).toMatchObject({ stage: 2, score: 3 })
      expect(validateState(s)).toEqual(s); expect(s.gold).toBe(before.gold); expect(s.inventory).toEqual(before.inventory)
    }
    expect(eventProgress(s).attempts).toBe(2)
    expect(apply(s, { type: 'deliver' })).toBe(s); s = apply(s, { type: 'lead', destination: 'danta' })
    s = apply(s, { type: 'deliver' }); expect(eventDone(s)).toBe(true); expect(s.xp).toBe(before.xp + 50)
    expect(apply(s, { type: 'deliver' })).toBe(s); expect(teacherSupport(s).status).toBe('away')
    expect(s.completed).not.toContain(22); expect(s.flame).toBe('fallen'); expect(validateState(s)).toEqual(s)
  })
  it('记录的真实守卫门槛、击败后读取，刷新按取得位重建未取得守卫', () => {
    const t = setup(), w = t.world, points = eventForChapter(19)!.checkpoints!
    Object.assign(w.player, points[1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).score).toBe(0); expect(t.notice()).toContain('守卫')
    const e = w.enemies.find(e => e.spawnId === 'star-west-hunter')!
    for (let frame = 0; frame < 1500 && e.hp > 0; frame++) {
      Object.assign(w.player, { x: e.x - 45, y: e.y }); w.action('attack', { x: 0, y: 0, aim: e })
      w.action('strike', { x: 0, y: 0, aim: e }); w.step({ x: 0, y: 0 })
    }
    expect(e.hp).toBe(0); Object.assign(w.player, points[1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).score).toBe(1)
    expect(t.reload().enemies.map(e => e.spawnId)).toEqual(['star-east-mage', 'star-east-brute'])
    const reversed = setup(); reversed.act({ type: 'seal', index: 2 })
    expect(reversed.reload().enemies.map(e => e.spawnId)).toEqual(['star-west-hunter'])
  })
  it('没有两份记录不能打开校对，登记前审核锁定，审核不生成首领且首通一次710金币', () => {
    const t = setup(), w = t.world, point = eventForChapter(19)!.checkpoints![3]
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 }); expect(t.notice()).toContain('两份记录')
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(t.audits()).toBe(0)
    for (const index of [2, 1]) t.act({ type: 'seal', index })
    t.act({ type: 'lead', destination: 'danta' }); w.action('interact', { x: 0, y: 0 }); expect(t.audits()).toBe(0)
    t.act({ type: 'deliver' }); w.action('interact', { x: 0, y: 0 }); expect(t.audits()).toBe(1)
    expect(w.enemies.some(e => e.type === 'boss')).toBe(false)
    w.action('interact', { x: 0, y: 0 }); expect(t.audits()).toBe(1)
    const before = t.state(), done = finishChapter(before)
    expect(done.gold).toBe(before.gold + 710); expect(teacherSupport(done).status).toBe('away')
    expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it('异常位集合、提前校对尝试和缺少成功尝试记录拒绝导入', () => {
    for (const [stage, score, attempts] of [[1, 3, 0], [1, 1, 1], [2, 2, 0], [3, 3, 0]]) {
      const s = setup().state(); Object.assign(eventProgress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('师门线索')
    }
  })
  it.each([1, 2, 3])('schema%i旧师门4草4战迁移不补记录奖励', schema => {
    const old = JSON.parse(JSON.stringify(lineageState())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.8.3'
    old.progress[19].events = {}; old.progress[19].herbs = 4; old.progress[19].kills = 3
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(19); old.progress[19].boss = true
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[19].kills = 4
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(eventProgress(done)).toMatchObject({ score: 3, attempts: 1 })
    expect(done.gold).toBe(old.gold); expect(done.xp).toBe(old.xp); expect(done.inventory).toEqual(old.inventory)
  })
})
