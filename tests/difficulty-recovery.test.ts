import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { advanceEvent } from '../src/core/events'
import { initialState } from '../src/core/model'
import { parseSave, serializeSave } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'
import { playerStats } from '../src/core/rules'

describe('C11c-1 三难度受击与失败恢复', () => {
  it('实际敌人预警落下后造成分级伤害，倒下保留事件与资源，重建满血并能移动', () => {
    const hits: number[] = []
    for (const difficulty of ['story', 'normal', 'hard'] as const) {
      let state = initialState(); state.settings.difficulty = difficulty
      state = advanceEvent(state, { type: 'begin' }).state
      const before = structuredClone(state), callbacks = {
        state: () => state, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      }
      const world = new CombatWorld(chapterById(1), callbacks)
      // Controlled rule fixture: stand by a real enemy, never alter HP or attack.
      world.player.x = world.enemies[0].x; world.player.y = world.enemies[0].y
      const fullHp = world.player.hp
      let firstHit = 0
      for (let frame = 0; frame < 60 * 90 && world.player.hp > 0; frame++) {
        const previous = world.player.hp
        world.step({ x: 0, y: 0 })
        if (!firstHit && world.player.hp < previous) firstHit = previous - world.player.hp
      }
      expect(firstHit, difficulty).toBeGreaterThan(0); hits.push(firstHit)
      expect(world.runtime().dead, difficulty).toBe(true)
      expect(world.player.hp).toBe(0); expect(state).toEqual(before)
      state = parseSave(serializeSave(state))
      const retry = new CombatWorld(chapterById(1), callbacks)
      expect(retry.runtime().dead).toBe(false); expect(retry.player.hp).toBe(fullHp)
      expect(retry.player.hp).toBe(playerStats(state).maxHp)
      expect(retry.player.x).toBe(retry.map.spawn.x); expect(retry.player.y).toBe(retry.map.spawn.y)
      expect(state.progress[1].events).toEqual(before.progress[1].events)
      const x = retry.player.x; retry.step({ x: 1, y: 0 }); expect(retry.player.x).toBeGreaterThan(x)
    }
    expect(hits[0]).toBeLessThan(hits[1]); expect(hits[1]).toBeLessThan(hits[2])
  })
})
