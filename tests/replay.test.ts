import { describe, expect, it } from 'vitest'
import { chapters } from '../src/content/chapters'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, craft, finishChapter, skillUnlocked } from '../src/core/rules'
import { CombatWorld, collides, gate, HEIGHT, WIDTH, type Vec } from '../src/game/combat'

// A test-only player: it uses the same movement, combat, collection and crafting rules.
// It never changes enemy HP, player position or task counters outside normal callbacks.
function route(from: Vec, to: Vec): Vec[] {
  const cell = 32, columns = Math.floor(WIDTH / cell), rows = Math.floor(HEIGHT / cell)
  const key = (x: number, y: number) => y * columns + x
  const pos = (n: number) => ({ x: (n % columns) * cell + cell / 2, y: Math.floor(n / columns) * cell + cell / 2 })
  const index = (p: Vec) => key(Math.min(columns - 2, Math.max(1, Math.floor(p.x / cell))), Math.min(rows - 2, Math.max(1, Math.floor(p.y / cell))))
  const start = index(from), end = index(to), parents = new Map<number, number>([[start, -1]]), queue = [start]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    if (current === end) break
    const x = current % columns, y = Math.floor(current / columns)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = key(nx, ny)
      if (nx < 1 || ny < 1 || nx >= columns - 1 || ny >= rows - 1 || parents.has(n) || collides(pos(n), 22)) continue
      parents.set(n, current); queue.push(n)
    }
  }
  if (!parents.has(end)) return [to]
  const result: Vec[] = [to]
  let current = end
  while (current !== start && current !== -1) { result.unshift(pos(current)); current = parents.get(current)! }
  return result
}
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)

describe('完整主线真实规则战斗回放', () => {
  it('通过移动、采集、炼制与战斗，依次打通28章', () => {
    let state = initialState()
    state.settings.difficulty = 'story'
    const timings: number[] = []
    for (const chapter of chapters) {
      state.chapter = chapter.id; state.progress[chapter.id] = blankProgress()
      const world = new CombatWorld(chapter, {
        state: () => state,
        collect: () => { state.progress[chapter.id].herbs++; state.inventory.herb++ },
        kill: boss => {
          if (boss) { if (chapterReady(state)) state.progress[chapter.id].boss = true }
          else { state.progress[chapter.id].kills++; state.inventory.crystal++; state.totalKills++ }
        },
        heal: () => { if (!state.inventory.heal) return false; state.inventory.heal--; return true },
        mana: () => { if (!state.inventory.mana) return false; state.inventory.mana--; return true },
        camp: () => {}, notify: () => {},
      })
      let path: Vec[] = [], previousTarget: Vec = { x: -999, y: -999 }, frame = 0
      for (; frame < 60 * 240 && !state.progress[chapter.id].boss && world.player.hp > 0; frame++) {
        const p = state.progress[chapter.id]
        if (p.brews < chapter.objectives.brews && state.inventory.herb >= 2 && state.inventory.crystal >= 1) {
          const result = craft(state, 'heal', .5); if (result.ok) state = result.state
        }
        const needsHerb = p.herbs < chapter.objectives.herbs || (p.brews < chapter.objectives.brews && state.inventory.herb < 2)
        const living = world.enemies.filter(e => e.hp > 0).sort((a, b) => dist(a, world.player) - dist(b, world.player))
        let target: Vec = gate
        if (needsHerb) target = world.herbs.filter(h => h.available).sort((a, b) => dist(a, world.player) - dist(b, world.player))[0] ?? gate
        else if (living.length) target = living[0]
        const threat = living.find(e => e.windup > 0 && [e.target, ...(e.secondary ?? [])].some(t => dist(t, world.player) < e.radius + 25))
        let input = { x: 0, y: 0 }
        if (threat) {
          const point = [threat.target, ...(threat.secondary ?? [])].sort((a, b) => dist(a, world.player) - dist(b, world.player))[0]
          const dx = world.player.x - point.x, dy = world.player.y - point.y, length = Math.hypot(dx, dy)
          input = length > 1 ? { x: dx / length, y: dy / length } : { x: 0, y: 1 }
          world.action('dodge', input)
          path = []
        } else {
          if (frame % 20 === 0 || !path.length || dist(target, previousTarget) > 45) {
            path = route(world.player, target); previousTarget = { ...target }
          }
          while (path.length > 1 && dist(path[0], world.player) < 14) path.shift()
          const waypoint = path[0] ?? target
          const dx = waypoint.x - world.player.x, dy = waypoint.y - world.player.y, length = Math.hypot(dx, dy)
          if (length > 4 && (needsHerb || !living.length || dist(target, world.player) > 70)) input = { x: dx / length, y: dy / length }
        }
        if (frame % 10 === 0) {
          world.action('attack', input)
          if (living[0] && dist(living[0], world.player) < 145) world.action('strike', input)
          if (skillUnlocked(state, 'wave') && living[0] && dist(living[0], world.player) < 320) world.action('wave', input)
          if (skillUnlocked(state, 'lotus') && living[0] && dist(living[0], world.player) < 300) world.action('lotus', input)
          if (world.player.hp < world.runtime().maxHp * .5) world.action('heal', input)
          if (world.player.qi < 20) world.action('mana', input)
          world.action('support', input)
          if (needsHerb || (chapterReady(state) && !living.length)) world.action('interact', input)
        }
        world.step(input)
      }
      expect(state.progress[chapter.id].boss, `第${chapter.id}章未打通：hp=${world.player.hp}, kills=${state.progress[chapter.id].kills}, herbs=${state.progress[chapter.id].herbs}, position=${world.player.x},${world.player.y}`).toBe(true)
      state = finishChapter(state)
      expect(state.completed.length).toBe(chapter.id)
      timings.push(Math.round(frame / 60))
    }
    expect(state.completed.length).toBe(28)
    console.log(`28章纯逻辑输入回放（剧情难度，非人工通关）：${timings.join(', ')} 秒`)
  }, 30_000)
})
