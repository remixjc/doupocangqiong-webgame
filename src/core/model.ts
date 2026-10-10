export type Theme = 'city' | 'forest' | 'desert' | 'temple' | 'void' | 'fire'
export type Pattern = 'slam' | 'dash' | 'volley' | 'storm'
export type FlameId = 'ember' | 'lotus' | 'fallen' | 'star' | 'pure'
export type ItemId = 'herb' | 'crystal' | 'heal' | 'mana' | 'elixir'
export type SkillId = 'strike' | 'wave' | 'lotus'
export type Difficulty = 'story' | 'normal' | 'hard'
export type Action = 'attack' | 'dodge' | 'strike' | 'wave' | 'lotus' | 'heal' | 'interact' | 'support'

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
}
export interface Settings {
  difficulty: Difficulty
  volume: number
  reducedMotion: boolean
  spoiler: 'novel' | 'anime'
  animeLimit: number
}
export interface GameState {
  schemaVersion: 1
  contentVersion: string
  chapter: number
  completed: number[]
  progress: Record<number, ChapterProgress>
  gold: number
  xp: number
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
  hp: number; maxHp: number; qi: number; maxQi: number; stamina: number
  cooldowns: Record<SkillId | 'dodge' | 'heal' | 'support', number>
  prompt: string
  near: 'camp' | 'herb' | 'gate' | ''
  bossHp: number; bossMaxHp: number; bossName: string
  dead: boolean
}
export interface Snapshot { state: GameState; runtime: Runtime; notice: string }
export const CONTENT_VERSION = '0.1.0'
export const blankProgress = (): ChapterProgress => ({ herbs: 0, kills: 0, brews: 0, boss: false, intro: false })
export function initialState(): GameState {
  return {
    schemaVersion: 1, contentVersion: CONTENT_VERSION, chapter: 1, completed: [], progress: { 1: blankProgress() },
    gold: 80, xp: 0, inventory: { herb: 0, crystal: 0, heal: 3, mana: 2, elixir: 0 },
    attackUpgrade: 0, armorUpgrade: 0, flame: 'ember',
    settings: { difficulty: 'normal', volume: 0.3, reducedMotion: false, spoiler: 'novel', animeLimit: 3 },
    totalKills: 0, totalBrews: 0, startedAt: Date.now(),
  }
}
