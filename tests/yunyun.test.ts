import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { bondJournal } from '../src/core/bonds'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'

const pages = bondEvents.filter(item => item.event.bond!.lineId === 'yun-yun')
function state() {
  const s = initialState(); s.chapter = 28; s.completed = Array.from({ length: 28 }, (_, i) => i + 1)
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), boss: true, herbs: 4, kills: 5,
    brews: [6, 9, 20].includes(chapter) ? 2 : 0, events: migrateLegacyEvents(chapter, true) }
  return s
}
function complete(s: ReturnType<typeof state>, id: string, choice: 'steady' | 'premium') {
  for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice }, { type: 'deliver' }] as EventAction[]) {
    const result = advanceEvent(s, { ...action, eventId: id }); expect(result.ok, result.message).toBe(true); s = validateState(result.state)
  }
  return s
}
describe('C10d 云韵相遇与立场', () => {
  it.each(['steady', 'premium'] as const)('%s回应三页保存且奖励幂等，不改变避战/纳兰决斗/其他伙伴记录', choice => {
    let s = state()
    const before = structuredClone(s)
    expect(pages.map(item => item.chapter)).toEqual([5, 10, 28])
    for (const { chapter, event } of pages) {
      s.chapter = chapter; s = complete(s, event.id, choice)
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s); expect(finishChapter(s)).toBe(s)
    }
    expect(s.xp - before.xp).toBe(105); expect(s.gold).toBe(before.gold); expect(s.completed).toEqual(before.completed)
    expect(s.progress[5].boss).toBe(before.progress[5].boss); expect(s.progress[10].boss).toBe(before.progress[10].boss)
    expect(s.inventory.heal - before.inventory.heal).toBe(choice === 'steady' ? 3 : 0)
    expect(s.inventory.mana - before.inventory.mana).toBe(choice === 'premium' ? 3 : 0)
    expect(bondJournal(s).find(line => line.id === 'yun-yun')?.completed).toBe(3)
    expect(bondJournal(s).filter(line => line.id !== 'yun-yun').every(line => line.completed === 0)).toBe(true)
    expect(validateState(s)).toEqual(s)
  })
  it('相遇与山门页需正式首通，前页未完成不能开启立场页', () => {
    const s = state(); s.chapter = 5; s.completed = s.completed.filter(chapter => chapter !== 5)
    expect(advanceEvent(s, { type: 'begin', eventId: pages[0].event.id }).message).toContain('正式首通')
    s.chapter = 10; s.completed = Array.from({ length: 28 }, (_, i) => i + 1)
    expect(advanceEvent(s, { type: 'begin', eventId: pages[1].event.id }).message).toContain('第5章')
    s.progress[10].events[pages[1].event.id].started = true
    expect(() => validateState(s)).toThrow('跨章前置')
  })
  it('0.12.2旧档三条伙伴线保留，云韵新页为空且不补主线/补给', () => {
    let s = state()
    for (const { chapter, event } of bondEvents.filter(item => ['little-doctor', 'qinglin', 'hai-bodong'].includes(item.event.bond!.lineId))) {
      s.chapter = chapter; s = complete(s, event.id, 'steady')
    }
    s.contentVersion = '0.12.2'
    for (const { chapter, event } of pages) delete s.progress[chapter].events[event.id]
    const restored = validateState(s)
    expect(restored.xp).toBe(s.xp); expect(restored.gold).toBe(s.gold); expect(restored.inventory).toEqual(s.inventory)
    expect(bondJournal(restored).filter(line => line.id !== 'yun-yun').every(line => line.completed === line.entries.length)).toBe(true)
    for (const { chapter, event } of pages) expect(eventDone(restored, chapter, event.id)).toBe(false)
  })
  it('动画上限5显示山谷页，隐藏山门/归途标题及其回应', () => {
    const s = state(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 5
    const line = bondJournal(s).find(line => line.id === 'yun-yun')!
    expect(line.entries).toHaveLength(1); expect(line.entries[0].chapter).toBe(5)
    expect(JSON.stringify(line)).not.toContain('山门两端'); expect(JSON.stringify(line)).not.toContain('山风回信')
    expect(eventProgress(s, 5, pages[0].event.id).started).toBe(false)
  })
})
