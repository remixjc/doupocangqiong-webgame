import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter, rankPracticeReward, registerBossVictory, trainFireEnergy } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function academy() {
  const s = initialState(); s.chapter = 14; s.completed = Array.from({ length: 13 }, (_, n) => n + 1)
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : n === 9 ? 2 : 0,
    boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[14] = blankProgress(14); s.settings.difficulty = 'story'; s.armorUpgrade = 20; s.attackUpgrade = 8
  return s
}
function setup(stage = 0, completed = false) {
  let s = advanceEvent(academy(), { type: 'begin' }).state, notice = '', practiceWins = 0
  for (let index = 0; index < Math.min(stage, 3); index++) s = advanceEvent(s, { type: 'seal', index }).state
  if (stage === 4) s = advanceEvent(s, { type: 'deliver' }).state
  if (completed) s = finishChapter(registerBossVictory(s))
  const callbacks = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
    kill: (boss: boolean) => { if (boss) s = registerBossVictory(s) },
    notify: (text: string) => { notice = text }, eventAction: (action: EventAction) => { s = advanceEvent(s, action).state },
    rankPractice: () => { practiceWins++; s = rankPracticeReward(s).state } }
  return { world: new CombatWorld(chapterById(14), callbacks), state: () => s, notice: () => notice, practiceWins: () => practiceWins,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(14), callbacks) } }
}
function tick(w: CombatWorld, frames: number) { for (let n = 0; n < frames; n++) w.step({ x: 0, y: 0 }) }
function defeat(w: CombatWorld, id: number) {
  const e = w.enemies.find(e => e.id === id)!
  for (let n = 0; n < 2400 && e.hp > 0; n++) {
    Object.assign(w.player, { x: e.x + 45, y: e.y })
    w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e }); w.action('wave', { x: 0, y: 0, aim: e })
    w.step({ x: 0, y: 0 })
  }
  expect(e.hp).toBe(0)
}
function challenge(w: CombatWorld) {
  Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
  return w.enemies.find(e => e.ranking)!
}

