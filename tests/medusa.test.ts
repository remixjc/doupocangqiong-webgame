import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { findEvent } from '../src/content/events'
import { bondJournal } from '../src/core/bonds'
import { teacherSupport } from '../src/core/companions'
import { advanceEvent, eventDone, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'

const pages = bondEvents.filter(item => item.event.bond!.lineId === 'medusa')
function state(count = 28) {
  const s = initialState(); s.chapter = count; s.completed = Array.from({ length: count }, (_, i) => i + 1)
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
describe('C10e 美杜莎共历与责任', () => {
  it.each(['steady', 'premium'] as const)('%s三页报告一次补给、选择保存，与其他伙伴和主线奖励隔离', choice => {
    let s = state(), before = structuredClone(s)
    expect(pages.map(item => item.chapter)).toEqual([8, 17, 28])
    for (const { chapter, event } of pages) {
      s.chapter = chapter; s = complete(s, event.id, choice)
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s); expect(finishChapter(s)).toBe(s)
    }
    expect(s.xp - before.xp).toBe(115); expect(s.gold).toBe(before.gold); expect(s.completed).toEqual(before.completed); expect(s.flame).toBe(before.flame)
    expect(s.inventory.heal - before.inventory.heal).toBe(choice === 'steady' ? 3 : 0)
    expect(s.inventory.mana - before.inventory.mana).toBe(choice === 'premium' ? 3 : 0)
    expect(bondJournal(s).find(line => line.id === 'medusa')?.completed).toBe(3)
    expect(bondJournal(s).filter(line => line.id !== 'medusa').every(line => line.completed === 0)).toBe(true)
  })
  it('伙伴回应与炎盟筹备路线各自保存，药老离队状态保持', () => {
    let s = state(17); s.chapter = 8; s = complete(s, pages[0].event.id, 'premium')
    s.chapter = 17
    const primary = findEvent(17)!.id
    s.progress[17].events[primary].choice = 'premium'
    const before = structuredClone(s.progress[17].events[primary]), gold = s.gold, fireEnergy = s.fireEnergy
    s = complete(s, pages[1].event.id, 'steady')
    expect(s.progress[17].events[primary]).toEqual(before); expect(s.gold).toBe(gold); expect(s.fireEnergy).toBe(fireEnergy)
    expect(teacherSupport(s).status).toBe('away')
  })
  it('正式首通和前页是独立门槛，缺失前页的导入被拒绝', () => {
    const s = state(7); s.chapter = 8; s.progress[8] = blankProgress(8)
    expect(advanceEvent(s, { type: 'begin', eventId: pages[0].event.id }).message).toContain('正式首通')
    const missing = state(17)
    expect(advanceEvent(missing, { type: 'begin', eventId: pages[1].event.id }).message).toContain('第8章')
    missing.progress[17].events[pages[1].event.id].started = true
    expect(() => validateState(missing)).toThrow('跨章前置')
  })
  it('0.12.3旧档保留四线完成与资源，美杜莎页仍为空白', () => {
    let s = state()
    for (const { chapter, event } of bondEvents.filter(item => ['little-doctor', 'qinglin', 'hai-bodong', 'yun-yun'].includes(item.event.bond!.lineId))) {
      s.chapter = chapter; s = complete(s, event.id, 'steady')
    }
    s.contentVersion = '0.12.3'
    for (const { chapter, event } of pages) delete s.progress[chapter].events[event.id]
    const restored = validateState(s)
    expect(restored.xp).toBe(s.xp); expect(restored.gold).toBe(s.gold); expect(restored.inventory).toEqual(s.inventory)
    expect(bondJournal(restored).filter(line => ['little-doctor', 'qinglin', 'hai-bodong', 'yun-yun'].includes(line.id)).every(line => line.completed === line.entries.length)).toBe(true)
    for (const { chapter, event } of pages) expect(eventDone(restored, chapter, event.id)).toBe(false)
  })
  it('动画上限7隐藏美杜莎线，上限8仅显示火路首卷', () => {
    const s = state(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 7
    expect(bondJournal(s).some(line => line.id === 'medusa')).toBe(false)
    s.settings.animeLimit = 8
    const line = bondJournal(s).find(line => line.id === 'medusa')!
    expect(line.entries).toHaveLength(1); expect(line.entries[0].chapter).toBe(8)
    expect(JSON.stringify(line)).not.toContain('共同筹备'); expect(JSON.stringify(line)).not.toContain('归途守望')
  })
})
