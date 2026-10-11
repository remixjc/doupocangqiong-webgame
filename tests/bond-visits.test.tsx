import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BondJournal from '../src/ui/BondJournal'
import { bondEvents } from '../src/content/bonds'
import { bondJournal, bondVisitQueue } from '../src/core/bonds'
import { advanceEvent, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'

function cleared(count = 28) {
  const s = initialState(); s.chapter = count; s.completed = Array.from({ length: count }, (_, i) => i + 1)
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), herbs: 4, kills: 5, boss: true,
    brews: [6, 9, 20].includes(chapter) ? 2 : 0, events: migrateLegacyEvents(chapter, true) }
  return s
}
function act(s: ReturnType<typeof cleared>, id: string, action: EventAction) {
  const result = advanceEvent(s, { ...action, eventId: id })
  expect(result.ok, result.message).toBe(true)
  return validateState(result.state)
}
describe('C10g-1 回访安排与前页导航', () => {
  it('旧通关只安排每线首张可做页，尾声被前页挡住，规划不改存档', () => {
    const s = cleared(), before = structuredClone(s), queue = bondVisitQueue(s)
    expect(queue).toHaveLength(7)
    expect(queue.map(entry => entry.chapter)).toEqual([1, 2, 4, 5, 7, 8, 8])
    expect(queue.every(entry => entry.status === 'available')).toBe(true)
    const last = bondJournal(s).find(line => line.id === 'little-doctor')!.entries.at(-1)!
    expect(last.status).toBe('blocked')
    expect(last.prerequisite).toEqual({ chapter: 4, eventId: 'doctor-cave-trust', title: '小医仙 · 洞外的约定', canVisit: true })
    expect(s).toEqual(before)
  })
  it('待报告优先于进行中，进行中优先于新页，刷新保留回应与目标', () => {
    let s = cleared(); s.chapter = 4
    s = act(s, 'doctor-cave-trust', { type: 'begin' })
    expect(bondVisitQueue(s)[0].destination).toBe('同行石')
    s = act(s, 'doctor-cave-trust', { type: 'seal', index: 0 })
    expect(bondVisitQueue(s)[0].destination).toBe('山径书简')
    s.chapter = 2; s = act(s, 'teacher-first-lessons', { type: 'begin' })
    s = act(s, 'teacher-first-lessons', { type: 'seal', index: 0 })
    s = act(s, 'teacher-first-lessons', { type: 'strategy', choice: 'premium' })
    const loaded = validateState(JSON.parse(JSON.stringify(s))), queue = bondVisitQueue(loaded)
    expect(queue[0].eventId).toBe('teacher-first-lessons'); expect(queue[0].status).toBe('report')
    expect(queue[0].destination).toBe('药老 · 师徒回访'); expect(queue[0].choice).toContain('记下疑问')
    expect(queue[1].eventId).toBe('doctor-cave-trust'); expect(queue[1].status).toBe('reading')
    const inventory = structuredClone(loaded.inventory)
    expect(s.inventory).toEqual(inventory)
  })
  it('报告后队列换到下一页，重复重读不改变完成或补给', () => {
    let s = cleared(); s.chapter = 2
    for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice: 'steady' }, { type: 'deliver' }] as EventAction[])
      s = act(s, 'teacher-first-lessons', action)
    expect(bondVisitQueue(s).some(entry => entry.eventId === 'teacher-first-lessons')).toBe(false)
    expect(bondVisitQueue(s).some(entry => entry.eventId === 'teacher-absence-notes')).toBe(true)
    const before = structuredClone(s)
    expect(advanceEvent(s, { type: 'deliver', eventId: 'teacher-first-lessons' }).state).toBe(s)
    bondJournal(s); bondVisitQueue(s); expect(s).toEqual(before)
  })
  it('未首通和本章前置缺失的页不出现在可做队列，前页未解锁按钮也禁用', () => {
    const s = initialState()
    expect(bondVisitQueue(s)).toEqual([])
    expect(bondJournal(s).find(line => line.id === 'yao-teacher')!.entries[1].prerequisite?.canVisit).toBe(false)
    s.chapter = 4; s.completed = [1, 2, 3]; s.progress[4] = blankProgress(4)
    expect(bondVisitQueue(s).some(entry => entry.chapter === 4)).toBe(false)
  })
  it('剧透范围同时约束队列、前页标题、汇总数字和实际HTML', () => {
    const s = cleared(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 2
    const queue = bondVisitQueue(s); expect(queue).toHaveLength(2)
    expect(queue.map(entry => entry.chapter)).toEqual([1, 2])
    const journal = bondJournal(s)
    expect(journal).toHaveLength(2); expect(journal.every(line => line.entries.length === 1)).toBe(true)
    const html = renderToStaticMarkup(<BondJournal state={s} visit={() => {}} />)
    expect(html).toContain('继续第1章'); expect(html).toContain('可见记录 0 / 2')
    for (const { chapter, event } of bondEvents.filter(item => item.chapter > 2)) {
      expect(html).not.toContain(event.title)
      expect(journal[0].entries.some(entry => entry.chapter === chapter)).toBe(false)
    }
  })
})
