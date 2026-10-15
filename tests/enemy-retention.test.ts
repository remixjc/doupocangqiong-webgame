import { describe, expect, it } from 'vitest'
import { chapters, chapterById } from '../src/content/chapters'
import { migrateLegacyEvents } from '../src/core/events'
import { blankProgress, initialState, type Difficulty } from '../src/core/model'
import { parseSave, serializeSave, validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

// Controlled rule stress, not browser performance: tower descent completed,
// chapter 15's ordinary storm trial entered through the normal gate action.
// Timing/positions/one-hit HP isolate repeated storm reinforcement settlement.
function setup(difficulty: Difficulty) {
  const raw = initialState()
  raw.chapter = 15
  raw.completed = chapters.slice(0, 14).map(c => c.id)
  raw.flame = 'lotus'
  raw.settings.difficulty = difficulty
  for (const c of chapters.slice(0, 15)) raw.progress[c.id] = {
    ...blankProgress(c.id), ...c.objectives, boss: true, intro: true,
    events: migrateLegacyEvents(c.id, true),
  }
  raw.progress[15].boss = false
  const state = validateState(raw), kills: boolean[] = []
  const world = new CombatWorld(chapterById(15), {
    state: () => state, kill: boss => kills.push(boss), collect: () => {},
    heal: () => false, camp: () => {}, notify: () => {},
  })
  Object.assign(world.player, world.map.gate)
  world.action('interact', { x: 0, y: 0 })
  expect(world.enemies).toHaveLength(1)
  const boss = world.enemies[0]
  Object.assign(boss, { x: 850, y: 450 })
  Object.assign(world.player, { x: 600, y: 450 })
  return { world, boss, state, kills }
}

describe('E03 持续增援的死敌对象保留', () => {
  it.each(['story', 'normal', 'hard'] as const)('%s: 200轮增援与真实击杀回调后数组有界，活敌/首领/唯一ID保持', difficulty => {
    const { world, boss, state, kills } = setup(difficulty)
    const before = parseSave(serializeSave(state))
    const ids = new Set<number>([boss.id])
    for (let round = 0; round < 200; round++) {
      world.player.invincible = 1
      Object.assign(boss, { windup: 1 / 120, target: { x: 600, y: 450 }, radius: 150 })
      world.step({ x: 0, y: 0 })
      const living = world.enemies.filter(e => e.hp > 0)
      expect(living).toHaveLength(2)
      expect(living[0]).toBe(boss)
      const hunter = living[1]
      expect(hunter.type).toBe('hunter')
      expect(ids.has(hunter.id)).toBe(false)
      ids.add(hunter.id)
      Object.assign(hunter, { x: 635, y: 450, hp: 1 })
      world.attackCooldown = 0
      world.action('attack', { x: 0, y: 0, aim: hunter })
      expect(hunter.hp).toBe(0)
      expect(kills).toHaveLength(round + 1)
      expect(kills.every(b => b === false)).toBe(true)
      expect(world.enemies.length).toBeLessThanOrEqual(2)
      expect(world.runtime().bossHp).toBe(boss.maxHp)
    }
    expect(ids.size).toBe(201)
    expect(parseSave(serializeSave(state))).toEqual(before)
  })

  it('回收保留具名关卡记录、活敌顺序和已胜首领HUD，不重复结算', () => {
    const { world, boss, kills } = setup('normal')
    world.spawn('hunter', 635, 450, 'dead-guard')
    const guard = world.enemies.at(-1)!
    guard.hp = 1
    world.action('attack', { x: 0, y: 0, aim: guard })
    expect(kills).toEqual([false])
    expect(guard.hp).toBe(0)
    world.spawn('hunter', 635, 450)
    const anonymous = world.enemies.at(-1)!
    anonymous.hp = 0
    boss.hp = 0 // Isolate the existing completed-boss HUD contract.
    world.spawn('mage', 1000, 450, 'live-guard')
    const mage = world.enemies.at(-1)!
    world.spawn('hunter', 1050, 450)
    expect(world.enemies).toEqual([boss, guard, mage, world.enemies.at(-1)])
    expect(world.enemies).not.toContain(anonymous)
    expect(world.runtime().bossHp).toBe(0)
    expect(world.runtime().bossMaxHp).toBe(boss.maxHp)
    for (let frame = 0; frame < 120; frame++) world.step({ x: 0, y: 0 })
    expect(kills).toEqual([false])
  })
})
