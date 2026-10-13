import { successfulTransaction } from './early-result'
import { chapterById, chapters } from '../content/chapters'
import { blankProgress, type FlameId, type GameState, type SkillId } from './model'
import { recipes } from '../content/recipes'
import type { ItemId } from './model'
import { eventDone } from './events'

export const flames: { id: FlameId; name: string; color: string; description: string; chapter: number }[] = [
  { id: 'ember', name: '修炼之火', color: '#e5b97e', description: '基础斗气火焰，均衡、稳定。游戏原创训练效果。', chapter: 0 },
  { id: 'lotus', name: '青莲地心火', color: '#6de4bc', description: '攻击命中附加持续燃烧。', chapter: 8 },
  { id: 'fallen', name: '陨落心炎', color: '#eac788', description: '斗气恢复更快，支持连续释放。', chapter: 15 },
  { id: 'star', name: '三千焱炎火', color: '#b59af5', description: '非受击期间缓慢恢复生命。', chapter: 21 },
  { id: 'pure', name: '净莲妖火', color: '#f4c1d3', description: '扩大火莲范围并增强技能伤害。', chapter: 25 },
]
export const skillInfo: { id: SkillId; name: string; key: string; cost: number; cooldown: number; unlock: number; description: string }[] = [
  { id: 'strike', name: '八极崩', key: '1', cost: 18, cooldown: 3.2, unlock: 1, description: '近身爆发，打断普通敌人的蓄力。' },
  { id: 'wave', name: '焰分噬浪尺', key: '2', cost: 28, cooldown: 5, unlock: 5, description: '沿面向方向释放远距斩击。' },
  { id: 'lotus', name: '佛怒火莲', key: '3', cost: 48, cooldown: 10, unlock: 11, description: '在前方凝聚范围火莲，需要持有异火。' },
]
export function isVisible(s: GameState, id: number): boolean {
  return s.settings.spoiler === 'novel' || id <= s.settings.animeLimit
}
export function unlockedChapter(s: GameState): number {
  return Math.min(chapters.length, s.completed.length + 1)
}
export function canEnter(s: GameState, id: number): boolean {
  return chapters.some(c => c.id === id) && id <= unlockedChapter(s) && isVisible(s, id)
}
export function unlockedFlames(s: GameState) {
  return flames.filter(f => f.chapter === 0 || s.completed.includes(f.chapter))
}
export function skillUnlocked(s: GameState, id: SkillId): boolean {
  const info = skillInfo.find(k => k.id === id)!
  return isVisible(s, info.unlock) && unlockedChapter(s) >= info.unlock && (id !== 'lotus' || unlockedFlames(s).length > 1)
}
export function chapterReady(s: GameState): boolean {
  const p = s.progress[s.chapter] ?? blankProgress()
  const o = chapterById(s.chapter).objectives
  return p.herbs >= o.herbs && p.kills >= o.kills && p.brews >= o.brews && eventDone(s)
}
export function finishChapter(s: GameState): GameState {
  if (!chapterReady(s) || !s.progress[s.chapter]?.boss || s.completed.includes(s.chapter)) return s
  // A first-clear transaction: a second invocation cannot pay the reward again.
  if (s.chapter !== s.completed.length + 1) return s
  const next = structuredClone(s)
  const chapter = chapterById(s.chapter)
  next.completed.push(s.chapter)
  next.gold += chapter.reward
  next.xp += 100 + s.chapter * 25
  if (chapter.flame) next.flame = chapter.flame
  return next
}
export function playerStats(s: GameState) {
  const level = s.completed.length
  const practice = Math.min(10, Math.floor(s.xp / 300))
  return { maxHp: 180 + level * 18 + s.armorUpgrade * 22 + practice * 4, maxQi: 100 + level * 3,
    attack: 22 + level * 3.1 + s.attackUpgrade * 5 + practice, defense: 8 + level * 1.2 + s.armorUpgrade * 4 }
}
export function damage(attack: number, multiplier: number, defense: number): number {
  return Math.max(1, Math.round(attack * multiplier * 100 / (100 + Math.max(0, defense))))
}
export interface Transaction { state: GameState; ok: boolean; message: string }
export function registerBossVictory(s: GameState): GameState {
  if (!chapterReady(s) || s.progress[s.chapter].boss) return s
  const next = structuredClone(s)
  next.progress[s.chapter].boss = true
  if (s.chapter === 14 && !s.completed.includes(14)) next.fireEnergy += 3
  return next
}
export function rankPracticeReward(s: GameState): Transaction {
  if (s.chapter !== 14 || !s.completed.includes(14) || !chapterReady(s))
    return { state: s, ok: false, message: '完成内院首通后才开放强榜复练。' }
  const next = structuredClone(s); next.fireEnergy++
  return successfulTransaction(next, '强榜复练获胜 · 火能+1。休整后可再练，没有额外金币或首通奖励。')
}
export function trainFireEnergy(s: GameState): Transaction {
  if (!s.completed.includes(14) || !isVisible(s, 14))
    return { state: s, ok: false, message: '先完成内院首通，登记所需火能暂不用于普通修炼。' }
  if (s.fireEnergy < 2) return { state: s, ok: false, message: '修炼需2火能，可重返第十四章进行强榜复练。' }
  const next = structuredClone(s); next.fireEnergy -= 2; next.xp += 30
  return successfulTransaction(next, '火能修炼完成 · 火能−2、修炼积累+30。')
}
export function craft(s: GameState, recipeId: string, quality = .5): Transaction {
  const recipe = recipes.find(r => r.id === recipeId)
  if (!recipe || unlockedChapter(s) < recipe.unlock) return { state: s, ok: false, message: '丹方尚未解锁。' }
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) return { state: s, ok: false, message: '炼药结果无效。' }
  const cost = Object.entries(recipe.cost) as [ItemId, number][]
  if (cost.some(([item, n]) => s.inventory[item] < n)) return { state: s, ok: false, message: '材料不足，采集灵草、击败敌人可补充。' }
  const next = structuredClone(s)
  for (const [item, n] of cost) next.inventory[item] -= n
  const count = (recipe.id === 'great-heal' ? 3 : 1) + (quality >= .8 ? 1 : 0)
  next.inventory[recipe.result] += count
  next.progress[s.chapter].brews++
  next.totalBrews++
  next.xp += 12
  return successfulTransaction(next, `${recipe.name} ×${count} · ${quality >= .8 ? '上品' : quality >= .45 ? '良品' : '初成'}`)
}
export const prices: Record<ItemId, number> = { herb: 12, crystal: 20, heal: 45, mana: 35, elixir: 100 }
export function buy(s: GameState, item: ItemId, quantity: number): Transaction {
  if (!(item in prices) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99)
    return { state: s, ok: false, message: '购买数量无效。' }
  const price = prices[item] * quantity
  if (s.gold < price) return { state: s, ok: false, message: '金币不足。' }
  const next = structuredClone(s)
  next.gold -= price; next.inventory[item] += quantity
  return successfulTransaction(next, '购买完成。')
}
export function upgrade(s: GameState, kind: 'attack' | 'armor'): Transaction {
  const key = kind === 'attack' ? 'attackUpgrade' : 'armorUpgrade'
  const price = 60 + s[key] * 60
  if (s[key] >= 20) return { state: s, ok: false, message: '强化已达当前上限。' }
  if (s.gold < price) return { state: s, ok: false, message: '金币不足。' }
  const next = structuredClone(s)
  next.gold -= price; next[key]++
  return successfulTransaction(next, kind === 'attack' ? '兵器磨砺完成。' : '护具强化完成。')
}
