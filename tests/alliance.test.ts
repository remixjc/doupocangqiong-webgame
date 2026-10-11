import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { teacherSupport } from '../src/core/companions'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function allianceState() {
  const s = initialState(); s.chapter = 17; s.completed = Array.from({ length: 16 }, (_, n) => n + 1); s.flame = 'fallen'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[17] = blankProgress(17); s.settings.difficulty = 'story'; s.armorUpgrade = 20
  return s
}
function apply(s: ReturnType<typeof initialState>, action: EventAction) { return advanceEvent(s, action).state }
function ready(choice: 'steady' | 'premium', gold = 60) {
  let s = allianceState(); s.gold = gold
  s = apply(s, { type: 'begin' }); s = apply(s, { type: 'seal', index: 0 })
  return apply(s, { type: 'strategy', choice })
}
function worldFor(state: ReturnType<typeof initialState>) {
  let s = state, notice = ''
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s); else s.progress[17].kills++ },
    eventAction: (action: EventAction) => { s = apply(s, action) }, notify: (text: string) => { notice = text } }
  return { world: new CombatWorld(chapterById(17), callbacks), state: () => s, notice: () => notice,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(17), callbacks) } }
}
describe('C6b 炎盟根基决策', () => {
  it('议事前不能选路线，缺款不扣钱且零币可改选免费巡防', () => {
    const untouched = apply(allianceState(), { type: 'begin' })
    expect(apply(untouched, { type: 'strategy', choice: 'premium' })).toBe(untouched)
    const poor = ready('premium', 59)
    expect(eventProgress(poor)).toMatchObject({ stage: 1, choice: 'none' }); expect(poor.gold).toBe(59)
    const free = apply(poor, { type: 'strategy', choice: 'steady' })
    expect(free.gold).toBe(59); expect(eventProgress(ready('steady', 0)).choice).toBe('steady')
  })
  it('补给只扣一次60金币，路线不能更换，保存恢复不再次扣款', () => {
    const s = ready('premium')
    expect(s.gold).toBe(0); expect(validateState(s)).toEqual(s)
    expect(apply(s, { type: 'strategy', choice: 'premium' })).toBe(s)
    expect(apply(s, { type: 'strategy', choice: 'steady' })).toBe(s)
    expect(s.inventory).toEqual(allianceState().inventory)
  })
  it.each(['steady', 'premium'] as const)('%s路线按序登记，报告一次发对应补给，首通仍需实战', choice => {
    let s = ready(choice); const before = structuredClone(s)
    expect(apply(s, { type: 'seal', index: 2 })).toBe(s); expect(apply(s, { type: 'deliver' })).toBe(s)
    s = apply(s, { type: 'seal', index: 1 }); expect(validateState(s)).toEqual(s)
    expect(apply(s, { type: 'seal', index: 1 })).toBe(s); s = apply(s, { type: 'seal', index: 2 })
    expect(s.inventory).toEqual(before.inventory); expect(finishChapter(s)).toBe(s)
    s = apply(s, { type: 'deliver' })
    expect(eventDone(s)).toBe(true); expect(s.inventory.heal).toBe(before.inventory.heal + (choice === 'premium' ? 2 : 1))
    expect(s.inventory.mana).toBe(before.inventory.mana + (choice === 'premium' ? 1 : 0)); expect(s.xp).toBe(before.xp + 40)
    expect(s.gold).toBe(before.gold); expect(apply(s, { type: 'deliver' })).toBe(s); expect(validateState(s)).toEqual(s)
    expect(teacherSupport(s).status).toBe('away')
  })
  it('巡防真实守卫门槛，实际击败后登记；刷新不会消失未登记的西侧守卫', () => {
    const t = worldFor(ready('steady', 0)), w = t.reload(), point = eventForChapter(17)!.checkpoints![1]
    expect(w.guardsRemaining(eventForChapter(17)!.id, 1)).toBe(1)
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2); expect(t.notice()).toContain('守卫')
    const guard = w.enemies.find(e => e.spawnId === 'alliance-west-brute')!
    for (let frame = 0; frame < 1500 && guard.hp > 0; frame++) {
      Object.assign(w.player, { x: guard.x - 45, y: guard.y })
      w.action('attack', { x: 0, y: 0, aim: guard }); w.action('strike', { x: 0, y: 0, aim: guard }); w.step({ x: 0, y: 0 })
    }
    expect(guard.hp).toBe(0)
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(3)
    const next = t.reload(); expect(next.enemies.map(e => e.spawnId)).toEqual(['alliance-east-mage', 'alliance-east-hunter'])
  })
  it('补给路线真实交互可在守卫存活时登记，未报告不能开启防线首领', () => {
    const t = worldFor(ready('premium')), w = t.world
    for (const index of [1, 2]) {
      Object.assign(w.player, eventForChapter(17)!.checkpoints![index]); w.action('interact', { x: 0, y: 0 })
      expect(eventProgress(t.state()).stage).toBe(index + 2)
    }
    expect(w.enemies.every(e => e.hp > 0)).toBe(true)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(w.enemies.some(e => e.type === 'boss')).toBe(false); expect(t.state().gold).toBe(0)
  })
  it('拒绝提前路线、缺失选择与伪造计分记录', () => {
    for (const kind of ['early', 'missing', 'score'] as const) {
      const s = ready('premium'), p = eventProgress(s)
      if (kind === 'early') p.stage = 1
      if (kind === 'missing') p.choice = 'none'
      if (kind === 'score') p.score = 1
      expect(() => validateState(s)).toThrow()
    }
  })
  it.each([1, 2, 3])('schema%i旧炎盟3草4战完成迁移不补筹备奖励', schema => {
    const old = JSON.parse(JSON.stringify(allianceState())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.8.1'
    old.progress[17].events = {}; old.progress[17].herbs = 3; old.progress[17].kills = 3
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(17); old.progress[17].boss = true
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[17].kills = 4
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(eventProgress(done).choice).toBe('steady')
    expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory); expect(done.xp).toBe(old.xp)
  })
})
