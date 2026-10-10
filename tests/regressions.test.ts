import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { initialState } from '../src/core/model'
import { CombatWorld } from '../src/game/combat'
import { FixedClock } from '../src/game/clock'

function fixture() {
  const state = initialState(), notices: string[] = []
  const world = new CombatWorld(chapterById(1), { state: () => state, collect: () => {},
    kill: () => {}, heal: () => true, camp: () => {}, notify: text => notices.push(text) })
  return { state, world, notices }
}
describe('战斗回归', () => {
  it.each([30, 60, 120, 144])('%i FPS 下移动、伤害和冷却按相同逻辑时间推进', fps => {
    function run(frames: number) {
      const { world } = fixture(), clock = new FixedClock()
      world.enemies.length = 0
      world.player.x = 680; world.player.y = 700
      world.action('strike', { x: 0, y: 0 })
      for (let i = 0; i < frames; i++) clock.advance(1000 / frames, () => world.step({ x: 1, y: 0 }))
      return { x: world.player.x, qi: world.player.qi, cd: world.cooldowns.strike, elapsed: world.elapsed }
    }
    expect(run(fps)).toEqual(run(60))
  })
  it('燃烧不通过自己的持续伤害无限续期', () => {
    const { state, world } = fixture()
    state.completed = Array.from({ length: 8 }, (_, i) => i + 1); state.flame = 'lotus'
    const e = world.enemies[0]
    e.x = world.player.x + 35; e.y = world.player.y; e.hp = e.maxHp = 1000
    world.action('attack', { x: 0, y: 0 })
    expect(e.burn).toBe(3)
    for (let i = 0; i < 240; i++) world.step({ x: 0, y: 0 })
    expect(e.burn).toBeLessThanOrEqual(0)
    expect(e.hp).toBeLessThan(1000)
  })
  it('药老在离队期间不能支援，营救后恢复', () => {
    const { state, world, notices } = fixture()
    state.completed = Array.from({ length: 16 }, (_, i) => i + 1)
    world.player.qi = 30
    world.action('support', { x: 0, y: 0 })
    expect(world.player.qi).toBe(30)
    expect(notices.at(-1)).toContain('离队')
    state.completed = Array.from({ length: 22 }, (_, i) => i + 1)
    world.action('support', { x: 0, y: 0 })
    expect(world.player.qi).toBe(75)
    expect(world.cooldowns.support).toBe(25)
  })
  it('恢复与回气丹共用冷却，不能重复消耗', () => {
    const { state } = fixture()
    let heals = 0, manas = 0
    const world = new CombatWorld(chapterById(1), { state: () => state, collect: () => {}, kill: () => {},
      heal: () => { heals++; return true }, mana: () => { manas++; return true }, camp: () => {}, notify: () => {} })
    world.player.hp = 20; world.player.qi = 0
    world.action('heal', { x: 0, y: 0 }); world.action('mana', { x: 0, y: 0 })
    expect(heals).toBe(1); expect(manas).toBe(0)
  })
})
