import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { finalPhaseMaps, mapForChapter, type Point } from '../src/content/maps'
import { linePath } from '../src/game/line-path'

const require = createRequire(import.meta.url)
const Path = require('phaser/src/curves/path/Path') as new (x: number, y: number) => {
  lineTo(x: number, y: number): void
  getPoint(t: number): Point
  draw(graphics: { lineBetween: (...coords: number[]) => void }): void
}

describe('straight map paths compared with the locked upstream curve path', () => {
  it('all 28 maps and final phases use identical ordered strokes and distance sampling', () => {
    const maps = [...Array.from({ length: 28 }, (_, i) => mapForChapter(i + 1)), ...finalPhaseMaps]
    for (const map of maps) for (const points of map.paths) {
      expect(points.length).toBeGreaterThan(1)
      const old = new Path(points[0].x, points[0].y), current = linePath(points)
      for (const p of points.slice(1)) old.lineTo(p.x, p.y)
      const previousStrokes: number[][] = [], currentStrokes: number[][] = []
      old.draw({ lineBetween: (...coords) => { previousStrokes.push(coords) } })
      current.draw({ lineBetween: (...coords) => { currentStrokes.push(coords) } })
      expect(currentStrokes).toEqual(previousStrokes)
      for (let sample = 0; sample <= 256; sample++) {
        const previous = old.getPoint(sample / 256), actual = current.getPoint(sample / 256)
        expect(Math.abs(actual.x - previous.x)).toBeLessThan(1e-8)
        expect(Math.abs(actual.y - previous.y)).toBeLessThan(1e-8)
      }
    }
  })
  it('repeated zero-length points and exact segment boundaries keep upstream behavior', () => {
    for (const points of [[{ x: 3, y: 4 }, { x: 3, y: 4 }], [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 4 }, { x: 9, y: 12 }]]) {
      const old = new Path(points[0].x, points[0].y), current = linePath(points)
      for (const p of points.slice(1)) old.lineTo(p.x, p.y)
      for (const t of [0, 1 / 3, .5, 1]) {
        const previous = old.getPoint(t), actual = current.getPoint(t)
        expect(actual.x).toBeCloseTo(previous.x, 8)
        expect(actual.y).toBeCloseTo(previous.y, 8)
      }
    }
  })
})
