import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { bondJournal } from '../src/core/bonds'
import { teacherSupport } from '../src/core/companions'
import { advanceEvent, eventDone, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'

const pages = bondEvents.filter(item => item.event.bond!.lineId === 'yao-teacher')
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
describe('C10f 师徒传授与归途', () => {
  it.each(['steady', 'premium'] as const)('%s四页真实选择存档，同行/离队/归队均按主线读取', choice => {
    let s = cleared(2)
    const gold = s.gold, inventory = structuredClone(s.inventory)
    expect(pages.map(item => item.chapter)).toEqual([2, 16, 22, 28])
    for (const { chapter, event } of pages) {
      for (let id = s.completed.length + 1; id <= chapter; id++) {
        s.completed.push(id)
        s.progress[id] = { ...blankProgress(id), boss: true, herbs: 4, kills: 5, brews: [6, 9, 20].includes(id) ? 2 : 0, events: migrateLegacyEvents(id, true) }
      }
      s.chapter = chapter
      const support = teacherSupport(s)
      s = complete(s, event.id, choice)
      expect(teacherSupport(s)).toEqual(support)
      expect(support.status).toBe(chapter === 2 ? 'travelling' : chapter === 16 ? 'away' : 'returned')
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s); expect(finishChapter(s)).toBe(s)
    }
    expect(s.gold).toBe(gold); expect(s.xp).toBe(160)
    expect(s.inventory.heal - inventory.heal).toBe(choice === 'steady' ? 4 : 0)
    expect(s.inventory.mana - inventory.mana).toBe(choice === 'premium' ? 4 : 0)
    expect(bondJournal(s).find(line => line.id === 'yao-teacher')?.completed).toBe(4)
    expect(bondJournal(s).filter(line => line.id !== 'yao-teacher').every(line => line.completed === 0)).toBe(true)
  })
  it('正式首通前不能读离队札记，没有初课页不能跳到后页', () => {
    const s = cleared(15); s.chapter = 16; s.progress[16] = { ...blankProgress(16), boss: true, events: migrateLegacyEvents(16, true) }
    expect(advanceEvent(s, { type: 'begin', eventId: pages[1].event.id }).message).toContain('正式首通')
    const done = finishChapter(s)
    expect(advanceEvent(done, { type: 'begin', eventId: pages[1].event.id }).message).toContain('第2章')
    done.progress[16].events[pages[1].event.id].started = true
    expect(() => validateState(done)).toThrow('跨章前置')
  })
  it('0.12.4五线记录保持，新师徒页空白，不补资源或改变归队', () => {
    let s = cleared(28)
    for (const { chapter, event } of bondEvents.filter(item => ['little-doctor', 'qinglin', 'hai-bodong', 'yun-yun', 'medusa'].includes(item.event.bond!.lineId))) {
      s.chapter = chapter; s = complete(s, event.id, 'steady')
    }
    s.contentVersion = '0.12.4'
    for (const { chapter, event } of pages) delete s.progress[chapter].events[event.id]
    const restored = validateState(s)
    expect(restored.xp).toBe(s.xp); expect(restored.gold).toBe(s.gold); expect(restored.inventory).toEqual(s.inventory)
    expect(teacherSupport(restored)).toEqual(teacherSupport(s))
    for (const { chapter, event } of pages) expect(eventDone(restored, chapter, event.id)).toBe(false)
    expect(bondJournal(restored).filter(line => ['little-doctor', 'qinglin', 'hai-bodong', 'yun-yun', 'medusa'].includes(line.id)).every(line => line.completed === line.entries.length)).toBe(true)
  })
  it('动画上限2仅显示师徒初课，隐藏离队/归队/终局页标题', () => {
    const s = cleared(28); s.settings.spoiler = 'anime'; s.settings.animeLimit = 2
    const journal = bondJournal(s); expect(journal).toHaveLength(1)
    expect(journal[0].id).toBe('yao-teacher'); expect(journal[0].entries).toHaveLength(1)
    expect(JSON.stringify(journal)).not.toContain('留下的日课'); expect(JSON.stringify(journal)).not.toContain('归队之后'); expect(JSON.stringify(journal)).not.toContain('传授未止')
  })
})
