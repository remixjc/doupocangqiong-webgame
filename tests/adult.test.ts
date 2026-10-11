import { describe, expect, it } from 'vitest'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, pulseMarker, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { eventsForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { CombatWorld } from '../src/game/combat'
import { chapterById } from '../src/content/chapters'

const stone = 'adult-test-stone', competition = 'market-competition'
function adult() {
  let state = initialState(); state.chapter = 3; state.completed = [1, 2]
  for (const id of [1, 2]) state.progress[id] = { ...blankProgress(id), herbs: 3, kills: 3, boss: true, events: migrateLegacyEvents(id, true) }
  state.progress[3] = blankProgress(3); state.inventory.herb = 8; state.inventory.crystal = 5
  for (const action of [{ type: 'begin' }, { type: 'quote', amount: 60 }, { type: 'deliver' }] as EventAction[]) state = advanceEvent(state, action).state
  return state
}
function completeStone(state = adult()) {
  state = advanceEvent(state, { type: 'begin', eventId: stone }).state
  state = advanceEvent(state, { type: 'test', eventId: stone }).state
  for (const stage of [1, 2, 3]) state = advanceEvent(state, { type: 'pulse', eventId: stone, stage, marker: .5 }).state
  return state
}
describe('成人礼控气与竞争支线', () => {
  it('供货前不能接测试或竞争，三步达标后才满足主线事件条件', () => {
    const s = initialState(); s.chapter = 3; s.progress[3] = blankProgress(3)
    expect(advanceEvent(s, { type: 'begin', eventId: stone }).state).toBe(s)
    const supplied = adult()
    expect(eventDone(supplied)).toBe(false)
    expect(eventDone(completeStone(supplied))).toBe(true)
    expect(eventDone(completeStone(), 3, competition)).toBe(false)
  })
  it('低分免费重试，成功与重复输入不扣材料、不改变境界和货币', () => {
    let s = adult(), base = structuredClone(s)
    s = advanceEvent(s, { type: 'begin', eventId: stone }).state
    s = advanceEvent(s, { type: 'test', eventId: stone }).state
    for (const stage of [1, 2, 3]) s = advanceEvent(s, { type: 'pulse', eventId: stone, stage, marker: 0 }).state
    expect(eventProgress(s, 3, stone)).toMatchObject({ stage: 0, attempts: 1, score: 0 })
    s = advanceEvent(s, { type: 'test', eventId: stone }).state
    s = advanceEvent(s, { type: 'pulse', eventId: stone, stage: 1, marker: .5 }).state
    expect(advanceEvent(s, { type: 'pulse', eventId: stone, stage: 1, marker: .5 }).state).toBe(s)
    s = validateState(s)
    for (const stage of [2, 3]) s = advanceEvent(s, { type: 'pulse', eventId: stone, stage, marker: .5 }).state
    expect(eventProgress(s, 3, stone)).toMatchObject({ stage: 4, attempts: 2, score: 300 })
    expect(s.inventory).toEqual(base.inventory); expect(s.gold).toBe(base.gold); expect(s.xp).toBe(base.xp)
  })
  it.each(['steady', 'premium'] as const)('%s 策略具有不同成本、路线和一次收益', choice => {
    let s = adult()
    s = advanceEvent(s, { type: 'begin', eventId: competition }).state
    s = advanceEvent(s, { type: 'strategy', eventId: competition, choice }).state
    expect(advanceEvent(s, { type: 'strategy', eventId: competition, choice: choice === 'steady' ? 'premium' : 'steady' }).state).toBe(s)
    if (choice === 'premium') {
      expect(advanceEvent(s, { type: 'deliver', eventId: competition }).state).toBe(s)
      expect(advanceEvent(s, { type: 'seal', eventId: competition, index: 1 }).state).toBe(s)
      for (const index of [0, 1, 2]) s = advanceEvent(s, { type: 'seal', eventId: competition, index }).state
    }
    const before = structuredClone(s)
    const result = advanceEvent(s, { type: 'deliver', eventId: competition })
    expect(result.ok).toBe(true)
    expect(result.state.gold - before.gold).toBe(choice === 'premium' ? 135 : 70)
    expect(before.inventory.herb - result.state.inventory.herb).toBe(choice === 'premium' ? 4 : 2)
    expect(result.state.inventory.elixir - before.inventory.elixir).toBe(choice === 'premium' ? 1 : 0)
    expect(advanceEvent(result.state, { type: 'deliver', eventId: competition }).state).toBe(result.state)
    expect(validateState(result.state)).toEqual(result.state)
  })
  it('缺料失败不部分扣除材料，完成记录刷新后不再发奖励', () => {
    let s = adult()
    for (const action of [{ type: 'begin' }, { type: 'strategy', choice: 'steady' }] as EventAction[]) s = advanceEvent(s, { ...action, eventId: competition }).state
    s.inventory.herb = 1
    expect(advanceEvent(s, { type: 'deliver', eventId: competition }).state).toBe(s)
    s.inventory.herb = 2; s = advanceEvent(s, { type: 'deliver', eventId: competition }).state
    const loaded = validateState(s)
    expect(advanceEvent(loaded, { type: 'deliver', eventId: competition }).state).toBe(loaded)
  })
  it('旧0.2进行中供货保留，新事件空白；已通过首领者不增发奖励', () => {
    const old = JSON.parse(JSON.stringify(adult()))
    old.schemaVersion = 2; old.contentVersion = '0.2.0'
    for (const [id, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      const first = eventsForChapter(Number(id))[0]
      const events = p.events as Record<string, unknown>
      p.event = events[first.id]; delete p.events
    }
    const s = validateState(old)
    expect(eventDone(s, 3, 'family-market-order')).toBe(true)
    expect(eventProgress(s, 3, stone).started).toBe(false)
    old.progress[3].boss = true; old.completed = [1, 2, 3]
    const passed = validateState(old)
    expect(eventDone(passed)).toBe(true); expect(passed.gold).toBe(old.gold)
    expect(eventDone(passed, 3, competition)).toBe(true)
    expect(advanceEvent(passed, { type: 'deliver', eventId: competition }).state).toBe(passed)
  })
  it('拒绝非法评分、路线和跳过前置任务', () => {
    const s = completeStone()
    for (const score of [179, 301, NaN]) {
      const bad = structuredClone(s); bad.progress[3].events[stone].score = score
      expect(() => validateState(bad)).toThrow()
    }
    const bad = structuredClone(s); bad.progress[3].events[competition] = { ...bad.progress[3].events[competition], started: true, stage: 2, choice: 'steady' }
    expect(() => validateState(bad)).toThrow()
    delete bad.progress[3].events[stone]
    expect(() => validateState(bad)).toThrow()
  })
  it('新增交互点无碰撞且靠近时选中正确人物', () => {
    const s = adult(), world = new CombatWorld(chapterById(3), { state: () => s, camp: () => {}, collect: () => {}, kill: () => {}, heal: () => false, notify: () => {} })
    for (const event of eventsForChapter(3)) {
      for (const p of [event.npc, ...(event.checkpoints ?? [])]) expect(mapCollides(mapForChapter(3), p)).toBe(false)
      Object.assign(world.player, event.npc)
      expect(world.nearEvent()?.id).toBe(event.id)
    }
    expect(pulseMarker(900)).toBe(.5); expect(pulseMarker(2700)).toBe(.5); expect(pulseMarker(3600)).toBe(0)
  })
})
