export interface Point { x: number; y: number }
export interface MapObstacle extends Point { w: number; h: number }
export interface MapEnemy extends Point { type: 'brute' | 'hunter' | 'mage'; id?: string }
export interface MapDefinition {
  id: string
  style: 'wilderness' | 'courtyard' | 'market' | 'cave' | 'guild' | 'desert-town' | 'legacy'
  trialMode?: 'assessment'
  gateLabel?: string
  camp: Point
  spawn: Point
  gate: Point
  bossSpawn: Point
  safeRadius: number
  obstacles: MapObstacle[]
  eventBarrier?: { eventId: string; unlockedStage: number; obstacle: MapObstacle }
  herbs: Point[]
  enemies: MapEnemy[]
  paths: Point[][]
  landmarks: (Point & { label: string })[]
  survivalZone?: { x: number; y: number; w: number; h: number }
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
export const mountainMaps: Record<number, MapDefinition> = {
  4: {
    id: 'qingshan-hidden-cave', style: 'cave',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1090, y: 650 },
    bossSpawn: { x: 1050, y: 550 }, safeRadius: 170,
    eventBarrier: { eventId: 'hidden-cave-treasure', unlockedStage: 2, obstacle: { x: 810, y: 350, w: 45, h: 100 } },
    obstacles: [
      { x: 810, y: 0, w: 45, h: 350 }, { x: 810, y: 450, w: 45, h: 350 },
      { x: 380, y: 140, w: 110, h: 80 }, { x: 480, y: 570, w: 130, h: 100 },
      { x: 970, y: 80, w: 120, h: 80 },
    ],
    herbs: [{ x: 300, y: 550 }, { x: 400, y: 300 }, { x: 700, y: 700 },
      { x: 1060, y: 300 }, { x: 1120, y: 500 }, { x: 250, y: 170 }],
    enemies: [{ type: 'brute', x: 480, y: 450 }, { type: 'hunter', x: 740, y: 370 }, { type: 'mage', x: 1050, y: 480 }],
    paths: [
      [{ x: 150, y: 650 }, { x: 280, y: 410 }, { x: 320, y: 215 }],
      [{ x: 280, y: 410 }, { x: 650, y: 400 }, { x: 895, y: 400 }, { x: 1060, y: 215 }],
      [{ x: 895, y: 400 }, { x: 1090, y: 650 }],
    ],
    landmarks: [{ x: 300, y: 100, label: '青山镇 · 洞口山径' }, { x: 650, y: 300, label: '机关石室' },
      { x: 1070, y: 210, label: '洞穴深处 · 寻宝区域' }],
  },
  5: {
    id: 'purple-crystal-valley', style: 'wilderness',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 400, y: 450 },
    bossSpawn: { x: 1120, y: 150 }, safeRadius: 180,
    survivalZone: { x: 500, y: 130, w: 680, h: 390 },
    obstacles: [
      { x: 440, y: 180, w: 70, h: 110 }, { x: 540, y: 680, w: 130, h: 80 },
      { x: 950, y: 580, w: 150, h: 120 }, { x: 70, y: 320, w: 90, h: 110 },
    ],
    herbs: [{ x: 480, y: 630 }, { x: 720, y: 560 }, { x: 850, y: 600 }, { x: 1090, y: 320 }, { x: 600, y: 150 }, { x: 240, y: 180 }],
    enemies: [{ type: 'brute', x: 550, y: 540 }, { type: 'hunter', x: 790, y: 400 }, { type: 'mage', x: 1060, y: 360 }],
    paths: [
      [{ x: 150, y: 650 }, { x: 280, y: 625 }, { x: 500, y: 580 }, { x: 820, y: 420 }],
      [{ x: 280, y: 625 }, { x: 330, y: 400 }, { x: 330, y: 220 }, { x: 600, y: 320 }, { x: 920, y: 230 }],
      [{ x: 920, y: 230 }, { x: 800, y: 450 }, { x: 400, y: 450 }],
    ],
    landmarks: [{ x: 710, y: 75, label: '紫晶洞外 · 狮王警戒' }, { x: 550, y: 740, label: '采药山谷 · 保护同伴' }],
  },
  6: {
    id: 'black-rock-alchemy-guild', style: 'guild', trialMode: 'assessment', gateLabel: '审核台',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1090, y: 180 },
    bossSpawn: { x: 1090, y: 260 }, safeRadius: 1280,
    obstacles: [
      { x: 440, y: 100, w: 190, h: 160 }, { x: 450, y: 540, w: 180, h: 130 },
      { x: 875, y: 520, w: 170, h: 130 }, { x: 80, y: 330, w: 100, h: 100 },
    ],
    herbs: [], enemies: [],
    paths: [
      [{ x: 150, y: 650 }, { x: 300, y: 420 }, { x: 330, y: 220 }],
      [{ x: 330, y: 220 }, { x: 330, y: 400 }, { x: 740, y: 400 }, { x: 1090, y: 400 }, { x: 1090, y: 180 }],
    ],
    landmarks: [{ x: 770, y: 70, label: '黑岩城 · 炼药师公会' }, { x: 720, y: 735, label: '练习材料由公会提供 · 认证不是丹药生产' }],
  },
}
export const desertMaps: Record<number, MapDefinition> = {
  7: {
    id: 'stone-desert-rescue-town', style: 'desert-town',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1090, y: 650 },
    bossSpawn: { x: 1050, y: 550 }, safeRadius: 175,
    eventBarrier: { eventId: 'stone-desert-rescue', unlockedStage: 2, obstacle: { x: 870, y: 320, w: 40, h: 130 } },
    obstacles: [
      { x: 870, y: 0, w: 40, h: 320 }, { x: 870, y: 450, w: 40, h: 350 },
      { x: 440, y: 100, w: 170, h: 160 }, { x: 440, y: 540, w: 150, h: 140 },
      { x: 80, y: 330, w: 100, h: 100 },
    ],
    herbs: [{ x: 320, y: 480 }, { x: 700, y: 580 }, { x: 690, y: 180 }, { x: 1050, y: 400 }],
    enemies: [
      { id: 'sand-alley-guard', type: 'brute', x: 700, y: 430 },
      { id: 'sand-well-hunter', type: 'hunter', x: 1050, y: 320 },
      { id: 'sand-well-mage', type: 'mage', x: 1120, y: 260 },
    ],
    paths: [
      [{ x: 150, y: 650 }, { x: 300, y: 420 }, { x: 350, y: 220 }],
      [{ x: 350, y: 220 }, { x: 350, y: 400 }, { x: 700, y: 400 }, { x: 950, y: 380 }, { x: 1060, y: 230 }],
      [{ x: 950, y: 380 }, { x: 1090, y: 650 }],
    ],
    landmarks: [{ x: 690, y: 60, label: '石漠城 · 漠铁佣兵团' }, { x: 690, y: 750, label: '解救团员 · 原创救援历练' }],
  },
}
export function mapForChapter(id: number): MapDefinition { return wutanMaps[id] ?? mountainMaps[id] ?? desertMaps[id] ?? legacy }
export function mapCollides(map: MapDefinition, point: Point, radius = 17): boolean {
  return map.obstacles.some(o => point.x > o.x - radius && point.x < o.x + o.w + radius
    && point.y > o.y - radius && point.y < o.y + o.h + radius)
}
