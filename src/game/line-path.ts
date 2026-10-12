import type { Point } from '../content/maps'

// Maps contain straight segments. Keep the same independent line strokes and
// distance-weighted sampling without loading the general curve constructors.
export function linePath(points: Point[]) {
  let total = 0
  const segments = points.slice(1).map((end, i) => {
    const start = points[i], length = Math.hypot(end.x - start.x, end.y - start.y)
    total += length
    return { start, end, length, cumulative: total }
  })
  return {
    draw(graphics: { lineBetween: (x1: number, y1: number, x2: number, y2: number) => unknown }) {
      for (const { start, end } of segments) graphics.lineBetween(start.x, start.y, end.x, end.y)
    },
    getPoint(t: number): Point {
      const distance = t * total
      const segment = segments.find(item => item.cumulative >= distance)
      if (!segment) return { ...points[points.length - 1] }
      const { start, end, length, cumulative } = segment
      const u = length === 0 ? 0 : 1 - (cumulative - distance) / length
      return u === 1 ? { ...end } : { x: (end.x - start.x) * u + start.x, y: (end.y - start.y) * u + start.y }
    },
  }
}
