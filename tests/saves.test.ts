import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialState } from '../src/core/model'
import { listSlots, loadSlot, saveSlot, type SaveRecord } from '../src/core/save'

async function mutateDatabase(change: (store: IDBObjectStore) => void): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('doupocangqiong-saves', 1)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('slots', 'readwrite')
      change(tx.objectStore('slots'))
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

beforeEach(async () => {
  await listSlots()
  await mutateDatabase(store => { store.clear() })
})

describe('IndexedDB persistence and recovery', () => {
  it('round-trips the auto save and all manual slots', async () => {
    const state = initialState()
    for (const slot of [0, 1, 2, 3]) {
      await saveSlot(slot, { ...state, gold: 80 + slot })
      expect((await loadSlot(slot))?.gold).toBe(80 + slot)
    }
    expect(await loadSlot(-1)).toBeNull()
    expect((await listSlots()).length).toBe(4)
  })

  it('keeps previous auto state independently of manual slots', async () => {
    const state = initialState()
    await saveSlot(0, state)
    await saveSlot(1, { ...state, gold: 42 })
    await saveSlot(0, { ...state, gold: 300 })
    expect((await loadSlot(0))?.gold).toBe(300)
    expect((await loadSlot(-1))?.gold).toBe(state.gold)
    expect((await loadSlot(1))?.gold).toBe(42)
  })

  it('rejects illegal state before modifying any existing record', async () => {
    const state = initialState()
    await saveSlot(0, state)
    const before = await listSlots()
    await expect(saveSlot(0, { ...state, gold: -1 })).rejects.toThrow('非法数值')
    expect(await listSlots()).toEqual(before)
  })

  it('preserves recovery when the current auto record is corrupt', async () => {
    const state = initialState()
    await saveSlot(0, state)
    await saveSlot(0, { ...state, gold: 300 })
    await mutateDatabase(store => {
      store.put({ slot: 0, savedAt: Date.now(), text: '{broken' } satisfies SaveRecord)
    })
    await expect(loadSlot(0)).rejects.toThrow()
    expect((await loadSlot(-1))?.gold).toBe(state.gold)
    await saveSlot(0, { ...state, gold: 400 })
    expect((await loadSlot(0))?.gold).toBe(400)
    expect((await loadSlot(-1))?.gold).toBe(state.gold)
  })

  it('serializes overlapping event saves in order', async () => {
    const state = initialState()
    await Promise.all([
      saveSlot(0, { ...state, gold: 100 }),
      saveSlot(0, { ...state, gold: 200 }),
      saveSlot(0, { ...state, gold: 300 }),
    ])
    expect((await loadSlot(0))?.gold).toBe(300)
    expect((await loadSlot(-1))?.gold).toBe(200)
  })

  it('rejects unsupported write slots', async () => {
    for (const slot of [-1, 4, 0.5, NaN])
      await expect(saveSlot(slot, initialState())).rejects.toThrow('存档槽')
    expect(await listSlots()).toEqual([])
  })

  it('loads schema 1 auto and manual records, then writes schema 3 without losing recovery', async () => {
    const old = JSON.parse(JSON.stringify(initialState()))
    old.schemaVersion = 1; old.contentVersion = '0.1.0'
    delete old.progress[1].events["yao-training"]
    old.gold = 345; old.progress[1].herbs = 2
    const text = JSON.stringify({ game: 'doupocangqiong-webgame', state: old })
    await mutateDatabase(store => {
      for (const slot of [0, 1]) store.put({ slot, savedAt: Date.now(), text } satisfies SaveRecord)
    })
    const migrated = (await loadSlot(0))!
    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.progress[1].herbs).toBe(2)
    expect(await loadSlot(1)).toEqual(migrated)
    await saveSlot(0, migrated)
    expect((await loadSlot(-1))?.gold).toBe(345)
    expect(JSON.parse((await listSlots()).find(s => s.slot === 0)!.text).state.schemaVersion).toBe(3)
  })
})
