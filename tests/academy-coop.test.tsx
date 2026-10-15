import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { advanceAcademyCoop, coopAvailable, type CoopCommand } from '../src/core/academy-coop'
import { parseAcademyCoop } from '../src/core/academy-coop-state'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { chapterById } from '../src/content/chapters'
import { migrateLegacyEvents } from '../src/core/events'
import { loadSlot, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import AcademyCoop from '../src/ui/AcademyCoop'
import BondJournal from '../src/ui/BondJournal'

function unlocked() {
  const s = initialState()
  s.chapter = 14; s.completed = Array.from({ length: 14 }, (_, i) => i + 1); s.flame = 'lotus'
  for (const id of s.completed) s.progress[id] = {
    ...blankProgress(id), ...chapterById(id).objectives, boss: true, intro: true,
    events: migrateLegacyEvents(id, true),
  }
  return validateState(s)
}
function act(s: GameState, command: CoopCommand) {
  const result = advanceAcademyCoop(s, { ...command, revision: s.academyCoop?.revision ?? 0 })
  expect(result.ok, result.message).toBe(true)
  const next = { ...s, academyCoop: result.coop! }
  expect(validateState(next)).toEqual(next)
  expect(parseSave(serializeSave(next))).toEqual(next)
  return next
}
function team(s: GameState, roles = [0, 1, 2]) {
  for (const [member, role] of roles.entries()) s = act(s, { type: 'assign', member, role })
  return s
}
function finish(s: GameState) {
  if (s.academyCoop!.supplies < 3) s = act(s, { type: 'rest' })
  s = act(s, { type: 'dispatch' })
  for (let step = 0; step < 3; step++) s = act(s, { type: 'respond', option: (s.academyCoop!.completed + step) % 3 })
  expect(s.academyCoop!.phase).toBe('review')
  return act(s, { type: 'report' })
}
function reject(s: GameState, command: CoopCommand, revision = s.academyCoop?.revision ?? 0) {
  const before = structuredClone(s)
  expect(advanceAcademyCoop(s, { ...command, revision }).ok).toBe(false)
  expect(s).toEqual(before)
}

describe('C10n 原创内院协作完整经营', () => {
  it('三委托循环、首三单上限和第四至第百单零追加，主线整状态不变', () => {
    const original = unlocked()
    let s = team(act(original, { type: 'begin' }))
    for (let round = 0; round < 100; round++) {
      expect(s.academyCoop!.completed % 3).toBe(round % 3)
      s = finish(s)
      expect(s.academyCoop!.merit).toBe(Math.min(3, round + 1) * 3)
      reject(s, { type: 'report' })
    }
    const { academyCoop, ...rest } = s
    expect(rest).toEqual(original)
    expect(academyCoop!.completed).toBe(100)
  })

  it('失误两次耗尽不推进，免费整队保存前奖/分工/委托后能接续', () => {
    let s = finish(team(act(unlocked(), { type: 'begin' })))
    s = act(s, { type: 'rest' }); s = act(s, { type: 'dispatch' })
    const roles = [...s.academyCoop!.assignments]
    s = act(s, { type: 'respond', option: 0 })
    expect(s.academyCoop).toMatchObject({ phase: 'field', step: 0, supplies: 2, mistakes: 1 })
    s = act(s, { type: 'respond', option: 0 })
    expect(s.academyCoop).toMatchObject({ phase: 'failed', step: 0, supplies: 0, mistakes: 2, merit: 3, completed: 1 })
    reject(s, { type: 'report' }); reject(s, { type: 'dispatch' }); reject(s, { type: 'respond', option: 1 })
    s = act(s, { type: 'retry' })
    expect(s.academyCoop).toMatchObject({ phase: 'plan', step: 0, supplies: 6, mistakes: 0, merit: 3, completed: 1, assignments: roles })
    expect(finish(s).academyCoop!.merit).toBe(6)
  })

  it('全跨职仍可完成但耗3物资；低物资必须整理，半途耗尽可重建', () => {
    let s = team(act(unlocked(), { type: 'begin' }), [1, 2, 0])
    s = finish(s)
    expect(s.academyCoop).toMatchObject({ supplies: 1, merit: 3 })
    reject(s, { type: 'dispatch' })
    s = act(s, { type: 'rest' }); s = act(s, { type: 'dispatch' })
    s = act(s, { type: 'respond', option: 0 }) // incorrect: needed1
    s = act(s, { type: 'respond', option: 1 })
    expect(s.academyCoop!.step).toBe(1)
    s = act(s, { type: 'respond', option: 2 })
    expect(s.academyCoop).toMatchObject({ phase: 'failed', step: 1, supplies: 0, merit: 3 })
    expect(act(s, { type: 'retry' }).academyCoop!.completed).toBe(1)
  })

  it('草案可重复职责，出发不行；所有越阶段/非法索引/旧修订和同值操作零写', () => {
    let s = act(unlocked(), { type: 'begin' })
    reject(s, { type: 'begin' }); reject(s, { type: 'rest' })
    reject(s, { type: 'dispatch' }); reject(s, { type: 'report' }); reject(s, { type: 'retry' })
    for (const [member, role] of [[-1, 0], [3, 0], [0, 4], [0, 0.5], [NaN, 0]]) reject(s, { type: 'assign', member, role })
    s = act(s, { type: 'assign', member: 0, role: 0 })
    reject(s, { type: 'assign', member: 0, role: 0 })
    s = act(s, { type: 'assign', member: 1, role: 0 })
    reject(s, { type: 'dispatch' })
    s = act(s, { type: 'assign', member: 1, role: 1 })
    s = act(s, { type: 'assign', member: 2, role: 2 })
    const old = s.academyCoop!.revision
    s = act(s, { type: 'dispatch' })
    reject(s, { type: 'dispatch' }, old)
    reject(s, { type: 'assign', member: 0, role: 1 }); reject(s, { type: 'retry' }); reject(s, { type: 'rest' })
    reject(s, { type: 'respond', option: 3 }); reject(s, { type: 'respond', option: 0 }, old)
    for (const option of [0, 1, 2]) s = act(s, { type: 'respond', option })
    const report = s.academyCoop!.revision
    s = act(s, { type: 'report' })
    reject(s, { type: 'report' }, report)
  })

  it('前14章与动画范围守卫包括已有演练；可读档但隐藏进度且不推进', () => {
    reject(initialState(), { type: 'begin' })
    const s = team(act(unlocked(), { type: 'begin' }))
    s.settings.spoiler = 'anime'; s.settings.animeLimit = 13
    expect(coopAvailable(s)).toBe(false)
    reject(s, { type: 'dispatch' })
    expect(validateState(s)).toEqual(s) // hiding never destroys existing history
    const hidden = renderToStaticMarkup(<AcademyCoop state={s} />)
    expect(hidden).not.toContain('护送'); expect(hidden).not.toContain('协作章')
    expect(renderToStaticMarkup(<BondJournal state={s} visit={() => {}} />)).not.toContain('内院协作演练')
    s.settings.animeLimit = 14
    expect(renderToStaticMarkup(<BondJournal state={s} visit={() => {}} />)).toContain('内院协作演练')
    expect(advanceAcademyCoop(s, { type: 'dispatch', revision: s.academyCoop!.revision }).ok).toBe(true)
  })

  it('新字段缺省不补历史，旧版本带新历史/14前账本和伪造结构明确拒绝', () => {
    const s = unlocked()
    s.contentVersion = '0.94.2'
    expect(validateState(s)).not.toHaveProperty('academyCoop')
    s.academyCoop = act(unlocked(), { type: 'begin' }).academyCoop
    expect(() => validateState(s)).toThrow('前置')
    const early = initialState(); early.academyCoop = s.academyCoop
    expect(() => validateState(early)).toThrow('前置')
    const p = s.academyCoop!
    for (const patch of [
      { merit: 9 }, { completed: -1 }, { revision: NaN }, { revision: 0 }, { supplies: 7 }, { supplies: -1 }, { supplies: 0 },
      { step: 1 }, { mistakes: 1 }, { assignments: [] }, { assignments: [0, 1, 4] },
      { phase: 'field', assignments: [0, 0, 1] }, { phase: 'field', assignments: [0, 1, 2], mistakes: 2, supplies: 1 },
      { phase: 'review', assignments: [0, 1, 2], step: 3, supplies: 0 },
      { phase: 'failed', assignments: [0, 1, 2], supplies: 1 }, { phase: 'unknown' }, { surpriseReward: 1 },
    ]) expect(() => parseAcademyCoop({ ...p, ...patch })).toThrow('记录无效')
    for (const bad of [null, false, [], 'hello']) expect(() => parseAcademyCoop(bad)).toThrow()
  })

  it('实际四槽/上一自动档分别保留现场与报告断点，恢复不重奖', async () => {
    let s = team(act(unlocked(), { type: 'begin' }))
    s = act(s, { type: 'dispatch' }); s = act(s, { type: 'respond', option: 0 })
    for (const slot of [0, 1, 2, 3]) await saveSlot(slot, s)
    const checkpoint = structuredClone(s)
    s = act(s, { type: 'respond', option: 1 }); s = act(s, { type: 'respond', option: 2 })
    await saveSlot(0, s)
    expect(await loadSlot(-1)).toEqual(checkpoint)
    expect(await loadSlot(0)).toEqual(s)
    for (const slot of [1, 2, 3]) expect(await loadSlot(slot)).toEqual(checkpoint)
    s = act((await loadSlot(0))!, { type: 'report' }); await saveSlot(0, s)
    expect(await loadSlot(0)).toEqual(s); reject((await loadSlot(0))!, { type: 'report' })
  })
})
