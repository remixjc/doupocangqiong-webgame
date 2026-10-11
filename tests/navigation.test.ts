import { describe, expect, it, vi } from 'vitest'
import { chapters, chapterById } from '../src/content/chapters'
import { mapForChapter, mapCollides } from '../src/content/maps'
import { clearWalk, planWalk, RouteWalker, worldBounds } from '../src/game/navigation'
import { CombatWorld } from '../src/game/combat'
import { GameStore } from '../src/core/store'
import { initialState, type GameState } from '../src/core/model'
import { validateState } from '../src/core/save'

describe('沿路行走使用实际地形和普通物理输入', () => {
  it('28章的起点到营地路径每一段都满足角色边界与碰撞半径', () => {
    for (const chapter of chapters) {
      const map = mapForChapter(chapter.id), route = planWalk(map.spawn, map.camp, map)
      expect(route, chapter.title).not.toBeNull()
      let previous = map.spawn
      for (const point of route!) {
        expect(clearWalk(map, worldBounds, previous, point), chapter.title).toBe(true)
        previous = point
      }
    }
  })
  it('绕开第一章横石，按235速度真实逐帧抵达；不采草、击杀或结算', () => {
    const state = initialState(), before = structuredClone(state)
    const collect = vi.fn(), kill = vi.fn(), camp = vi.fn(), eventAction = vi.fn()
    const world = new CombatWorld(chapterById(1), { state: () => state, collect, kill, camp, eventAction, heal: () => false, notify: () => {} })
    const to = world.map.herbs[2], walker = new RouteWalker()
    expect(walker.start(world.player, to, world.collisionMap(), world.movementBounds())).toBe(true)
    expect(walker.path.length).toBeGreaterThan(1)
    let steps = 0
    while (walker.active && steps++ < 600) {
      const previous = { ...world.player }, input = walker.input(world.player)
      expect(Math.hypot(input.x, input.y)).toBeLessThanOrEqual(1.000001)
      world.step(input)
      expect(Math.hypot(world.player.x - previous.x, world.player.y - previous.y)).toBeLessThanOrEqual(235 / 60 + .000001)
      expect(mapCollides(world.map, world.player)).toBe(false)
    }
    expect(steps).toBeGreaterThan(100)
    expect(walker.active).toBe(false)
    expect(walker.result).toBe('arrived')
    expect(Math.hypot(world.player.x - to.x, world.player.y - to.y)).toBeLessThan(.5)
    expect(world.herbs.every(h => h.available)).toBe(true)
    expect(collect).not.toHaveBeenCalled(); expect(kill).not.toHaveBeenCalled()
    expect(camp).not.toHaveBeenCalled(); expect(eventAction).not.toHaveBeenCalled()
    expect(state).toEqual(before)
  })
  it('封闭的真实障碍不能穿越；解封后可通；战场边界不能绕出', () => {
    const base = mapForChapter(1), from = { x: 300, y: 400 }, to = { x: 900, y: 400 }
    const closed = { ...base, obstacles: [{ x: 600, y: 0, w: 40, h: 800 }] }
    expect(planWalk(from, to, closed)).toBeNull()
    expect(planWalk(from, to, { ...base, obstacles: [] })).not.toBeNull()
    expect(planWalk(from, to, base, { left: 200, top: 200, right: 500, bottom: 700 })).toBeNull()
    expect(planWalk(from, { x: NaN, y: 400 }, base)).toBeNull()
  })
  it('停止后不继续移动；无物理进展一秒终止，不在墙边无限走', () => {
    const walker = new RouteWalker(), map = mapForChapter(1), from = map.spawn
    expect(walker.start(from, map.camp, map)).toBe(true)
    walker.stop()
    expect(walker.input(from)).toEqual({ x: 0, y: 0 })
    expect(walker.start(from, map.camp, map)).toBe(true)
    for (let i = 0; i < 62; i++) walker.input(from)
    expect(walker.active).toBe(false)
    expect(walker.result).toBe('blocked')
  })
  it('临时路线命令不保存，暂停拒绝新请求，战斗动作/载入清除命令且旧档有效', async () => {
    const write = vi.fn(async (_state: GameState) => {}), state = initialState()
    const store = new GameStore({ load: async () => state, write })
    await store.initialize()
    store.travel('gate'); expect(store.travelTarget).toBeUndefined()
    store.paused = false; store.travel('gate'); expect(store.travelTarget).toBe('gate')
    store.action('dodge'); expect(store.travelTarget).toBeUndefined()
    expect(store.actions).toEqual(['dodge'])
    store.travel('camp'); store.stopTravel(); expect(store.travelTarget).toBeUndefined()
    store.travel('camp'); store.replace(state); expect(store.travelTarget).toBeUndefined()
    await store.waitForAutosave()
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0][0]).toEqual(state)
    expect(JSON.stringify(state)).not.toContain('travel')
    expect(validateState(state)).toEqual(state)
  })
})
