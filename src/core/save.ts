import { chapterById, chapters } from '../content/chapters'
import { CONTENT_VERSION, initialState, blankEvent, type ChapterEventProgress, type FlameId, type GameState, type ItemId } from './model'
import { unlockedFlames } from './rules'
import { eventForChapter, eventsForChapter, type ChapterEvent } from '../content/events'
import { eventDone, migrateLegacyEvent, migrateLegacyEvents } from './events'
import { EARLY_TRAINING_VERSION, EARLY_GROWTH_VERSION, EARLY_HALL_VERSION, EARLY_HALL_SCROLL_VERSION, EARLY_TEACHING_VERSION, EARLY_SUPERVISION_VERSION, EARLY_RECOVERY_VERSION, EARLY_CONSIGNMENT_VERSION, EARLY_APPRAISAL_VERSION, EARLY_AUCTION_VERSION, EARLY_SETTLEMENT_VERSION, EARLY_FATHER_GIFT_VERSION, EARLY_XUNER_VISIT_VERSION, EARLY_LONG_SUPPLIES_VERSION, EARLY_FOREST_STRIKE_VERSION, EARLY_SEVENTH_ROOM_VERSION, parseEarlyTraining } from './early-training-state'
import { EARLY_PALM_PAIR_VERSION } from './early-training-state'
import { EARLY_PRELIMINARY_VERSION } from './early-training-state'
import { EARLY_KE_CHALLENGE_VERSION } from './early-training-state'
import { EARLY_EIGHTH_TRAINING_VERSION, EARLY_CEREMONY_GUESTS_VERSION, EARLY_CEREMONIAL_TEST_VERSION, EARLY_NING_FIRST_VERSION, EARLY_NING_SECOND_VERSION, EARLY_CEREMONY_VERDICT_VERSION } from './early-training-state'
import { EARLY_QI_PAVILION_ENTRY_VERSION } from './early-training-state'
import { EARLY_QI_AID_VERSION, EARLY_QI_BARRIER_VERSION, EARLY_QI_SCROLL_VERSION } from './early-training-state'

