import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { bondEvents } from '../src/content/bonds'
import { bondJournal, bondSaveSummary, bondVisitQueue } from '../src/core/bonds'
import { advanceEvent, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { listSlots, loadSlot, parseSave, saveSlot, serializeSave } from '../src/core/save'

function cleared() {
  const s = initialState(); s.chapter = 28; s.completed = Array.from({ length: 28 }, (_, i) => i + 1)
  for (const chapter of s.completed) s.progress[chapter] = { ...blankProgress(chapter), herbs: 4, kills: 5, boss: true,
    brews: [6, 9, 20].includes(chapter) ? 2 : 0, events: migrateLegacyEvents(chapter, true) }
  return s
}
function act(s: ReturnType<typeof cleared>, id: string, action: EventAction) {
  const result = advanceEvent(s, { ...action, eventId: id })
  expect(result.ok, result.message).toBe(true)
  return result.state
}
describe('C10g-3 集中回访保存恢复', () => {
  it.each(['forward', 'reverse'] as const)('%s混合回应按队列逐页回访，每步IndexedDB/JSON往返并只发一次奖', async mode => {
    let s = cleared(), xp = s.xp, heal = s.inventory.heal, mana = s.inventory.mana
    const original = structuredClone(s), visited = new Set<string>()
    while (bondVisitQueue(s).length) {
      const queue = bondVisitQueue(s), next = mode === 'forward' ? queue[0] : queue.at(-1)!
      const event = bondEvents.find(item => item.event.id === next.eventId)!.event
      expect(visited.has(event.id)).toBe(false); s.chapter = next.chapter
      const choice = visited.size % 2 ? 'premium' : 'steady'
      for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice }, { type: 'deliver' }] as EventAction[]) {
        s = act(s, event.id, action)
        await saveSlot(0, s)
        const loaded = (await loadSlot(0))!
        expect(loaded).toEqual(s)
        expect(parseSave(serializeSave(loaded))).toEqual(s)
        expect(bondSaveSummary(loaded, s.settings)).toBe(bondSaveSummary(s, s.settings))
        s = loaded
      }
      const reward = event.bond!.options.find(option => option.choice === choice)!.reward
      xp += reward.xp; heal += reward.heal ?? 0; mana += reward.mana ?? 0
      expect(s.xp).toBe(xp); expect(s.inventory.heal).toBe(heal); expect(s.inventory.mana).toBe(mana)
      expect(advanceEvent(s, { type: 'deliver', eventId: event.id }).state).toBe(s)
      visited.add(event.id)
    }
    expect(visited.size).toBe(24)
    expect(bondSaveSummary(s, s.settings)).toBe('可见伙伴记录 24 / 24 · 进行中 0 页')
    expect(s.gold).toBe(original.gold); expect(s.completed).toEqual(original.completed); expect(s.fireEnergy).toBe(original.fireEnergy)
    expect(bondJournal(s).every(line => line.completed === line.entries.length)).toBe(true)
  })
  it('进行中摘要包含刚接取阶段，待确认档不会提前发奖，恢复备份保留选择', async () => {
    let s = cleared(); s.chapter = 1
    const id = 'xuner-youth-letter', before = structuredClone(s)
    s = act(s, id, { type: 'begin' })
    expect(bondSaveSummary(s, s.settings)).toContain('进行中 1 页')
    s = act(s, id, { type: 'seal', index: 0 })
    s = act(s, id, { type: 'strategy', choice: 'premium' })
    await saveSlot(0, s); await saveSlot(2, s)
    const report = (await loadSlot(2))!
    expect(report.inventory).toEqual(before.inventory); expect(report.xp).toBe(before.xp)
    const complete = act(report, id, { type: 'deliver' })
    await saveSlot(0, complete)
    const backup = (await loadSlot(-1))!
    expect(bondVisitQueue(backup)[0].eventId).toBe(id); expect(bondVisitQueue(backup)[0].status).toBe('report')
    expect(bondVisitQueue(backup)[0].choice).toContain('认真倾听')
    expect(act(backup, id, { type: 'deliver' })).toEqual(complete)
    expect(await loadSlot(2)).toEqual(report)
  })
  it('乱序请求后页被拒绝，最早前页随报告更新，重复失败不产生存档资源差异', async () => {
    let s = cleared(); s.chapter = 28
    await saveSlot(3, s)
    const failed = advanceEvent(s, { type: 'begin', eventId: 'xuner-homeward-letter' })
    expect(failed.ok).toBe(false); expect(failed.state).toBe(s)
    expect(bondJournal(s).find(line => line.id === 'xuner')!.entries.at(-1)!.prerequisite?.chapter).toBe(1)
    s.chapter = 1
    for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice: 'steady' }, { type: 'deliver' }] as EventAction[])
      s = act(s, 'xuner-youth-letter', action)
    expect(bondJournal(s).find(line => line.id === 'xuner')!.entries.at(-1)!.prerequisite?.chapter).toBe(14)
    expect((await loadSlot(3))?.xp).toBe(0)
    expect((await listSlots()).some(record => record.slot === 3)).toBe(true)
  })
  it('存档自身小说模式不能向动画查看者暴露未来伙伴数字，摘要不改双方设置', () => {
    let s = cleared(); s.chapter = 4
    for (const action of [{ type: 'begin' }, { type: 'seal', index: 0 }, { type: 'strategy', choice: 'steady' }, { type: 'deliver' }] as EventAction[])
      s = act(s, 'doctor-cave-trust', action)
    const viewing = { ...initialState().settings, spoiler: 'anime' as const, animeLimit: 1 }
    const before = structuredClone(s), settings = structuredClone(viewing)
    expect(bondSaveSummary(s, viewing)).toBe('可见伙伴记录 0 / 1 · 进行中 0 页')
    expect(bondSaveSummary(s, s.settings)).toBe('可见伙伴记录 1 / 24 · 进行中 0 页')
    expect(s).toEqual(before); expect(viewing).toEqual(settings)
  })
})
