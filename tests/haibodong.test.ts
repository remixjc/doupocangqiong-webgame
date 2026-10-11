import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { bondJournal } from '../src/core/bonds'
import { teacherSupport } from '../src/core/companions'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'

const pages = bondEvents.filter(item => item.event.bond!.lineId === 'hai-bodong')
function cleared(count: number) {
  const s = initialState(); s.chapter = count; s.completed = Array.from({ length: count }, (_, i) => i + 1)
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), boss: true, herbs: 4, kills: 5,
    brews: [6, 9, 20].includes(chapter) ? 2 : 0, events: migrateLegacyEvents(chapter, true) }
  return s
}
function complete(s: ReturnType<typeof cleared>, id: string, choice: 'steady' | 'premium') {
  for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice }, { type: 'deliver' }] as EventAction[]) {
    const result = advanceEvent(s, { ...action, eventId: id }); expect(result.ok, result.message).toBe(true); s = validateState(result.state)
  }
  return s
}
describe('C10c 海波东守约与相助', () => {
  it('首卷需青莲正式首通，相助回访不会重发异火或主线奖励', () => {
    let s = cleared(7); s.chapter = 8
    s.progress[8] = { ...blankProgress(8), boss: true, events: migrateLegacyEvents(8, true) }
    expect(advanceEvent(s, { type: 'begin', eventId: pages[0].event.id }).state).toBe(s)
    s = finishChapter(s); expect(s.flame).toBe('lotus')
    const gold = s.gold
    s = complete(s, pages[0].event.id, 'steady')
    expect(s.flame).toBe('lotus'); expect(s.gold).toBe(gold); expect(finishChapter(s)).toBe(s)
  })
  it('中卷需再临云岚正式首通，回访不会提前恢复药老支援', () => {
    let s = cleared(15); s.chapter = 8; s = complete(s, pages[0].event.id, 'steady')
    s.chapter = 16; s.progress[16] = { ...blankProgress(16), boss: true, events: migrateLegacyEvents(16, true) }
    expect(advanceEvent(s, { type: 'begin', eventId: pages[1].event.id }).state).toBe(s)
    s = finishChapter(s); expect(teacherSupport(s).status).toBe('away')
    s = complete(s, pages[1].event.id, 'premium')
    expect(teacherSupport(s).status).toBe('away'); expect(teacherSupport(s).available).toBe(false)
    expect(eventProgress(s, 16, pages[1].event.id).choice).toBe('premium')
  })
  it.each(['steady', 'premium'] as const)('%s三页跨章奖励一次，其他伙伴记录保持空白', choice => {
    let s = cleared(28), before = structuredClone(s)
    for (const { chapter, event } of pages) {
      s.chapter = chapter; s = complete(s, event.id, choice)
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s)
      expect(finishChapter(s)).toBe(s)
    }
    expect(s.xp - before.xp).toBe(115); expect(s.gold).toBe(before.gold)
    expect(s.inventory.heal - before.inventory.heal).toBe(choice === 'steady' ? 3 : 0)
    expect(s.inventory.mana - before.inventory.mana).toBe(choice === 'premium' ? 3 : 0)
    expect(bondJournal(s).find(line => line.id === 'hai-bodong')?.completed).toBe(3)
    expect(bondJournal(s).filter(line => line.id !== 'hai-bodong').every(line => line.completed === 0)).toBe(true)
  })
  it('0.12.1旧档保持此前两线完成状态，新海波东页不自动发奖或记录', () => {
    let s = cleared(28)
    for (const { chapter, event } of bondEvents.filter(item => item.event.bond!.lineId !== 'hai-bodong')) {
      s.chapter = chapter; s = complete(s, event.id, 'steady')
    }
    s.contentVersion = '0.12.1'
    for (const { chapter, event } of pages) delete s.progress[chapter].events[event.id]
    const restored = validateState(s)
    expect(restored.inventory).toEqual(s.inventory); expect(restored.gold).toBe(s.gold); expect(restored.xp).toBe(s.xp)
    for (const { chapter, event } of pages) expect(eventDone(restored, chapter, event.id)).toBe(false)
    expect(bondJournal(restored).find(line => line.id === 'little-doctor')?.completed).toBe(4)
    expect(bondJournal(restored).find(line => line.id === 'qinglin')?.completed).toBe(3)
  })
})