export interface SaveRecord { slot: number; savedAt: number; text: string }
export class NewerSaveVersionError extends Error {
  constructor(protectedAutomatic = false) {
    super(protectedAutomatic
      ? '这是较新版本的存档，请先更新游戏。原有自动档已保护，本版本不会覆盖它；当前旅途可导出JSON备份。'
      : '这是较新版本的存档，请先更新游戏。原有存档没有被修改。')
    this.name = 'NewerSaveVersionError'
  }
}
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
export function versionBefore(a: string, b: string): boolean {
  const x = a.split('.').map(Number), y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] < y[i] }
  return false
}
function checkVersion(value: unknown) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) throw new Error('内容版本无效。')
  const imported = value.split('.').map(Number), current = CONTENT_VERSION.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (imported[i] > current[i]) throw new NewerSaveVersionError()
    if (imported[i] < current[i]) break
  }
}
function parseEvent(value: unknown, definition?: ChapterEvent, legacy = false): ChapterEventProgress {
  const e = record(value), p: ChapterEventProgress = { ...blankEvent(), started: bool(e.started),
    stage: number(e.stage, definition ? definition.stages.length - 1 : 0), quote: number(e.quote, 90) }
  if (!legacy) {
    p.score = number(e.score, 300); p.attempts = number(e.attempts)
    if (!['none', 'steady', 'premium'].includes(String(e.choice))) throw new Error('事件路线无效。')
    p.choice = e.choice as ChapterEventProgress['choice']
  }
  if ((!p.started && (p.stage || p.quote || p.score || p.attempts || p.choice !== 'none')) ||
    (!definition && p.started) || (!['trade', 'auction'].includes(definition?.kind ?? '') && p.quote !== 0) ||
    (definition?.kind === 'trade' && (p.stage === 0 ? p.quote !== 0 : ![42, 60].includes(p.quote))) ||
    (!['stone', 'cave', 'certification', 'tournament', 'auction', 'hunt', 'lineage', 'expedition', 'danfinal', 'inheritance', 'tomb', 'illusion', 'vault', 'preparation'].includes(definition?.kind ?? '') && (p.score !== 0 || p.attempts !== 0)) ||
    (!['competition', 'alliance', 'bond', 'preparation'].includes(definition?.kind ?? '') && p.choice !== 'none')) throw new Error('剧情事件进度无效。')
  if (definition?.kind === 'preparation' && (
    p.stage === 0 ? p.score !== 0 || p.attempts !== 0 || p.choice !== 'none'
      : p.stage === 1 ? p.score > 6 || p.attempts !== 0 || p.choice !== 'none'
        : p.score !== 7 || (p.stage === 2 ? p.choice !== 'none' || p.attempts % 3 !== 0 : p.choice === 'none')
  )) throw new Error('风险准备演练记录无效。')
  if (definition?.kind === 'bond' && (p.stage <= 1 ? p.choice !== 'none' : !definition.bond?.options.some(option => option.choice === p.choice)))
    throw new Error('伙伴书简选择记录无效。')
  if (definition?.kind === 'alliance' && (p.stage <= 1 ? p.choice !== 'none' : p.choice === 'none'))
    throw new Error('炎盟筹备方案记录无效。')
  if (definition?.kind === 'lineage' && (p.stage === 0 ? p.score !== 0 || p.attempts !== 0
    : p.stage === 1 ? p.score > 2 || p.attempts !== 0 : p.score !== 3 || (p.stage >= 3 && p.attempts < 1)))
    throw new Error('师门线索记录无效。')
  if (definition?.kind === 'expedition' && (p.stage === 0 ? p.score !== 0 || p.attempts !== 0
    : p.attempts < 1 || (p.stage === 1 ? p.score > 6 : p.score !== 7)))
    throw new Error('丹界指定药材记录无效。')
  if (['danfinal', 'inheritance'].includes(definition?.kind ?? '') && (p.stage <= 1 ? p.score !== 0 : p.stage === 2 ? p.score > 100
    : p.stage === 3 ? p.score > 200 : p.score < 210 || p.attempts < 1))
    throw new Error(definition?.kind === 'inheritance' ? '传承心念成绩无效。' : '丹会成丹成绩无效。')
  if (definition?.kind === 'tomb' && (p.score !== 0 || (p.stage === 0 ? p.attempts !== 0 : p.attempts < Math.min(p.stage, 3))))
    throw new Error('天墓探索记录无效。')
  if (definition?.kind === 'illusion' && (p.score !== Math.min(3, Math.max(0, p.stage - 1)) ||
    (p.stage === 0 ? p.attempts !== 0 : p.attempts < p.score)))
    throw new Error(definition.id === 'bodhi-three-reflections' ? '菩提观心记录无效。' : '妖火幻镜记录无效。')
  if (definition?.kind === 'vault' && (p.stage === 4 ? p.score > 2 : p.score !== 0) ||
    definition?.kind === 'vault' && (p.stage < 4 ? p.attempts !== 0 : p.stage >= 5 && p.attempts < 1))
    throw new Error('洞府封门记录无效。')
  if (definition?.kind === 'stone' && (p.stage <= 1 ? p.score !== 0 : p.stage === 2 ? p.score > 100 : p.stage === 3 ? p.score > 200 : p.score < 180 || p.attempts < 1))
    throw new Error('控气测试记录无效。')
  if (definition?.kind === 'competition' && (p.stage === 0 ? p.choice !== 'none' : p.choice === 'none' || (p.choice === 'steady' && p.stage < 4)))
    throw new Error('竞争路线进度无效。')
  if (definition?.kind === 'cave' && (p.score > 2 || (p.stage !== 1 && p.score !== 0) || (p.stage === 0 && p.attempts !== 0)))
    throw new Error('洞穴机关记录无效。')
  if (definition?.kind === 'certification' && (p.stage <= 2 ? p.score !== 0 : p.stage === 3 ? p.score > 100 : p.stage === 4 ? p.score > 200 : p.score < 210 || p.attempts < 1))
    throw new Error('认证控火记录无效。')
  if (definition?.kind === 'certification' && p.stage === 0 && p.attempts !== 0) throw new Error('认证尝试记录无效。')
  if (definition?.kind === 'tournament') {
    if (p.started || e.roundScores !== undefined) {
      if (!Array.isArray(e.roundScores)) throw new Error('大会分轮成绩缺失。')
      p.roundScores = e.roundScores.map(value => number(value, 300))
      const passed = Math.min(3, Math.max(0, Math.floor((p.stage - 1) / 4)))
      if (p.roundScores.length !== passed || p.roundScores.some(score => score < 210) || p.attempts < passed ||
        (!p.started && p.roundScores.length > 0)) throw new Error('大会分轮成绩无效。')
    }
    const step = p.stage >= 2 && p.stage <= 12 ? (p.stage - 2) % 4 : -1
    if (p.score > (step === 1 ? 100 : step === 2 ? 200 : 0) || (p.stage === 0 && p.attempts !== 0))
      throw new Error('大会当前轮记录无效。')
  } else if (e.roundScores !== undefined) throw new Error('此事件不包含大会成绩。')
  if (definition?.kind === 'auction') {
    if (![0, 60].includes(p.score) || (p.stage <= 1 && (p.quote !== 0 || p.score !== 0 || p.attempts !== 0)) ||
      (p.stage === 2 && (![40, 60, 80].includes(p.quote) || p.attempts < 1 || (p.score === 60 && (p.quote !== 80 || p.attempts < 2)))) ||
      (p.stage === 3 && (p.quote !== 0 || p.score !== 60 || p.attempts < 1))) throw new Error('拍卖托管记录无效。')
    if (p.stage < 4) {
      if (e.auctionOutcome !== undefined) throw new Error('拍卖结果尚未产生。')
    } else {
      if (!['won', 'observed'].includes(String(e.auctionOutcome))) throw new Error('拍卖结果缺失。')
      p.auctionOutcome = e.auctionOutcome as ChapterEventProgress['auctionOutcome']
      if (p.auctionOutcome === 'won' ? p.quote !== 80 || p.attempts < (p.score === 60 ? 2 : 1)
        : p.quote !== 0 || (p.score === 0 ? p.attempts !== 0 : p.attempts < 1)) throw new Error('拍卖结果与资金记录不一致。')
    }
  } else if (e.auctionOutcome !== undefined) throw new Error('此事件不包含拍卖结果。')
  if (definition?.kind === 'hunt') {
    if (p.attempts !== 0 || (p.stage < 4 && p.score !== (p.stage < 2 ? 0 : p.stage === 2 ? 2 : 4)))
      throw new Error('猎捕火能记录无效。')
    if (p.stage < 4) {
      if (e.huntOutcome !== undefined) throw new Error('猎捕资格尚未登记。')
    } else {
      if (!['completed', 'legacy'].includes(String(e.huntOutcome))) throw new Error('猎捕登记结果缺失。')
      p.huntOutcome = e.huntOutcome as ChapterEventProgress['huntOutcome']
      if (p.score !== (p.huntOutcome === 'completed' ? 4 : 0)) throw new Error('猎捕收益与登记结果不一致。')
    }
  } else if (e.huntOutcome !== undefined) throw new Error('此事件不包含猎捕登记。')
  return p
}
export function validateState(value: unknown): GameState {
  const data = record(value)
  if (typeof data.schemaVersion === 'number' && Number.isSafeInteger(data.schemaVersion) && data.schemaVersion > 3)
    throw new NewerSaveVersionError()
  if (![1, 2, 3].includes(Number(data.schemaVersion)) || typeof data.schemaVersion !== 'number') throw new Error('不支持此存档版本，现有存档没有被修改。')
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
    const boss = bool(p.boss), definitions = eventsForChapter(n)
    const events = migrateLegacyEvents(n, data.schemaVersion < 3 && boss)
    if (data.schemaVersion === 2) {
      const definition = eventForChapter(n)
      const existed = definition && (!definition.introducedVersion || !versionBefore(data.contentVersion as string, definition.introducedVersion))
      const primary = parseEvent(p.event, existed ? definition : undefined, true)
      if (definition && existed) events[definition.id] = primary
    } else if (data.schemaVersion === 3) {
      const entries = record(p.events)
      if (Object.keys(entries).some(id => !definitions.some(e => e.id === id))) throw new Error('未知剧情事件。')
      for (const definition of definitions) {
        const addedLater = definition.introducedVersion && versionBefore(data.contentVersion as string, definition.introducedVersion)
        events[definition.id] = !Object.hasOwn(entries, definition.id) && addedLater
          ? migrateLegacyEvent(n, boss, definition.id) : parseEvent(entries[definition.id], definition)
      }
    }
    s.progress[n] = { herbs: number(p.herbs), kills: number(p.kills), brews: number(p.brews), boss, intro: bool(p.intro), events }
    for (const definition of definitions) if (events[definition.id].started && definition.requires?.some(id => !eventDone(s, n, id)))
      throw new Error('事件前置条件不完整。')
    const oldChecklist = (data.schemaVersion === 1 && [2, 3].includes(n)) || (n === 4 && versionBefore(data.contentVersion as string, '0.3.2')) || (n === 5 && versionBefore(data.contentVersion as string, '0.4.0')) || (n === 7 && versionBefore(data.contentVersion as string, '0.5.0')) || (n === 8 && versionBefore(data.contentVersion as string, '0.5.2')) || (n === 10 && versionBefore(data.contentVersion as string, '0.6.1')) || (n === 11 && versionBefore(data.contentVersion as string, '0.6.2'))
    const oldCertification = n === 6 && versionBefore(data.contentVersion as string, '0.4.1')
    const oldTournament = n === 9 && versionBefore(data.contentVersion as string, '0.6.0')
    const oldAuction = n === 12 && versionBefore(data.contentVersion as string, '0.7.0')
    const oldSquad = n === 13 && versionBefore(data.contentVersion as string, '0.7.1')
    const oldHunt = n === 14 && versionBefore(data.contentVersion as string, '0.7.2')
    const oldTower = n === 15 && versionBefore(data.contentVersion as string, '0.7.3')
    const oldSiege = n === 16 && versionBefore(data.contentVersion as string, '0.8.1')
    const oldAlliance = n === 17 && versionBefore(data.contentVersion as string, '0.8.2')
    const oldThunder = n === 18 && versionBefore(data.contentVersion as string, '0.8.3')
    const oldLineage = n === 19 && versionBefore(data.contentVersion as string, '0.8.4')
    const oldExpedition = n === 20 && versionBefore(data.contentVersion as string, '0.9.1')
    const oldDanFinal = n === 20 && versionBefore(data.contentVersion as string, '0.9.2')
    const oldStar = n === 21 && versionBefore(data.contentVersion as string, '0.9.3')
    const oldPrison = n === 22 && versionBefore(data.contentVersion as string, '0.9.4')
    const oldTomb = n === 23 && versionBefore(data.contentVersion as string, '0.10.1')
    const oldBodhi = n === 24 && versionBefore(data.contentVersion as string, '0.10.3')
    const oldMirrors = n === 25 && versionBefore(data.contentVersion as string, '0.10.4')
    const oldDefense = n === 26 && versionBefore(data.contentVersion as string, '0.11.1')
    const oldVault = n === 27 && versionBefore(data.contentVersion as string, '0.11.2')
    const oldFinal = n === 28 && versionBefore(data.contentVersion as string, '0.11.4')
    const o = oldChecklist ? { herbs: 3, kills: 3, brews: 0 } : oldExpedition ? { herbs: 4, kills: 4, brews: 2 } : oldDanFinal ? { herbs: 0, kills: 0, brews: 2 } : oldTomb || oldBodhi || oldMirrors || oldDefense || oldVault || oldFinal ? { herbs: 4, kills: 5, brews: 0 } : oldThunder || oldLineage || oldStar || oldPrison ? { herbs: 4, kills: 4, brews: 0 } : oldAuction || oldSquad || oldHunt || oldTower || oldSiege || oldAlliance ? { herbs: 3, kills: 4, brews: 0 } : oldCertification ? { herbs: 3, kills: 3, brews: 1 } : oldTournament ? { herbs: 3, kills: 3, brews: 2 } : chapterById(n).objectives
    if ((s.completed.includes(n) || p.boss) && (s.progress[n].herbs < o.herbs || s.progress[n].kills < o.kills || s.progress[n].brews < o.brews))
      throw new Error('已完成任务的条件不完整。')
    if ((s.completed.includes(n) || boss) && !eventDone(s, n)) throw new Error('已完成章节的剧情事件不完整。')
  }
  if (!s.progress[s.chapter] || s.completed.some(id => !s.progress[id]?.boss)) throw new Error('章节进度缺失。')
  // Validate cross-chapter dependencies after every entry has been read, regardless of JSON key order.
  for (const [chapter, progress] of Object.entries(s.progress)) for (const definition of eventsForChapter(Number(chapter))) {
    if (!progress.events[definition.id].started) continue
    if (definition.requiresHistory?.some(item => !eventDone(s, item.chapter, item.eventId)) ||
      definition.requiresCompleted?.some(id => !s.completed.includes(id))) throw new Error('伙伴记录的跨章前置条件不完整。')
  }
  s.gold = number(data.gold); s.xp = number(data.xp, 100_000_000)
  s.fireEnergy = data.fireEnergy === undefined && versionBefore(data.contentVersion as string, '0.7.2') ? 0 : number(data.fireEnergy, 1_000_000)
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
  if (data.earlyTraining === undefined && versionBefore(data.contentVersion as string, EARLY_TRAINING_VERSION)) {
    // Keep the initial empty task record; old main clears cannot grant supplies.
  } else s.earlyTraining = parseEarlyTraining(data.earlyTraining, s.completed,
    versionBefore(data.contentVersion as string, '0.15.1'), versionBefore(data.contentVersion as string, '0.15.3'),
    versionBefore(data.contentVersion as string, '0.15.4'), versionBefore(data.contentVersion as string, '0.15.5'),
    versionBefore(data.contentVersion as string, '0.16.3'), versionBefore(data.contentVersion as string, EARLY_GROWTH_VERSION),
    versionBefore(data.contentVersion as string, EARLY_HALL_VERSION),
    versionBefore(data.contentVersion as string, EARLY_HALL_SCROLL_VERSION),
    versionBefore(data.contentVersion as string, EARLY_TEACHING_VERSION),
    versionBefore(data.contentVersion as string, EARLY_SUPERVISION_VERSION),
    versionBefore(data.contentVersion as string, EARLY_RECOVERY_VERSION),
    versionBefore(data.contentVersion as string, EARLY_CONSIGNMENT_VERSION),
    versionBefore(data.contentVersion as string, EARLY_APPRAISAL_VERSION),
    versionBefore(data.contentVersion as string, EARLY_AUCTION_VERSION),
    versionBefore(data.contentVersion as string, EARLY_SETTLEMENT_VERSION),
    versionBefore(data.contentVersion as string, EARLY_FATHER_GIFT_VERSION),
    versionBefore(data.contentVersion as string, EARLY_XUNER_VISIT_VERSION),
    versionBefore(data.contentVersion as string, EARLY_LONG_SUPPLIES_VERSION),
    versionBefore(data.contentVersion as string, EARLY_FOREST_STRIKE_VERSION),
    versionBefore(data.contentVersion as string, EARLY_SEVENTH_ROOM_VERSION),
    versionBefore(data.contentVersion as string, EARLY_PALM_PAIR_VERSION),
    versionBefore(data.contentVersion as string, EARLY_PRELIMINARY_VERSION),
    versionBefore(data.contentVersion as string, EARLY_KE_CHALLENGE_VERSION),
    versionBefore(data.contentVersion as string, EARLY_EIGHTH_TRAINING_VERSION),
    versionBefore(data.contentVersion as string, EARLY_CEREMONY_GUESTS_VERSION),
    versionBefore(data.contentVersion as string, EARLY_CEREMONIAL_TEST_VERSION),
    versionBefore(data.contentVersion as string, EARLY_NING_FIRST_VERSION),
    versionBefore(data.contentVersion as string, EARLY_NING_SECOND_VERSION),
    versionBefore(data.contentVersion as string, EARLY_CEREMONY_VERDICT_VERSION),
    versionBefore(data.contentVersion as string, EARLY_QI_PAVILION_ENTRY_VERSION),
    versionBefore(data.contentVersion as string, EARLY_QI_BARRIER_VERSION),
    versionBefore(data.contentVersion as string, EARLY_QI_SCROLL_VERSION),
    versionBefore(data.contentVersion as string, EARLY_QI_AID_VERSION))
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
export class AutoSaveConflictError extends Error {
  constructor() {
    super('另一个游戏标签已更新自动存档。当前进度未覆盖它；可先保存到手动槽或导出备份，再载入最新自动存档。')
    this.name = 'AutoSaveConflictError'
  }
}
async function writeSlot(slot: number, state: GameState, expected?: { autoText: string | null }): Promise<string> {
  if (![0, 1, 2, 3].includes(slot)) throw new Error('存档槽无效。')
  const text = serializeSave(validateState(state))
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('slots', 'readwrite')
    let conflict: AutoSaveConflictError | undefined
    // Keep the previous valid auto-save as a recovery slot in the same transaction.
    if (slot === 0) {
      const previous = tx.objectStore('slots').get(0)
      previous.onsuccess = () => {
        if (expected && (previous.result?.text ?? null) !== expected.autoText) {
          conflict = new AutoSaveConflictError()
          tx.abort()
          return
        }
        if (previous.result) {
          try {
            parseSave(previous.result.text)
            tx.objectStore('slots').put({ ...previous.result, slot: -1 })
          } catch {
            // A damaged current slot must never replace a valid recovery copy.
          }
        }
        tx.objectStore('slots').put({ slot, savedAt: Date.now(), text } satisfies SaveRecord)
      }
    } else tx.objectStore('slots').put({ slot, savedAt: Date.now(), text } satisfies SaveRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('本地存档写入失败，请立即导出 JSON 备份。'))
    tx.onabort = () => reject(conflict ?? new Error('存档写入中断，原有存档保留。'))
  })
  return text
}
export async function saveSlot(slot: number, state: GameState): Promise<void> {
  await writeSlot(slot, state)
}
export function saveAutoSlot(state: GameState, expectedAutoText: string | null): Promise<string> {
  // Compare and commit within one IDB transaction; a preceding read alone is insufficient.
  return writeSlot(0, state, { autoText: expectedAutoText })
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
