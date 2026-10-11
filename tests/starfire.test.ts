import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory, unlockedFlames } from '../src/core/rules'
import { teacherSupport } from '../src/core/companions'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function starState() {
  const s = initialState(); s.chapter = 21; s.completed = Array.from({ length: 20 }, (_, i) => i + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[21] = blankProgress(21); s.armorUpgrade = 20
  return s
}
const act = (s: ReturnType<typeof starState>, action: EventAction) => advanceEvent(s, action).state
function setup(stage = 2) {
  let s = act(act(act(starState(), { type: 'begin' }), { type: 'seal', index: 0 }), { type: 'test' }), notice = ''
  while (eventProgress(s).stage < stage) s = act(s, { type: 'stabilize', stage: eventProgress(s).stage })
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    notify: (text: string) => { notice = text }, kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) },
    eventAction: (action: EventAction) => { s = act(s, action) } }
  return { world: new CombatWorld(chapterById(21), cb), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(21), cb) },
    act: (action: EventAction) => { s = act(s, action) } }
}
function tick(w: CombatWorld, n: number) { for (let i = 0; i < n; i++) w.step({ x: 0, y: 0 }) }
describe('C7b 星域不灭星火稳固', () => {
  it('确认退路才能启动，E不能替代稳固，过期和乱序段输入无效', () => {
    let s = act(starState(), { type: 'begin' })
    expect(act(s, { type: 'test' })).toBe(s)
    s = act(s, { type: 'seal', index: 0 }); s = act(s, { type: 'test' })
    expect(act(s, { type: 'stabilize', stage: 3 })).toBe(s)
    const t = setup(), w = t.world
    Object.assign(w.player, eventForChapter(21)!.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2); expect(t.notice()).toContain('不能')
  })
  it('核心外、镇心石和压力超过65均暂停计时；镇心石实际降压', () => {
    const t = setup(), w = t.world, run = w.starRun!
    Object.assign(w.player, w.map.camp); tick(w, 60)
    expect(run.elapsed).toBe(0); expect(run.heat).toBe(0)
    Object.assign(w.player, w.map.starTrial!.center); w.step({ x: 0, y: 0 })
    expect(run.elapsed).toBeGreaterThan(0); expect(run.heat).toBeGreaterThan(0)
    run.heat = 70; const elapsed = run.elapsed; w.step({ x: 0, y: 0 }); expect(run.elapsed).toBe(elapsed)
    Object.assign(w.player, w.map.starTrial!.cooling[0]); tick(w, 30)
    expect(run.elapsed).toBe(elapsed); expect(run.heat).toBeLessThan(60)
    expect(w.runtime().starChallenge).toMatchObject({ cooling: true, stable: false })
  })
  it('压力跨段保留；满格失控且免费重建当前安全段', () => {
    const t = setup(), w = t.world
    Object.assign(w.player, w.map.starTrial!.center)
    w.starRun!.heat = 40; w.starRun!.elapsed = 10 - 1 / 120; w.step({ x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(3); expect(w.starRun!.heat).toBeGreaterThan(40)
    expect(w.starRun!.elapsed).toBe(0); expect(w.starRun!.warnings).toHaveLength(0)
    w.starRun!.heat = 99.99; w.step({ x: 0, y: 0 })
    expect(w.starRun!.failed).toBe(true); expect(eventProgress(t.state()).stage).toBe(3)
    tick(w, 900); expect(eventProgress(t.state()).stage).toBe(3)
    const before = structuredClone(t.state()), rebuilt = t.reload()
    expect(rebuilt.starRun).toMatchObject({ phase: 3, heat: 0, elapsed: 0, failed: false })
    expect(rebuilt.player).toMatchObject(w.map.starTrial!.cooling[0]); expect(t.state()).toEqual(before)
  })
  it.each([[2, 1, 65], [3, 6, 45], [4, 5, 50]])('阶段%i有%d处预警且半径%d', (stage, count, radius) => {
    const t = setup(stage), w = t.world
    Object.assign(w.player, w.map.starTrial!.center); w.step({ x: 0, y: 0 })
    expect(w.starRun!.warnings).toHaveLength(count); expect(w.starRun!.warnings.every(p => p.radius === radius)).toBe(true)
    const positions = w.starRun!.warnings.map(({ x, y }) => ({ x, y })); w.step({ x: 1, y: 0 })
    expect(w.starRun!.warnings.map(({ x, y }) => ({ x, y }))).toEqual(positions)
  })
  it('落焰造成真实伤害和15压力；死亡末帧不能转下一段', () => {
    const t = setup(), w = t.world
    Object.assign(w.player, w.map.starTrial!.center)
    const hp = w.player.hp
    w.starRun!.warnings = [{ ...w.player, radius: 60, time: .001 }]; w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBeLessThan(hp); expect(w.starRun!.heat).toBeGreaterThan(15)
    w.player.hp = 1; w.player.invincible = 0; w.starRun!.elapsed = 10 - 1 / 120
    w.starRun!.warnings = [{ ...w.player, radius: 60, time: .001 }]; w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBe(0); expect(eventProgress(t.state()).stage).toBe(2)
  })
  it('最后一帧受击导致压力超65也不能通过', () => {
    const t = setup(), w = t.world
    Object.assign(w.player, w.map.starTrial!.center)
    w.starRun!.heat = 60; w.starRun!.elapsed = 10 - 1 / 120
    w.starRun!.warnings = [{ ...w.player, radius: 60, time: .001 }]; w.step({ x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2); expect(w.starRun!.elapsed).toBe(10 - 1 / 120)
  })
  it('三段时长、报告和收服确认都不提前发火，正式首通一次取得星火，药老仍离队', () => {
    const t = setup(), w = t.world, before = structuredClone(t.state())
    for (const duration of [10, 12, 14]) {
      Object.assign(w.player, w.map.starTrial!.center); w.starRun!.heat = 0; w.starRun!.elapsed = duration - 1 / 120
      w.step({ x: 0, y: 0 }); expect(validateState(t.state())).toEqual(t.state())
    }
    expect(eventProgress(t.state()).stage).toBe(5); expect(chapterReady(t.state())).toBe(false)
    t.act({ type: 'deliver' }); expect(eventDone(t.state())).toBe(true); expect(t.state().flame).toBe('fallen')
    expect(unlockedFlames(t.state()).some(f => f.id === 'star')).toBe(false)
    expect(t.state().inventory).toEqual(before.inventory); expect(t.state().xp).toBe(before.xp); expect(t.state().gold).toBe(before.gold)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(t.state().progress[21].boss).toBe(true); expect(w.enemies).toHaveLength(0); expect(t.state().flame).toBe('fallen')
    const done = finishChapter(t.state()); expect(done.flame).toBe('star'); expect(finishChapter(done)).toBe(done)
    expect(done.gold).toBe(before.gold + chapterById(21).reward); expect(teacherSupport(done).status).toBe('away')
    expect(validateState(done)).toEqual(done)
  })
  it.each([1, 2, 3])('schema%i旧4草4战目标保留，完成补事件不补奖励，未完成仍待接', schema => {
    const old = JSON.parse(JSON.stringify(starState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.9.2'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[21].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[21].boss = true; old.progress[21].herbs = 4; old.progress[21].kills = 3; old.completed.push(21); old.flame = 'star'
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[21].kills = 4
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(done.flame).toBe('star')
    expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
