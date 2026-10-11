import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventsForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory, unlockedFlames } from '../src/core/rules'
import { teacherSupport } from '../src/core/companions'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const [mirrors, purification] = eventsForChapter(25)
function pureState() {
  const s = initialState(); s.chapter = 25; s.completed = Array.from({ length: 24 }, (_, i) => i + 1); s.flame = 'star'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[25] = blankProgress(25); s.progress[25].events[mirrors.id] = migrateLegacyEvents(25, true)[mirrors.id]
  return s
}
const act = (s: ReturnType<typeof pureState>, a: EventAction) => advanceEvent(s, { ...a, eventId: purification.id }).state
function setup(stage = 1) {
  let s = act(act(pureState(), { type: 'begin' }), { type: 'seal', index: 0 }), notice = ''
  while (eventProgress(s, 25, purification.id).stage < stage) s = act(s, { type: 'purify', stage: eventProgress(s, 25, purification.id).stage })
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: (message: string) => { notice = message },
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) }, eventAction: (a: EventAction) => { s = act(s, a) } }
  return { world: new CombatWorld(chapterById(25), cb), state: () => s, notice: () => notice,
    act: (a: EventAction) => { s = act(s, a) }, reload: () => { s = validateState(s); return new CombatWorld(chapterById(25), cb) } }
}
function tick(w: CombatWorld, n: number) { for (let i = 0; i < n; i++) w.step({ x: 0, y: 0 }) }
describe('C8c-2 妖火三段净化', () => {
  it('三镜前置、退路前置、乱序和过期推进拒绝，E不能代替区域计时', () => {
    const s = pureState(); s.progress[25] = blankProgress(25)
    expect(act(s, { type: 'begin' })).toBe(s)
    const started = act(pureState(), { type: 'begin' }); expect(act(started, { type: 'purify', stage: 1 })).toBe(started)
    const t = setup(), w = t.world, before = t.state()
    expect(act(before, { type: 'purify', stage: 2 })).toBe(before)
    Object.assign(w.player, purification.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(t.state()).toBe(before); expect(t.notice()).toContain('不能代替')
    expect(w.enemies).toHaveLength(0)
    t.act({ type: 'purify', stage: 1 }); expect(act(t.state(), { type: 'purify', stage: 1 })).toBe(t.state())
  })
  it('只有当前区域计时，其他区及营地暂停，离区降侵蚀且未落预警仍有伤害', () => {
    const t = setup(), w = t.world, run = w.purificationRun!
    Object.assign(w.player, w.map.purificationZones![1].center); tick(w, 60); expect(run.elapsed).toBe(0)
    Object.assign(w.player, w.map.purificationZones![0].center); w.step({ x: 0, y: 0 }); expect(run.elapsed).toBeGreaterThan(0)
    const before = run.elapsed; Object.assign(w.player, w.map.camp); run.corruption = 50; tick(w, 30)
    expect(run.elapsed).toBe(before); expect(run.corruption).toBeLessThan(50)
    const hp = w.player.hp; run.warnings = [{ ...w.player, radius: 65, time: .001 }]; w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBeLessThan(hp); expect(run.elapsed).toBe(0)
    expect(w.runtime().purification).toMatchObject({ inZone: false, blocked: true })
  })
  it.each([[1, 1, 65], [2, 4, 38], [3, 5, 45]])('第%i段生成%d处半径%d锁定预警', (stage, count, radius) => {
    const t = setup(stage), w = t.world
    Object.assign(w.player, w.map.purificationZones![stage - 1].center); w.step({ x: 0, y: 0 })
    expect(w.purificationRun!.warnings).toHaveLength(count)
    expect(w.purificationRun!.warnings.every(p => p.radius === radius)).toBe(true)
    const positions = w.purificationRun!.warnings.map(({ x, y }) => ({ x, y })); w.step({ x: 1, y: 0 })
    expect(w.purificationRun!.warnings.map(({ x, y }) => ({ x, y }))).toEqual(positions)
  })
  it('受击倒退2秒增30侵蚀并暂停1秒，护体闪避不倒退', () => {
    const t = setup(), w = t.world, run = w.purificationRun!
    Object.assign(w.player, w.map.purificationZones![0].center)
    run.elapsed = 5; run.nextWave = 100; run.warnings = [{ ...w.player, radius: 65, time: .001 }]
    const hp = w.player.hp; w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBeLessThan(hp); expect(run).toMatchObject({ elapsed: 3, corruption: 30, blocked: 1 })
    tick(w, 30); expect(run.elapsed).toBe(3)
    w.player.invincible = 2; run.warnings = [{ ...w.player, radius: 65, time: .001 }]; tick(w, 40)
    expect(run.corruption).toBe(30); expect(run.elapsed).toBeGreaterThan(3)
  })
  it('侵蚀满格失败停止，免费重建当前安全段且无资源损失', () => {
    const t = setup(2), w = t.world, run = w.purificationRun!
    Object.assign(w.player, w.map.purificationZones![1].center)
    run.corruption = 90; run.elapsed = 4; run.warnings = [{ ...w.player, radius: 65, time: .001 }]; w.step({ x: 0, y: 0 })
    expect(run.failed).toBe(true); expect(t.notice()).toContain('免费')
    tick(w, 1000); expect(eventProgress(t.state(), 25, purification.id).stage).toBe(2)
    const before = structuredClone(t.state()), rebuilt = t.reload()
    expect(rebuilt.purificationRun).toMatchObject({ stage: 2, elapsed: 0, corruption: 0, blocked: 0, failed: false })
    expect(rebuilt.player).toMatchObject(purification.checkpoints![1]); expect(t.state()).toEqual(before)
  })
  it('死亡、最后一帧受击或失控均不能通过；死亡重建保留已通过段', () => {
    for (const mode of ['dead', 'hit', 'failed']) {
      const t = setup(3), w = t.world, run = w.purificationRun!
      Object.assign(w.player, w.map.purificationZones![2].center)
      run.elapsed = 12 - 1 / 120; run.warnings = [{ ...w.player, radius: 65, time: .001 }]
      if (mode === 'dead') w.player.hp = 1
      if (mode === 'failed') run.corruption = 90
      w.step({ x: 0, y: 0 }); expect(eventProgress(t.state(), 25, purification.id).stage).toBe(3)
      expect(t.reload().purificationRun).toMatchObject({ stage: 3, elapsed: 0, failed: false })
    }
  })
  it('8/10/12秒完成三段，报告和收服都不发火，正式首通幂等，药老仍归队', () => {
    const t = setup(), w = t.world, before = structuredClone(t.state())
    expect(act(t.state(), { type: 'deliver' })).toBe(t.state())
    for (const [index, zone] of w.map.purificationZones!.entries()) {
      Object.assign(w.player, zone.center); w.purificationRun!.elapsed = zone.duration - 1 / 120
      w.step({ x: 0, y: 0 }); expect(eventProgress(t.state(), 25, purification.id).stage).toBe(index + 2)
      expect(validateState(t.state())).toEqual(t.state())
    }
    expect(chapterReady(t.state())).toBe(false); t.act({ type: 'deliver' }); expect(eventDone(t.state())).toBe(true)
    expect(t.state().gold).toBe(before.gold); expect(t.state().xp).toBe(before.xp); expect(t.state().inventory).toEqual(before.inventory)
    expect(act(t.state(), { type: 'deliver' })).toBe(t.state())
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(w.enemies).toHaveLength(0); expect(t.state().flame).toBe('star'); expect(t.notice()).toContain('净莲妖火')
    expect(unlockedFlames(t.state()).some(f => f.id === 'pure')).toBe(false)
    const done = finishChapter(t.state()); expect(done.flame).toBe('pure'); expect(done.gold).toBe(before.gold + chapterById(25).reward)
    expect(teacherSupport(done).status).toBe('returned'); expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it('0.10.4旧完成档零资源门槛保留，缺净化只补完成无奖励，未通关待接', () => {
    const old = pureState(); old.contentVersion = '0.10.4'; delete old.progress[25].events[purification.id]
    expect(eventProgress(validateState(old), 25, purification.id).started).toBe(false)
    old.progress[25].boss = true; old.completed.push(25); old.flame = 'pure'
    const migrated = validateState(old); expect(eventDone(migrated)).toBe(true)
    expect(migrated.gold).toBe(old.gold); expect(migrated.xp).toBe(old.xp); expect(migrated.inventory).toEqual(old.inventory)
    const broken = setup().state(); broken.progress[25].events[purification.id].score = 1
    expect(() => validateState(broken)).toThrow('剧情事件')
    const noPrerequisite = setup().state(); noPrerequisite.progress[25].events[mirrors.id] = blankProgress(25).events[mirrors.id]
    expect(() => validateState(noPrerequisite)).toThrow('前置')
  })
  it('所有草药与人物/交互点至少相距100，避免交互优先级遮挡', () => {
    const w = setup().world
    for (const herb of w.map.herbs) expect(eventsForChapter(25).flatMap(e => [e.npc, ...e.checkpoints!])
      .every(point => Math.hypot(herb.x - point.x, herb.y - point.y) >= 100)).toBe(true)
  })
})
