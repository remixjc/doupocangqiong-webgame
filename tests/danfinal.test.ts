import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { danFinalTargets, findEvent } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { teacherSupport } from '../src/core/companions'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const id = 'danta-alchemy-lightning-final'
function state() {
  const s = initialState(); s.chapter = 20; s.completed = Array.from({ length: 19 }, (_, i) => i + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[20] = blankProgress(20)
  s.progress[20].events['dan-realm-timed-herbs'] = migrateLegacyEvents(20, true)['dan-realm-timed-herbs']
  return s
}
const act = (s: ReturnType<typeof state>, action: EventAction) => advanceEvent(s, { ...action, eventId: id }).state
const progress = (s: ReturnType<typeof state>) => eventProgress(s, 20, id)
function ready() {
  let s = act(act(state(), { type: 'begin' }), { type: 'test' })
  for (let i = 0; i < 3; i++) s = act(s, { type: 'pulse', marker: danFinalTargets[i], stage: i + 1 })
  return s
}
function setup() {
  let s = act(ready(), { type: 'seal', index: 1 }), notice = ''
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    notify: (text: string) => { notice = text },
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) },
    eventAction: (action: EventAction) => { s = advanceEvent(s, action).state } }
  return { world: new CombatWorld(chapterById(20), cb), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(20), cb) },
    act: (action: EventAction) => { s = act(s, action) } }
}
function tick(w: CombatWorld, frames: number) { for (let i = 0; i < frames; i++) w.step({ x: 0, y: 0 }) }
describe('C7a-3 丹会成丹与丹雷', () => {
  it('未完成丹界不能接取；控火不能被普通机关交互跳过', () => {
    const s = state(); s.progress[20] = blankProgress(20)
    expect(act(s, { type: 'begin' })).toBe(s)
    const begun = act(state(), { type: 'begin' })
    expect(act(begun, { type: 'seal', index: 0 })).toBe(begun)
    expect(act(begun, { type: 'seal', index: 1 })).toBe(begun)
    expect(act(begun, { type: 'survive' })).toBe(begun)
  })
  it('三步评分保存、重复与过期输入无效，失败可免费重试且不产丹', () => {
    let s = act(act(state(), { type: 'begin' }), { type: 'test' }), before = structuredClone(s)
    s = act(s, { type: 'pulse', marker: .3, stage: 1 }); expect(progress(s)).toMatchObject({ stage: 2, score: 100 })
    expect(validateState(s)).toEqual(s); expect(act(s, { type: 'pulse', marker: .3, stage: 1 })).toBe(s)
    for (const marker of [NaN, Infinity, -.1, 1.1]) expect(act(s, { type: 'pulse', marker, stage: 2 })).toBe(s)
    s = act(s, { type: 'pulse', marker: 0, stage: 2 }); s = act(s, { type: 'pulse', marker: 0, stage: 3 })
    expect(progress(s)).toMatchObject({ stage: 0, score: 0, attempts: 1 }); expect(validateState(s)).toEqual(s)
    s = act(s, { type: 'test' })
    for (let i = 0; i < 3; i++) s = act(s, { type: 'pulse', marker: danFinalTargets[i], stage: i + 1 })
    expect(progress(s)).toMatchObject({ stage: 4, score: 300, attempts: 2 })
    expect(s.inventory).toEqual(before.inventory); expect(s.gold).toBe(before.gold)
  })
  it('满分控火仍需真实生存、报告与审核；报告及740首通奖励各一次', () => {
    const t = setup(), w = t.world
    expect(chapterReady(t.state())).toBe(false)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(t.state().progress[20].boss).toBe(false)
    t.act({ type: 'survive' }); const xp = t.state().xp
    t.act({ type: 'deliver' }); t.act({ type: 'deliver' })
    expect(t.state().xp).toBe(xp + 80); expect(eventDone(t.state())).toBe(true)
    w.action('interact', { x: 0, y: 0 }); expect(w.enemies.some(e => e.type === 'boss')).toBe(false)
    const before = t.state().gold, done = finishChapter(t.state())
    expect(done.gold).toBe(before + 740); expect(finishChapter(done)).toBe(done)
    expect(teacherSupport(done).status).toBe('away'); expect(done.flame).toBe('fallen')
    expect(validateState(done)).toEqual(done)
  })
  it('E不能替代丹雷，区外暂停计时但雷击继续', () => {
    const t = setup(), w = t.world
    w.action('interact', { x: 0, y: 0 }); expect(progress(t.state()).stage).toBe(5)
    Object.assign(w.player, w.map.camp); tick(w, 20)
    expect(w.danLightning!.elapsed).toBe(0); expect(w.danLightning!.warnings.length).toBe(1)
    expect(w.runtime().danLightning).toMatchObject({ remaining: 18, inZone: false, phase: 1 })
  })
  it.each([[0, 1, 70], [6, 2, 60], [12, 5, 50]])('第%s秒雷阵%d点且锁定预警坐标', (elapsed, count, radius) => {
    const t = setup(), w = t.world
    w.danLightning!.elapsed = elapsed; w.step({ x: 0, y: 0 })
    expect(w.danLightning!.warnings).toHaveLength(count)
    expect(w.danLightning!.warnings.every(p => p.radius === radius)).toBe(true)
    const points = w.danLightning!.warnings.map(({ x, y }) => ({ x, y }))
    w.step({ x: 1, y: 0 })
    expect(w.danLightning!.warnings.map(({ x, y }) => ({ x, y }))).toEqual(points)
  })
  it('实际落雷造成伤害；死亡的最后一帧不能通过', () => {
    const t = setup(), w = t.world, hp = w.player.hp
    w.step({ x: 0, y: 0 }); tick(w, 61); expect(w.player.hp).toBeLessThan(hp)
    w.player.hp = 1; w.player.invincible = 0; w.danLightning!.elapsed = 18 - 1 / 120
    w.danLightning!.warnings = [{ x: w.player.x, y: w.player.y, radius: 70, time: .001 }]
    w.step({ x: 0, y: 0 }); expect(w.player.hp).toBe(0); expect(progress(t.state()).stage).toBe(5)
  })
  it('安全完成18秒自动转报告，重建回雷台重新计时并保留控火成绩', () => {
    const t = setup(), w = t.world
    w.danLightning!.elapsed = 8; const rebuilt = t.reload()
    expect(rebuilt.player).toMatchObject(rebuilt.map.lightningTrial!.center)
    expect(rebuilt.danLightning).toMatchObject({ elapsed: 0, warnings: [] })
    expect(progress(t.state())).toMatchObject({ stage: 5, score: 300, attempts: 1 })
    rebuilt.danLightning!.elapsed = 18 - 1 / 120; rebuilt.step({ x: 0, y: 0 })
    expect(progress(t.state()).stage).toBe(6); expect(rebuilt.runtime().danLightning).toBeUndefined()
  })
  it('非法部分分数、未尝试却通过及缺前置拒绝导入', () => {
    for (const [stage, score, attempts] of [[1, 1, 0], [2, 101, 0], [3, 201, 0], [4, 209, 1], [5, 300, 0]]) {
      const s = ready(); Object.assign(progress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('丹会成丹')
    }
    const s = ready(); s.progress[20].events['dan-realm-timed-herbs'] = blankProgress(20).events['dan-realm-timed-herbs']
    expect(() => validateState(s)).toThrow('前置')
  })
  it('0.9.1旧两炉目标仍校验，完成补大会记录不补奖励，未完成保持新任务待接', () => {
    const old = state(); old.contentVersion = '0.9.1'; delete old.progress[20].events[id]
    expect(progress(validateState(old)).started).toBe(false)
    old.progress[20].boss = true; old.progress[20].brews = 1
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[20].brews = 2
    const migrated = validateState(old)
    expect(progress(migrated)).toMatchObject({ stage: 7, score: 300, attempts: 1 })
    expect(migrated.inventory).toEqual(old.inventory); expect(migrated.xp).toBe(old.xp); expect(migrated.gold).toBe(old.gold)
  })
  it('丹炉只打开控火面板，未接任务不会自动推进', () => {
    let s = state(), checkpoint: number | undefined
    const w = new CombatWorld(chapterById(20), { state: () => s, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, storyEvent: (_id, index) => { checkpoint = index }, eventAction: a => { s = advanceEvent(s, a).state } })
    Object.assign(w.player, findEvent(20, id)!.checkpoints![0]); w.action('interact', { x: 0, y: 0 })
    expect(checkpoint).toBe(0); expect(progress(s).started).toBe(false)
  })
})
