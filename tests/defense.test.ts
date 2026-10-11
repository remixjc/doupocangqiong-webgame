import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function defenseState() {
  const s = initialState(); s.chapter = 26; s.completed = Array.from({ length: 25 }, (_, i) => i + 1); s.flame = 'pure'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[26] = blankProgress(26); s.attackUpgrade = 20; s.armorUpgrade = 20
  return s
}
const act = (s: ReturnType<typeof defenseState>, a: EventAction) => advanceEvent(s, a).state
function setup(stage = 1) {
  let s = act(act(defenseState(), { type: 'begin' }), { type: 'seal', index: 0 }), notice = ''
  while (eventProgress(s).stage < stage) s = act(s, { type: 'defend', stage: eventProgress(s).stage })
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: (message: string) => { notice = message },
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) }, eventAction: (a: EventAction) => { s = act(s, a) } }
  return { world: new CombatWorld(chapterById(26), cb), state: () => s, notice: () => notice,
    act: (a: EventAction) => { s = act(s, a) }, reload: () => { s = validateState(s); return new CombatWorld(chapterById(26), cb) } }
}
function tick(w: CombatWorld, n: number) { for (let i = 0; i < n; i++) w.step({ x: 0, y: 0 }) }
function fight(w: CombatWorld, stage: number) {
  Object.assign(w.player, eventForChapter(26)!.checkpoints![stage])
  for (let frame = 0; frame < 3600 && w.defenseRun?.stage === stage; frame++) {
    const e = w.defenseEnemies().sort((a, b) => Math.hypot(a.x - w.player.x, a.y - w.player.y) - Math.hypot(b.x - w.player.x, b.y - w.player.y))[0]
    const dx = (e?.x ?? w.defenseRun.x) - w.player.x, dy = (e?.y ?? w.defenseRun.y) - w.player.y, length = Math.hypot(dx, dy)
    const input = length > 50 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 }
    if (frame % 10 === 0 && e) {
      w.action('attack', { ...input, aim: e }); w.action('strike', { ...input, aim: e })
      w.action('wave', { ...input, aim: e }); w.action('lotus', { ...input, aim: e }); w.action('support', input)
    }
    w.step(input)
  }
}
describe('C9a-2 联盟三处守线', () => {
  it('驻点和人物不会遮挡普通采草交互', () => {
    const e = eventForChapter(26)!
    for (const herb of setup().world.map.herbs)
      expect([e.npc, ...e.checkpoints!].every(p => Math.hypot(p.x - herb.x, p.y - herb.y) >= 100)).toBe(true)
  })
  it('接取/战报前置、乱序和过期推进拒绝，E不能代替守线', () => {
    const s = defenseState(); expect(act(s, { type: 'seal', index: 0 })).toBe(s)
    const started = act(s, { type: 'begin' }); expect(act(started, { type: 'defend', stage: 1 })).toBe(started)
    const t = setup(), w = t.world; expect(act(t.state(), { type: 'defend', stage: 2 })).toBe(t.state())
    Object.assign(w.player, eventForChapter(26)!.checkpoints![1]); w.action('interact', { x: 0, y: 0 })
    expect(t.notice()).toContain('不能代替'); expect(eventProgress(t.state()).stage).toBe(1)
    t.act({ type: 'defend', stage: 1 }); expect(act(t.state(), { type: 'defend', stage: 1 })).toBe(t.state())
  })
  it.each([1, 2, 3])('第%i段靠近才开始，波数和敌人ID唯一且出生不碰撞', stage => {
    const t = setup(stage), w = t.world
    Object.assign(w.player, w.map.camp); tick(w, 120)
    expect(w.defenseRun).toMatchObject({ engaged: false, wave: 0, hp: 280 }); expect(w.enemies).toHaveLength(0)
    Object.assign(w.player, eventForChapter(26)!.checkpoints![stage]); w.step({ x: 0, y: 0 })
    expect(w.defenseRun).toMatchObject({ engaged: true, wave: 1 })
    expect(w.defenseEnemies()).toHaveLength(1)
    expect(w.defenseEnemies().every(e => !mapCollides(w.map, e))).toBe(true)
    fight(w, stage)
    expect(eventProgress(t.state()).stage).toBe(stage + 1)
    const attackers = w.enemies.filter(e => e.spawnId?.startsWith(`defense-${stage}-`))
    expect(attackers).toHaveLength(3); expect(new Set(attackers.map(e => e.spawnId)).size).toBe(3)
    expect(attackers.every(e => e.hp === 0)).toBe(true)
  })
  it('营地不会冻结守线敌人，实际攻击独立驻点生命并失守停止', () => {
    const t = setup(), w = t.world
    Object.assign(w.player, eventForChapter(26)!.checkpoints![1]); w.step({ x: 0, y: 0 })
    Object.assign(w.player, w.map.camp); const hp = w.player.hp
    tick(w, 600); expect(w.defenseRun!.hp).toBeLessThan(280); expect(w.player.hp).toBe(hp)
    tick(w, 3600); expect(w.defenseRun).toMatchObject({ failed: true, hp: 0, wave: 1 })
    expect(t.notice()).toContain('免费'); expect(eventProgress(t.state()).stage).toBe(1)
    tick(w, 120); expect(w.defenseEnemies()).toHaveLength(1)
  })
  it('死亡和驻点失守均不推进，免费重建当前段并恢复两波/驻点', () => {
    const t = setup(2), w = t.world
    Object.assign(w.player, eventForChapter(26)!.checkpoints![2]); w.step({ x: 0, y: 0 }); w.player.hp = 0
    tick(w, 300); expect(eventProgress(t.state()).stage).toBe(2)
    const before = structuredClone(t.state()), rebuilt = t.reload()
    expect(rebuilt.defenseRun).toMatchObject({ stage: 2, hp: 280, wave: 0, engaged: false, failed: false })
    expect(rebuilt.player).toMatchObject(eventForChapter(26)!.checkpoints![1]); expect(rebuilt.enemies).toHaveLength(0)
    expect(t.state()).toEqual(before)
    Object.assign(rebuilt.player, eventForChapter(26)!.checkpoints![2]); rebuilt.step({ x: 0, y: 0 })
    rebuilt.defenseRun!.hp = 1
    const attacker = rebuilt.defenseEnemies()[0]
    attacker.windup = .001; attacker.target = { ...rebuilt.defenseRun! }; attacker.radius = 85
    rebuilt.step({ x: 0, y: 0 }); expect(rebuilt.defenseRun!.failed).toBe(true)
    expect(eventProgress(t.state()).stage).toBe(2)
  })
  it('真实两波清理后才完成各段，报告/出征无奖励，首通幂等', () => {
    const t = setup(), w = t.world, before = structuredClone(t.state())
    expect(act(t.state(), { type: 'deliver' })).toBe(t.state())
    for (const stage of [1, 2, 3]) { fight(w, stage); expect(eventProgress(t.state()).stage).toBe(stage + 1); expect(validateState(t.state())).toEqual(t.state()) }
    expect(chapterReady(t.state())).toBe(false); t.act({ type: 'deliver' }); expect(eventDone(t.state())).toBe(true)
    expect(t.state().gold).toBe(before.gold); expect(t.state().xp).toBe(before.xp); expect(t.state().inventory).toEqual(before.inventory)
    expect(act(t.state(), { type: 'deliver' })).toBe(t.state())
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(w.enemies.every(e => e.type !== 'boss')).toBe(true)
    expect(t.state().progress[26].boss).toBe(true); expect(t.state().flame).toBe('pure')
    const done = finishChapter(t.state()); expect(done.gold).toBe(before.gold + chapterById(26).reward); expect(finishChapter(done)).toBe(done)
  })
  it.each([1, 2, 3])('schema%i旧4草5战完成档迁移不补奖励，未完成待接', schema => {
    const old = JSON.parse(JSON.stringify(defenseState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.11.0'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[26].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[26].boss = true; old.completed.push(26); old.progress[26].herbs = 4; old.progress[26].kills = 4
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[26].kills = 5
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
})
