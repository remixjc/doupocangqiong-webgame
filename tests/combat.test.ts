import { describe, expect, it } from 'vitest'
import { initialState } from '../src/core/model'
import { chapterById } from '../src/content/chapters'
import { CombatWorld, collides } from '../src/game/combat'
import { chapterReady, finishChapter } from '../src/core/rules'

function setup() {
  const state = initialState()
  let kills = 0, herbs = 0
  const world = new CombatWorld(chapterById(1), {
    state: () => state, collect: () => herbs++, kill: () => kills++, heal: () => true,
    camp: () => undefined, notify: () => undefined,
  })
  return { world, state, kills: () => kills, herbs: () => herbs }
}
describe('战斗和章节规则', () => {
  it('按固定步长推进移动，且不穿过障碍', () => {
    const { world } = setup()
    const before = world.player.x
    for (let i = 0; i < 60; i++) world.step({ x: 1, y: 0 })
    expect(world.player.x - before).toBeCloseTo(235)
    expect(collides(world.player)).toBe(false)
  })
  it('同一个敌人的死亡只结算一次', () => {
    const { world, kills } = setup()
    world.enemies.splice(1)
    const e = world.enemies[0]
    e.x = world.player.x + 35; e.y = world.player.y; e.hp = 1
    world.action('attack', { x: 0, y: 0 })
    for (let i = 0; i < 30; i++) world.step({ x: 0, y: 0 })
    world.action('attack', { x: 0, y: 0 })
    expect(kills()).toBe(1)
  })
  it('冷却与斗气约束限制技能连发', () => {
    const { world } = setup()
    world.action('strike', { x: 0, y: 0 })
    const qi = world.player.qi
    world.action('strike', { x: 0, y: 0 })
    expect(world.player.qi).toBe(qi)
    expect(world.cooldowns.strike).toBeGreaterThan(0)
  })
  it('未完成探索不能结算，首通奖励不能重复领取', () => {
    const { state } = setup()
    state.progress[1].boss = true
    expect(chapterReady(state)).toBe(false)
    expect(finishChapter(state)).toBe(state)
    state.progress[1].herbs = 3; state.progress[1].kills = 3
    const result = finishChapter(state)
    expect(result.gold).toBe(state.gold + chapterById(1).reward)
    expect(finishChapter(result)).toBe(result)
  })
})
