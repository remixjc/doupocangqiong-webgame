import { describe, expect, it, vi } from 'vitest'
import { AutoSaveSession } from '../src/core/save-session'
import { GameStore } from '../src/core/store'
import { initialState } from '../src/core/model'
import { serializeSave } from '../src/core/save-serialize'

vi.mock('../src/core/save', () => ({
  listSlots: async () => { throw new Error('测试：存档读取失败') },
  parseSave: () => { throw new Error('测试：不应进入解析') },
}))

describe('异步存档读取失败时保留内存导出与未读取保护', () => {
  it('未成功读取的会话不能写入；轻量导出不依赖存档模块或IndexedDB', async () => {
    const state = initialState(), before = structuredClone(state), session = new AutoSaveSession()
    await expect(session.load(0)).rejects.toThrow('存档读取失败')
    await expect(session.write(state)).rejects.toThrow('尚未读取')
    const exported = JSON.parse(serializeSave(state))
    expect(exported.game).toBe('doupocangqiong-webgame')
    expect(exported.state).toEqual(state)
    expect(state).toEqual(before)
  })
  it('初始化失败后仍显示具体错误，内存旅途可导出，自动写入和重试不能覆盖未读取旧档', async () => {
    const store = new GameStore()
    await store.initialize()
    expect(store.getSnapshot().notice).toContain('存档读取失败')
    expect(store.getSnapshot().state.gold).toBe(80)
    store.update(state => { state.gold = 81 })
    expect(await store.waitForAutosave()).toBe(false)
    expect(store.getSnapshot().autosave.error).toContain('尚未读取')
    store.retryAutosave()
    expect(await store.waitForAutosave()).toBe(false)
    expect(JSON.parse(serializeSave(store.getSnapshot().state)).state.gold).toBe(81)
  })
})
