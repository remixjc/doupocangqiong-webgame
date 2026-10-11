import type { ChapterEvent } from './events'

export type PreparationOperation = 'isolate' | 'cool' | 'rest'
export const preparationLabels: Record<PreparationOperation, string> = {
  isolate: '隔离封存', cool: '缓慢冷却', rest: '停止操作并观察',
}
export const preparationProtocols = {
  steady: ['isolate', 'cool', 'rest'],
  premium: ['cool', 'rest', 'isolate'],
} as const
export const preparationEvents: { chapter: number; event: ChapterEvent }[] = [{
  chapter: 17,
  event: {
    id: 'doctor-risk-preparation', kind: 'preparation', optional: true, introducedVersion: '0.14.0',
    requires: ['doctor-poison-notes'],
    title: '小医仙 · 药材风险准备演练', speaker: '小医仙 · 留存练习札记', npc: { x: 120, y: 300 },
    stages: ['到隔离约定牌阅读练习规则', '取得三份练习凭证，顺序不限',
      '到演练盘选择隔离或缓释方案', '按方案完成第一步控制', '按方案完成第二步控制',
      '按方案完成第三步控制', '返回留存札记报告准备结果', '风险准备演练已归档'],
    introduction: '阅读毒体书简后，可以练习如何先做准备，再处理风险。先看隔离约定，再寻找三份练习凭证，顺序由你决定。到演练盘选择方案，并按照明确步骤操作。每次错误增加35演练风险，累计三次就放弃当前方案，凭证保留，可以免费重新选择。',
    note: '此为原创风险准备演练，札记不代表小医仙在此刻到场。三份凭证不是原著毒丹材料；练习不扣行囊材料、不生产毒丹、不表示毒体已被压制或控制。报告一次40积累与隔离方案恢复丹1/缓释方案回气丹1。完整原作材料、控制地点及过程继续校订。',
    checkpoints: [
      { x: 120, y: 470, label: '隔离约定牌', text: '先核对器皿、隔离区域和观察记录。三份都是练习凭证，不能用于原著毒丹配方。' },
      { x: 1100, y: 80, label: '器皿练习凭证', text: '已核对练习器皿。凭证仅用于本次演练，不进入行囊。' },
      { x: 1150, y: 730, label: '隔离练习凭证', text: '已核对练习隔离区域。凭证仅用于本次演练，不进入行囊。' },
      { x: 760, y: 70, label: '观察练习凭证', text: '已核对练习观察记录。三份齐全后去演练盘选择方案。' },
      { x: 240, y: 60, label: '风险演练盘', text: '隔离方案：隔离封存 → 缓慢冷却 → 停止操作并观察。缓释方案：缓慢冷却 → 停止操作并观察 → 隔离封存。错误累计三次放弃当前方案，保留凭证免费重选。' },
    ],
  },
}]
