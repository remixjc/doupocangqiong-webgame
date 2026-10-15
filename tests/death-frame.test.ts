import { describe, expect, it } from 'vitest'
import { chapters, chapterById } from '../src/content/chapters'
import { migrateLegacyEvents } from '../src/core/events'
import { blankProgress, initialState, type Difficulty } from '../src/core/model'
import { parseSave, serializeSave, validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

// Rule-only fixture: a validated chapter-one revisit after earning lotus fire.
// Precise HP, burn clock and windup are controlled here, never in a browser.
function deathFrame(difficulty: Difficulty) {
  const s = initialState()
  s.completed = Array.from({ length: 8 }, (_, i) => i + 1)
  s.flame = 'lotus'
  s.settings.difficulty = difficulty
  for (const id of s.completed) {
    const chapter = chapters[id - 1]
    s.progress[id] = { ...blankProgress(id), ...chapter.objectives, boss: true, intro: true,
      events: migrateLegacyEvents(id, true) }
  }
  const state = validateState(s)
  const settledAtHp: number[] = []
  let world: CombatWorld
  const callbacks = {
    state: () => state, collect: () => {}, heal: () => false, camp: () => {}, notify: () => {},
    kill: () => { settledAtHp.push(world.player.hp) },
  }
  world = new CombatWorld(chapterById(1), callbacks)
  world.enemies.splice(2)
  Object.assign(world.player, { x: 600, y: 450, hp: 1, invincible: 0 })
  const [attacker, burning] = world.enemies
  Object.assign(attacker, { x: 600, y: 450, windup: 1 / 120, target: { x: 600, y: 450 }, radius: 70, patrol: undefined })
  Object.assign(burning, { x: 640, y: 450, hp: 1, burn: 1, burnTick: .8 - 1 / 120, patrol: undefined })
  return { world, state, attacker, burning, settledAtHp,
    rebuild: () => new CombatWorld(chapterById(1), callbacks) }
}

describe('E02 精确死亡帧与后续敌人灼烧', () => {
  it.each(['story', 'normal', 'hard'] as const)('%s: 敌人造成死亡后，本帧后续灼烧不再发击杀回调', difficulty => {
    const t = deathFrame(difficulty)
    const before = serializeSave(t.state)
    t.world.step({ x: 0, y: 0 })
    expect(t.world.runtime().dead).toBe(true)
    expect(t.settledAtHp).toEqual([])
    expect(t.burning.hp).toBe(1)
    expect(parseSave(serializeSave(t.state))).toEqual(parseSave(before))
    for (let i = 0; i < 120; i++) t.world.step({ x: 1, y: 0 })
    t.world.action('attack', { x: 0, y: 0 })
    expect(t.settledAtHp).toEqual([])
    expect(t.burning.hp).toBe(1)
    const rebuilt = t.rebuild()
    expect(rebuilt.runtime().dead).toBe(false)
    expect(rebuilt.player.hp).toBeGreaterThan(1)
    expect(parseSave(serializeSave(t.state))).toEqual(parseSave(before))
  })

  it.each(['story', 'normal', 'hard'] as const)('%s: 同帧倒下前已发生的灼烧击杀仍正常保留一次', difficulty => {
    const t = deathFrame(difficulty)
    t.world.enemies.reverse()
    t.world.step({ x: 0, y: 0 })
    expect(t.world.runtime().dead).toBe(true)
    expect(t.settledAtHp).toEqual([1])
    expect(t.burning.hp).toBe(0)
    for (let i = 0; i < 120; i++) t.world.step({ x: 0, y: 0 })
    expect(t.settledAtHp).toEqual([1])
  })
})
