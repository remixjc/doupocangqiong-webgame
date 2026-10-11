import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { bondJournal, bondVisitQueue } from '../src/core/bonds'
import { advanceEvent, eventDone, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'

const pages = bondEvents.filter(item => item.event.bond!.lineId === 'xuner')
const oldLines = ['little-doctor', 'qinglin', 'hai-bodong', 'yun-yun', 'medusa', 'yao-teacher']
function cleared(count = 28) {
  const s = initialState(); s.chapter = count; s.completed = Array.from({ length: count }, (_, i) => i + 1)
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), herbs: 4, kills: 5, boss: true,
    brews: [6, 9, 20].includes(chapter) ? 2 : 0, events: migrateLegacyEvents(chapter, true) }
  return s
}
function complete(s: ReturnType<typeof cleared>, id: string, choice: 'steady' | 'premium') {
  for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice }, { type: 'deliver' }] as EventAction[]) {
    const result = advanceEvent(s, { ...action, eventId: id })
    expect(result.ok, result.message).toBe(true); s = validateState(result.state)
  }
  return s
}
describe('C10g-2 薰儿相知与同行', () => {
  it.each(['steady', 'premium'] as const)('%s四页保存，补给仅一次，火能/异火/其他伙伴和首通保持', choice => {
    let s = cleared(); s.fireEnergy = 7
    const before = structuredClone(s)
    expect(pages.map(item => item.chapter)).toEqual([1, 14, 23, 28])
    for (const { chapter, event } of pages) {
      s.chapter = chapter; s = complete(s, event.id, choice)
      expect(eventDone(s, chapter, event.id)).toBe(true)
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s)
      expect(finishChapter(s)).toBe(s)
    }
    expect(s.xp - before.xp).toBe(150); expect(s.gold).toBe(before.gold)
    expect(s.inventory.heal - before.inventory.heal).toBe(choice === 'steady' ? 4 : 0)
    expect(s.inventory.mana - before.inventory.mana).toBe(choice === 'premium' ? 4 : 0)
    expect(s.fireEnergy).toBe(7); expect(s.flame).toBe(before.flame); expect(s.completed).toEqual(before.completed)
    expect(bondJournal(s).find(line => line.id === 'xuner')?.completed).toBe(4)
    expect(bondJournal(s).filter(line => oldLines.includes(line.id)).every(line => line.completed === 0)).toBe(true)
  })
  it('后山未正式首通不能接取，内院和天墓未补前页不能开始或导入', () => {
    expect(advanceEvent(initialState(), { type: 'begin', eventId: pages[0].event.id }).message).toContain('正式首通')
    for (const { chapter, event } of pages.slice(1)) {
      const s = cleared(chapter)
      expect(advanceEvent(s, { type: 'begin', eventId: event.id }).message).toContain(`第${event.requiresHistory![0].chapter}章`)
      s.progress[chapter].events[event.id].started = true
      expect(() => validateState(s)).toThrow('跨章前置')
    }
  })
  it('旧0.12.6六线完成和资源保持，新的少年页可回访而非补完成', () => {
    let s = cleared()
    for (const { chapter, event } of bondEvents.filter(item => oldLines.includes(item.event.bond!.lineId))) {
      s.chapter = chapter; s = complete(s, event.id, 'premium')
    }
    s.contentVersion = '0.12.6'
    for (const { chapter, event } of pages) delete s.progress[chapter].events[event.id]
    const restored = validateState(s)
    expect(restored.inventory).toEqual(s.inventory); expect(restored.gold).toBe(s.gold); expect(restored.xp).toBe(s.xp)
    expect(bondJournal(restored).filter(line => oldLines.includes(line.id)).every(line => line.completed === line.entries.length)).toBe(true)
    expect(bondJournal(restored).find(line => line.id === 'xuner')?.completed).toBe(0)
    expect(bondVisitQueue(restored).map(entry => entry.eventId)).toEqual(['xuner-youth-letter'])
  })
  it('动画上限1只读少年书简，后续标题/回应/前置按钮不泄露', () => {
    const s = cleared(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 1
    const journal = bondJournal(s)
    expect(journal).toHaveLength(1); expect(journal[0].id).toBe('xuner'); expect(journal[0].entries).toHaveLength(1)
    for (const { event } of pages.slice(1)) expect(JSON.stringify(journal)).not.toContain(event.title)
    expect(journal[0].entries[0].prerequisite).toBeUndefined()
    expect(bondVisitQueue(s)[0].eventId).toBe('xuner-youth-letter')
  })
})
