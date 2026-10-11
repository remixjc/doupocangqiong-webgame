export const earlyRecoveryScenes = [
  { step: 0, station: 'door', operation: 'return', title: '停练后回房', speaker: '药老',
    text: '本轮已停下。萧炎依老师提醒回到房中，准备在已有的盛水容器中恢复。',
    action: '从门边回房 · 查看容器' },
  { step: 1, station: 'container', operation: 'enter', title: '使用既有药液', speaker: '萧炎',
    text: '这是此前老师调制并加入清水的同一份修炼药液。萧炎进入容器，逐渐放松疲惫的姿态。',
    action: '进入容器 · 开始恢复' },
  { step: 2, station: 'container', operation: 'breathe', title: '呼吸渐稳，药色渐淡', speaker: '往事手札',
    text: '萧炎的呼吸慢慢平稳，药液的绿色逐渐变淡。把调息时机移到35%–65%，确认这一段恢复。',
    action: '调息 · 观察药色渐淡' },
  { step: 3, station: 'container', operation: 'rest', title: '休息中，药力用尽', speaker: '往事手札',
    text: '疲惫渐渐散去，萧炎在容器中休息。药色继续淡去，最后只余清水。用相同区间完成这一段。',
    action: '休息 · 观察药力耗尽' },
  { step: 4, station: 'container', operation: 'leave', title: '晨光下离开容器', speaker: '萧炎',
    text: '醒来时，晨光照进房间。萧炎舒展身体，离开已不再有药力的容器；后续修炼需要另筹材料。',
    action: '醒来 · 离开容器' },
  { step: 5, station: 'window', operation: 'review', title: '回顾此前持续训练', speaker: '往事手札',
    text: '这一天之前，萧炎一直在老师监督下训练并回房恢复。此处单独回顾跨越时日的成长，随后再记录结果。',
    action: '记下持续时段回顾 · 尚不记录五段' },
  { step: 6, station: 'window', operation: 'sense', title: '感知斗气，记录结果', speaker: '萧炎',
    text: '萧炎静心感知，确认故事中的斗之气五段。前面的准备、训练与恢复有了阶段结果，也面临新的物资需求。',
    action: '静心感知 · 记下五段故事结果' },
] as const

export const recoveryEnergyLabels = {
  unobserved: '药力尚未观察', active: '仍有药力', fading: '药色渐淡', spent: '药力耗尽 · 只余清水',
} as const
