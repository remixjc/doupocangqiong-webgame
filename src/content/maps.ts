import { enemy, eventBarrier, landmark, namedEnemy, purificationZone, towerFloor } from './content-records'
export function point(x: number, y: number): Point { return { x, y } }
function rectangle(x: number, y: number, w: number, h: number): MapObstacle { return { x, y, w, h } }
export interface Point { x: number; y: number }
export interface MapObstacle extends Point { w: number; h: number }
export interface PatrolDefinition { route: Point[]; detectionRadius: number }
export interface MapEnemy extends Point { type: 'brute' | 'hunter' | 'mage'; id?: string; patrol?: PatrolDefinition }
export interface TowerFloor { center: Point; cooling: Point; duration: number; pressure: number; radius: number }
export interface MapDefinition {
  id: string
  style: 'wilderness' | 'courtyard' | 'market' | 'cave' | 'guild' | 'desert-town' | 'fire-cavern' | 'tournament' | 'duel' | 'escape' | 'auction' | 'academy' | 'fire-tower' | 'sect' | 'alliance' | 'thunder-path' | 'star-pavilion' | 'dan-realm' | 'star-domain' | 'soul-prison' | 'tomb' | 'bodhi' | 'pure-fire' | 'coalition-front' | 'emperor-vault' | 'final-battle' | 'blood-realm' | 'emperor-flame' | 'legacy'
  trialMode?: 'assessment' | 'attunement'
  gateLabel?: string
  gatePrompt?: string
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
  finalArena?: { x: number; y: number; w: number; h: number }
  finalLabel?: string
  escapeRoute?: boolean
  thunderRoute?: boolean
  escapeDurations?: number[]
  expeditionDuration?: number
  lightningTrial?: { center: Point; radius: number; duration: number }
  starTrial?: { center: Point; radius: number; cooling: Point[]; durations: number[]; pressure: number[] }
  purificationZones?: { center: Point; radius: number; duration: number }[]
  defensePosts?: boolean
  vaultGuards?: MapEnemy[]
  prisonPursuit?: MapEnemy[]
  tombDurations?: number[]
  rankingArena?: boolean
  towerFloors?: TowerFloor[]
  siegeDurations?: number[]
}

