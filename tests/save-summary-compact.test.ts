import { describe, expect, it } from 'vitest'
import { compactSaveSummaries, savePreviewSummary } from '../src/core/save-preview'
import { firstTrainingEligible } from './helpers/first-training-replay'
import { parseSave, serializeSave } from '../src/core/save'

describe('完整存档摘要去除已包含的接续记录', () => {
  it('重复只保留首次，完整子摘要已有承载时不再展开；不会误删部分重叠', () => {
    expect(compactSaveSummaries(['甲', '甲', '乙'])).toBe('甲 · 乙')
    expect(compactSaveSummaries(['甲 · 乙 · 丙', '乙 · 丙', '丙', '丁'])).toBe('甲 · 乙 · 丙 · 丁')
    expect(compactSaveSummaries(['归档A', '归档B'])).toBe('归档A · 归档B')
    expect(compactSaveSummaries([])).toBe('')
  })
  it('真实合法完整早期接续摘要缩短，JSON与摘要不写玩法；查看者上限保持', () => {
    const state = firstTrainingEligible(), before = structuredClone(state)
    const summary = savePreviewSummary(state, state.settings)
    for (const name of ['家族来访', '补偿交涉', '文书与离厅', '后山与古戒', '当晚来访', '晨间交卡',
      '同行药铺', '入坊巡卫', '坊市寻核', '让路手链', '围堵离场', '摊位发现', '唯一成交', '主辅药调制', '持续调息'])
      expect(summary).toContain(name)
    // The root chain carries every later checkpoint once instead of expanding again.
    expect(summary.match(/当晚来访 ·/g)?.length).toBe(1)
    expect(summary.match(/晨间交卡 ·/g)?.length).toBe(1)
    expect(savePreviewSummary(parseSave(serializeSave(state)), state.settings)).toBe(summary)
    const sealed = savePreviewSummary(state, { ...state.settings, spoiler: 'anime', animeLimit: 1 })
    expect(sealed).not.toMatch(/家族|后山|调息|五段/)
    expect(state).toEqual(before)
  })
})
