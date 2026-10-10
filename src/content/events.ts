import type { Point } from './maps'

export interface ChapterEvent {
  id: string
  kind: 'training' | 'vow' | 'trade'
  title: string
  speaker: string
  npc: Point
  stages: string[]
  introduction: string
  note: string
  dummy?: Point
  checkpoints?: (Point & { label: string; text: string })[]
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
}
export function eventForChapter(id: number): ChapterEvent | undefined { return chapterEvents[id] }
