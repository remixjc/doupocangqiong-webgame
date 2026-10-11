export interface Point { x: number; y: number }
export interface MapObstacle extends Point { w: number; h: number }
export interface MapEnemy extends Point { type: 'brute' | 'hunter' | 'mage' }
export interface MapDefinition {
  id: string
  style: 'wilderness' | 'courtyard' | 'market' | 'legacy'
  camp: Point
  spawn: Point
  gate: Point
  bossSpawn: Point
  safeRadius: number
  obstacles: MapObstacle[]
  herbs: Point[]
  enemies: MapEnemy[]
  paths: Point[][]
  landmarks: (Point & { label: string })[]
}

export const MAP_WIDTH = 1280, MAP_HEIGHT = 800
const legacy: MapDefinition = {
  id: 'training-arena', style: 'legacy',
  camp: { x: 160, y: 640 }, spawn: { x: 210, y: 615 }, gate: { x: 1090, y: 180 },
  bossSpawn: { x: 1020, y: 260 }, safeRadius: 105,
  obstacles: [
    { x: 360, y: 140, w: 120, h: 80 }, { x: 540, y: 560, w: 90, h: 90 },
    { x: 860, y: 360, w: 130, h: 70 }, { x: 90, y: 350, w: 80, h: 80 },
  ],
  herbs: [{ x: 300, y: 550 }, { x: 550, y: 300 }, { x: 740, y: 640 },
    { x: 1080, y: 500 }, { x: 850, y: 220 }, { x: 250, y: 200 }],
  enemies: [{ type: 'brute', x: 550, y: 470 }, { type: 'hunter', x: 740, y: 360 },
    { type: 'mage', x: 1020, y: 610 }, { type: 'hunter', x: 570, y: 260 }, { type: 'mage', x: 1050, y: 390 }],
  paths: [[{ x: 150, y: 650 }, { x: 360, y: 480 }, { x: 680, y: 470 }, { x: 800, y: 270 }, { x: 1090, y: 180 }]],
  landmarks: [],
}
export const wutanMaps: Record<number, MapDefinition> = {
  1: {
    ...legacy, id: 'xiao-back-mountain', style: 'wilderness', safeRadius: 230,
    obstacles: [
      { x: 360, y: 140, w: 120, h: 80 }, { x: 575, y: 555, w: 120, h: 75 },
      { x: 890, y: 365, w: 100, h: 105 }, { x: 95, y: 335, w: 80, h: 100 },
    ],
    landmarks: [{ x: 375, y: 710, label: '药老指导 · 木桩演练' }, { x: 665, y: 105, label: '后山山径' }],
  },
  2: {
    id: 'xiao-family-courtyard', style: 'courtyard',
    camp: { x: 150, y: 660 }, spawn: { x: 210, y: 635 }, gate: { x: 1090, y: 145 },
    bossSpawn: { x: 1040, y: 235 }, safeRadius: 190,
    obstacles: [
      { x: 470, y: 125, w: 275, h: 185 }, { x: 335, y: 550, w: 180, h: 110 },
      { x: 835, y: 430, w: 160, h: 90 }, { x: 80, y: 320, w: 90, h: 105 },
    ],
    herbs: [{ x: 300, y: 460 }, { x: 360, y: 705 }, { x: 805, y: 305 },
      { x: 1080, y: 570 }, { x: 1060, y: 340 }, { x: 250, y: 130 }],
    enemies: [{ type: 'brute', x: 590, y: 385 }, { type: 'hunter', x: 825, y: 235 }, { type: 'mage', x: 1080, y: 455 }],
    paths: [
      [{ x: 150, y: 660 }, { x: 270, y: 430 }, { x: 330, y: 220 }],
      [{ x: 330, y: 220 }, { x: 350, y: 380 }, { x: 660, y: 410 }, { x: 760, y: 630 }, { x: 1060, y: 625 }],
      [{ x: 1060, y: 625 }, { x: 1110, y: 360 }, { x: 1090, y: 145 }],
    ],
    landmarks: [{ x: 610, y: 100, label: '萧家议事堂' }, { x: 730, y: 745, label: '立约后的修炼之路' }],
  },
  3: {
    id: 'wutan-family-market', style: 'market',
    camp: { x: 130, y: 650 }, spawn: { x: 185, y: 620 }, gate: { x: 1100, y: 180 },
    bossSpawn: { x: 1060, y: 280 }, safeRadius: 215,
    obstacles: [
      { x: 365, y: 250, w: 125, h: 100 }, { x: 560, y: 250, w: 120, h: 100 },
      { x: 770, y: 250, w: 120, h: 100 }, { x: 390, y: 525, w: 180, h: 100 },
      { x: 795, y: 540, w: 180, h: 100 },
    ],
    herbs: [{ x: 310, y: 480 }, { x: 600, y: 200 }, { x: 730, y: 460 },
      { x: 1050, y: 600 }, { x: 215, y: 200 }, { x: 630, y: 680 }],
    enemies: [{ type: 'brute', x: 620, y: 420 }, { type: 'hunter', x: 1040, y: 530 }, { type: 'mage', x: 1060, y: 340 }],
    paths: [
      [{ x: 130, y: 650 }, { x: 270, y: 430 }, { x: 1100, y: 430 }, { x: 1100, y: 180 }],
      [{ x: 270, y: 430 }, { x: 280, y: 185 }, { x: 980, y: 185 }],
      [{ x: 270, y: 430 }, { x: 650, y: 700 }, { x: 1090, y: 700 }],
    ],
    landmarks: [{ x: 820, y: 85, label: '乌坦城 · 萧家坊市' }, { x: 680, y: 765, label: '补货与议价 · 原创经营历练' }],
  },
}
export function mapForChapter(id: number): MapDefinition { return wutanMaps[id] ?? legacy }
export function mapCollides(map: MapDefinition, point: Point, radius = 17): boolean {
  return map.obstacles.some(o => point.x > o.x - radius && point.x < o.x + o.w + radius
    && point.y > o.y - radius && point.y < o.y + o.h + radius)
}
