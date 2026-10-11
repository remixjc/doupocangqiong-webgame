import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { bondJournal } from '../src/core/bonds'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'

const pages = bondEvents.filter(item => item.event.bond!.lineId === 'qinglin')
function fullState() {
  const s = initialState(); s.chapter = 28; s.completed = Array.from({ length: 28 }, (_, i) => i + 1); s.flame = 'pure'
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), boss: true, herbs: 4, kills: 5, brews: [6, 9, 20].includes(chapter) ? 2 : 0,
    events: migrateLegacyEvents(chapter, true) }
  return s
}
describe('C10b 青鳞三页成长回望', () => {
  it.each(['steady', 'premium'] as const)('%s回应跨章保存、报告一次补给，小医仙记录与主线保持', choice => {
    let s = fullState()
    const before = structuredClone(s), rewards = pages.map(page => page.event.bond!.options.find(option => option.choice === choice)!.reward)
    expect(pages.map(page => page.chapter)).toEqual([7, 19, 28])
    for (const { chapter, event } of pages) {
      s.chapter = chapter
      for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice }, { type: 'deliver' }] as EventAction[]) {
        const result = advanceEvent(s, { ...action, eventId: event.id })
        expect(result.ok, result.message).toBe(true); s = validateState(result.state)
      }
      expect(eventDone(s, chapter, event.id)).toBe(true)
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s)
      expect(finishChapter(s)).toBe(s)
    }
    expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp + rewards.reduce((sum, reward) => sum + reward.xp, 0))
    expect(s.inventory.herb).toBe(before.inventory.herb); expect(s.inventory.crystal).toBe(before.inventory.crystal)
    expect(s.inventory.heal).toBe(before.inventory.heal + (choice === 'steady' ? 3 : 0))
    expect(s.inventory.mana).toBe(before.inventory.mana + (choice === 'premium' ? 3 : 0))
    expect(s.completed).toEqual(before.completed)
    const journal = bondJournal(s)
    expect(journal.find(line => line.id === 'qinglin')?.completed).toBe(3)
    expect(journal.find(line => line.id === 'little-doctor')?.completed).toBe(0)
  })
  it('没有沙城页不能开启成长页，伪造跨章进度拒绝导入', () => {
    const s = fullState(); s.chapter = 19
    const result = advanceEvent(s, { type: 'begin', eventId: pages[1].event.id })
    expect(result.state).toBe(s); expect(result.message).toContain('第7章')
    s.progress[19].events[pages[1].event.id].started = true
    expect(() => validateState(s)).toThrow('跨章前置')
  })
  it('0.12.0旧档保留已完成小医仙页，不自动补青鳞页或资源', () => {
    let s = fullState()
    for (const { chapter, event } of bondEvents.filter(item => item.event.bond!.lineId === 'little-doctor')) {
      s.chapter = chapter
      for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice: 'steady' }, { type: 'deliver' }] as EventAction[])
        s = advanceEvent(s, { ...action, eventId: event.id }).state
    }
    s.contentVersion = '0.12.0'
    for (const { chapter, event } of pages) delete s.progress[chapter].events[event.id]
    const migrated = validateState(s)
    expect(bondJournal(migrated).find(line => line.id === 'little-doctor')?.completed).toBe(4)
    expect(bondJournal(migrated).find(line => line.id === 'qinglin')?.completed).toBe(0)
    expect(migrated.inventory).toEqual(s.inventory); expect(migrated.gold).toBe(s.gold); expect(migrated.xp).toBe(s.xp)
    for (const { chapter, event } of pages) expect(eventProgress(migrated, chapter, event.id)).toMatchObject({ started: false, stage: 0, choice: 'none' })
  })
  it('动画上限7只显示青鳞首卷，隐藏成长页和末页名称、地点与回应', () => {
    const s = fullState(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 7
    const line = bondJournal(s).find(line => line.id === 'qinglin')!
    expect(line.entries).toHaveLength(1); expect(line.entries[0].chapter).toBe(7)
    expect(JSON.stringify(line)).not.toContain('成长回望'); expect(JSON.stringify(line)).not.toContain('远行来信')
  })
})
