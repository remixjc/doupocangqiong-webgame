import { describe, expect, it } from 'vitest'
import { initialState } from '../src/core/model'
import { saveRecordSummary } from '../src/core/save-preview'
import { serializeSave } from '../src/core/save'

describe('C11f-3c 版本不兼容的存档摘要', () => {
  it.each(['content', 'schema'])('较新%s在所有槽和查看范围提示更新，不被当损坏或泄露原内容', kind => {
    const envelope = JSON.parse(serializeSave(initialState()))
    if (kind === 'content') envelope.state.contentVersion = '999.0.0'
    else envelope.state.schemaVersion = 4
    // Unreadable future contents must never be displayed, even if they resemble legitimate progress.
    envelope.state.chapter = 28
    envelope.state.completed = Array.from({ length: 28 }, (_, i) => i + 1)
    envelope.state.futureTitle = '不应泄露的未来篇章<img src=x onerror=alert(1)>'
    const text = JSON.stringify(envelope)
    for (const slot of [-1, 0, 1, 2, 3]) for (const viewing of [
      initialState().settings,
      { ...initialState().settings, spoiler: 'anime' as const, animeLimit: 1 },
      { ...initialState().settings, spoiler: 'anime' as const, animeLimit: 2 },
    ]) {
      const record = { slot, savedAt: 12345, text }, before = structuredClone(record)
      const summary = saveRecordSummary(record, viewing)
      expect(summary).toBe('存档来自较新版本，请更新游戏后读取；原有记录保持。')
      for (const leaked of ['存档异常', '恢复', '第 28', '已完成', '999', '未来篇章', '<img'])
        expect(summary).not.toContain(leaked)
      expect(record).toEqual(before)
    }
  })

  it('真实损坏与非本游戏文件仍保留损坏恢复提示，兼容档继续显示实际摘要', () => {
    for (const text of ['{broken', '{}', JSON.stringify({ game: 'other', state: { contentVersion: '999.0.0' } })]) {
      expect(saveRecordSummary({ slot: 0, savedAt: 0, text }, initialState().settings))
        .toBe('存档异常，可尝试恢复上一份自动备份')
    }
    const state = initialState()
    expect(saveRecordSummary({ slot: 1, savedAt: 0, text: serializeSave(state) }, state.settings))
      .toContain('第 1 章 · 少年与戒指')
  })
})
