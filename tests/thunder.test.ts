import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function thunderState() {
  const s = initialState(); s.chapter = 18; s.completed = Array.from({ length: 17 }, (_, n) => n + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[18] = blankProgress(18); s.settings.difficulty = 'story'
  return s
}
function setup(stage = 1) {
  let s = advanceEvent(thunderState(), { type: 'begin' }).state, exits = 0, notice = ''
  s = advanceEvent(s, { type: 'seal', index: 0 }).state
  if (stage >= 2) s = advanceEvent(s, { type: 'evade', stage: 1 }).state
  if (stage >= 3) s = advanceEvent(s, { type: 'evade', stage: 2 }).state
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: (text: string) => { notice = text },
    kill: (boss: boolean) => { const next = boss ? registerBossVictory(s) : s; if (next !== s) exits++; s = next },
    eventAction: (action: EventAction) => { s = advanceEvent(s, action).state } }
  return { world: new CombatWorld(chapterById(18), cb), state: () => s, exits: () => exits, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(18), cb) } }
}
function tick(w: CombatWorld, frames: number) { for (let i = 0; i < frames; i++) w.step({ x: 0, y: 0 }) }
describe('C6c 雷云避战撤离', () => {
  it('提前出口/跳序无效，E不能替代8/10秒，区外暂停计时', () => {
    const t = setup(), w = t.world, points = eventForChapter(18)!.checkpoints!
    expect(advanceEvent(t.state(), { type: 'evade', stage: 2 }).state).toBe(t.state())
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(t.exits()).toBe(0)
    Object.assign(w.player, points[2]); tick(w, 90); expect(w.escapeRun?.elapsed).toBe(0)
    Object.assign(w.player, points[1]); w.action('interact', { x: 0, y: 0 }); expect(t.notice()).toContain('稳住')
    tick(w, 181); const elapsed = w.escapeRun!.elapsed; expect(elapsed).toBeCloseTo(3, 1); expect(w.runtime().escape?.remaining).toBe(5)
    Object.assign(w.player, points[0]); tick(w, 60); expect(w.escapeRun?.elapsed).toBe(elapsed)
  })
  it('第一段三点交替横/纵，第二段五点交替十字/斜向，预警不随玩家移动', () => {
    const first = setup().world
    tick(first, 1); expect(first.escapeRun?.warnings).toHaveLength(3)
    const points = structuredClone(first.escapeRun!.warnings); first.step({ x: 1, y: 0 })
    expect(first.escapeRun!.warnings.map(({ x, y }) => ({ x, y }))).toEqual(points.map(({ x, y }) => ({ x, y })))
    expect(first.escapeRun?.warnings[0]).toMatchObject({ radius: 45 })
    const second = setup(2).world
    tick(second, 1); expect(second.escapeRun?.warnings).toHaveLength(5)
    expect(second.escapeRun?.warnings[0]).toMatchObject({ radius: 50 })
    tick(second, 121); expect(second.escapeRun?.wave).toBe(2)
    const warning = second.escapeRun!.warnings
    expect(warning.slice(1).every(p => p.x !== warning[0].x && p.y !== warning[0].y)).toBe(true)
  })
  it('雷击实际伤害与死亡，最后帧死亡不能记录退路', () => {
    const t = setup(), w = t.world, point = eventForChapter(18)!.checkpoints![1]
    Object.assign(w.player, point); tick(w, 1)
    const hp = w.player.hp; tick(w, 70); expect(w.player.hp).toBeLessThan(hp)
    w.escapeRun!.elapsed = 8 - 1 / 120; w.escapeRun!.warnings = [{ ...point, radius: 45, time: 1 / 120 }]
    w.player.hp = 1; w.player.invincible = 0; w.step({ x: 0, y: 0 })
    expect(w.player.hp).toBe(0); expect(eventProgress(t.state()).stage).toBe(1)
  })
  it('重建从最近通过点恢复，当前计时/雷阵清零，资源和异火保留', () => {
    const t = setup(2), before = structuredClone(t.state()), w = t.reload()
    expect(w.player).toMatchObject(eventForChapter(18)!.checkpoints![1])
    expect(w.escapeRun).toMatchObject({ stage: 2, elapsed: 0, warnings: [], wave: 0 })
    expect(t.state()).toEqual(before); expect(w.enemies).toHaveLength(0)
  })
  it('实际避雷移动与闪避完成两段，出口只登记撤离一次、首通680金币', () => {
    const t = setup(), w = t.world, points = eventForChapter(18)!.checkpoints!
    // Isolate stage timing from travel. The full replay covers legal map travel.
    for (const stage of [1, 2]) {
      Object.assign(w.player, points[stage])
      for (let frame = 0; frame < 1800 && eventProgress(t.state()).stage === stage && w.player.hp > 0; frame++) {
        const warning = w.escapeRun?.warnings.find(p => Math.hypot(p.x - w.player.x, p.y - w.player.y) < p.radius + 20)
        const target = points[stage], dx = target.x - w.player.x, dy = target.y - w.player.y, length = Math.hypot(dx, dy)
        const input = warning ? { x: 0, y: w.player.y < warning.y ? -1 : 1 } : length > 4 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 }
        if (warning) w.action('dodge', input)
        w.step(input)
      }
      expect(eventProgress(t.state()).stage).toBe(stage + 1)
    }
    expect(eventDone(t.state())).toBe(false); expect(w.enemies).toHaveLength(0)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(t.exits()).toBe(1)
    w.action('interact', { x: 0, y: 0 }); expect(t.exits()).toBe(1)
    const before = t.state(), done = finishChapter(before)
    expect(done.gold).toBe(before.gold + 680); expect(done.totalKills).toBe(0); expect(done.flame).toBe('fallen')
    expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it.each([1, 2, 3])('schema%i旧第18章4草4战校验，不补撤离奖励', schema => {
    const old = JSON.parse(JSON.stringify(thunderState())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.8.2'
    old.progress[18].events = {}; old.progress[18].herbs = 3; old.progress[18].kills = 4
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(18); old.progress[18].boss = true
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[18].herbs = 4
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
