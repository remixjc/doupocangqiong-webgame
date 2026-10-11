import { eventsForChapter } from '../content/events'
import { version } from '../../package.json'
import type { AutoSaveStatus } from './autosave'
export type Theme = 'city' | 'forest' | 'desert' | 'temple' | 'void' | 'fire'
export type Pattern = 'slam' | 'dash' | 'volley' | 'storm'
export type FlameId = 'ember' | 'lotus' | 'fallen' | 'star' | 'pure'
export type ItemId = 'herb' | 'crystal' | 'heal' | 'mana' | 'elixir'
export type SkillId = 'strike' | 'wave' | 'lotus'
export type Difficulty = 'story' | 'normal' | 'hard'
export type Action = 'attack' | 'dodge' | 'strike' | 'wave' | 'lotus' | 'heal' | 'mana' | 'interact' | 'support'

export interface Dialogue { speaker: string; text: string }
export interface Chapter {
  id: number
  title: string
  location: string
  theme: Theme
  summary: string
  opening: Dialogue[]
  closing: Dialogue[]
  boss: string
  pattern: Pattern
  objectives: { herbs: number; kills: number; brews: number }
  realm: string
  reward: number
  flame?: FlameId
  trialNote?: string
}
export interface ChapterProgress {
  herbs: number
  kills: number
  brews: number
  boss: boolean
  intro: boolean
  events: Record<string, ChapterEventProgress>
}
export interface ChapterEventProgress { started: boolean; stage: number; quote: number; score: number; attempts: number; choice: 'none' | 'steady' | 'premium'; roundScores?: number[]; auctionOutcome?: 'won' | 'observed'; huntOutcome?: 'completed' | 'legacy' }
export interface Settings {
  difficulty: Difficulty
  volume: number
  reducedMotion: boolean
  spoiler: 'novel' | 'anime'
  animeLimit: number
}
export interface GameState {
  schemaVersion: 3
  contentVersion: string
  chapter: number
  completed: number[]
  progress: Record<number, ChapterProgress>
  gold: number
  xp: number
  fireEnergy: number
  inventory: Record<ItemId, number>
  attackUpgrade: number
  armorUpgrade: number
  flame: FlameId
  settings: Settings
  totalKills: number
  totalBrews: number
  startedAt: number
}
export interface Runtime {
  x: number; y: number
  hp: number; maxHp: number; qi: number; maxQi: number; stamina: number
  cooldowns: Record<SkillId | 'dodge' | 'heal' | 'support', number>
  prompt: string
  near: 'camp' | 'herb' | 'gate' | 'event' | 'checkpoint' | ''
  bossHp: number; bossMaxHp: number; bossName: string
  escort?: { hp: number; maxHp: number; failed: boolean; waiting: boolean }
  survival?: { remaining: number; inZone: boolean }
  patrol?: { alert: number; alerted: boolean; remaining: number }
  heatChallenge?: { phase: number; remaining: number; heat: number; cooling: boolean; inZone: boolean; failed: boolean }
  duel?: { phase: number; move: string; warning: boolean; recovery: boolean }
  escape?: { stage: number; remaining: number; sheltered: boolean }
  squad?: { hp: number; maxHp: number; holding: boolean; failed: boolean; waiting: boolean; remaining: number; channeling: boolean }
  huntTeam?: { hp: number; maxHp: number; failed: boolean; waiting: boolean; arrived: boolean }
  ranking?: { phase: number; shield: boolean; recovery: boolean; practice: boolean }
  tower?: { floor: number; remaining: number; heat: number; failed: boolean; inZone: boolean; cooling: boolean }
  siege?: { stage: number; remaining: number; guards: number; channeling: boolean }
  sect?: { phase: number; shield: boolean; recovery: boolean }
  expedition?: { remaining: number; failed: boolean; collected: number }
  danLightning?: { remaining: number; inZone: boolean; phase: number }
  starChallenge?: { phase: number; remaining: number; heat: number; inZone: boolean; cooling: boolean; stable: boolean; failed: boolean }
  prisonEscort?: { hp: number; maxHp: number; waiting: boolean; failed: boolean; arrived: boolean }
  tomb?: { stage: number; remaining: number; failed: boolean }
  purification?: { stage: number; remaining: number; corruption: number; inZone: boolean; blocked: boolean; failed: boolean }
  defense?: { stage: number; hp: number; maxHp: number; wave: number; remaining: number; engaged: boolean; failed: boolean }
  finale?: { phase: number; arena: string; move: string; shield: boolean; recovery: boolean }
  dead: boolean
}
export interface Snapshot { state: GameState; runtime: Runtime; notice: string; autosave: AutoSaveStatus }
export const CONTENT_VERSION = version
export const blankEvent = (): ChapterEventProgress => ({ started: false, stage: 0, quote: 0, score: 0, attempts: 0, choice: 'none' })
export const blankProgress = (chapter = 1): ChapterProgress => ({ herbs: 0, kills: 0, brews: 0, boss: false, intro: false,
  events: Object.fromEntries(eventsForChapter(chapter).map(event => [event.id, blankEvent()])) })
export function initialState(): GameState {
  return {
    schemaVersion: 3, contentVersion: CONTENT_VERSION, chapter: 1, completed: [], progress: { 1: blankProgress() },
    gold: 80, xp: 0, fireEnergy: 0, inventory: { herb: 0, crystal: 0, heal: 3, mana: 2, elixir: 0 },
    attackUpgrade: 0, armorUpgrade: 0, flame: 'ember',
    settings: { difficulty: 'normal', volume: 0.3, reducedMotion: false, spoiler: 'novel', animeLimit: 3 },
    totalKills: 0, totalBrews: 0, startedAt: Date.now(),
  }
}
