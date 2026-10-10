import { chapterById, chapters } from '../content/chapters'
import { CONTENT_VERSION, initialState, type FlameId, type GameState, type ItemId } from './model'
import { unlockedFlames } from './rules'

export interface SaveRecord { slot: number; savedAt: number; text: string }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('存档结构无效。')
  return value as Record<string, unknown>
}
function number(value: unknown, max = 10_000_000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) throw new Error('存档包含非法数值。')
  return value
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('存档包含非法状态。')
  return value
}
function checkVersion(value: unknown) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) throw new Error('内容版本无效。')
  const imported = value.split('.').map(Number), current = CONTENT_VERSION.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (imported[i] > current[i]) throw new Error('这是较新版本的存档，请先更新游戏。')
    if (imported[i] < current[i]) break
  }
}
export function validateState(value: unknown): GameState {
  const data = record(value)
  if (data.schemaVersion !== 1) throw new Error('不支持此存档版本，现有存档没有被修改。')
  checkVersion(data.contentVersion)
  const s = initialState()
  s.contentVersion = CONTENT_VERSION
  s.chapter = number(data.chapter, chapters.length)
  if (s.chapter < 1) throw new Error('章节无效。')
  if (!Array.isArray(data.completed) || data.completed.length > chapters.length) throw new Error('章节列表无效。')
  s.completed = data.completed.map((id, i) => {
    if (id !== i + 1) throw new Error('章节顺序无效，不能跳过前置主线。')
    return id as number
  })
  if (s.chapter > Math.min(chapters.length, s.completed.length + 1)) throw new Error('当前章节尚未解锁。')
  const progress = record(data.progress)
  s.progress = {}
  for (const [id, value] of Object.entries(progress)) {
    const n = Number(id)
    if (!Number.isInteger(n) || n < 1 || n > Math.min(chapters.length, s.completed.length + 1)) throw new Error('任务章节无效。')
    const p = record(value)
    s.progress[n] = { herbs: number(p.herbs), kills: number(p.kills), brews: number(p.brews), boss: bool(p.boss), intro: bool(p.intro) }
    const o = chapterById(n).objectives
    if ((s.completed.includes(n) || p.boss) && (s.progress[n].herbs < o.herbs || s.progress[n].kills < o.kills || s.progress[n].brews < o.brews))
      throw new Error('已完成任务的条件不完整。')
  }
  if (!s.progress[s.chapter] || s.completed.some(id => !s.progress[id]?.boss)) throw new Error('章节进度缺失。')
  s.gold = number(data.gold); s.xp = number(data.xp, 100_000_000)
  s.totalKills = number(data.totalKills); s.totalBrews = number(data.totalBrews)
  s.attackUpgrade = number(data.attackUpgrade, 20); s.armorUpgrade = number(data.armorUpgrade, 20)
  const inventory = record(data.inventory)
  for (const id of Object.keys(s.inventory) as ItemId[]) s.inventory[id] = number(inventory[id], 1_000_000)
  s.flame = data.flame as FlameId
  if (!unlockedFlames(s).some(f => f.id === s.flame)) throw new Error('存档包含尚未取得的异火。')
  const settings = record(data.settings)
  if (!['story', 'normal', 'hard'].includes(String(settings.difficulty))) throw new Error('难度无效。')
  if (!['novel', 'anime'].includes(String(settings.spoiler))) throw new Error('剧情模式无效。')
  if (typeof settings.volume !== 'number' || !Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1) throw new Error('音量无效。')
  const animeLimit = number(settings.animeLimit, 28)
  if (animeLimit < 1) throw new Error('剧透范围无效。')
  s.settings = { difficulty: settings.difficulty as GameState['settings']['difficulty'], volume: settings.volume,
    reducedMotion: bool(settings.reducedMotion), spoiler: settings.spoiler as GameState['settings']['spoiler'], animeLimit }
  s.startedAt = number(data.startedAt, 9_000_000_000_000_000)
  // Construct only known fields. Imported HTML and __proto__ never enter the application.
  return s
}
export function serializeSave(state: GameState): string {
  return JSON.stringify({ game: 'doupocangqiong-webgame', savedAt: Date.now(), state }, null, 2)
}
export function parseSave(text: string): GameState {
  if (text.length > 1_000_000) throw new Error('存档超过 1 MB 限制。')
  const envelope = record(JSON.parse(text))
  if (envelope.game !== 'doupocangqiong-webgame') throw new Error('这不是异火之路的存档。')
  return validateState(envelope.state)
}
let database: Promise<IDBDatabase> | undefined
function openDatabase(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('此浏览器无法使用本地存档，请使用 JSON 备份。')); return }
    const req = indexedDB.open('doupocangqiong-saves', 1)
    req.onupgradeneeded = () => { req.result.createObjectStore('slots', { keyPath: 'slot' }) }
    req.onsuccess = () => {
      req.result.onversionchange = () => { req.result.close(); database = undefined }
      resolve(req.result)
    }
    req.onerror = () => { database = undefined; reject(new Error('无法打开浏览器存档，请导出备份。')) }
    req.onblocked = () => reject(new Error('存档数据库被其他标签页占用，请关闭其他游戏标签。'))
  })
  database.catch(() => { database = undefined })
  return database
}
export async function saveSlot(slot: number, state: GameState): Promise<void> {
  if (![0, 1, 2, 3].includes(slot)) throw new Error('存档槽无效。')
  const text = serializeSave(validateState(state))
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('slots', 'readwrite')
    // Keep the previous valid auto-save as a recovery slot in the same transaction.
    if (slot === 0) {
      const previous = tx.objectStore('slots').get(0)
      previous.onsuccess = () => {
        if (previous.result) {
          try {
            parseSave(previous.result.text)
            tx.objectStore('slots').put({ ...previous.result, slot: -1 })
          } catch {
            // A damaged current slot must never replace a valid recovery copy.
          }
        }
      }
    }
    tx.objectStore('slots').put({ slot, savedAt: Date.now(), text } satisfies SaveRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('本地存档写入失败，请立即导出 JSON 备份。'))
    tx.onabort = () => reject(new Error('存档写入中断，原有存档保留。'))
  })
}
export async function listSlots(): Promise<SaveRecord[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const req = db.transaction('slots', 'readonly').objectStore('slots').getAll()
    req.onsuccess = () => resolve(req.result as SaveRecord[])
    req.onerror = () => reject(new Error('存档读取失败。'))
  })
}
export async function loadSlot(slot: number): Promise<GameState | null> {
  const saves = await listSlots(), save = saves.find(s => s.slot === slot)
  return save ? parseSave(save.text) : null
}
