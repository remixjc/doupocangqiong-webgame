import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { AutoSaveQueue, type AutoSaveStatus } from '../src/core/autosave'
import { initialState, type GameState } from '../src/core/model'
import { GameStore } from '../src/core/store'
import { loadSlot, saveSlot } from '../src/core/save'

describe('C11a-1 自动保存状态与重试', () => {
  it('重叠进度顺序写入，末次真实完成后才显示已保存，flush包含后追加的写入', async () => {
    const jobs: { state: GameState; resolve: () => void }[] = [], statuses: AutoSaveStatus[] = []
    const queue = new AutoSaveQueue(state => new Promise<void>(resolve => { jobs.push({ state, resolve }) }), status => statuses.push(status))
    queue.enqueue({ ...initialState(), gold: 100 }); queue.enqueue({ ...initialState(), gold: 200 })
    const flushing = queue.flush()
    await vi.waitFor(() => expect(jobs).toHaveLength(1))
    expect(statuses.at(-1)).toMatchObject({ phase: 'saving', pending: 2 })
    queue.enqueue({ ...initialState(), gold: 300 })
    jobs[0].resolve()
    await vi.waitFor(() => expect(jobs).toHaveLength(2))
    expect(statuses.at(-1)?.phase).toBe('saving'); jobs[1].resolve()
    await vi.waitFor(() => expect(jobs).toHaveLength(3))
    expect(statuses.at(-1)?.phase).toBe('saving'); jobs[2].resolve()
    expect(await flushing).toBe(true)
    expect(jobs.map(job => job.state.gold)).toEqual([100, 200, 300])
    expect(statuses.at(-1)).toMatchObject({ phase: 'saved', pending: 0, savedAt: expect.any(Number) })
  })
  it('末次写入失败持续保留，重试只写最新快照，不受调用方修改影响', async () => {
    let fail = true; const writes: number[] = [], statuses: AutoSaveStatus[] = []
    const queue = new AutoSaveQueue(async state => { writes.push(state.gold); if (fail) throw new Error('磁盘写入失败') }, status => statuses.push(status))
    const state = { ...initialState(), gold: 100 }
    queue.enqueue(state); state.gold = 900
    expect(await queue.flush()).toBe(false)
    expect(statuses.at(-1)).toMatchObject({ phase: 'error', pending: 0, error: '磁盘写入失败' })
    fail = false; queue.retry(); queue.retry()
    expect(await queue.flush()).toBe(true)
    expect(writes).toEqual([100, 100]); expect(statuses.at(-1)?.phase).toBe('saved')
    queue.retry(); expect(writes).toEqual([100, 100])
  })
  it('较早失败不覆盖后来成功，较新失败不能被旧成功伪装为已保存', async () => {
    for (const failing of [100, 200]) {
      let latest: AutoSaveStatus | undefined
      const queue = new AutoSaveQueue(async state => { if (state.gold === failing) throw new Error('failed') }, status => { latest = status })
      queue.enqueue({ ...initialState(), gold: 100 }); queue.enqueue({ ...initialState(), gold: 200 })
      expect(await queue.flush()).toBe(failing === 100)
      expect(latest?.phase).toBe(failing === 100 ? 'saved' : 'error')
    }
  })
  it('Store重复初始化只读一次，runtime/提示不写档，回访持久状态写入真实IndexedDB', async () => {
    const saved = initialState(); saved.gold = 345
    await saveSlot(0, saved)
    const load = vi.fn(loadSlot), write = vi.fn((state: GameState) => saveSlot(0, state))
    const store = new GameStore({ load, write })
    await Promise.all([store.initialize(), store.initialize()])
    expect(load).toHaveBeenCalledTimes(1); expect(write).not.toHaveBeenCalled()
    expect(store.getSnapshot().autosave.phase).toBe('loaded')
    store.runtime({ ...store.getSnapshot().runtime, x: 220 }); store.notify('试验提示')
    expect(write).not.toHaveBeenCalled()
    store.update(s => { s.inventory.herb++ }); store.update(s => { s.inventory.herb++ })
    expect(await store.waitForAutosave()).toBe(true)
    expect((await loadSlot(0))?.inventory.herb).toBe(2)
    expect((await loadSlot(-1))?.inventory.herb).toBe(1)
    expect(store.getSnapshot().autosave.phase).toBe('saved')
  })
  it('Store写入失败后提示消失和运行时更新不消除保存错误，重试保存最新事件', async () => {
    let fail = true, persisted: GameState | undefined
    const store = new GameStore({ load: async () => null, write: async state => {
      if (fail) throw new Error('quota'); persisted = state
    } })
    await store.initialize()
    store.update(s => { s.gold = 222 })
    expect(await store.waitForAutosave()).toBe(false)
    store.notify(''); store.runtime({ ...store.getSnapshot().runtime, x: 230 })
    expect(store.getSnapshot().autosave).toMatchObject({ phase: 'error', error: 'quota' })
    fail = false; store.retryAutosave()
    expect(await store.waitForAutosave()).toBe(true)
    expect(persisted?.gold).toBe(222); expect(store.getSnapshot().state.gold).toBe(222)
  })
  it('损坏自动档恢复备份只标已读取，不把加载当作本次写入成功', async () => {
    const recovery = initialState(); recovery.gold = 456
    const write = vi.fn(async () => {})
    const store = new GameStore({ load: async slot => { if (slot === 0) throw new Error('damaged'); return recovery }, write })
    await store.initialize()
    expect(store.getSnapshot().state.gold).toBe(456); expect(store.getSnapshot().notice).toContain('已恢复上一份')
    expect(store.getSnapshot().autosave).toEqual({ phase: 'loaded', pending: 0 })
    expect(write).not.toHaveBeenCalled()
  })
})
