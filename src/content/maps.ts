export interface Point { x: number; y: number }
export interface MapObstacle extends Point { w: number; h: number }
export interface PatrolDefinition { route: Point[]; detectionRadius: number }
export interface MapEnemy extends Point { type: 'brute' | 'hunter' | 'mage'; id?: string; patrol?: PatrolDefinition }
export interface TowerFloor { center: Point; cooling: Point; duration: number; pressure: number; radius: number }
export interface MapDefinition {
  id: string
  style: 'wilderness' | 'courtyard' | 'market' | 'cave' | 'guild' | 'desert-town' | 'fire-cavern' | 'tournament' | 'duel' | 'escape' | 'auction' | 'academy' | 'fire-tower' | 'sect' | 'alliance' | 'thunder-path' | 'star-pavilion' | 'dan-realm' | 'star-domain' | 'soul-prison' | 'tomb' | 'bodhi' | 'pure-fire' | 'legacy'
  trialMode?: 'assessment' | 'attunement'
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
  heatZone?: { x: number; y: number; w: number; h: number; cooling: Point[] }
  duelArena?: { x: number; y: number; w: number; h: number }
  escapeRoute?: boolean
  thunderRoute?: boolean
  escapeDurations?: number[]
  expeditionDuration?: number
  lightningTrial?: { center: Point; radius: number; duration: number }
  starTrial?: { center: Point; radius: number; cooling: Point[]; durations: number[]; pressure: number[] }
  prisonPursuit?: MapEnemy[]
  rankingArena?: boolean
  towerFloors?: TowerFloor[]
  siegeDurations?: number[]
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
export const capitalMaps: Record<number, MapDefinition> = {
  9: {
    id: 'capital-alchemy-tournament', style: 'tournament', trialMode: 'assessment', gateLabel: '领奖台',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1100, y: 200 }, bossSpawn: { x: 1100, y: 200 }, safeRadius: 180,
    obstacles: [{ x: 400, y: 110, w: 150, h: 150 }, { x: 710, y: 140, w: 140, h: 120 },
      { x: 470, y: 540, w: 120, h: 120 }, { x: 820, y: 560, w: 150, h: 100 }],
    herbs: [{ x: 330, y: 400 }, { x: 650, y: 300 }, { x: 980, y: 700 }],
    enemies: [],
    paths: [[{ x: 150, y: 650 }, { x: 330, y: 400 }, { x: 1100, y: 400 }, { x: 1100, y: 200 }],
      [{ x: 330, y: 400 }, { x: 330, y: 220 }]],
    landmarks: [{ x: 650, y: 70, label: '帝都大会 · 岩枭之名' }, { x: 650, y: 750, label: '初赛 → 复赛 → 决赛 · 成绩分轮保留' }],
  },
  10: {
    id: 'yunlan-duel-court', style: 'duel', gateLabel: '决斗碑',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1100, y: 220 }, bossSpawn: { x: 1050, y: 330 }, safeRadius: 150,
    duelArena: { x: 500, y: 140, w: 700, h: 520 },
    obstacles: [{ x: 400, y: 100, w: 60, h: 200 }, { x: 80, y: 300, w: 100, h: 160 }, { x: 340, y: 530, w: 100, h: 100 }],
    herbs: [{ x: 280, y: 410 }, { x: 1150, y: 720 }],
    enemies: [],
    paths: [[{ x: 150, y: 650 }, { x: 300, y: 400 }, { x: 880, y: 400 }, { x: 1100, y: 220 }],
      [{ x: 300, y: 400 }, { x: 330, y: 220 }]],
    landmarks: [{ x: 810, y: 80, label: '云岚宗 · 三年之约' }, { x: 840, y: 740, label: '踏风突进 · 三叠风刃 · 旋风回旋' }],
  },
  11: {
    id: 'yunlan-mountain-escape', style: 'escape', escapeRoute: true, gateLabel: '山路出口',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1130, y: 180 }, bossSpawn: { x: 1130, y: 180 }, safeRadius: 150,
    obstacles: [{ x: 720, y: 0, w: 60, h: 320 }, { x: 720, y: 470, w: 60, h: 330 },
      { x: 390, y: 340, w: 120, h: 90 }, { x: 1020, y: 320, w: 100, h: 110 }, { x: 80, y: 320, w: 110, h: 110 }],
    herbs: [{ x: 300, y: 480 }, { x: 630, y: 680 }, { x: 1130, y: 640 }],
    enemies: [],
    paths: [[{ x: 150, y: 650 }, { x: 350, y: 560 }, { x: 600, y: 460 }, { x: 600, y: 240 }],
      [{ x: 600, y: 240 }, { x: 630, y: 400 }, { x: 850, y: 400 }, { x: 950, y: 560 }, { x: 1160, y: 460 }, { x: 1130, y: 180 }]],
    landmarks: [{ x: 660, y: 70, label: '云岚山外 · 留得退路' }, { x: 600, y: 750, label: '岩间掩体 → 中段山口 → 竹林掩体 → 出口' }],
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
  8: {
    id: 'lotus-fire-cavern', style: 'fire-cavern', trialMode: 'attunement', gateLabel: '收服台',
    heatZone: { x: 600, y: 210, w: 620, h: 470, cooling: [{ x: 680, y: 270 }, { x: 1030, y: 570 }] },
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1100, y: 620 },
    bossSpawn: { x: 1080, y: 510 }, safeRadius: 180,
    obstacles: [
      { x: 400, y: 150, w: 100, h: 170 }, { x: 660, y: 520, w: 130, h: 140 },
      { x: 910, y: 100, w: 100, h: 90 }, { x: 70, y: 320, w: 100, h: 110 },
    ],
    herbs: [{ x: 320, y: 480 }, { x: 600, y: 180 }, { x: 850, y: 700 }, { x: 1050, y: 520 }, { x: 240, y: 180 }, { x: 600, y: 450 }],
    enemies: [
      { id: 'snake-west-patrol', type: 'hunter', x: 550, y: 350, patrol: { detectionRadius: 180, route: [{ x: 550, y: 350 }, { x: 780, y: 350 }, { x: 780, y: 460 }, { x: 550, y: 460 }] } },
      { id: 'snake-east-patrol', type: 'hunter', x: 960, y: 250, patrol: { detectionRadius: 180, route: [{ x: 960, y: 250 }, { x: 1150, y: 250 }, { x: 1150, y: 450 }, { x: 960, y: 450 }] } },
      { id: 'fire-cavern-guard', type: 'mage', x: 1050, y: 580 },
    ],
    paths: [
      [{ x: 150, y: 650 }, { x: 310, y: 400 }, { x: 600, y: 400 }, { x: 850, y: 400 }, { x: 1030, y: 400 }, { x: 1100, y: 620 }],
      [{ x: 310, y: 400 }, { x: 330, y: 220 }, { x: 570, y: 350 }],
    ],
    landmarks: [{ x: 700, y: 70, label: '地底火域 · 蛇人巡逻' }, { x: 1040, y: 350, label: '火域深处 · 收服区域' }],
  },
}
export const blackCornerMaps: Record<number, MapDefinition> = {
  12: {
    id: 'black-corner-auction-street', style: 'auction', gateLabel: '出发碑',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1100, y: 190 }, bossSpawn: { x: 1080, y: 310 }, safeRadius: 170,
    obstacles: [{ x: 410, y: 100, w: 130, h: 160 }, { x: 610, y: 560, w: 150, h: 120 },
      { x: 920, y: 390, w: 90, h: 160 }, { x: 80, y: 290, w: 120, h: 110 }],
    herbs: [{ x: 330, y: 470 }, { x: 600, y: 300 }, { x: 1100, y: 680 }],
    enemies: [{ id: 'auction-street-brute', type: 'brute', x: 620, y: 450 }, { id: 'auction-street-mage', type: 'mage', x: 1050, y: 620 }],
    paths: [[{ x: 150, y: 650 }, { x: 330, y: 400 }, { x: 750, y: 400 }, { x: 1100, y: 260 }, { x: 1100, y: 190 }],
      [{ x: 330, y: 400 }, { x: 330, y: 220 }]],
    landmarks: [{ x: 710, y: 70, label: '黑角域 · 拍卖街区' }, { x: 650, y: 750, label: '量力出价 · 超价退款 · 旁观也有退路' }],
  },
}
export const academyMaps: Record<number, MapDefinition> = {
  13: {
    id: 'academy-formation-ground', style: 'academy', trialMode: 'assessment', gateLabel: '入院审核',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1100, y: 190 }, bossSpawn: { x: 1100, y: 190 }, safeRadius: 170,
    obstacles: [{ x: 390, y: 130, w: 120, h: 140 }, { x: 780, y: 600, w: 150, h: 100 }, { x: 1010, y: 90, w: 70, h: 170 }],
    herbs: [{ x: 330, y: 430 }, { x: 630, y: 650 }, { x: 1180, y: 550 }],
    enemies: [{ id: 'formation-mage', type: 'mage', x: 740, y: 300 }, { id: 'formation-hunter', type: 'hunter', x: 900, y: 480 }],
    paths: [[{ x: 150, y: 650 }, { x: 500, y: 520 }, { x: 700, y: 400 }, { x: 1000, y: 400 }, { x: 1150, y: 300 }, { x: 1100, y: 190 }]],
    landmarks: [{ x: 680, y: 70, label: '迦南外院 · 双阵协作' }, { x: 650, y: 750, label: '集合 → 西阵守护 → 东阵共鸣 → 入院审核' }],
  },
  14: {
    id: 'inner-academy-hunt-paths', style: 'academy', gateLabel: '强榜演武台', rankingArena: true,
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1120, y: 160 }, bossSpawn: { x: 1060, y: 270 }, safeRadius: 150,
    obstacles: [{ x: 400, y: 100, w: 170, h: 150 }, { x: 820, y: 80, w: 120, h: 130 }, { x: 570, y: 630, w: 150, h: 100 }],
    herbs: [{ x: 330, y: 370 }, { x: 730, y: 570 }, { x: 1100, y: 680 }],
    enemies: [{ id: 'hunt-west-brute', type: 'brute', x: 720, y: 330 },
      { id: 'hunt-east-mage', type: 'mage', x: 1050, y: 450 }, { id: 'hunt-east-hunter', type: 'hunter', x: 980, y: 530 }],
    paths: [[{ x: 150, y: 650 }, { x: 500, y: 520 }, { x: 740, y: 350 }, { x: 1050, y: 500 }, { x: 280, y: 625 }],
      [{ x: 1050, y: 500 }, { x: 1120, y: 160 }]],
    landmarks: [{ x: 670, y: 60, label: '迦南内院 · 磐门共同历练' }, { x: 900, y: 740, label: '双路猎捕 · 火能独立收支 · 强榜复练' }],
  },
  15: {
    id: 'blazing-tower-three-landings', style: 'fire-tower', gateLabel: '塔底危机',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1160, y: 120 }, bossSpawn: { x: 1110, y: 310 }, safeRadius: 150,
    obstacles: [{ x: 590, y: 250, w: 140, h: 110 }, { x: 800, y: 560, w: 140, h: 140 }, { x: 920, y: 60, w: 80, h: 100 }],
    herbs: [{ x: 330, y: 400 }, { x: 500, y: 180 }, { x: 1150, y: 700 }], enemies: [],
    towerFloors: [
      { center: { x: 700, y: 520 }, cooling: { x: 600, y: 520 }, duration: 8, pressure: 5, radius: 95 },
      { center: { x: 900, y: 380 }, cooling: { x: 800, y: 380 }, duration: 10, pressure: 7, radius: 95 },
      { center: { x: 1080, y: 220 }, cooling: { x: 980, y: 220 }, duration: 12, pressure: 9, radius: 95 },
    ],
    paths: [[{ x: 150, y: 650 }, { x: 500, y: 650 }, { x: 700, y: 520 }, { x: 900, y: 380 }, { x: 1080, y: 220 }, { x: 1160, y: 120 }],
      [{ x: 280, y: 625 }, { x: 500, y: 520 }, { x: 900, y: 450 }, { x: 1080, y: 220 }]],
    landmarks: [{ x: 610, y: 70, label: '天焚炼气塔 · 逐层镇炎' }, { x: 650, y: 755, label: '已完成台阶保留 · 镇心石降热 · 首通取得心炎' }],
  },
}
export const returnAndCentralMaps: Record<number, MapDefinition> = {
  16: {
    id: 'yunlan-return-sect', style: 'sect', gateLabel: '宗门决战碑',
    siegeDurations: [3, 4, 5],
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1160, y: 140 }, bossSpawn: { x: 1090, y: 260 }, safeRadius: 170,
    eventBarrier: { eventId: 'yunlan-three-sigil-siege', unlockedStage: 4, obstacle: { x: 1000, y: 155, w: 45, h: 190 } },
    obstacles: [{ x: 440, y: 100, w: 200, h: 190 }, { x: 790, y: 550, w: 200, h: 120 }, { x: 90, y: 300, w: 100, h: 110 },
      { x: 1000, y: 0, w: 45, h: 155 }, { x: 1000, y: 345, w: 45, h: 455 }],
    herbs: [{ x: 330, y: 410 }, { x: 680, y: 620 }, { x: 1080, y: 540 }, { x: 280, y: 170 }, { x: 1100, y: 310 }],
    enemies: [{ id: 'sect-stair-brute', type: 'brute', x: 700, y: 460 }, { id: 'sect-stair-hunter', type: 'hunter', x: 700, y: 370 },
      { id: 'sect-court-mage', type: 'mage', x: 840, y: 470 }, { id: 'sect-hall-hunter', type: 'hunter', x: 750, y: 230 }],
    paths: [[{ x: 150, y: 650 }, { x: 300, y: 430 }, { x: 650, y: 430 }, { x: 900, y: 380 }, { x: 1160, y: 140 }],
      [{ x: 300, y: 430 }, { x: 300, y: 170 }]],
    landmarks: [{ x: 690, y: 65, label: '再临云岚 · 宗门台阶' }, { x: 690, y: 750, label: '清理守阵投影 → 连续破阵 → 回报 → 决战' }],
  },
  17: {
    id: 'flame-alliance-hall', style: 'alliance', gateLabel: '炎盟防线',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1140, y: 220 }, bossSpawn: { x: 1080, y: 350 }, safeRadius: 170,
    obstacles: [{ x: 450, y: 100, w: 190, h: 190 }, { x: 800, y: 560, w: 170, h: 120 }, { x: 350, y: 540, w: 120, h: 120 }],
    herbs: [{ x: 300, y: 400 }, { x: 700, y: 600 }, { x: 1040, y: 630 }, { x: 760, y: 180 }, { x: 280, y: 170 }],
    enemies: [{ id: 'alliance-west-brute', type: 'brute', x: 630, y: 430 }, { id: 'alliance-east-mage', type: 'mage', x: 1050, y: 490 },
      { id: 'alliance-east-hunter', type: 'hunter', x: 850, y: 340 }],
    paths: [[{ x: 150, y: 650 }, { x: 280, y: 430 }, { x: 670, y: 430 }, { x: 1000, y: 430 }, { x: 1140, y: 220 }],
      [{ x: 670, y: 430 }, { x: 750, y: 180 }]],
    landmarks: [{ x: 680, y: 65, label: '炎盟 · 议事与防线' }, { x: 660, y: 750, label: '免费巡防 / 60金币补给 → 双驻点登记 → 边境试炼' }],
  },
  18: {
    id: 'central-thunder-mountain', style: 'thunder-path', gateLabel: '雷云山口', escapeRoute: true, thunderRoute: true, escapeDurations: [8, 10],
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1120, y: 160 }, bossSpawn: { x: 1080, y: 270 }, safeRadius: 170,
    obstacles: [{ x: 640, y: 0, w: 70, h: 300 }, { x: 640, y: 520, w: 70, h: 280 }, { x: 850, y: 500, w: 100, h: 100 }],
    herbs: [{ x: 320, y: 480 }, { x: 540, y: 250 }, { x: 990, y: 210 }, { x: 1120, y: 640 }, { x: 800, y: 410 }, { x: 430, y: 660 }],
    enemies: [],
    paths: [[{ x: 150, y: 650 }, { x: 340, y: 480 }, { x: 520, y: 400 }, { x: 760, y: 400 }, { x: 960, y: 320 }, { x: 1120, y: 160 }]],
    landmarks: [{ x: 1020, y: 65, label: '中州北域 · 雷云山径' }, { x: 440, y: 750, label: '西侧避雷石 → 穿过山口 → 东侧避雷石 → 撤离' }],
  },
  19: {
    id: 'star-pavilion-grove', style: 'star-pavilion', gateLabel: '师门联络审核', trialMode: 'assessment',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1120, y: 160 }, bossSpawn: { x: 1060, y: 270 }, safeRadius: 170,
    obstacles: [{ x: 430, y: 100, w: 170, h: 180 }, { x: 760, y: 540, w: 180, h: 120 }, { x: 80, y: 310, w: 110, h: 100 }],
    herbs: [{ x: 320, y: 440 }, { x: 640, y: 300 }, { x: 1020, y: 620 }, { x: 1080, y: 180 }, { x: 680, y: 640 }, { x: 300, y: 170 }],
    enemies: [{ id: 'star-west-hunter', type: 'hunter', x: 650, y: 370 },
      { id: 'star-east-mage', type: 'mage', x: 1030, y: 580 }, { id: 'star-east-brute', type: 'brute', x: 1000, y: 680 }],
    paths: [[{ x: 150, y: 650 }, { x: 300, y: 430 }, { x: 650, y: 420 }, { x: 980, y: 350 }, { x: 1120, y: 160 }],
      [{ x: 650, y: 420 }, { x: 660, y: 240 }]],
    landmarks: [{ x: 690, y: 65, label: '星陨阁 · 师门林径' }, { x: 680, y: 750, label: '两份记录 → 校对丹塔之行 → 返回登记 → 联络审核' }],
  },
}
export const dantaAndRescueMaps: Record<number, MapDefinition> = {
  20: {
    id: 'danta-dan-realm-valley', style: 'dan-realm', gateLabel: '大会成绩审核', expeditionDuration: 45, trialMode: 'assessment',
    lightningTrial: { center: { x: 1080, y: 300 }, radius: 170, duration: 18 },
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1150, y: 160 }, bossSpawn: { x: 1080, y: 300 }, safeRadius: 175,
    obstacles: [{ x: 460, y: 110, w: 170, h: 150 }, { x: 740, y: 500, w: 150, h: 160 }, { x: 930, y: 100, w: 70, h: 120 }],
    herbs: [{ x: 320, y: 440 }, { x: 680, y: 430 }, { x: 1050, y: 730 }, { x: 280, y: 100 }, { x: 680, y: 650 }, { x: 1100, y: 530 }],
    enemies: [{ id: 'dan-west-brute', type: 'brute', x: 600, y: 420 }, { id: 'dan-east-hunter', type: 'hunter', x: 940, y: 640 },
      { id: 'dan-east-mage', type: 'mage', x: 1060, y: 560 }, { id: 'dan-north-hunter', type: 'hunter', x: 1120, y: 320 }],
    paths: [[{ x: 150, y: 650 }, { x: 310, y: 430 }, { x: 650, y: 390 }, { x: 1010, y: 390 }, { x: 1150, y: 160 }],
      [{ x: 650, y: 390 }, { x: 650, y: 680 }, { x: 1060, y: 680 }]],
    landmarks: [{ x: 680, y: 60, label: '丹界药谷 · 大会历练' }, { x: 620, y: 755, label: '限时药材 → 控火成丹 → 丹雷生存 → 审核' }],
  },
  21: {
    id: 'danta-star-domain-platforms', style: 'star-domain', gateLabel: '星火收服台', trialMode: 'attunement',
    starTrial: { center: { x: 980, y: 350 }, radius: 200, cooling: [{ x: 860, y: 420 }, { x: 1110, y: 430 }],
      durations: [10, 12, 14], pressure: [9, 11, 13] },
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1150, y: 160 }, bossSpawn: { x: 1060, y: 300 }, safeRadius: 175,
    obstacles: [{ x: 410, y: 100, w: 140, h: 180 }, { x: 740, y: 560, w: 170, h: 140 }, { x: 930, y: 70, w: 80, h: 120 }],
    herbs: [{ x: 310, y: 440 }, { x: 640, y: 280 }, { x: 1010, y: 620 }, { x: 290, y: 170 }, { x: 680, y: 650 }, { x: 1080, y: 430 }],
    enemies: [],
    paths: [[{ x: 150, y: 650 }, { x: 300, y: 430 }, { x: 650, y: 420 }, { x: 1050, y: 400 }, { x: 1150, y: 160 }],
      [{ x: 650, y: 420 }, { x: 650, y: 240 }]],
    landmarks: [{ x: 680, y: 60, label: '丹塔星域 · 不灭星火' }, { x: 660, y: 755, label: '确认退路 → 星火引流 / 魂力稳固 / 不灭调息 → 收服' }],
  },
  22: {
    id: 'soul-prison-rescue-corridor', style: 'soul-prison', gateLabel: '撤离确认', trialMode: 'assessment',
    eventBarrier: { eventId: 'soul-prison-teacher-extraction', unlockedStage: 2, obstacle: { x: 620, y: 300, w: 70, h: 230 } },
    prisonPursuit: [{ id: 'prison-pursuit-hunter', type: 'hunter', x: 1170, y: 390 },
      { id: 'prison-pursuit-mage', type: 'mage', x: 1040, y: 170 }],
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1140, y: 150 }, bossSpawn: { x: 1090, y: 290 }, safeRadius: 175,
    obstacles: [{ x: 620, y: 0, w: 70, h: 300 }, { x: 620, y: 530, w: 70, h: 270 },
      { x: 910, y: 460, w: 100, h: 110 }, { x: 400, y: 140, w: 100, h: 100 }],
    herbs: [{ x: 310, y: 460 }, { x: 540, y: 310 }, { x: 800, y: 610 }, { x: 1070, y: 650 }, { x: 1000, y: 240 }, { x: 310, y: 170 }],
    enemies: [{ id: 'prison-outer-brute', type: 'brute', x: 510, y: 450 },
      { id: 'prison-inner-hunter', type: 'hunter', x: 830, y: 410 }, { id: 'prison-inner-mage', type: 'mage', x: 800, y: 320 },
      { id: 'prison-cell-mage', type: 'mage', x: 1100, y: 220 }],
    paths: [[{ x: 150, y: 650 }, { x: 330, y: 460 }, { x: 540, y: 410 }, { x: 780, y: 410 }, { x: 1060, y: 400 }, { x: 1140, y: 150 }]],
    landmarks: [{ x: 920, y: 60, label: '魂殿据点 · 禁魂长廊' }, { x: 500, y: 755, label: '退路 → 外廊 / 内封 / 囚牢 → 护送会合 → 撤离确认' }],
  },
}
export const ancientMaps: Record<number, MapDefinition> = {
  23: {
    id: 'ancient-clan-heaven-tomb', style: 'tomb', gateLabel: '天墓深处',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1140, y: 160 }, bossSpawn: { x: 1070, y: 300 }, safeRadius: 175,
    obstacles: [{ x: 430, y: 100, w: 140, h: 160 }, { x: 680, y: 550, w: 140, h: 130 },
      { x: 900, y: 90, w: 100, h: 130 }, { x: 60, y: 310, w: 120, h: 100 }],
    herbs: [{ x: 310, y: 440 }, { x: 640, y: 300 }, { x: 1010, y: 640 }, { x: 280, y: 170 }, { x: 620, y: 660 }, { x: 1120, y: 420 }],
    enemies: [{ id: 'tomb-outer-brute', type: 'brute', x: 620, y: 410 }, { id: 'tomb-middle-hunter', type: 'hunter', x: 850, y: 390 },
      { id: 'tomb-middle-mage', type: 'mage', x: 810, y: 260 }, { id: 'tomb-deep-hunter', type: 'hunter', x: 1030, y: 580 },
      { id: 'tomb-deep-mage', type: 'mage', x: 1150, y: 320 }],
    paths: [[{ x: 150, y: 650 }, { x: 310, y: 430 }, { x: 630, y: 390 }, { x: 830, y: 400 }, { x: 1090, y: 380 }, { x: 1140, y: 160 }],
      [{ x: 630, y: 390 }, { x: 610, y: 660 }]],
    landmarks: [{ x: 680, y: 60, label: '古族之行 · 天墓石径' }, { x: 650, y: 755, label: '外层石阶 · 中层遗迹 · 深层祭台' }],
  },
  24: {
    id: 'wilderness-bodhi-illusion-grove', style: 'bodhi', gateLabel: '菩提树前',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1140, y: 170 }, bossSpawn: { x: 1050, y: 330 }, safeRadius: 175,
    obstacles: [{ x: 420, y: 100, w: 150, h: 170 }, { x: 750, y: 550, w: 150, h: 120 },
      { x: 950, y: 70, w: 65, h: 140 }, { x: 70, y: 320, w: 90, h: 100 }],
    herbs: [{ x: 310, y: 440 }, { x: 630, y: 300 }, { x: 1020, y: 640 }, { x: 280, y: 170 }, { x: 650, y: 650 }, { x: 1110, y: 430 }],
    enemies: [{ type: 'brute', x: 590, y: 410 }, { type: 'hunter', x: 820, y: 410 }, { type: 'mage', x: 1060, y: 540 },
      { type: 'hunter', x: 700, y: 270 }, { type: 'mage', x: 1080, y: 260 }],
    paths: [[{ x: 150, y: 650 }, { x: 310, y: 430 }, { x: 650, y: 420 }, { x: 1020, y: 390 }, { x: 1140, y: 170 }],
      [{ x: 650, y: 420 }, { x: 660, y: 650 }]],
    landmarks: [{ x: 680, y: 60, label: '莽荒古域 · 菩提林' }, { x: 650, y: 755, label: '林间三径 · 静看心念' }],
  },
  25: {
    id: 'pure-lotus-fire-space', style: 'pure-fire', gateLabel: '净莲核心',
    camp: { x: 150, y: 650 }, spawn: { x: 210, y: 625 }, gate: { x: 1150, y: 160 }, bossSpawn: { x: 1080, y: 320 }, safeRadius: 175,
    obstacles: [{ x: 410, y: 110, w: 140, h: 170 }, { x: 760, y: 550, w: 170, h: 120 },
      { x: 960, y: 60, w: 65, h: 140 }, { x: 80, y: 330, w: 90, h: 100 }],
    herbs: [{ x: 310, y: 440 }, { x: 650, y: 300 }, { x: 1040, y: 650 }, { x: 280, y: 160 }, { x: 650, y: 650 }, { x: 1120, y: 450 }],
    enemies: [{ type: 'brute', x: 600, y: 410 }, { type: 'mage', x: 830, y: 330 }, { type: 'hunter', x: 1040, y: 550 },
      { type: 'mage', x: 720, y: 250 }, { type: 'hunter', x: 1130, y: 290 }],
    paths: [[{ x: 150, y: 650 }, { x: 310, y: 430 }, { x: 660, y: 420 }, { x: 1060, y: 400 }, { x: 1150, y: 160 }],
      [{ x: 660, y: 420 }, { x: 660, y: 650 }]],
    landmarks: [{ x: 680, y: 60, label: '妖火空间 · 净莲之境' }, { x: 660, y: 755, label: '白焰映照 · 净莲台' }],
  },
}
export function mapForChapter(id: number): MapDefinition { return wutanMaps[id] ?? mountainMaps[id] ?? desertMaps[id] ?? capitalMaps[id] ?? blackCornerMaps[id] ?? academyMaps[id] ?? returnAndCentralMaps[id] ?? dantaAndRescueMaps[id] ?? ancientMaps[id] ?? legacy }
export function mapCollides(map: MapDefinition, point: Point, radius = 17): boolean {
  return map.obstacles.some(o => point.x > o.x - radius && point.x < o.x + o.w + radius
    && point.y > o.y - radius && point.y < o.y + o.h + radius)
}
export function hasLineOfSight(map: MapDefinition, from: Point, to: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8))
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    if (mapCollides(map, { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }, 0)) return false
  }
  return true
}
