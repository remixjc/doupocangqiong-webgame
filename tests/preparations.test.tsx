import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { preparationEvents, preparationProtocols } from '../src/content/preparations'
import { eventsForChapter } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState, serializeSave, parseSave, saveSlot, loadSlot } from '../src/core/save'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { chapterById } from '../src/content/chapters'
import { CombatWorld } from '../src/game/combat'
import BondJournal from '../src/ui/BondJournal'

const { event } = preparationEvents[0], id = event.id
function cleared() {
  const s = initialState(); s.chapter = 17; s.completed = Array.from({ length: 17 }, (_, i) => i + 1)
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), herbs: 4, kills: 5,
    brews: [6, 9].includes(chapter) ? 2 : 0, boss: true, events: migrateLegacyEvents(chapter, true) }
  return s
}
function act(s: ReturnType<typeof cleared>, action: EventAction, eventId = id) {
  const result = advanceEvent(s, { ...action, eventId })
  expect(result.ok, result.message).toBe(true)
  return validateState(result.state)
}
function ready() {
  let s = cleared(); s.chapter = 4
  for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice: 'steady' }, { type: 'deliver' }] as EventAction[])
    s = act(s, action, 'doctor-cave-trust')
  s.chapter = 17
  for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice: 'premium' }, { type: 'deliver' }] as EventAction[])
    s = act(s, action, 'doctor-poison-notes')
  return s
}
function materials() {
  let s = act(ready(), { type: 'begin' })
  s = act(s, { type: 'seal', index: 0 })
  for (const index of [3, 1, 2]) s = act(s, { type: 'seal', index })
  return s
}
describe('C10h-1 原创风险准备演练', () => {
  it.each(['steady', 'premium'] as const)('%s方案逐节点存档恢复，三步不同顺序，报告补给幂等而不改变主线', async choice => {
    let s = materials(), before = structuredClone(s)
    s = act(s, { type: 'strategy', choice })
    for (const operation of preparationProtocols[choice]) {
      const p = eventProgress(s, 17, id)
      s = act(s, { type: 'contain', operation, stage: p.stage, attempts: p.attempts })
      await saveSlot(0, s); expect(await loadSlot(0)).toEqual(s)
      expect(parseSave(serializeSave(s))).toEqual(s)
      expect(s.inventory).toEqual(before.inventory); expect(s.xp).toBe(before.xp)
    }
    expect(eventProgress(s, 17, id).stage).toBe(6)
    s = act(s, { type: 'deliver' })
    expect(s.xp).toBe(before.xp + 40)
    expect(s.inventory).toEqual({ ...before.inventory, [choice === 'steady' ? 'heal' : 'mana']: before.inventory[choice === 'steady' ? 'heal' : 'mana'] + 1 })
    expect(s.gold).toBe(before.gold); expect(s.flame).toBe(before.flame)
    expect(s.completed).toEqual(before.completed); expect(s.fireEnergy).toBe(before.fireEnergy)
    expect(s.progress[17].events['flame-alliance-foundation']).toEqual(before.progress[17].events['flame-alliance-foundation'])
    expect(advanceEvent(s, { type: 'deliver', eventId: id }).state).toBe(s)
    expect(eventDone(s, 17, id)).toBe(true)
  })
  it('无前置不能接取，未读约定不收凭证；凭证重复/提前报告/过期步骤不推进', () => {
    expect(advanceEvent(cleared(), { type: 'begin', eventId: id }).ok).toBe(false)
    let s = act(ready(), { type: 'begin' })
    expect(advanceEvent(s, { type: 'seal', index: 1, eventId: id }).state).toBe(s)
    s = act(s, { type: 'seal', index: 0 }); s = act(s, { type: 'seal', index: 1 })
    expect(advanceEvent(s, { type: 'seal', index: 1, eventId: id }).state).toBe(s)
    expect(advanceEvent(s, { type: 'strategy', choice: 'steady', eventId: id }).ok).toBe(false)
    expect(advanceEvent(s, { type: 'deliver', eventId: id }).ok).toBe(false)
    s = act(materials(), { type: 'strategy', choice: 'steady' })
    const old: EventAction = { type: 'contain', operation: 'cool', stage: 3, attempts: 0 }
    s = act(s, old)
    expect(eventProgress(s, 17, id)).toMatchObject({ stage: 3, attempts: 1, score: 7 })
    expect(advanceEvent(s, { ...old, eventId: id }).state).toBe(s)
    for (const action of [{ type: 'contain', operation: 'unknown', stage: 3, attempts: 1 }, { type: 'contain', operation: 'isolate', stage: 4, attempts: 1 }])
      expect(advanceEvent(s, { ...action, eventId: id } as EventAction).state).toBe(s)
  })
  it('第三次错误放弃当前方案，凭证与行囊保留；重建/换方案后按新顺序完成', () => {
    let s = act(materials(), { type: 'strategy', choice: 'steady' }), before = structuredClone(s)
    s = act(s, { type: 'contain', operation: 'isolate', stage: 3, attempts: 0 })
    for (let attempt = 0; attempt < 3; attempt++)
      s = act(s, { type: 'contain', operation: 'rest', stage: 4, attempts: attempt })
    expect(eventProgress(s, 17, id)).toMatchObject({ stage: 2, score: 7, attempts: 3, choice: 'none' })
    expect(s.inventory).toEqual(before.inventory); expect(s.xp).toBe(before.xp)
    s = parseSave(serializeSave(s))
    const world = new CombatWorld(chapterById(17), { state: () => s, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false, notify: () => {} })
    expect(eventProgress(s, 17, id).score).toBe(7); expect(world.runtime().dead).toBe(false)
    s = act(s, { type: 'strategy', choice: 'premium' })
    for (const operation of preparationProtocols.premium) {
      const p = eventProgress(s, 17, id); s = act(s, { type: 'contain', operation, stage: p.stage, attempts: p.attempts })
    }
    expect(eventProgress(s, 17, id).stage).toBe(6)
  })
  it('真实E交互仅在凭证点采集，演练盘只开面板，不代做控制', () => {
    let s = act(ready(), { type: 'begin' }), opened: [string, number | undefined] | undefined
    const world = new CombatWorld(chapterById(17), { state: () => s, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      eventAction: action => { s = advanceEvent(s, action).state }, storyEvent: (id, checkpoint) => { opened = [id, checkpoint] } })
    world.action('interact', { x: 0, y: 0 }); expect(eventProgress(s, 17, id).stage).toBe(0)
    for (const index of [0, 3, 1, 2]) {
      Object.assign(world.player, event.checkpoints![index])
      world.action('interact', { x: 0, y: 0 }); s = validateState(s)
    }
    expect(eventProgress(s, 17, id)).toMatchObject({ stage: 2, score: 7 })
    Object.assign(world.player, event.checkpoints![4]); world.action('interact', { x: 0, y: 0 })
    expect(opened).toEqual([id, 4]); expect(eventProgress(s, 17, id).stage).toBe(2)
  })
  it('旧0.13.3不补完成或奖励，导入拒绝假凭证/无方案/无前置/非整轮复位', () => {
    const old = structuredClone(ready()); old.contentVersion = '0.13.3'
    delete old.progress[17].events[id]
    const migrated = validateState(old)
    expect(eventProgress(migrated, 17, id).started).toBe(false)
    expect(migrated.inventory).toEqual(old.inventory); expect(migrated.xp).toBe(old.xp)
    for (const patch of [{ stage: 2, score: 6 }, { stage: 3, choice: 'none' }, { stage: 2, attempts: 1 }, { stage: 1, score: 7 }]) {
      const invalid = materials()
      Object.assign(invalid.progress[17].events[id], patch)
      expect(() => validateState(invalid)).toThrow('演练记录')
    }
    const missing = act(ready(), { type: 'begin' })
    missing.progress[17].events['doctor-poison-notes'] = { ...blankProgress(17).events['doctor-poison-notes'] }
    expect(() => validateState(missing)).toThrow('前置')
  })
  it('各节点可达且距其他事件/药草100以上；动画低于17章不输出专属标题或数字', () => {
    const map = mapForChapter(17), queue = [map.spawn], seen = new Set([`${map.spawn.x},${map.spawn.y}`])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const q = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${q.x},${q.y}`
      if (q.x < 40 || q.x > 1240 || q.y < 50 || q.y > 760 || seen.has(key) || mapCollides(map, q, 22)) continue
      seen.add(key); queue.push(q)
    }
    const other = eventsForChapter(17).filter(e => e.id !== id).flatMap(e => [e.npc, ...(e.checkpoints ?? [])])
    for (const p of [event.npc, ...event.checkpoints!]) {
      expect(mapCollides(map, p, 22)).toBe(false)
      expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 16)).toBe(true)
      for (const q of [...other, ...map.herbs]) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(100)
    }
    const s = ready(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 4
    expect(renderToStaticMarkup(<BondJournal state={s} visit={() => {}} />)).not.toContain('准备演练')
    s.settings.spoiler = 'novel'
    expect(renderToStaticMarkup(<BondJournal state={s} visit={() => {}} />)).toContain('前往第17章准备演练')
  })
})
