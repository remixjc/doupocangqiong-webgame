import type { Point } from './maps'

export interface ChapterEvent {
  id: string
  kind: 'training' | 'vow' | 'trade' | 'stone' | 'competition' | 'cave' | 'escort' | 'survival' | 'certification' | 'rescue' | 'flame' | 'tournament'
  introducedVersion?: string
  optional?: boolean
  requires?: string[]
  title: string
  speaker: string
  npc: Point
  stages: string[]
  introduction: string
  note: string
  dummy?: Point
  checkpoints?: (Point & { label: string; text: string; guards?: string[] })[]
}
export const chapterEvents: Record<number, ChapterEvent> = {
  1: {
    id: 'yao-training', kind: 'training', title: '药老指导', speaker: '药老',
    npc: { x: 285, y: 625 }, dummy: { x: 370, y: 630 },
    stages: ['靠近木桩，使用八极崩命中一次', '在木桩附近完成一次闪避', '斗技与闪避演练完成'],
    introduction: '先把力量用准，再把退路留好。接下演练后，向东走到木桩旁，按 1 释放八极崩；随后在木桩附近按空格闪避。手机可用下方斗技和闪避按钮。',
    note: '木桩演练是游戏原创教学，指导区域内普通敌人停止追击。',
  },
  2: {
    id: 'three-year-vow', kind: 'vow', title: '立约与启程', speaker: '萧战',
    npc: { x: 280, y: 630 },
    stages: ['前往祖训碑，按 E 记下初心', '前往演武台，按 E 立下约定', '前往出门路，按 E 确认启程', '三处立约足迹已完成'],
    introduction: '有些决定，得由你亲自迈出去。先走到祖训碑，再穿过演武台，最后到出门路。每到一处，按 E 留下一段誓言。三年后的胜负，仍由未来的你来回答。',
    note: '立约路线为游戏改编交互；本章的约定之战尚未发生。',
    checkpoints: [
      { x: 330, y: 220, label: '祖训碑', text: '记住家族给予的庇护，也记住自己为何要重新修炼。' },
      { x: 660, y: 410, label: '演武台', text: '把约定交给每一天的练习，不让旁人的目光代替自己的判断。' },
      { x: 1060, y: 625, label: '出门路', text: '从熟悉的院落走出去，准备亲自面对三年后的约定。' },
    ],
  },
  3: {
    id: 'family-market-order', kind: 'trade', title: '坊市供货', speaker: '坊市执事',
    npc: { x: 280, y: 640 },
    stages: ['和执事议定供货价格', '备好灵草 ×2、魔晶 ×1，回到执事处交付', '家族供货完成'],
    introduction: '家里的生意也需要你出一份力。这份订单收灵草两株、魔晶一枚，买方预算最多六十金币。先议价，再备货，最后到我这里交付；不够的材料可以采集、击败护卫投影或在坊市购买。',
    note: '订单与报价为游戏原创经营机制，只结算一次；不会重演原著中的商业细节。',
  },
  4: {
    id: 'hidden-cave-treasure', kind: 'cave', introducedVersion: '0.3.2',
    title: '洞穴 · 三符寻宝', speaker: '小医仙', npc: { x: 280, y: 625 },
    stages: ['前往北侧石刻，读出机关线索', '前往机关盘，按线索解开三符封门', '穿过开启的石门，打开洞内宝匣', '带着材料回到洞口，与小医仙确认返程', '洞穴探索完成'],
    introduction: '洞内的石门封住了去路。先到北侧石刻寻找提示，再到岩壁前的机关盘依序触碰三枚符文。开门后带回宝匣里的材料，我们在洞口会合。',
    note: '石刻、三符机关与材料宝匣为原创游戏化设计；不是原著宝物清单。错误输入免费重试，刷新保留已解开的符文与领取记录。',
    checkpoints: [
      { x: 320, y: 215, label: '石刻线索', text: '石刻：草木先醒，月照归途，最后一缕火光开启石门。顺序：叶 → 月 → 火。' },
      { x: 730, y: 400, label: '三符机关盘', text: '观察石刻的顺序，再触碰三符。' },
      { x: 1060, y: 270, label: '材料宝匣', text: '宝匣内是本次探索所得：灵草 ×3、魔晶 ×2、恢复丹 ×1。带回洞口，不要继续深入。' },
    ],
  },
  5: {
    id: 'mountain-herb-escort', kind: 'escort', introducedVersion: '0.4.0',
    title: '山谷 · 采药保护', speaker: '采药同伴', npc: { x: 280, y: 625 },
    stages: ['带同伴到南坡药圃，双方靠近后按 E 采药', '带同伴到山涧药圃，双方靠近后按 E 采药', '护送同伴返回洞口会合点', '采药同伴安全返营'],
    introduction: '山谷药圃沿途有魔兽。走在前方清理威胁，但不要把同伴甩在身后。同伴只在你附近时继续前进，双方都到达药圃后按 E 采药，最后返回洞口。',
    note: '采药保护为原创历练。同伴有独立生命，受伤倒下可营地休整免费重试。每处药圃只奖励一次灵草；刷新从最近完成的安全节点重建同伴。',
    checkpoints: [
      { x: 500, y: 580, label: '南坡药圃', text: '南坡灵草采集完成。继续去山涧，保护同伴跟上。' },
      { x: 820, y: 420, label: '山涧药圃', text: '山涧灵草采集完成。沿山谷返回洞口会合点。' },
      { x: 280, y: 625, label: '洞口会合点', text: '同伴已安全返营。去北侧寻找云韵，了解洞外的警戒。' },
    ],
  },
  6: {
    id: 'black-rock-certification', kind: 'certification', introducedVersion: '0.4.1',
    title: '黑岩城 · 控火认证', speaker: '认证执事', npc: { x: 280, y: 625 },
    stages: ['前往丹方台，按 E 记下三步火候', '前往公会药炉，开始控火认证', '提炼：指针靠近三成半火候时锁定', '融合：指针靠近六成火候时锁定', '凝丹：指针靠近五成火候时锁定', '考核通过，返回执事处登记', '控火认证已经登记'],
    introduction: '公会为认证准备了专用练习材料。先查看丹方台上的三步火候，再去药炉提炼、融合、凝丹。三次合计达到210分即可通过，最后回到执事处登记。',
    note: '认证丹方和分数为原创练习，不判定原著丹药品级。公会练习材料仅供认证、不进入行囊；失败免费重试，登记奖励40金币与50修炼积累，不额外生成丹药。',
    checkpoints: [
      { x: 330, y: 220, label: '丹方台', text: '公会练习丹方：提炼35% → 融合60% → 凝丹50%。合计210/300分通过；考核材料由公会提供。' },
      { x: 740, y: 400, label: '公会药炉', text: '公会药炉已备好练习材料，可以免费进行三步控火认证。' },
    ],
  },
  7: {
    id: 'stone-desert-rescue', kind: 'rescue', introducedVersion: '0.5.0',
    title: '石漠城 · 失散团员', speaker: '萧鼎', npc: { x: 280, y: 625 },
    stages: ['前往青鳞线索点，按 E 确认失散团员方位', '清除后巷守卫，在囚栏前按 E 解救第一位团员', '穿过开放巷道，清除水井守卫并解救第二位团员', '返回萧鼎处，报告两位团员已经脱险', '失散团员救援完成'],
    introduction: '有两位团员在城外失散。青鳞留下了他们最后的方向，先读巷口线索，再清除守在囚栏和水井旁的敌人。解救第一人后巷道才会开放，救出第二人后回来报平安。',
    note: '失散团员、守卫和封门是原创救援关卡，不复现原著具体绑架事件。各救援节点奖励一次恢复丹，最后报告一次50金币。重试保留已解救节点，未解救节点的守卫会重新出现。',
    checkpoints: [
      { x: 350, y: 220, label: '青鳞线索', text: '青鳞留下的方向：先找南侧后巷囚栏，再去北侧水井。囚栏附近还有守卫，必须清理后才能解救。' },
      { x: 700, y: 400, label: '后巷囚栏', text: '第一位团员已经脱险 · 恢复丹×1。后巷门已打开，继续寻找水井旁的同伴。', guards: ['sand-alley-guard'] },
      { x: 1060, y: 230, label: '水井囚栏', text: '第二位团员已经脱险 · 恢复丹×1。返回萧鼎处报告，不再深入沙漠。', guards: ['sand-well-hunter', 'sand-well-mage'] },
    ],
  },
  8: {
    id: 'lotus-fire-attunement', kind: 'flame', introducedVersion: '0.5.2',
    title: '青莲火域 · 三段控火', speaker: '药老', npc: { x: 280, y: 625 },
    stages: ['穿过巡逻区，到地底入口按 E 确认退路', '前往控火坛，开始三段火焰挑战',
      '火焰引流：躲开追踪落焰，坚持12秒', '熔脉绕行：避开交替火脉，坚持12秒', '火息凝定：避开大范围回涌，坚持12秒',
      '控火稳定，返回药老处确认', '控火准备完成，前往收服台'],
    introduction: '先留下退路，再面对火焰。穿过巡逻区确认入口，进入控火坛开始三段挑战。每段在火域内坚持12秒，热量过高会失控，青色冷却点可降温。最后回来确认，再去收服台。',
    note: '三段危险、热量与冷却点为原创收服玩法。专用练习补给不扣行囊材料；失败或刷新从当前安全阶段重建。完成事件不会提前发异火，第八章正式结算才取得青莲地心火。',
    checkpoints: [
      { x: 600, y: 220, label: '地底入口', text: '已确认退路。前往控火坛；追踪落焰、交替火脉、范围回涌需不同走位，青色冷却点可以降温。' },
      { x: 1000, y: 400, label: '控火坛', text: '进入火域后开始计时。保持走位，靠近青色冷却点，别让热量满格。' },
    ],
  },
  9: {
    id: 'capital-three-round-tournament', kind: 'tournament', introducedVersion: '0.6.0',
    title: '帝都 · 三轮炼药大会', speaker: '法犸', npc: { x: 280, y: 625 },
    stages: ['查看北侧赛程牌，确认三轮规则', '前往初赛炉，开始初赛', '初赛提炼：25%', '初赛融合：55%', '初赛凝丹：45%',
      '初赛通过，前往复赛炉', '复赛提炼：65%', '复赛融合：40%', '复赛凝丹：70%',
      '复赛通过，前往决赛炉', '决赛提炼：35%', '决赛融合：75%', '决赛凝丹：50%',
      '三轮通过，返回法犸处登记', '大会成绩已登记，前往领奖台'],
    introduction: '以岩枭之名报名，先看赛程，再到初赛、复赛和决赛三座炉台。每轮三步火候合计210分才通过，目标和指针速度每轮不同。失败仅重试当前轮，已通过成绩保留，最后回来登记。',
    note: '赛炉、火候与计分为原创大会玩法，不判定原著丹药品级。练习材料免费提供，不扣行囊或额外产丹。登记一次60金币 / 80修炼积累；领奖台审核后再营地结算。',
    checkpoints: [
      { x: 330, y: 220, label: '赛程牌', text: '各轮210/300分：初赛25 / 55 / 45%，复赛65 / 40 / 70%，决赛35 / 75 / 50%。后两轮指针加快；失败免费重试当前轮。' },
      { x: 580, y: 400, label: '初赛炉', text: '初赛：先稳定提炼，随后融合凝丹。' },
      { x: 850, y: 400, label: '复赛炉', text: '复赛：火候目标改变，注意更快的指针。' },
      { x: 1100, y: 400, label: '决赛炉', text: '决赛：冷静完成最后三步。' },
    ],
  },
  10: {
    id: 'yunlan-duel-approach', kind: 'vow', introducedVersion: '0.6.1',
    title: '云岚 · 赴约足迹', speaker: '药老', npc: { x: 280, y: 625 },
    stages: ['到山门约碑，确认三年之约', '到演武台入口，确认决斗规则', '赴约准备完成，前往决斗碑'],
    introduction: '先到北侧山门约碑记下这一路，再到演武台入口。决斗开始后只能在演武台内交锋；突进、三叠风刃、旋风有不同预警，招式结束后留下反击机会。',
    note: '赴约路线与三阶段招式为原创战斗设计，不代表原著招式参数。失败可休整重试，已确认路线保留；获胜后营地结算约定之战。',
    checkpoints: [
      { x: 330, y: 220, label: '山门约碑', text: '三年的路已走到这里。前往演武台入口，用自己的行动回应约定。' },
      { x: 880, y: 400, label: '演武台入口', text: '突进沿锁定路线、三叠风刃封锁横向区域、旋风围绕对手。预警出现后离开范围，收招时再反击；决斗期间演武台边界封闭。' },
    ],
  },
}
export const certificationTargets = [.35, .6, .5] as const
export const tournamentRounds = [
  { name: '初赛', targets: [.25, .55, .45], speed: 1 },
  { name: '复赛', targets: [.65, .4, .7], speed: 1.3 },
  { name: '决赛', targets: [.35, .75, .5], speed: 1.6 },
] as const
export function tournamentRound(stage: number) { return Math.min(2, Math.max(0, Math.floor((stage - 1) / 4))) }
export function eventForChapter(id: number): ChapterEvent | undefined { return chapterEvents[id] }
const adultEvents: ChapterEvent[] = [
  {
    id: 'adult-test-stone', kind: 'stone', title: '成人礼 · 控气测试', speaker: '测试石',
    npc: { x: 640, y: 165 }, requires: ['family-market-order'],
    stages: ['准备测试，失败可免费重试', '锁定第一道斗气', '锁定第二道斗气', '锁定第三道斗气', '控气测试通过'],
    introduction: '完成供货后，到测试石前练习稳定斗气。开始后，指针往返移动，在中央区域锁定三次。累计达到 180 / 300 分即通过；未达标可免费再试。',
    note: '评分属于游戏控气练习，不用于判定原著境界。关闭或刷新保留本次已锁定步数，重新打开后指针重新起动。',
  },
  {
    id: 'market-competition', kind: 'competition', optional: true, title: '坊市 · 竞争委托', speaker: '采购商',
    npc: { x: 730, y: 700 }, requires: ['family-market-order'],
    stages: ['选择稳妥或精品路线', '考察药材摊', '考察晶石摊', '考察交货台', '返回采购商处交付材料', '竞争委托完成'],
    introduction: '竞争订单只接一份。稳妥路线需灵草 ×2、魔晶 ×1，收入 70 金币；精品路线需依序考察三处摊位，再交灵草 ×4、魔晶 ×2，收入 135 金币与修炼丹 ×1。接单前比较材料和时间成本。',
    note: '原创经营支线，可选完成；选择后不能换路线，缺料可以补货，失败不扣材料，首通后不重复结算。',
    checkpoints: [
      { x: 310, y: 390, label: '药材摊', text: '先查看药材的新鲜度，再与店家核对来源。' },
      { x: 700, y: 390, label: '晶石摊', text: '记录晶石品相，为精品委托准备稳定的材料。' },
      { x: 1080, y: 700, label: '交货台', text: '精品路线考察完成，带齐材料返回采购商。' },
    ],
  },
]
const mountainEvents: ChapterEvent[] = [{
  id: 'lion-escape', kind: 'survival', introducedVersion: '0.4.0', requires: ['mountain-herb-escort'],
  title: '紫晶洞外 · 警戒撤离', speaker: '云韵', npc: { x: 330, y: 220 },
  stages: ['前往洞外警戒石，按 E 开始生存遭遇', '在紫色警戒区躲避预警，坚持 24 秒', '撤离窗口已开，前往西侧撤离标记', '已经安全撤离'],
  introduction: '狮王的力量远非你现在能对抗。到警戒石观察洞外动静，在紫色区域躲开落焰预警，坚持到撤离窗口开启，然后从西侧离开。攻击无法伤害狮王。',
  note: '此处是原创生存机制，不改写早期实力差距。菜单暂停计时，离开警戒区不计时；刷新或死亡重试从本段开始重新计时，已完成节点保留。',
  checkpoints: [
    { x: 920, y: 230, label: '洞外警戒石', text: '警戒开始。进入紫色区域，离开圆形落焰预警。' },
    { x: 400, y: 450, label: '西侧撤离标记', text: '已安全撤离，返回营地结算。本次没有击杀紫晶翼狮王。' },
  ],
}]
export function eventsForChapter(id: number): ChapterEvent[] {
  const primary = eventForChapter(id)
  return [...(primary ? [primary] : []), ...(id === 3 ? adultEvents : id === 5 ? mountainEvents : [])]
}
export function findEvent(chapter: number, eventId?: string): ChapterEvent | undefined {
  return eventId ? eventsForChapter(chapter).find(e => e.id === eventId) : eventForChapter(chapter)
}
