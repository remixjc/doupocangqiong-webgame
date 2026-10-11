import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function expeditionState() {
  const s = initialState(); s.chapter = 20; s.completed = Array.from({ length: 19 }, (_, n) => n + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[20] = blankProgress(20); s.settings.difficulty = 'story'; s.armorUpgrade = 20
  return s
}
const apply = (s: ReturnType<typeof initialState>, action: EventAction) => advanceEvent(s, action).state
function setup(score = 0) {
  let s = apply(apply(expeditionState(), { type: 'begin' }), { type: 'seal', index: 0 }), notice = ''
  for (const index of [1, 2, 3]) if (score & (1 << (index - 1))) s = apply(s, { type: 'seal', index })
  const cb = { state: () => s, collect: () => { s.inventory.herb++; s.progress[20].herbs++ }, camp: () => {}, heal: () => false,
    notify: (text: string) => { notice = text }, kill: () => { s.progress[20].kills++ },
    eventAction: (action: EventAction) => { s = apply(s, action) } }
  return { world: new CombatWorld(chapterById(20), cb), state: () => s, notice: () => notice,
    act: (action: EventAction) => { s = apply(s, action) }, reload: () => { s = validateState(s); return new CombatWorld(chapterById(20), cb) } }
}
function tick(w: CombatWorld, frames: number) { for (let i = 0; i < frames; i++) w.step({ x: 0, y: 0 }) }
function clearGuard(w: CombatWorld, id: string) {
  const e = w.enemies.find(e => e.spawnId === id)!
  for (let frame = 0; frame < 1500 && e.hp > 0 && w.player.hp > 0; frame++) {
    Object.assign(w.player, { x: e.x - 45, y: e.y })
    w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e }); w.step({ x: 0, y: 0 })
  }
  expect(e.hp).toBe(0)
}
describe('C7a-2 丹界限时指定药材', () => {
  it.each([[1, 3, 2], [3, 2, 1]])('三处顺序%j可完成，重复节点和提前报告无效且不发普通材料', (...order) => {
    let s = setup().state(), before = structuredClone(s)
    expect(apply(s, { type: 'deliver' })).toBe(s)
    for (const index of order) {
      s = apply(s, { type: 'seal', index }); expect(validateState(s)).toEqual(s)
      expect(apply(s, { type: 'seal', index })).toBe(s)
    }
    expect(eventProgress(s)).toMatchObject({ stage: 2, score: 7 }); expect(eventDone(s)).toBe(false)
    s = apply(s, { type: 'deliver' }); expect(eventDone(s)).toBe(true)
    expect(apply(s, { type: 'deliver' })).toBe(s); expect(s.inventory).toEqual(before.inventory)
    expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp)
  })
  it('真实驻点守卫必须清理，普通行囊药草不能代交', () => {
    const t = setup(), w = t.world, point = eventForChapter(20)!.checkpoints![1]
    t.state().inventory.herb = 100
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).score).toBe(0); expect(t.notice()).toContain('守卫')
    clearGuard(w, 'dan-west-brute'); Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).score).toBe(1); expect(t.state().inventory.herb).toBe(100)
  })
  it('45秒超时后不能取得药材，免费重试保留取得位并重新计时', () => {
    const t = setup(1), w = t.world
    Object.assign(w.player, w.map.camp); tick(w, 2701)
    expect(w.runtime().expedition).toMatchObject({ failed: true, remaining: 0, collected: 1 })
    Object.assign(w.player, eventForChapter(20)!.checkpoints![2]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).score).toBe(1); expect(t.notice()).toContain('超时')
    const before = structuredClone(t.state()); t.act({ type: 'restart' }); w.step({ x: 0, y: 0 })
    expect(eventProgress(t.state()).attempts).toBe(2); expect(w.expeditionRun).toMatchObject({ attempt: 2, failed: false })
    expect(w.expeditionRun!.elapsed).toBeLessThan(.02); expect(eventProgress(t.state()).score).toBe(1)
    expect(t.state().inventory).toEqual(before.inventory); expect(t.state().gold).toBe(before.gold)
  })
  it('最后驻点在截止后不能完成，保存保留部分取得记录', () => {
    const t = setup(3), w = t.world, point = eventForChapter(20)!.checkpoints![3]
    clearGuard(w, 'dan-north-hunter'); Object.assign(w.player, point)
    w.expeditionRun!.elapsed = 45 - 1 / 120; w.step({ x: 0, y: 0 }); w.action('interact', { x: 0, y: 0 })
    expect(w.expeditionRun!.failed).toBe(true); expect(eventProgress(t.state())).toMatchObject({ stage: 1, score: 3 })
    expect(validateState(t.state())).toEqual(t.state())
  })
  it('刷新回任务牌、未采点重新给45秒，已采守卫不重建', () => {
    const t = setup(5), before = structuredClone(t.state()), w = t.reload()
    expect(w.player).toMatchObject(eventForChapter(20)!.checkpoints![0])
    expect(w.expeditionRun).toMatchObject({ elapsed: 0, failed: false })
    expect(w.enemies.map(e => e.spawnId)).toEqual(['dan-east-hunter', 'dan-east-mage'])
    expect(t.state()).toEqual(before); expect(w.runtime().expedition?.collected).toBe(2)
  })
  it('取得三份后停止计时，事件仍不能替代两炉炼药与丹雷试炼', () => {
    const t = setup(7), w = t.world
    tick(w, 2800); expect(w.expeditionRun).toBeUndefined()
    t.act({ type: 'deliver' }); Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(w.enemies.some(e => e.type === 'boss')).toBe(false); expect(t.state().progress[20].brews).toBe(0)
  })
  it('非法取得位、缺少启动和提前记录全集拒绝导入', () => {
    for (const [stage, score, attempts] of [[0, 1, 0], [1, 7, 1], [1, 2, 0], [2, 6, 1], [3, 8, 1]]) {
      const s = setup().state(); Object.assign(eventProgress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('丹界指定药材')
    }
  })
  it.each([1, 2, 3])('schema%i旧丹会4草4战2炉校验，完成档不补探索所得', schema => {
    const old = JSON.parse(JSON.stringify(expeditionState())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.9.0'
    old.progress[20].events = {}; old.progress[20].herbs = 4; old.progress[20].kills = 4; old.progress[20].brews = 1
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(20); old.progress[20].boss = true
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[20].brews = 2
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(done.inventory).toEqual(old.inventory)
    expect(done.gold).toBe(old.gold); expect(done.xp).toBe(old.xp)
  })
})
