import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { AutoSaveConflictError, listSlots, loadSlot, saveSlot, serializeSave, type SaveRecord } from '../src/core/save'
import { AutoSaveSession } from '../src/core/save-session'
import { initialState } from '../src/core/model'
import { GameStore } from '../src/core/store'

async function rawAuto(text: string) {
  const db = await new Promise<IDBDatabase>(resolve => {
    const req = indexedDB.open('doupocangqiong-saves', 1)
    req.onsuccess = () => resolve(req.result)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('slots', 'readwrite')
      tx.objectStore('slots').put({ slot: 0, savedAt: Date.now(), text } satisfies SaveRecord)
      tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
beforeEach(async () => { await saveSlot(0, initialState()) })
describe('C11a-2 自动存档会话冲突', () => {
  it('两个标签从同一自动档出发只能有一个提交，失败不动自动/备份/手动档', async () => {
    const a = new AutoSaveSession(), b = new AutoSaveSession()
    const stateA = (await a.load(0))!, stateB = (await b.load(0))!
    stateA.gold = 300; stateB.gold = 400
    await saveSlot(1, { ...stateA, gold: 200 })
    await a.write(stateA)
    const before = await listSlots()
    await expect(b.write(stateB)).rejects.toBeInstanceOf(AutoSaveConflictError)
    expect(await listSlots()).toEqual(before)
    expect((await loadSlot(0))?.gold).toBe(300); expect((await loadSlot(-1))?.gold).toBe(80)
    expect((await loadSlot(1))?.gold).toBe(200)
  })
  it('同时提交也在同一事务里比较，只有一个写入成功', async () => {
    const a = new AutoSaveSession(), b = new AutoSaveSession()
    const stateA = (await a.load(0))!, stateB = (await b.load(0))!
    stateA.gold = 301; stateB.gold = 401
    const results = await Promise.allSettled([a.write(stateA), b.write(stateB)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    expect([301, 401]).toContain((await loadSlot(0))?.gold)
    expect((await loadSlot(-1))?.gold).toBe(80)
  })
  it('冲突重试不会强行覆盖，显式读取最新档后才从新基线继续', async () => {
    const a = new GameStore(), b = new GameStore()
    await Promise.all([a.initialize(), b.initialize()])
    a.update(s => { s.gold = 302 }); expect(await a.waitForAutosave()).toBe(true)
    b.update(s => { s.gold = 402 }); expect(await b.waitForAutosave()).toBe(false)
    b.retryAutosave(); expect(await b.waitForAutosave()).toBe(false)
    expect(b.getSnapshot().state.gold).toBe(402)
    expect(b.getSnapshot().autosave.error).toContain('另一个游戏标签')
    expect((await loadSlot(0))?.gold).toBe(302)
    await saveSlot(2, b.getSnapshot().state)
    expect(await b.loadSavedSlot(0)).toBe(true)
    expect(await b.waitForAutosave()).toBe(true)
    expect(b.getSnapshot().state.gold).toBe(302)
    b.update(s => { s.inventory.herb++ }); expect(await b.waitForAutosave()).toBe(true)
    expect((await loadSlot(0))?.inventory.herb).toBe(1)
    expect((await loadSlot(2))?.gold).toBe(402)
  })
  it('旧文本无需新schema或修订字段，迁移后更新令牌，同会话可连续保存', async () => {
    const old = initialState(); old.contentVersion = '0.12.8'
    const oldText = serializeSave(old); await rawAuto(oldText)
    const session = new AutoSaveSession(), state = (await session.load(0))!
    state.gold = 500; await session.write(state)
    expect((await listSlots()).find(record => record.slot === -1)?.text).toBe(oldText)
    state.gold = 600; await session.write(state)
    expect((await loadSlot(0))?.gold).toBe(600); expect((await loadSlot(-1))?.gold).toBe(500)
  })
  it('损坏自动档可从备份恢复而不覆盖有效备份，期间别的写入仍阻挡覆盖', async () => {
    const baseline = initialState(); baseline.gold = 700
    await saveSlot(0, baseline); await saveSlot(0, { ...baseline, gold: 800 })
    await rawAuto('{broken')
    const a = new AutoSaveSession(), b = new AutoSaveSession()
    await expect(a.load(0)).rejects.toThrow()
    const recovery = (await a.load(-1))!
    expect(recovery.gold).toBe(700)
    await expect(b.load(0)).rejects.toThrow()
    const recoveredB = (await b.load(-1))!
    await a.write(recovery)
    expect((await loadSlot(-1))?.gold).toBe(700)
    await expect(b.write(recoveredB)).rejects.toBeInstanceOf(AutoSaveConflictError)
    expect((await loadSlot(0))?.gold).toBe(700)
  })
  it('手动载入从当次自动档基线提交，未初始化会话不允许写档', async () => {
    const session = new AutoSaveSession()
    await expect(session.write(initialState())).rejects.toThrow('尚未读取')
    await saveSlot(3, { ...initialState(), gold: 900 })
    const store = new GameStore(); await store.initialize()
    await saveSlot(0, { ...initialState(), gold: 1000 })
    expect(await store.loadSavedSlot(3)).toBe(true)
    expect(await store.waitForAutosave()).toBe(true)
    expect((await loadSlot(0))?.gold).toBe(900)
    expect((await loadSlot(-1))?.gold).toBe(1000)
    expect((await loadSlot(3))?.gold).toBe(900)
  })
})
