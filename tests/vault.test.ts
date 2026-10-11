import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter, eventsForChapter, mindTargets } from '../src/content/events'
import { mapCollides } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function vaultState() {
  const s = initialState(); s.chapter = 27; s.completed = Array.from({ length: 26 }, (_, i) => i + 1); s.flame = 'pure'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[27] = blankProgress(27); s.attackUpgrade = 20
  return s
}
const act = (s: ReturnType<typeof vaultState>, a: EventAction) => advanceEvent(s, a).state
function readClues() {
  let s = act(vaultState(), { type: 'begin' })
  for (const index of [0, 1, 2, 3]) s = act(s, { type: 'seal', index })
  return s
}
function openDoor(s = readClues()) {
  for (const [step, symbol] of (['lotus', 'fallen', 'star'] as const).entries()) s = act(s, { type: 'inscribe', symbol, step })
  return s
}
function setup(initial = readClues()) {
  let s = initial, notice = '', opened: number | undefined
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: (message: string) => { notice = message },
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) }, eventAction: (a: EventAction) => { s = act(s, a) },
    storyEvent: (_id: string, checkpoint?: number) => { opened = checkpoint } }
  return { world: new CombatWorld(chapterById(27), cb), state: () => s, notice: () => notice, opened: () => opened,
    act: (a: EventAction) => { s = act(s, a) }, reload: () => { s = validateState(s); return new CombatWorld(chapterById(27), cb) } }
}
describe('C9b-1 洞府三铭封门', () => {
  it('入口和三铭顺序前置，乱序/过期/非法火纹不推进，E只开机关面板', () => {
    let s = act(vaultState(), { type: 'begin' })
    expect(act(s, { type: 'seal', index: 2 })).toBe(s); expect(act(s, { type: 'inscribe', symbol: 'lotus', step: 0 })).toBe(s)
    s = readClues(); expect(act(s, { type: 'inscribe', symbol: 'lotus', step: 1 })).toBe(s)
    expect(act(s, { type: 'inscribe', symbol: 'wrong' as 'lotus', step: 0 })).toBe(s)
    const t = setup(s), w = t.world; Object.assign(w.player, eventForChapter(27)!.checkpoints![4])
    w.action('interact', { x: 0, y: 0 }); expect(t.opened()).toBe(4)
    expect(eventProgress(t.state())).toMatchObject({ stage: 4, score: 0, attempts: 0 })
  })
  it('错误免费复位当前机关，已读线索可重读且部分火纹保存', () => {
    let s = readClues(), before = structuredClone(s)
    s = act(s, { type: 'inscribe', symbol: 'lotus', step: 0 }); s = validateState(s)
    expect(eventProgress(s)).toMatchObject({ stage: 4, score: 1 })
    const result = advanceEvent(s, { type: 'inscribe', symbol: 'star', step: 1 }); s = result.state
    expect(result.message).toContain('免费复位'); expect(eventProgress(s)).toMatchObject({ stage: 4, score: 0, attempts: 1 })
    for (const index of [0, 1, 2, 3]) {
      const read = advanceEvent(s, { type: 'seal', index }); s = read.state
      expect(read.message).toBe(eventForChapter(27)!.checkpoints![index].text)
      expect(eventProgress(s)).toMatchObject({ stage: 4, score: 0, attempts: 1 })
    }
    expect(s.gold).toBe(before.gold); expect(s.inventory).toEqual(before.inventory); expect(s.flame).toBe('pure')
  })
  it('实体封门横跨唯一通道，解封前移动受阻，解封后通行且守卫才生成', () => {
    const t = setup(), w = t.world
    expect(w.barrierClosed()).toBe(true); expect(mapCollides(w.collisionMap(), { x: 800, y: 410 })).toBe(true)
    expect(w.enemies).toHaveLength(0)
    Object.assign(w.player, { x: 750, y: 410 })
    for (let frame = 0; frame < 120; frame++) w.step({ x: 1, y: 0 })
    expect(w.player.x).toBeLessThan(780)
    for (const [step, symbol] of (['lotus', 'fallen', 'star'] as const).entries()) t.act({ type: 'inscribe', symbol, step })
    expect(w.barrierClosed()).toBe(false)
    for (let frame = 0; frame < 40; frame++) w.step({ x: 1, y: 0 })
    expect(w.player.x).toBeGreaterThan(850); expect(w.enemies).toHaveLength(2)
    expect(new Set(w.enemies.map(e => e.spawnId)).size).toBe(2)
  })
  it('清理真实守卫才能读内殿石刻，刷新恢复未记录守卫；报告无资源', () => {
    const t = setup(openDoor()), w = t.world, e = eventForChapter(27)!
    Object.assign(w.player, e.checkpoints![5]); w.action('interact', { x: 0, y: 0 })
    expect(t.notice()).toContain('守卫'); expect(eventProgress(t.state()).stage).toBe(5)
    for (let frame = 0; frame < 1200 && w.enemies.some(e => e.hp > 0); frame++) {
      const target = w.enemies.find(e => e.hp > 0)!
      const dx = target.x - w.player.x, dy = target.y - w.player.y, len = Math.hypot(dx, dy)
      const input = len > 50 ? { x: dx / len, y: dy / len } : { x: 0, y: 0 }
      w.action('attack', { ...input, aim: target }); w.action('strike', { ...input, aim: target }); w.action('wave', { ...input, aim: target })
      w.step(input)
    }
    expect(w.enemies.every(e => e.hp === 0)).toBe(true)
    const restored = t.reload(); expect(restored.enemies).toHaveLength(2); expect(restored.enemies.every(e => e.hp > 0)).toBe(true)
    expect(restored.player).toMatchObject(e.checkpoints![4])
    Object.assign(w.player, e.checkpoints![5]); w.action('interact', { x: 0, y: 0 }); expect(eventProgress(t.state()).stage).toBe(6)
    const before = structuredClone(t.state()); t.act({ type: 'deliver' }); expect(eventDone(t.state(), 27, e.id)).toBe(true)
    expect(t.state().gold).toBe(before.gold); expect(t.state().xp).toBe(before.xp); expect(t.state().inventory).toEqual(before.inventory)
    expect(t.reload().enemies).toHaveLength(0); expect(chapterReady(t.state())).toBe(false)
    expect(finishChapter(t.state())).toBe(t.state())
    const origin = eventsForChapter(27)[1], eventId = origin.id
    t.act({ type: 'begin', eventId }); t.act({ type: 'test', eventId })
    for (const [index, marker] of mindTargets(origin).entries()) t.act({ type: 'pulse', marker, stage: index + 1, eventId })
    t.act({ type: 'deliver', eventId })
    const done = finishChapter(registerBossVictory(t.state())); expect(done.gold).toBe(before.gold + chapterById(27).reward)
    expect(finishChapter(done)).toBe(done)
  })
  it('异常分数/尝试记录拒绝，药草不被交互点挡住', () => {
    for (const [stage, score, attempts] of [[3, 1, 0], [4, 3, 0], [5, 1, 1], [5, 0, 0], [0, 0, 1]]) {
      const s = readClues(); Object.assign(eventProgress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('洞府封门')
    }
    const e = eventForChapter(27)!, w = setup().world
    for (const herb of w.map.herbs) expect([e.npc, ...e.checkpoints!].every(p => Math.hypot(p.x - herb.x, p.y - herb.y) >= 100)).toBe(true)
  })
  it.each([1, 2, 3])('schema%i旧完成档按4草5战校验，不补奖励', schema => {
    const old = JSON.parse(JSON.stringify(vaultState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.11.1'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[27].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[27].boss = true; old.completed.push(27); old.progress[27].herbs = 4; old.progress[27].kills = 4
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[27].kills = 5
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
