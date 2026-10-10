import { chapterById, chapters } from '../content/chapters'
import { blankProgress, type FlameId, type GameState, type SkillId } from './model'

export const flames: { id: FlameId; name: string; color: string; description: string; chapter: number }[] = [
  { id: 'ember', name: '修炼之火', color: '#e5b97e', description: '基础斗气火焰，均衡、稳定。游戏原创训练效果。', chapter: 0 },
  { id: 'lotus', name: '青莲地心火', color: '#6de4bc', description: '技能命中附加持续燃烧。', chapter: 8 },
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
  return unlockedChapter(s) >= info.unlock && (id !== 'lotus' || unlockedFlames(s).length > 1)
}
export function chapterReady(s: GameState): boolean {
  const p = s.progress[s.chapter] ?? blankProgress()
  const o = chapterById(s.chapter).objectives
  return p.herbs >= o.herbs && p.kills >= o.kills && p.brews >= o.brews
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
  return next
}
export function playerStats(s: GameState) {
  const level = s.completed.length
  return { maxHp: 180 + level * 18 + s.armorUpgrade * 22, maxQi: 100 + level * 3,
    attack: 22 + level * 3.1 + s.attackUpgrade * 5, defense: 8 + level * 1.2 + s.armorUpgrade * 4 }
}
export function damage(attack: number, multiplier: number, defense: number): number {
  return Math.max(1, Math.round(attack * multiplier * 100 / (100 + Math.max(0, defense))))
}
