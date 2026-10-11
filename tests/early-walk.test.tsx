import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState } from '../src/core/model'
import { earlyWalkStart, earlyWalkPlaces, earlyWalkPositionValid, moveEarlyWalker, nearbyEarlyWalkPlace, type EarlyWalkDirection } from '../src/core/early-walk'
import EarlyWalk from '../src/ui/EarlyWalk'

describe('往事准备路线', () => {
  it('从院门使用方向输入可到所有地点，建筑和水池碰撞保持当前位置', () => {
    const start = { ...earlyWalkStart }, queue = [start], visited = new Set([`${start.x},${start.y}`]), reached = new Set<string>()
    for (let index = 0; index < queue.length; index++) {
      const position = queue[index], place = nearbyEarlyWalkPlace(position)
      if (place) reached.add(place.id)
      for (const direction of ['up', 'down', 'left', 'right'] as EarlyWalkDirection[]) {
        const next = moveEarlyWalker(position, direction), id = `${next.x},${next.y}`
        expect(earlyWalkPositionValid(next)).toBe(true)
        if (!visited.has(id)) { visited.add(id); queue.push(next) }
      }
    }
    expect(reached.size).toBe(earlyWalkPlaces.length)
    const south = { x: 360, y: 250 }
    expect(moveEarlyWalker(south, 'up')).toBe(south)
    const pharmacy = { x: 150, y: 150 }
    expect(moveEarlyWalker(pharmacy, 'up')).toBe(pharmacy)
    expect(start).toEqual(earlyWalkStart)
  })
  it('边界/非法位置不穿墙，只有接近且有效位置能查看地点', () => {
    const edge = { x: 12, y: 250 }
    expect(moveEarlyWalker(edge, 'left')).toBe(edge)
    for (const position of [{ x: NaN, y: 10 }, { x: -20, y: 100 }, { x: 100, y: 80 }]) {
      expect(moveEarlyWalker(position, 'up')).toEqual(earlyWalkStart)
      expect(nearbyEarlyWalkPlace(position)).toBeUndefined()
    }
    expect(nearbyEarlyWalkPlace(earlyWalkStart)).toBeUndefined()
    expect(nearbyEarlyWalkPlace({ x: 150, y: 170 })?.id).toBe('pharmacy')
  })
  it('地图入口前置/范围不泄露，静态无计时器并明确主线隔离和返回', () => {
    const state = initialState()
    expect(renderToStaticMarkup(<EarlyWalk state={state} onBack={() => {}} />)).not.toContain('往事路线地图')
    // Explicit display fixture; route operations never edit persistent progress.
    state.completed = [1, 2]
    const before = structuredClone(state)
    const html = renderToStaticMarkup(<EarlyWalk state={state} onBack={() => {}} />)
    expect(html).toContain('aria-label="往事路线地图"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('回到重修准备单')
    expect(html).toContain('回到药老容器处继续调制')
    expect(state).toEqual(before)
    state.settings.spoiler = 'anime'; state.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyWalk state={state} onBack={() => {}} />)).not.toContain('药铺')
  })
})
