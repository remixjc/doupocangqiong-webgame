import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { initialState, blankProgress, type GameState } from '../src/core/model'
import { earlyTrainingSaveSummary, earlyBraceletSaveSummary, savePreviewSummary, saveRecordSummary } from '../src/core/save-preview'
import { validateState, serializeSave, parseSave, saveSlot, listSlots } from '../src/core/save'
import { replayEarlyTraining } from './helpers/early-training-replay'

function eligible() {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  return validateState(old)
}

describe('重修存档预览', () => {
  it('正常事务断点在JSON与手动/自动/备份槽提供同样摘要，不改写进度', async () => {
    const checkpoints: GameState[] = []
    replayEarlyTraining(eligible(), true, state => checkpoints.push(state))
    for (const state of checkpoints) {
      const before = structuredClone(state), summary = savePreviewSummary(state, state.settings)
      expect(savePreviewSummary(parseSave(serializeSave(state)), state.settings)).toBe(summary)
      await saveSlot(0, state); await saveSlot(2, state)
      const records = await listSlots()
      for (const slot of [0, 2]) expect(saveRecordSummary(records.find(record => record.slot === slot)!, state.settings)).toBe(summary)
      expect(state).toEqual(before)
    }
    const records = await listSlots(), last = checkpoints.at(-1)!
    expect(saveRecordSummary(records.find(record => record.slot === -1)!, last.settings))
      .toContain('斗技结果待记下')
    expect(savePreviewSummary(last, last.settings)).toContain('初期尝试已归档')
    expect(checkpoints.map(state => earlyTrainingSaveSummary(state, state.settings))).toEqual(expect.arrayContaining([
      '重修记录 · 准备单已记下，待借资',
      '重修记录 · 借资已记账，待采购',
      '重修记录 · 采购 1/3 · 余额140',
      '重修记录 · 采购齐备 · 坊市 0/4',
      '重修记录 · 老师调制 0/6',
      '重修记录 · 药液已备好，待调息',
      '重修记录 · 调息 0/3 · 0/300 · 重试1次',
      '重修记录 · 调息通过，待试斗技',
    ]))
  })
  it('查看者动画上限1对未接取、借资、进行中与已归档显示相同封存摘要', () => {
    const viewing = { ...initialState().settings, spoiler: 'anime' as const, animeLimit: 1 }
    const checkpoints = [eligible()]
    replayEarlyTraining(eligible(), true, state => checkpoints.push(state))
    for (const state of checkpoints) {
      const before = structuredClone(state), settings = structuredClone(viewing)
      expect(earlyTrainingSaveSummary(state, viewing)).toBe('重修记录 · 当前范围封存')
      expect(savePreviewSummary(state, viewing)).toContain('封存篇章')
      expect(state).toEqual(before); expect(viewing).toEqual(settings)
    }
    const allowed = { ...viewing, animeLimit: 2 }
    expect(earlyTrainingSaveSummary(checkpoints.at(-1)!, allowed)).toContain('已归档')
  })
  it('旧版本只补空准备，异常记录不显示完成，导入预览不产生结算', () => {
    const state = eligible(), old = JSON.parse(JSON.stringify(state))
    old.contentVersion = '0.14.10'; delete old.earlyTraining
    const migrated = parseSave(JSON.stringify({ game: 'doupocangqiong-webgame', state: old }))
    expect(earlyTrainingSaveSummary(migrated, state.settings)).toBe('重修记录 · 尚未接取')
    expect(earlyTrainingSaveSummary(initialState(), state.settings)).toContain('第2章首通后开放')
    const record = { slot: 1, savedAt: 0, text: '{"earlyTraining":"invalid"}' }
    expect(saveRecordSummary(record, state.settings)).toContain('存档异常')
    const done = replayEarlyTraining(state)
    const before = structuredClone(done)
    expect(savePreviewSummary(done, state.settings)).toContain('初期尝试已归档')
    expect(done).toEqual(before)
  })
  it('完整准备链按顺序加入手链，摘要显示真实阶段，封存不泄露且查看不改状态', async () => {
    const states: GameState[] = []
    const done = replayEarlyTraining(eligible(), true, state => states.push(state), true)
    const viewing = { ...done.settings, spoiler: 'anime' as const, animeLimit: 1 }
    expect(new Set(states.map(state => state.earlyTraining.bracelet.stage)).size).toBe(7)
    for (const state of states) {
      const before = structuredClone(state), summary = earlyBraceletSaveSummary(state, state.settings)
      expect(savePreviewSummary(state, state.settings)).toContain(summary)
      expect(earlyBraceletSaveSummary(state, viewing)).toBe('手链往事 · 当前范围封存')
      await saveSlot(0, state)
      const records = await listSlots()
      expect(saveRecordSummary(records.find(record => record.slot === 0)!, state.settings)).toContain(summary)
      expect(state).toEqual(before)
    }
    expect(earlyBraceletSaveSummary(done, done.settings)).toBe('手链往事 · 已归档')
    expect(done.earlyTraining.practice.phase).toBe(4)
    expect(done.earlyTraining.market.blackIron).toBe(1)
    expect(done.earlyTraining.purse.spent).toBe(110)
  })
})
