import { describe, expect, it } from 'vitest'
import { chapters } from '../src/content/chapters'
import { blankProgress, initialState } from '../src/core/model'
import { canEnter, craft, finishChapter, isVisible, unlockedFlames } from '../src/core/rules'
import { parseSave, serializeSave } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'
import { migrateLegacyEvents } from '../src/core/events'

describe('全主线配置与任务可达性', () => {
  it('28 章连续且每章都有目标、开场、结局与足够敌人', () => {
    expect(chapters.length).toBe(28)
    expect(chapters.map(c => c.id)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1))
    for (const chapter of chapters) {
      expect(chapter.opening.length).toBeGreaterThanOrEqual(2)
      expect(chapter.closing.length).toBeGreaterThanOrEqual(2)
      const s = initialState(); s.chapter = chapter.id; s.progress[chapter.id] = blankProgress(chapter.id)
      const world = new CombatWorld(chapter, { state: () => s, collect: () => {}, kill: () => {}, heal: () => true, camp: () => {}, notify: () => {} })
      expect(world.enemies.length).toBeGreaterThanOrEqual(chapter.objectives.kills)
      expect(world.herbs.length).toBeGreaterThanOrEqual(chapter.objectives.herbs)
    }
  })
  it('合法任务状态可以从第一章依序推进至尾声，不能越章且可恢复存档', () => {
    let s = initialState()
    for (const c of chapters) {
      expect(canEnter(s, c.id)).toBe(true)
      if (c.id < 28) expect(canEnter(s, c.id + 1)).toBe(false)
      s.chapter = c.id; s.progress[c.id] = blankProgress(c.id)
      s.progress[c.id].intro = true
      for (let i = 0; i < c.objectives.herbs; i++) { s.progress[c.id].herbs++; s.inventory.herb++ }
      for (let i = 0; i < c.objectives.kills; i++) { s.progress[c.id].kills++; s.inventory.crystal++ }
      for (let i = 0; i < c.objectives.brews; i++) {
        const result = craft(s, 'heal')
        expect(result.ok).toBe(true)
        s = result.state
      }
      s.progress[c.id].boss = true
      s.progress[c.id].events = migrateLegacyEvents(c.id, true)
      const oldGold = s.gold
      s = finishChapter(s)
      expect(s.completed.length).toBe(c.id)
      expect(s.gold).toBe(oldGold + c.reward)
      expect(finishChapter(s)).toBe(s)
      expect(parseSave(serializeSave(s))).toEqual(s)
    }
    expect(s.completed.length).toBe(28)
    expect(unlockedFlames(s).map(f => f.id)).toEqual(['ember', 'lotus', 'fallen', 'star', 'pure'])
    expect(s.flame).toBe('pure')
  })
  it('异火依章节首通解锁，提前进入不授予异火', () => {
    const s = initialState()
    expect(unlockedFlames(s).length).toBe(1)
    s.chapter = 8
    expect(unlockedFlames(s).length).toBe(1)
    s.completed = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(unlockedFlames(s).map(f => f.id)).toEqual(['ember', 'lotus'])
  })
  it('动画模式阻止超出上限的章节进入', () => {
    const s = initialState(); s.settings.spoiler = 'anime'; s.settings.animeLimit = 3
    s.completed = [1, 2, 3]
    expect(isVisible(s, 3)).toBe(true)
    expect(isVisible(s, 4)).toBe(false)
    expect(canEnter(s, 4)).toBe(false)
  })
})
