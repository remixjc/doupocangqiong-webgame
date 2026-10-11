import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialState } from '../src/core/model'
import { listSlots, loadSlot, NewerSaveVersionError, saveSlot, serializeSave, type SaveRecord } from '../src/core/save'
import { AutoSaveSession } from '../src/core/save-session'
import { GameStore } from '../src/core/store'

async function writeRawAuto(text: string, slot = 0) {
  const db = await new Promise<IDBDatabase>(resolve => {
    const request = indexedDB.open('doupocangqiong-saves', 1)
    request.onsuccess = () => resolve(request.result)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('slots', 'readwrite')
      tx.objectStore('slots').put({ slot, savedAt: 123456, text } satisfies SaveRecord)
      tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

beforeEach(async () => {
  await saveSlot(0, { ...initialState(), gold: 222 })
  await saveSlot(0, { ...initialState(), gold: 333 })
  await saveSlot(1, { ...initialState(), gold: 444 })
})

describe('C11f-3a 较新自动档保护', () => {
  it.each(['content', 'schema'])('较新%s拒绝载入和重试，不覆盖任何已有槽', async kind => {
    const envelope = JSON.parse(serializeSave({ ...initialState(), gold: 999 }))
    if (kind === 'content') envelope.state.contentVersion = '999.0.0'
    else envelope.state.schemaVersion = 4
    await writeRawAuto(JSON.stringify(envelope))
    const before = await listSlots(), session = new AutoSaveSession()
    await expect(session.load(0)).rejects.toBeInstanceOf(NewerSaveVersionError)
    await expect(session.write(initialState())).rejects.toBeInstanceOf(NewerSaveVersionError)
    await expect(session.write(initialState())).rejects.toThrow('不会覆盖')
    expect(await listSlots()).toEqual(before)
  })

  it('初始化不把版本不兼容当损坏恢复，内存操作和开始新旅程均保留原始自动档', async () => {
    const future = { ...initialState(), contentVersion: '999.0.0', gold: 999 }
    await writeRawAuto(serializeSave(future))
    const before = await listSlots(), store = new GameStore()
    await store.initialize()
    expect(store.getSnapshot().state.gold).toBe(80)
    expect(store.getSnapshot().notice).toContain('较新版本')
    expect(store.getSnapshot().notice).not.toContain('已恢复')
    store.introSeen(); expect(await store.waitForAutosave()).toBe(false)
    expect(store.getSnapshot().autosave.error).toContain('原有自动档已保护')
    store.retryAutosave(); expect(await store.waitForAutosave()).toBe(false)
    store.newGame(); expect(await store.waitForAutosave()).toBe(false)
    expect(await listSlots()).toEqual(before)
  })

  it('兼容手动/恢复槽可读取，但不能绕过较新自动档保护；恢复兼容自动档后会话可继续保存', async () => {
    await writeRawAuto(serializeSave({ ...initialState(), contentVersion: '999.0.0', gold: 999 }))
    const before = await listSlots(), store = new GameStore()
    await store.initialize()
    expect(await store.loadSavedSlot(1)).toBe(true)
    expect(store.getSnapshot().state.gold).toBe(444)
    expect(await store.waitForAutosave()).toBe(false)
    expect(await store.loadSavedSlot(-1)).toBe(true)
    expect(store.getSnapshot().state.gold).toBe(222)
    expect(await store.waitForAutosave()).toBe(false)
    expect(await listSlots()).toEqual(before)
    // Model a compatible game restoring its own automatic record, then explicitly reload it.
    await writeRawAuto(serializeSave({ ...initialState(), gold: 555 }))
    expect(await store.loadSavedSlot(0)).toBe(true)
    expect(await store.waitForAutosave()).toBe(true)
    store.update(state => { state.inventory.herb++ })
    expect(await store.waitForAutosave()).toBe(true)
    expect((await loadSlot(0))?.gold).toBe(555)
    expect((await loadSlot(0))?.inventory.herb).toBe(1)
    expect((await loadSlot(1))?.gold).toBe(444)
  })

  it('普通损坏仍可恢复并继续保存有效备份', async () => {
    await writeRawAuto('{broken')
    const store = new GameStore(); await store.initialize()
    expect(store.getSnapshot().state.gold).toBe(222)
    expect(store.getSnapshot().notice).toContain('已恢复上一份')
    store.introSeen(); expect(await store.waitForAutosave()).toBe(true)
    expect((await loadSlot(0))?.progress[1].intro).toBe(true)
    expect((await loadSlot(-1))?.gold).toBe(222)
  })

  it('较新手动档拒绝载入不会把兼容自动档锁住或误称自动档被保护', async () => {
    await writeRawAuto(serializeSave({ ...initialState(), contentVersion: '999.0.0', gold: 999 }), 1)
    const session = new AutoSaveSession(), state = (await session.load(0))!
    await expect(session.load(1)).rejects.toThrow('原有存档没有被修改')
    await expect(session.load(1)).rejects.not.toThrow('自动档已保护')
    state.inventory.herb++; await session.write(state)
    expect((await loadSlot(0))?.inventory.herb).toBe(1)
    expect((await loadSlot(0))?.gold).toBe(333)
    expect((await listSlots()).find(record => record.slot === 1)?.text).toContain('999.0.0')
  })
})
