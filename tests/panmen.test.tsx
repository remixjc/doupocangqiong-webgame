import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { advancePanmen, parsePanmenFounding, panmenAvailable, type PanmenCommand } from '../src/core/panmen'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { chapterById } from '../src/content/chapters'
import { migrateLegacyEvents } from '../src/core/events'
import { loadSlot, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { panmenSaveSummary, savePreviewSummary, saveRecordSummary } from '../src/core/save-preview'
import PanmenFounding from '../src/ui/PanmenFounding'
import BondJournal from '../src/ui/BondJournal'

function unlocked() {
  const s = initialState()
  s.chapter = 14; s.completed = Array.from({ length: 14 }, (_, i) => i + 1); s.flame = 'lotus'
  for (const id of s.completed) s.progress[id] = {
    ...blankProgress(id), ...chapterById(id).objectives, boss: true, intro: true,
    events: migrateLegacyEvents(id, true),
  }
  s.academyCoop = { revision: 30, completed: 4, merit: 9, supplies: 6,
    assignments: [1, 2, 0], phase: 'plan', step: 0, mistakes: 0 }
  return validateState(s)
}
function act(s: GameState, command: PanmenCommand) {
  const before = structuredClone(s)
  const result = advancePanmen(s, { ...command, revision: s.panmenFounding?.revision ?? 0 })
  expect(s).toEqual(before)
  expect(result.ok, result.message).toBe(true)
  const next = { ...s, panmenFounding: result.founding! }
  expect(validateState(next)).toEqual(next)
  expect(parseSave(serializeSave(next))).toEqual(next)
  return next
}
function reject(s: GameState, command: PanmenCommand, revision = s.panmenFounding?.revision ?? 0) {
  const before = structuredClone(s)
  expect(advancePanmen(s, { ...command, revision }).ok).toBe(false)
  expect(s).toEqual(before)
}
function route() {
  let s = unlocked()
  const rows = [s]
  for (const command of [
    { type: 'begin' }, { type: 'walk', place: 1 }, { type: 'answer', option: 0 },
    { type: 'walk', place: 2 }, { type: 'confirm' }, { type: 'walk', place: 3 },
    { type: 'assign', member: 0, duty: 0 }, { type: 'assign', member: 1, duty: 1 }, { type: 'assign', member: 2, duty: 1 },
    { type: 'confirm' }, { type: 'answer', option: 1 }, { type: 'walk', place: 1 }, { type: 'confirm' },
  ] satisfies PanmenCommand[]) { s = act(s, command); rows.push(s) }
  return rows
}

describe('磐门筹议完整现场', () => {
  it('完整路线保持原有协作账本/全部主线，最终分工与名称独立归档且不可重奖', () => {
    const rows = route(), original = rows[0], final = rows.at(-1)!
    const { panmenFounding, ...rest } = final
    expect(rest).toEqual(original)
    expect(panmenFounding).toEqual({ revision: 13, stage: 5, place: 1, duties: [0, 1, 1] })
    reject(final, { type: 'begin' }); reject(final, { type: 'confirm' }); reject(final, { type: 'walk', place: 3 })
    expect(renderToStaticMarkup(<PanmenFounding state={final} exercise={() => {}} />)).toContain('继续协作经营演练')
  })

  it('所有断点经实际四槽和上一自动备份/摘要，导入无重复历史或资源变化', async () => {
    const rows = route()
    for (const [i, state] of rows.entries()) {
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      for (const slot of [0, 1, 2, 3]) expect(await loadSlot(slot)).toEqual(state)
      if (i > 0) expect(await loadSlot(-1)).toEqual(rows[i - 1])
      const summary = panmenSaveSummary(state, state.settings)
      expect(savePreviewSummary(state, state.settings)).toContain(summary)
      expect(saveRecordSummary({ slot: 0, savedAt: 0, text: serializeSave(state) }, state.settings)).toContain(summary)
    }
  })

  it('远处/错误选择/职责草案/过期输入零写；同类管理职责允许，两人同带头拒绝', () => {
    const rows = route()
    reject(rows[1], { type: 'answer', option: 0 })
    reject(rows[2], { type: 'answer', option: 1 }); reject(rows[2], { type: 'answer', option: NaN })
    reject(rows[3], { type: 'confirm' })
    reject(rows[5], { type: 'assign', member: 0, duty: 0 })
    reject(rows[6], { type: 'confirm' })
    for (const command of [
      { type: 'walk', place: NaN }, { type: 'walk', place: 4 }, { type: 'walk', place: 3 },
      { type: 'assign', member: -1, duty: 0 }, { type: 'assign', member: 0, duty: 3 },
    ] satisfies PanmenCommand[]) reject(rows[6], command)
    const wrong = act(act(rows[6], { type: 'assign', member: 0, duty: 0 }), { type: 'assign', member: 1, duty: 0 })
    reject(wrong, { type: 'confirm' })
    reject(rows[7], { type: 'assign', member: 0, duty: 0 })
    reject(rows[10], { type: 'answer', option: 2 })
    reject(rows[11], { type: 'confirm' })
    for (const state of rows.slice(1)) reject(state, { type: 'walk', place: (state.panmenFounding!.place + 1) % 4 }, state.panmenFounding!.revision - 1)
  })

  it('旧档和新游戏不补建门；版本/前置/结构/阶段/分工/过短历史严格拒绝', () => {
    const rows = route(), s = rows.at(-1)!, p = s.panmenFounding!
    expect(rows[0]).not.toHaveProperty('panmenFounding')
    const old = { ...rows[0], contentVersion: '0.95.1' }
    expect(validateState(old)).not.toHaveProperty('panmenFounding')
    expect(() => validateState({ ...s, contentVersion: '0.95.1' })).toThrow('前置')
    expect(() => validateState({ ...initialState(), panmenFounding: p })).toThrow('前置')
    for (const bad of [null, [], '', false, { ...p, reward: 1 }, { ...p, revision: 0 },
      { ...p, revision: 1_000_000_000 }, { ...p, revision: 12 }, { ...p, stage: 6 }, { ...p, place: 0 },
      { ...p, duties: [0, 0, 1] }, { ...p, duties: [0, 1] }, { ...p, duties: [0, 1, 3] },
      { ...p, stage: 1, place: 1 }, { ...rows[6].panmenFounding, duties: [0, 1, 1] },
    ]) expect(() => parsePanmenFounding(bad)).toThrow('记录无效')
  })

  it('查看者13章不见标题/人物/结果；14章恢复原记录，不受小说存档模式越界', () => {
    const s = route().at(-1)!, before = structuredClone(s)
    const hidden = { ...s.settings, spoiler: 'anime' as const, animeLimit: 13 }
    const allowed = { ...hidden, animeLimit: 14 }, without = { ...s }; delete without.panmenFounding
    expect(panmenSaveSummary(s, hidden)).toBe('')
    expect(savePreviewSummary(s, hidden)).toBe(savePreviewSummary(without, hidden))
    const sealed = { ...s, settings: hidden }
    expect(panmenAvailable(sealed)).toBe(false)
    expect(renderToStaticMarkup(<PanmenFounding state={sealed} exercise={() => {}} />)).not.toMatch(/磐门|薰儿|琥嘉/)
    expect(renderToStaticMarkup(<BondJournal state={sealed} visit={() => {}} />)).not.toContain('磐门筹议')
    expect(renderToStaticMarkup(<BondJournal state={{ ...s, settings: allowed }} visit={() => {}} />)).toContain('磐门筹议')
    expect(panmenSaveSummary(s, allowed)).toContain('名称与职责已归档')
    reject(sealed, { type: 'begin' })
    expect(validateState(sealed)).toEqual(sealed); expect(s).toEqual(before)
  })
})