describe('C5c 火能猎捕与强榜', () => {
  it('按集合、西路、东路取得一次火能，登记消耗2且不改金币材料', () => {
    let s = advanceEvent(academy(), { type: 'begin' }).state
    const before = structuredClone(s)
    expect(advanceEvent(s, { type: 'seal', index: 1 }).state).toBe(s)
    expect(advanceEvent(s, { type: 'deliver' }).state).toBe(s)
    for (let index = 0; index < 3; index++) {
      s = advanceEvent(s, { type: 'seal', index }).state
      expect(s.fireEnergy).toBe(index * 2)
      expect(validateState(s)).toEqual(s)
      expect(advanceEvent(s, { type: 'seal', index }).state).toBe(s)
    }
    expect(trainFireEnergy(s).state).toBe(s)
    s = advanceEvent(s, { type: 'deliver' }).state
    expect(s.fireEnergy).toBe(2); expect(s.xp).toBe(before.xp + 30); expect(s.gold).toBe(before.gold)
    expect(s.inventory).toEqual(before.inventory); expect(eventDone(s)).toBe(true)
    expect(advanceEvent(s, { type: 'deliver' }).state).toBe(s); expect(validateState(s)).toEqual(s)
  })
  it('守卫未清与队友未到达均不能领取；真实攻击清守卫后双方交互', () => {
    const t = setup(1), w = t.world, point = eventForChapter(14)!.checkpoints![1]
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.notice()).toContain('守卫')
    for (const e of w.enemies.filter(e => e.spawnId === 'hunt-west-brute')) defeat(w, e.id)
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.notice()).toContain('尚未到达')
    Object.assign(w.player, { x: 600, y: 430 }); tick(w, 200)
    Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 })
    expect(eventProgress(t.state()).stage).toBe(2); expect(t.state().fireEnergy).toBe(2)
    const reload = t.reload()
    expect(reload.player).toMatchObject(point); expect(reload.huntTeam).toMatchObject({ ...point, hp: 180 })
    expect(reload.enemies.some(e => e.spawnId === 'hunt-west-brute')).toBe(false)
  })
  it('敌人能实际击倒队友，失败保留火能并从节点免费恢复', () => {
    const t = setup(1), w = t.world
    Object.assign(w.player, { x: 1200, y: 730 }); tick(w, 1600)
    expect(w.huntTeam?.hp).toBe(0); expect(w.runtime().huntTeam?.failed).toBe(true)
    expect(eventProgress(t.state()).stage).toBe(1); expect(t.state().fireEnergy).toBe(0)
    const before = structuredClone(t.state()), reload = t.reload()
    expect(reload.huntTeam).toMatchObject({ hp: 180, x: 500, y: 520 })
    expect(t.state().inventory).toEqual(before.inventory); expect(t.state().gold).toBe(before.gold)
  })
  it('返回时队友须存活并抵达，不能把尚未到达视为已集合', () => {
    const t = setup(3), w = t.world
    Object.assign(w.player, eventForChapter(14)!.npc); tick(w, 100)
    expect(w.runtime().huntTeam?.arrived).toBe(false); expect(w.runtime().huntTeam?.waiting).toBe(true)
    Object.assign(w.player, { x: 930, y: 520 }); tick(w, 60)
    expect(w.huntTeam!.x).toBeLessThan(1050)
    for (let n = 0; n < 600 && !w.runtime().huntTeam?.arrived; n++) {
      const team = w.huntTeam!, npc = eventForChapter(14)!.npc
      Object.assign(w.player, { x: team.x - 60, y: team.y }); w.step({ x: 0, y: 0 })
      if (Math.hypot(team.x - npc.x, team.y - npc.y) < 65) break
    }
    expect(w.runtime().huntTeam?.arrived).toBe(true)
  })
  it('强榜首胜3火能与首通不重复；通关前保护登记余额，通关后可多次修炼', () => {
    const t = setup(4), before = structuredClone(t.state())
    expect(trainFireEnergy(before).state).toBe(before)
    const won = registerBossVictory(before)
    expect(won.fireEnergy).toBe(5); expect(registerBossVictory(won)).toBe(won)
    const done = finishChapter(won), training1 = trainFireEnergy(done).state, training2 = trainFireEnergy(training1).state
    expect(training1.fireEnergy).toBe(3); expect(training2.fireEnergy).toBe(1)
    expect(training2.xp).toBe(done.xp + 60); expect(training2.gold).toBe(done.gold)
    expect(trainFireEnergy(training2).state).toBe(training2); expect(finishChapter(done)).toBe(done)
    expect(validateState(training2)).toEqual(training2)
  })
  it('强榜锁定三点、半血后五点，护盾减伤并提供收招反击窗口', () => {
    const t = setup(4), w = t.world, e = challenge(w)
    Object.assign(w.player, { x: e.x + 45, y: e.y })
    for (let n = 0; n < 180 && e.windup <= 0; n++) w.step({ x: 0, y: 0 })
    expect(e.secondary).toHaveLength(2); expect(w.runtime().ranking?.shield).toBe(true)
    const shieldBefore = e.hp; w.action('attack', { x: 0, y: 0, aim: e }); const shieldDamage = shieldBefore - e.hp
    for (let n = 0; n < 120 && e.windup > 0; n++) w.step({ x: 0, y: 0 })
    expect(w.runtime().ranking?.recovery).toBe(true)
    const exposedBefore = e.hp; w.action('attack', { x: 0, y: 0, aim: e })
    expect(exposedBefore - e.hp).toBeGreaterThan(shieldDamage * 2)
    for (let n = 0; n < 2400 && e.hp / e.maxHp >= .5; n++) {
      w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e }); w.step({ x: 0, y: 0 })
    }
    expect(e.hp).toBeGreaterThan(0)
    for (let n = 0; n < 200 && !(e.windup > 0 && e.secondary?.length === 4); n++) w.step({ x: 0, y: 0 })
    expect(w.runtime().ranking?.phase).toBe(2); expect(e.secondary).toHaveLength(4)
  })
  it('复练必须真实击败对手，每局只发1火能，重新构建才开放下一局', () => {
    const t = setup(4, true), w = t.world, before = structuredClone(t.state()), e = challenge(w)
    expect(e.ranking?.practice).toBe(true); expect(t.practiceWins()).toBe(0)
    w.action('interact', { x: 0, y: 0 })
    expect(w.enemies.filter(e => e.ranking)).toHaveLength(1)
    defeat(w, e.id)
    expect(t.practiceWins()).toBe(1); expect(t.state().fireEnergy).toBe(before.fireEnergy + 1)
    expect(t.state().gold).toBe(before.gold); expect(t.state().xp).toBe(before.xp)
    expect(t.state().inventory).toEqual(before.inventory); expect(t.state().completed).toEqual(before.completed)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(t.practiceWins()).toBe(1); expect(w.enemies.filter(e => e.ranking)).toHaveLength(1)
    const reload = t.reload(), next = challenge(reload); defeat(reload, next.id)
    expect(t.practiceWins()).toBe(2); expect(t.state().fireEnergy).toBe(before.fireEnergy + 2)
  })
  it.each([1, 2, 3])('schema%i旧内院按3草3战迁移，不补火能和登记奖', schema => {
    const old = JSON.parse(JSON.stringify(academy())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.7.1'
    delete old.fireEnergy; old.progress[14].events = {}; old.progress[14].herbs = 3; old.progress[14].kills = 2
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(validateState(old).fireEnergy).toBe(0)
    old.completed.push(14); old.progress[14].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[14].kills = 3
    const migrated = validateState(old)
    expect(eventProgress(migrated).huntOutcome).toBe('legacy'); expect(migrated.fireEnergy).toBe(0)
    expect(migrated.xp).toBe(old.xp); expect(migrated.gold).toBe(old.gold)
    expect(validateState(migrated)).toEqual(migrated)
  })
  it('拒绝非法余额、当前版本缺余额、错位火能记录与混入其他事件的字段', () => {
    const s = setup(2).state()
    for (const value of [-1, .5, 1_000_001, '2']) expect(() => validateState({ ...s, fireEnergy: value })).toThrow()
    const missing = JSON.parse(JSON.stringify(s)); delete missing.fireEnergy
    expect(() => validateState(missing)).toThrow()
    const wrong = structuredClone(s); wrong.progress[14].events[eventForChapter(14)!.id].score = 4
    expect(() => validateState(wrong)).toThrow('猎捕火能')
    const other = initialState(); other.progress[1].events[eventForChapter(1)!.id].huntOutcome = 'legacy'
    expect(() => validateState(other)).toThrow('猎捕登记')
  })
  it('队友各段直线路径无碰撞，火能台和演武台可达', () => {
    const map = mapForChapter(14), e = eventForChapter(14)!, points = [e.npc, ...e.checkpoints!, e.npc]
    for (let n = 1; n < points.length; n++) for (let f = 0; f <= 1; f += .01)
      expect(mapCollides(map, { x: points[n - 1].x + (points[n].x - points[n - 1].x) * f, y: points[n - 1].y + (points[n].y - points[n - 1].y) * f })).toBe(false)
    expect(mapCollides(map, map.gate)).toBe(false); expect(mapCollides(map, map.bossSpawn)).toBe(false)
  })
})