export const MAP_WIDTH = 1280, MAP_HEIGHT = 800
const legacy: MapDefinition = {
  id: 'training-arena', style: 'legacy',
  camp: point(160, 640), spawn: point(210, 615), gate: point(1090, 180),
  bossSpawn: point(1020, 260), safeRadius: 105,
  obstacles: [
    rectangle(360, 140, 120, 80), rectangle(540, 560, 90, 90),
    rectangle(860, 360, 130, 70), rectangle(90, 350, 80, 80),
  ],
  herbs: [point(300, 550), point(550, 300), point(740, 640),
    point(1080, 500), point(850, 220), point(250, 200)],
  enemies: [enemy(['brute', 550, 470]), enemy(['hunter', 740, 360]),
    enemy(['mage', 1020, 610]), enemy(['hunter', 570, 260]), enemy(['mage', 1050, 390])],
  paths: [[point(150, 650), point(360, 480), point(680, 470), point(800, 270), point(1090, 180)]],
  landmarks: [],
}
export const wutanMaps: Record<number, MapDefinition> = {
  1: {
    ...legacy, id: 'xiao-back-mountain', style: 'wilderness', safeRadius: 230,
    obstacles: [
      rectangle(360, 140, 120, 80), rectangle(575, 555, 120, 75),
      rectangle(890, 365, 100, 105), rectangle(95, 335, 80, 100),
    ],
    landmarks: [landmark([375, 710, '药老指导 · 木桩演练']), landmark([665, 105, '后山山径'])],
  },
  2: {
    id: 'xiao-family-courtyard', style: 'courtyard',
    camp: point(150, 660), spawn: point(210, 635), gate: point(1090, 145),
    bossSpawn: point(1040, 235), safeRadius: 190,
    obstacles: [
      rectangle(470, 125, 275, 185), rectangle(335, 550, 180, 110),
      rectangle(835, 430, 160, 90), rectangle(80, 320, 90, 105),
    ],
    herbs: [point(300, 460), point(360, 705), point(805, 305),
      point(1080, 570), point(1060, 340), point(250, 130)],
    enemies: [enemy(['brute', 590, 385]), enemy(['hunter', 825, 235]), enemy(['mage', 1080, 455])],
    paths: [
      [point(150, 660), point(270, 430), point(330, 220)],
      [point(330, 220), point(350, 380), point(660, 410), point(760, 630), point(1060, 625)],
      [point(1060, 625), point(1110, 360), point(1090, 145)],
    ],
    landmarks: [landmark([610, 100, '萧家议事堂']), landmark([730, 745, '立约后的修炼之路'])],
  },
  3: {
    id: 'wutan-family-market', style: 'market',
    camp: point(130, 650), spawn: point(185, 620), gate: point(1100, 180),
    bossSpawn: point(1060, 280), safeRadius: 215,
    obstacles: [
      rectangle(365, 250, 125, 100), rectangle(560, 250, 120, 100),
      rectangle(770, 250, 120, 100), rectangle(390, 525, 180, 100),
      rectangle(795, 540, 180, 100),
    ],
    herbs: [point(310, 480), point(600, 200), point(730, 460),
      point(1050, 600), point(215, 200), point(630, 680)],
    enemies: [enemy(['brute', 620, 420]), enemy(['hunter', 1040, 530]), enemy(['mage', 1060, 340])],
    paths: [
      [point(130, 650), point(270, 430), point(1100, 430), point(1100, 180)],
      [point(270, 430), point(280, 185), point(980, 185)],
      [point(270, 430), point(650, 700), point(1090, 700)],
    ],
    landmarks: [landmark([820, 85, '乌坦城 · 萧家坊市']), landmark([680, 765, '补货与议价 · 原创经营历练'])],
  },
}
export const capitalMaps: Record<number, MapDefinition> = {
  9: {
    id: 'capital-alchemy-tournament', style: 'tournament', trialMode: 'assessment', gateLabel: '领奖台', gatePrompt: '提交大会成绩审核',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1100, 200), bossSpawn: point(1100, 200), safeRadius: 180,
    obstacles: [rectangle(400, 110, 150, 150), rectangle(710, 140, 140, 120),
      rectangle(470, 540, 120, 120), rectangle(820, 560, 150, 100)],
    herbs: [point(330, 400), point(650, 300), point(980, 700)],
    enemies: [],
    paths: [[point(150, 650), point(330, 400), point(1100, 400), point(1100, 200)],
      [point(330, 400), point(330, 220)]],
    landmarks: [landmark([650, 70, '帝都大会 · 岩枭之名']), landmark([650, 750, '初赛 → 复赛 → 决赛 · 成绩分轮保留'])],
  },
  10: {
    id: 'yunlan-duel-court', style: 'duel', gateLabel: '决斗碑',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1100, 220), bossSpawn: point(1050, 330), safeRadius: 150,
    duelArena: rectangle(500, 140, 700, 520),
    obstacles: [rectangle(400, 100, 60, 200), rectangle(80, 300, 100, 160), rectangle(340, 530, 100, 100)],
    herbs: [point(280, 410), point(1150, 720)],
    enemies: [],
    paths: [[point(150, 650), point(300, 400), point(880, 400), point(1100, 220)],
      [point(300, 400), point(330, 220)]],
    landmarks: [landmark([810, 80, '云岚宗 · 三年之约']), landmark([840, 740, '踏风突进 · 三叠风刃 · 旋风回旋'])],
  },
  11: {
    id: 'yunlan-mountain-escape', style: 'escape', escapeRoute: true, gateLabel: '山路出口',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1130, 180), bossSpawn: point(1130, 180), safeRadius: 150,
    obstacles: [rectangle(720, 0, 60, 320), rectangle(720, 470, 60, 330),
      rectangle(390, 340, 120, 90), rectangle(1020, 320, 100, 110), rectangle(80, 320, 110, 110)],
    herbs: [point(300, 480), point(630, 680), point(1130, 640)],
    enemies: [],
    paths: [[point(150, 650), point(350, 560), point(600, 460), point(600, 240)],
      [point(600, 240), point(630, 400), point(850, 400), point(950, 560), point(1160, 460), point(1130, 180)]],
    landmarks: [landmark([660, 70, '云岚山外 · 留得退路']), landmark([600, 750, '岩间掩体 → 中段山口 → 竹林掩体 → 出口'])],
  },
}
export const mountainMaps: Record<number, MapDefinition> = {
  4: {
    id: 'qingshan-hidden-cave', style: 'cave',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1090, 650),
    bossSpawn: point(1050, 550), safeRadius: 170,
    eventBarrier: eventBarrier(['hidden-cave-treasure', 2, rectangle(810, 350, 45, 100)]),
    obstacles: [
      rectangle(810, 0, 45, 350), rectangle(810, 450, 45, 350),
      rectangle(380, 140, 110, 80), rectangle(480, 570, 130, 100),
      rectangle(970, 80, 120, 80),
    ],
    herbs: [point(300, 550), point(400, 300), point(700, 700),
      point(1060, 300), point(1120, 500), point(250, 170)],
    enemies: [enemy(['brute', 480, 450]), enemy(['hunter', 740, 370]), enemy(['mage', 1050, 480])],
    paths: [
      [point(150, 650), point(280, 410), point(320, 215)],
      [point(280, 410), point(650, 400), point(895, 400), point(1060, 215)],
      [point(895, 400), point(1090, 650)],
    ],
    landmarks: [landmark([300, 100, '青山镇 · 洞口山径']), landmark([650, 300, '机关石室']),
      landmark([1070, 210, '洞穴深处 · 寻宝区域'])],
  },
  5: {
    id: 'purple-crystal-valley', style: 'wilderness',
    camp: point(150, 650), spawn: point(210, 625), gate: point(400, 450),
    bossSpawn: point(1120, 150), safeRadius: 180,
    survivalZone: rectangle(500, 130, 680, 390),
    obstacles: [
      rectangle(440, 180, 70, 110), rectangle(540, 680, 130, 80),
      rectangle(950, 580, 150, 120), rectangle(70, 320, 90, 110),
    ],
    herbs: [point(480, 630), point(720, 560), point(850, 600), point(1090, 320), point(600, 150), point(240, 180)],
    enemies: [enemy(['brute', 550, 540]), enemy(['hunter', 790, 400]), enemy(['mage', 1060, 360])],
    paths: [
      [point(150, 650), point(280, 625), point(500, 580), point(820, 420)],
      [point(280, 625), point(330, 400), point(330, 220), point(600, 320), point(920, 230)],
      [point(920, 230), point(800, 450), point(400, 450)],
    ],
    landmarks: [landmark([710, 75, '紫晶洞外 · 狮王警戒']), landmark([550, 740, '采药山谷 · 保护同伴'])],
  },
  6: {
    id: 'black-rock-alchemy-guild', style: 'guild', trialMode: 'assessment', gateLabel: '审核台', gatePrompt: '提交公会审核',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1090, 180),
    bossSpawn: point(1090, 260), safeRadius: 1280,
    obstacles: [
      rectangle(440, 100, 190, 160), rectangle(450, 540, 180, 130),
      rectangle(875, 520, 170, 130), rectangle(80, 330, 100, 100),
    ],
    herbs: [], enemies: [],
    paths: [
      [point(150, 650), point(300, 420), point(330, 220)],
      [point(330, 220), point(330, 400), point(740, 400), point(1090, 400), point(1090, 180)],
    ],
    landmarks: [landmark([770, 70, '黑岩城 · 炼药师公会']), landmark([720, 735, '练习材料由公会提供 · 认证不是丹药生产'])],
  },
}
export const desertMaps: Record<number, MapDefinition> = {
  7: {
    id: 'stone-desert-rescue-town', style: 'desert-town',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1090, 650),
    bossSpawn: point(1050, 550), safeRadius: 175,
    eventBarrier: eventBarrier(['stone-desert-rescue', 2, rectangle(870, 320, 40, 130)]),
    obstacles: [
      rectangle(870, 0, 40, 320), rectangle(870, 450, 40, 350),
      rectangle(440, 100, 170, 160), rectangle(440, 540, 150, 140),
      rectangle(80, 330, 100, 100),
    ],
    herbs: [point(320, 480), point(700, 580), point(690, 180), point(1050, 400)],
    enemies: [
      namedEnemy(['sand-alley-guard', 'brute', 700, 430]),
      namedEnemy(['sand-well-hunter', 'hunter', 1050, 320]),
      namedEnemy(['sand-well-mage', 'mage', 1120, 260]),
    ],
    paths: [
      [point(150, 650), point(300, 420), point(350, 220)],
      [point(350, 220), point(350, 400), point(700, 400), point(950, 380), point(1060, 230)],
      [point(950, 380), point(1090, 650)],
    ],
    landmarks: [landmark([690, 60, '石漠城 · 漠铁佣兵团']), landmark([690, 750, '解救团员 · 原创救援历练'])],
  },
  8: {
    id: 'lotus-fire-cavern', style: 'fire-cavern', trialMode: 'attunement', gateLabel: '收服台', gatePrompt: '确认青莲收服',
    heatZone: { x: 600, y: 210, w: 620, h: 470, cooling: [point(680, 270), point(1030, 570)] },
    camp: point(150, 650), spawn: point(210, 625), gate: point(1100, 620),
    bossSpawn: point(1080, 510), safeRadius: 180,
    obstacles: [
      rectangle(400, 150, 100, 170), rectangle(660, 520, 130, 140),
      rectangle(910, 100, 100, 90), rectangle(70, 320, 100, 110),
    ],
    herbs: [point(320, 480), point(600, 180), point(850, 700), point(1050, 520), point(240, 180), point(600, 450)],
    enemies: [
      { id: 'snake-west-patrol', type: 'hunter', x: 550, y: 350, patrol: { detectionRadius: 180, route: [point(550, 350), point(780, 350), point(780, 460), point(550, 460)] } },
      { id: 'snake-east-patrol', type: 'hunter', x: 960, y: 250, patrol: { detectionRadius: 180, route: [point(960, 250), point(1150, 250), point(1150, 450), point(960, 450)] } },
      namedEnemy(['fire-cavern-guard', 'mage', 1050, 580]),
    ],
    paths: [
      [point(150, 650), point(310, 400), point(600, 400), point(850, 400), point(1030, 400), point(1100, 620)],
      [point(310, 400), point(330, 220), point(570, 350)],
    ],
    landmarks: [landmark([700, 70, '地底火域 · 蛇人巡逻']), landmark([1040, 350, '火域深处 · 收服区域'])],
  },
}
export const blackCornerMaps: Record<number, MapDefinition> = {
  12: {
    id: 'black-corner-auction-street', style: 'auction', gateLabel: '出发碑',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1100, 190), bossSpawn: point(1080, 310), safeRadius: 170,
    obstacles: [rectangle(410, 100, 130, 160), rectangle(610, 560, 150, 120),
      rectangle(920, 390, 90, 160), rectangle(80, 290, 120, 110)],
    herbs: [point(330, 470), point(600, 300), point(1100, 680)],
    enemies: [namedEnemy(['auction-street-brute', 'brute', 620, 450]), namedEnemy(['auction-street-mage', 'mage', 1050, 620])],
    paths: [[point(150, 650), point(330, 400), point(750, 400), point(1100, 260), point(1100, 190)],
      [point(330, 400), point(330, 220)]],
    landmarks: [landmark([710, 70, '黑角域 · 拍卖街区']), landmark([650, 750, '量力出价 · 超价退款 · 旁观也有退路'])],
  },
}
export const academyMaps: Record<number, MapDefinition> = {
  13: {
    id: 'academy-formation-ground', style: 'academy', trialMode: 'assessment', gateLabel: '入院审核', gatePrompt: '提交入院资格审核',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1100, 190), bossSpawn: point(1100, 190), safeRadius: 170,
    obstacles: [rectangle(390, 130, 120, 140), rectangle(780, 600, 150, 100), rectangle(1010, 90, 70, 170)],
    herbs: [point(330, 430), point(630, 650), point(1180, 550)],
    enemies: [namedEnemy(['formation-mage', 'mage', 740, 300]), namedEnemy(['formation-hunter', 'hunter', 900, 480])],
    paths: [[point(150, 650), point(500, 520), point(700, 400), point(1000, 400), point(1150, 300), point(1100, 190)]],
    landmarks: [landmark([680, 70, '迦南外院 · 双阵协作']), landmark([650, 750, '集合 → 西阵守护 → 东阵共鸣 → 入院审核'])],
  },
  14: {
    id: 'inner-academy-hunt-paths', style: 'academy', gateLabel: '强榜演武台', rankingArena: true,
    camp: point(150, 650), spawn: point(210, 625), gate: point(1120, 160), bossSpawn: point(1060, 270), safeRadius: 150,
    obstacles: [rectangle(400, 100, 170, 150), rectangle(820, 80, 120, 130), rectangle(570, 630, 150, 100)],
    herbs: [point(330, 370), point(730, 570), point(1100, 680)],
    enemies: [namedEnemy(['hunt-west-brute', 'brute', 720, 330]),
      namedEnemy(['hunt-east-mage', 'mage', 1050, 450]), namedEnemy(['hunt-east-hunter', 'hunter', 980, 530])],
    paths: [[point(150, 650), point(500, 520), point(740, 350), point(1050, 500), point(280, 625)],
      [point(1050, 500), point(1120, 160)]],
    landmarks: [landmark([670, 60, '迦南内院 · 磐门共同历练']), landmark([900, 740, '双路猎捕 · 火能独立收支 · 强榜复练'])],
  },
  15: {
    id: 'blazing-tower-three-landings', style: 'fire-tower', gateLabel: '塔底危机',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1160, 120), bossSpawn: point(1110, 310), safeRadius: 150,
    obstacles: [rectangle(590, 250, 140, 110), rectangle(800, 560, 140, 140), rectangle(920, 60, 80, 100)],
    herbs: [point(330, 400), point(500, 180), point(1150, 700)], enemies: [],
    towerFloors: [
      towerFloor([point(700, 520), point(600, 520), 8, 5, 95]),
      towerFloor([point(900, 380), point(800, 380), 10, 7, 95]),
      towerFloor([point(1080, 220), point(980, 220), 12, 9, 95]),
    ],
    paths: [[point(150, 650), point(500, 650), point(700, 520), point(900, 380), point(1080, 220), point(1160, 120)],
      [point(280, 625), point(500, 520), point(900, 450), point(1080, 220)]],
    landmarks: [landmark([610, 70, '天焚炼气塔 · 逐层镇炎']), landmark([650, 755, '已完成台阶保留 · 镇心石降热 · 首通取得心炎'])],
  },
}
export const returnAndCentralMaps: Record<number, MapDefinition> = {
  16: {
    id: 'yunlan-return-sect', style: 'sect', gateLabel: '宗门决战碑',
    siegeDurations: [3, 4, 5],
    camp: point(150, 650), spawn: point(210, 625), gate: point(1160, 140), bossSpawn: point(1090, 260), safeRadius: 170,
    eventBarrier: eventBarrier(['yunlan-three-sigil-siege', 4, rectangle(1000, 155, 45, 190)]),
    obstacles: [rectangle(440, 100, 200, 190), rectangle(790, 550, 200, 120), rectangle(90, 300, 100, 110),
      rectangle(1000, 0, 45, 155), rectangle(1000, 345, 45, 455)],
    herbs: [point(330, 410), point(680, 620), point(1080, 540), point(280, 170), point(1100, 310)],
    enemies: [namedEnemy(['sect-stair-brute', 'brute', 700, 460]), namedEnemy(['sect-stair-hunter', 'hunter', 700, 370]),
      namedEnemy(['sect-court-mage', 'mage', 840, 470]), namedEnemy(['sect-hall-hunter', 'hunter', 750, 230])],
    paths: [[point(150, 650), point(300, 430), point(650, 430), point(900, 380), point(1160, 140)],
      [point(300, 430), point(300, 170)]],
    landmarks: [landmark([690, 65, '再临云岚 · 宗门台阶']), landmark([690, 750, '清理守阵投影 → 连续破阵 → 回报 → 决战'])],
  },
  17: {
    id: 'flame-alliance-hall', style: 'alliance', gateLabel: '炎盟防线',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1140, 220), bossSpawn: point(1080, 350), safeRadius: 170,
    obstacles: [rectangle(450, 100, 190, 190), rectangle(800, 560, 170, 120), rectangle(350, 540, 120, 120)],
    herbs: [point(300, 400), point(700, 600), point(1040, 630), point(760, 180), point(280, 170)],
    enemies: [namedEnemy(['alliance-west-brute', 'brute', 630, 430]), namedEnemy(['alliance-east-mage', 'mage', 1050, 490]),
      namedEnemy(['alliance-east-hunter', 'hunter', 850, 340])],
    paths: [[point(150, 650), point(280, 430), point(670, 430), point(1000, 430), point(1140, 220)],
      [point(670, 430), point(750, 180)]],
    landmarks: [landmark([680, 65, '炎盟 · 议事与防线']), landmark([660, 750, '免费巡防 / 60金币补给 → 双驻点登记 → 边境试炼'])],
  },
  18: {
    id: 'central-thunder-mountain', style: 'thunder-path', gateLabel: '雷云山口', escapeRoute: true, thunderRoute: true, escapeDurations: [8, 10],
    camp: point(150, 650), spawn: point(210, 625), gate: point(1120, 160), bossSpawn: point(1080, 270), safeRadius: 170,
    obstacles: [rectangle(640, 0, 70, 300), rectangle(640, 520, 70, 280), rectangle(850, 500, 100, 100)],
    herbs: [point(320, 480), point(540, 250), point(990, 210), point(1120, 640), point(800, 410), point(430, 660)],
    enemies: [],
    paths: [[point(150, 650), point(340, 480), point(520, 400), point(760, 400), point(960, 320), point(1120, 160)]],
    landmarks: [landmark([1020, 65, '中州北域 · 雷云山径']), landmark([440, 750, '西侧避雷石 → 穿过山口 → 东侧避雷石 → 撤离'])],
  },
  19: {
    id: 'star-pavilion-grove', style: 'star-pavilion', gateLabel: '师门联络审核', trialMode: 'assessment', gatePrompt: '提交师门联络审核',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1120, 160), bossSpawn: point(1060, 270), safeRadius: 170,
    obstacles: [rectangle(430, 100, 170, 180), rectangle(760, 540, 180, 120), rectangle(80, 310, 110, 100)],
    herbs: [point(320, 440), point(640, 300), point(1020, 620), point(1080, 180), point(680, 640), point(300, 170)],
    enemies: [namedEnemy(['star-west-hunter', 'hunter', 650, 370]),
      namedEnemy(['star-east-mage', 'mage', 1030, 580]), namedEnemy(['star-east-brute', 'brute', 1000, 680])],
    paths: [[point(150, 650), point(300, 430), point(650, 420), point(980, 350), point(1120, 160)],
      [point(650, 420), point(660, 240)]],
    landmarks: [landmark([690, 65, '星陨阁 · 师门林径']), landmark([680, 750, '两份记录 → 校对丹塔之行 → 返回登记 → 联络审核'])],
  },
}
export const dantaAndRescueMaps: Record<number, MapDefinition> = {
  20: {
    id: 'danta-dan-realm-valley', style: 'dan-realm', gateLabel: '大会成绩审核', expeditionDuration: 45, trialMode: 'assessment', gatePrompt: '提交丹会成绩审核',
    lightningTrial: purificationZone([point(1080, 300), 170, 18]),
    camp: point(150, 650), spawn: point(210, 625), gate: point(1150, 160), bossSpawn: point(1080, 300), safeRadius: 175,
    obstacles: [rectangle(460, 110, 170, 150), rectangle(740, 500, 150, 160), rectangle(930, 100, 70, 120)],
    herbs: [point(320, 440), point(680, 430), point(1050, 730), point(280, 100), point(680, 650), point(1100, 530)],
    enemies: [namedEnemy(['dan-west-brute', 'brute', 600, 420]), namedEnemy(['dan-east-hunter', 'hunter', 940, 640]),
      namedEnemy(['dan-east-mage', 'mage', 1060, 560]), namedEnemy(['dan-north-hunter', 'hunter', 1120, 320])],
    paths: [[point(150, 650), point(310, 430), point(650, 390), point(1010, 390), point(1150, 160)],
      [point(650, 390), point(650, 680), point(1060, 680)]],
    landmarks: [landmark([680, 60, '丹界药谷 · 大会历练']), landmark([620, 755, '限时药材 → 控火成丹 → 丹雷生存 → 审核'])],
  },
  21: {
    id: 'danta-star-domain-platforms', style: 'star-domain', gateLabel: '星火收服台', trialMode: 'attunement', gatePrompt: '确认星火收服',
    starTrial: { center: point(980, 350), radius: 200, cooling: [point(860, 420), point(1110, 430)],
      durations: [10, 12, 14], pressure: [9, 11, 13] },
    camp: point(150, 650), spawn: point(210, 625), gate: point(1150, 160), bossSpawn: point(1060, 300), safeRadius: 175,
    obstacles: [rectangle(410, 100, 140, 180), rectangle(740, 560, 170, 140), rectangle(930, 70, 80, 120)],
    herbs: [point(310, 440), point(640, 280), point(1010, 620), point(290, 170), point(680, 650), point(1080, 430)],
    enemies: [],
    paths: [[point(150, 650), point(300, 430), point(650, 420), point(1050, 400), point(1150, 160)],
      [point(650, 420), point(650, 240)]],
    landmarks: [landmark([680, 60, '丹塔星域 · 不灭星火']), landmark([660, 755, '确认退路 → 星火引流 / 魂力稳固 / 不灭调息 → 收服'])],
  },
  22: {
    id: 'soul-prison-rescue-corridor', style: 'soul-prison', gateLabel: '撤离确认', trialMode: 'assessment', gatePrompt: '确认营救撤离',
    eventBarrier: eventBarrier(['soul-prison-teacher-extraction', 2, rectangle(620, 300, 70, 230)]),
    prisonPursuit: [namedEnemy(['prison-pursuit-hunter', 'hunter', 1170, 390]),
      namedEnemy(['prison-pursuit-mage', 'mage', 1040, 170])],
    camp: point(150, 650), spawn: point(210, 625), gate: point(1140, 150), bossSpawn: point(1090, 290), safeRadius: 175,
    obstacles: [rectangle(620, 0, 70, 300), rectangle(620, 530, 70, 270),
      rectangle(910, 460, 100, 110), rectangle(400, 140, 100, 100)],
    herbs: [point(310, 460), point(540, 310), point(800, 610), point(1070, 650), point(1000, 240), point(310, 170)],
    enemies: [namedEnemy(['prison-outer-brute', 'brute', 510, 450]),
      namedEnemy(['prison-inner-hunter', 'hunter', 830, 410]), namedEnemy(['prison-inner-mage', 'mage', 800, 320]),
      namedEnemy(['prison-cell-mage', 'mage', 1100, 220])],
    paths: [[point(150, 650), point(330, 460), point(540, 410), point(780, 410), point(1060, 400), point(1140, 150)]],
    landmarks: [landmark([920, 60, '魂殿据点 · 禁魂长廊']), landmark([500, 755, '退路 → 外廊 / 内封 / 囚牢 → 护送会合 → 撤离确认'])],
  },
}
export const ancientMaps: Record<number, MapDefinition> = {
  23: {
    id: 'ancient-clan-heaven-tomb', style: 'tomb', gateLabel: '离墓审核', trialMode: 'assessment', gatePrompt: '提交离墓审核', tombDurations: [45, 40, 35],
    camp: point(150, 650), spawn: point(210, 625), gate: point(1140, 160), bossSpawn: point(1070, 300), safeRadius: 175,
    obstacles: [rectangle(430, 100, 140, 160), rectangle(680, 550, 140, 130),
      rectangle(900, 90, 100, 130), rectangle(60, 310, 120, 100)],
    herbs: [point(310, 440), point(640, 300), point(920, 730), point(280, 170), point(620, 660), point(1120, 420)],
    enemies: [namedEnemy(['tomb-outer-brute', 'brute', 620, 410]), namedEnemy(['tomb-middle-hunter', 'hunter', 850, 390]),
      namedEnemy(['tomb-middle-mage', 'mage', 810, 260]), namedEnemy(['tomb-deep-hunter', 'hunter', 1030, 580]),
      namedEnemy(['tomb-deep-mage', 'mage', 1150, 320])],
    paths: [[point(150, 650), point(310, 430), point(630, 390), point(830, 400), point(1090, 380), point(1140, 160)],
      [point(630, 390), point(610, 660)]],
    landmarks: [landmark([680, 60, '古族之行 · 天墓石径']), landmark([650, 755, '三层限时探索 → 族史心念稳固 → 离墓审核'])],
  },
  24: {
    id: 'wilderness-bodhi-illusion-grove', style: 'bodhi', gateLabel: '菩提观心审核', trialMode: 'assessment', gatePrompt: '提交菩提观心审核',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1140, 170), bossSpawn: point(1050, 330), safeRadius: 175,
    obstacles: [rectangle(420, 100, 150, 170), rectangle(750, 550, 150, 120),
      rectangle(950, 70, 65, 140), rectangle(70, 320, 90, 100)],
    herbs: [point(310, 440), point(650, 270), point(1050, 730), point(280, 100), point(650, 650), point(1110, 430)],
    enemies: [],
    paths: [[point(150, 650), point(310, 430), point(650, 420), point(1020, 390), point(1140, 170)],
      [point(650, 420), point(660, 650)]],
    landmarks: [landmark([680, 60, '莽荒古域 · 菩提林']), landmark([650, 755, '碑记 → 欲念 / 旧影 / 岁月 → 观心确认'])],
  },
  25: {
    id: 'pure-lotus-fire-space', style: 'pure-fire', gateLabel: '净莲收服台', trialMode: 'attunement', gatePrompt: '确认净莲收服',
    purificationZones: [
      purificationZone([point(620, 470), 110, 8]),
      purificationZone([point(1080, 500), 110, 10]),
      purificationZone([point(720, 240), 110, 12]),
    ],
    camp: point(150, 650), spawn: point(210, 625), gate: point(1150, 160), bossSpawn: point(1080, 320), safeRadius: 175,
    obstacles: [rectangle(410, 110, 140, 170), rectangle(760, 550, 170, 120),
      rectangle(960, 60, 65, 140), rectangle(80, 330, 90, 100)],
    herbs: [point(310, 440), point(620, 120), point(1050, 750), point(280, 100), point(650, 750), point(1180, 650)],
    enemies: [],
    paths: [[point(150, 650), point(310, 430), point(660, 420), point(1060, 400), point(1150, 160)],
      [point(660, 420), point(660, 650)]],
    landmarks: [landmark([680, 60, '妖火空间 · 净莲之境']), landmark([660, 755, '三镜辨识 → 三段净化 → 回报 / 收服确认']),
      landmark([532, 470, '外焰西缘']), landmark([708, 470, '外焰东缘']),
      landmark([992, 500, '莲环西缘']), landmark([1168, 500, '莲环东缘']),
      landmark([658, 178, '核心西北缘']), landmark([782, 302, '核心东南缘'])],
  },
}
export const endgameMaps: Record<number, MapDefinition> = {
  26: {
    id: 'coalition-ancient-ruins-front', style: 'coalition-front', gateLabel: '联盟出征台', trialMode: 'assessment', gatePrompt: '确认联盟出征', defensePosts: true,
    camp: point(150, 650), spawn: point(210, 625), gate: point(1150, 160), bossSpawn: point(1070, 300), safeRadius: 175,
    obstacles: [rectangle(430, 100, 140, 140), rectangle(760, 540, 140, 110),
      rectangle(950, 70, 60, 130), rectangle(60, 330, 100, 100)],
    herbs: [point(310, 440), point(640, 270), point(1080, 650), point(280, 100), point(560, 750), point(1140, 420)],
    enemies: [],
    paths: [[point(150, 650), point(330, 440), point(650, 400), point(1030, 400), point(1150, 160)],
      [point(650, 400), point(650, 650)]],
    landmarks: [landmark([680, 60, '远古遗迹 · 联盟防线']), landmark([680, 755, '西侧前哨 / 东侧联络 / 后方撤离'])],
  },
  27: {
    id: 'tuoshe-emperor-origin-vault', style: 'emperor-vault', gateLabel: '本源传承审核', trialMode: 'assessment', gatePrompt: '提交本源传承审核',
    eventBarrier: eventBarrier(['emperor-vault-three-inscriptions', 5, rectangle(780, 300, 70, 220)]),
    vaultGuards: [namedEnemy(['vault-core-hunter', 'hunter', 1070, 410]), namedEnemy(['vault-core-mage', 'mage', 1100, 260])],
    camp: point(150, 650), spawn: point(210, 625), gate: point(1150, 150), bossSpawn: point(1080, 310), safeRadius: 175,
    obstacles: [rectangle(420, 90, 140, 160), rectangle(740, 550, 170, 110),
      rectangle(940, 60, 70, 150), rectangle(60, 320, 100, 100),
      rectangle(780, 0, 70, 300), rectangle(780, 520, 70, 280)],
    herbs: [point(300, 350), point(650, 140), point(1150, 740), point(280, 100), point(560, 750), point(1200, 560)],
    enemies: [],
    paths: [[point(150, 650), point(330, 430), point(650, 400), point(1030, 400), point(1150, 150)],
      [point(650, 400), point(660, 670)]],
    landmarks: [landmark([680, 60, '陀舍古帝洞府 · 本源石殿']), landmark([680, 755, '三铭封门 → 内殿记录 → 本源心念 / 审核'])],
  },
  28: {
    id: 'continent-final-battlefield', style: 'final-battle', gateLabel: '终战启程碑',
    finalArena: rectangle(760, 80, 480, 480),
    finalLabel: '大陆战场',
    camp: point(150, 650), spawn: point(210, 625), gate: point(1150, 160), bossSpawn: point(1050, 330), safeRadius: 175,
    obstacles: [rectangle(420, 100, 140, 130), rectangle(660, 560, 150, 110),
      rectangle(70, 320, 100, 100)],
    herbs: [point(310, 440), point(650, 270), point(1060, 670), point(280, 100), point(570, 670), point(1140, 450)],
    enemies: [],
    paths: [[point(150, 650), point(330, 440), point(650, 410), point(1010, 410), point(1150, 160)],
      [point(650, 410), point(570, 660)]],
    landmarks: [landmark([680, 60, '斗气大陆 · 最终战场']), landmark([680, 755, '故人之约 / 最后的防线 / 终战与归途'])],
  },
}
export const finalPhaseMaps: MapDefinition[] = [
  endgameMaps[28],
  {
    ...endgameMaps[28], id: 'final-blood-realm', style: 'blood-realm', finalLabel: '血环裂界',
    spawn: point(880, 330), bossSpawn: point(1080, 330),
    obstacles: [...endgameMaps[28].obstacles, rectangle(900, 180, 70, 90), rectangle(1110, 420, 80, 85)],
    landmarks: [landmark([680, 60, '终战二段 · 血环裂界']), landmark([680, 755, '绕开裂石 · 血环锁定后寻找空隙'])],
  },
  {
    ...endgameMaps[28], id: 'final-emperor-flame-realm', style: 'emperor-flame', finalLabel: '帝炎交界',
    spawn: point(900, 450), bossSpawn: point(1080, 280),
    obstacles: [...endgameMaps[28].obstacles, rectangle(790, 270, 80, 80), rectangle(1020, 410, 70, 80)],
    landmarks: [landmark([680, 60, '终战三段 · 帝炎交界']), landmark([680, 755, '交叉帝炎 · 收招反击后走向归途'])],
  },
]
export function finalMapForPhase(phase: number): MapDefinition { return finalPhaseMaps[phase - 1] ?? finalPhaseMaps[0] }
export function mapForChapter(id: number): MapDefinition { return wutanMaps[id] ?? mountainMaps[id] ?? desertMaps[id] ?? capitalMaps[id] ?? blackCornerMaps[id] ?? academyMaps[id] ?? returnAndCentralMaps[id] ?? dantaAndRescueMaps[id] ?? ancientMaps[id] ?? endgameMaps[id] ?? legacy }
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
