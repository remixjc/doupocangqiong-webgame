import { mapCollides, MAP_HEIGHT, MAP_WIDTH, type MapDefinition, type Point } from '../content/maps'

export interface WalkBounds { left: number; right: number; top: number; bottom: number }
export const worldBounds: WalkBounds = { left: 40, right: MAP_WIDTH - 40, top: 45, bottom: MAP_HEIGHT - 40 }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** A little clearance beyond the combat body's radius; never changes collision or speed. */
export function clearWalk(map: MapDefinition, bounds: WalkBounds, from: Point, to: Point) {
  const steps = Math.max(1, Math.ceil(distance(from, to) / 4))
  for (let i = 0; i <= steps; i++) {
    const f = i / steps, p = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }
    if (p.x < bounds.left || p.x > bounds.right || p.y < bounds.top || p.y > bounds.bottom || mapCollides(map, p, 18)) return false
  }
  return true
}

/** Search the actual ground. A sealed door or arena wall can make a destination unreachable. */
export function planWalk(from: Point, to: Point, map: MapDefinition, bounds = worldBounds): Point[] | null {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return null
  if (clearWalk(map, bounds, from, to)) return [{ ...to }]
  const cell = 20, columns = Math.floor((bounds.right - bounds.left) / cell) + 1
  const rows = Math.floor((bounds.bottom - bounds.top) / cell) + 1, count = columns * rows
  const point = (n: number) => ({ x: bounds.left + n % columns * cell, y: bounds.top + Math.floor(n / columns) * cell })
  const free = Array.from({ length: count }, (_, n) => clearWalk(map, bounds, point(n), point(n)))
  const starts = Array.from({ length: count }, (_, n) => n).filter(n =>
    free[n] && distance(from, point(n)) <= 40 && clearWalk(map, bounds, from, point(n)))
  const goals = new Set(Array.from({ length: count }, (_, n) => n).filter(n =>
    free[n] && distance(to, point(n)) <= 28 && clearWalk(map, bounds, point(n), to)))
  const parents = new Map<number, number>(), queue: number[] = []
  starts.sort((a, b) => distance(from, point(a)) - distance(from, point(b)))
  for (const n of starts) { parents.set(n, -1); queue.push(n) }
  let end: number | undefined
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head]
    if (goals.has(n)) { end = n; break }
    const x = n % columns, y = Math.floor(n / columns)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * columns + nx
      if (nx < 0 || ny < 0 || nx >= columns || ny >= rows || parents.has(next) || !free[next]) continue
      if (!clearWalk(map, bounds, point(n), point(next))) continue
      parents.set(next, n); queue.push(next)
    }
  }
  if (end === undefined) return null
  const route: Point[] = [{ ...to }]
  for (let n = end; n !== -1; n = parents.get(n)!) route.unshift(point(n))
  const smooth: Point[] = []
  let previous = from
  for (let i = 0; i < route.length;) {
    let next = i
    while (next + 1 < route.length && clearWalk(map, bounds, previous, route[next + 1])) next++
    smooth.push(route[next]); previous = route[next]; i = next + 1
  }
  return smooth
}

/** Emits ordinary movement input. Arrival does not interact, attack, collect or reward. */
export class RouteWalker {
  private points: Point[] = []
  private previous?: Point
  private stalled = 0
  result?: 'arrived' | 'blocked'
  get active() { return this.points.length > 0 }
  get path(): readonly Point[] { return this.points }
  start(from: Point, to: Point, map: MapDefinition, bounds = worldBounds) {
    this.stop()
    const points = planWalk(from, to, map, bounds)
    if (!points) return false
    this.points = points
    return true
  }
  stop() { this.points = []; this.previous = undefined; this.stalled = 0; this.result = undefined }
  input(position: Point, dt = 1 / 60): Point {
    if (!this.active || dt <= 0) return { x: 0, y: 0 }
    if (this.previous && distance(this.previous, position) < .1) this.stalled += dt
    else this.stalled = 0
    this.previous = { ...position }
    if (this.stalled >= 1) { this.stop(); this.result = 'blocked'; return { x: 0, y: 0 } }
    while (this.points.length && distance(position, this.points[0]) < .5) this.points.shift()
    const next = this.points[0]
    if (!next) { this.result = 'arrived'; return { x: 0, y: 0 } }
    const dx = next.x - position.x, dy = next.y - position.y
    const scale = Math.max(distance(position, next), 235 * dt)
    return { x: dx / scale, y: dy / scale }
  }
}
