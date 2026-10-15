import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { advanceAcademyCoop, type CoopCommand } from '../src/core/academy-coop'
import { blankProgress, initialState, type GameState } from '../src/core/model'
import { chapterById } from '../src/content/chapters'
import { migrateLegacyEvents } from '../src/core/events'
import { academyCoopSaveSummary, savePreviewSummary, saveRecordSummary } from '../src/core/save-preview'
import { listSlots, loadSlot, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'

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
  return validateState({ ...s, academyCoop: result.coop! })
}
function checkpoints() {
  let s = act(unlocked(), { type: 'begin' })
  const rows = [s]
  for (let member = 0; member < 3; member++) s = act(s, { type: 'assign', member, role: member })
  s = act(s, { type: 'dispatch' }); rows.push(s)
  s = act(s, { type: 'respond', option: 1 })
  s = act(s, { type: 'respond', option: 1 }); rows.push(s)
  s = act(s, { type: 'retry' })
  for (let round = 0; round < 4; round++) {
    if (s.academyCoop!.supplies < 3) s = act(s, { type: 'rest' })
    s = act(s, { type: 'dispatch' })
    for (let step = 0; step < 3; step++) {
      s = act(s, { type: 'respond', option: (round + step) % 3 })
      if (round === 0) rows.push(s)
    }
    s = act(s, { type: 'report' }); rows.push(s)
  }
  return rows
}

describe('内院协作存档摘要', () => {
  it('实际规则产生的草案、现场、失败、待登记与四单上限均在JSON/四槽/上一档保留准确摘要', async () => {
    const rows = checkpoints()
    expect(new Set(rows.map(s => s.academyCoop!.phase))).toEqual(new Set(['plan', 'field', 'failed', 'review']))
    for (const state of rows) {
      const before = structuredClone(state), summary = academyCoopSaveSummary(state, state.settings), p = state.academyCoop!
      expect(summary).toContain(`第${p.completed + 1}单`)
      expect(summary).toContain(`物资${p.supplies}/6`)
      expect(summary).toContain(`已登记${p.completed}单`)
      expect(summary).toContain(`协作章${p.merit}/9`)
      expect(summary).toContain(p.phase === 'field' ? `现场${p.step + 1}/3`
        : p.phase === 'plan' ? '拟定分工' : p.phase === 'failed' ? '整队待续' : '待登记')
      expect(savePreviewSummary(parseSave(serializeSave(state)), state.settings)).toContain(summary)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      for (const record of (await listSlots()).filter(r => r.slot >= 0)) {
        expect(saveRecordSummary(record, state.settings)).toContain(summary)
        expect(await loadSlot(record.slot)).toEqual(state)
      }
      expect(state).toEqual(before)
    }
    const final = rows.at(-1)!, backup = (await listSlots()).find(r => r.slot === -1)!
    expect(academyCoopSaveSummary(final, final.settings)).toContain('已登记4单 · 协作章9/9')
    expect(saveRecordSummary(backup, final.settings)).toContain('已登记3单 · 协作章9/9')
  })

  it('没有账本或未首通14章不显示；小说存档不能向动画13章查看者泄露记录或数字', () => {
    const empty = unlocked(), state = checkpoints().at(-1)!
    expect(academyCoopSaveSummary(empty, empty.settings)).toBe('')
    expect(empty).not.toHaveProperty('academyCoop')
    const hidden = { ...state.settings, spoiler: 'anime' as const, animeLimit: 13 }
    const allowed = { ...hidden, animeLimit: 14 }
    const before = structuredClone(state), viewingBefore = structuredClone(hidden)
    const without = { ...state }; delete without.academyCoop
    expect(academyCoopSaveSummary(state, hidden)).toBe('')
    expect(savePreviewSummary(state, hidden)).toBe(savePreviewSummary(without, hidden))
    expect(saveRecordSummary({ slot: 0, savedAt: 0, text: serializeSave(state) }, hidden))
      .toBe(savePreviewSummary(without, hidden))
    expect(savePreviewSummary(state, allowed)).toContain('内院协作 · 第5单')
    expect(academyCoopSaveSummary({ ...state, completed: state.completed.filter(id => id !== 14) }, state.settings)).toBe('')
    expect(state).toEqual(before); expect(hidden).toEqual(viewingBefore)
  })
})
