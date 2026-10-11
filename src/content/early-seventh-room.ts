// Chapter 27 fact sequence; all dialogue, stations and timing are original.
export const seventhRoomScenes = [
  { station: 'window', operation: 'enter', title: '秋光入室', text: '林中练技之后，时序来到秋日。过去一个月的几次尝试尚未成功，今日重新入定。', action: '回顾时序 · 就位调息' },
  { station: 'basin', operation: 'breathe', title: '先收心，再调息', text: '保持专注，用两次连贯呼吸承接这一轮。木盆中的绿色药液随着吸收逐渐变淡。', action: '凝定调息' },
  { station: 'basin', operation: 'observe', title: '药色渐淡', text: '眼前药色淡去，绿色气流减弱。先看清容器状态，再等待老师。', action: '观察药液 · 水已变清' },
  { station: 'ring', operation: 'refill', title: '古戒补入一滴', text: '古戒微亮。萧炎继续入定，观察药老从戒中补液；这一滴入盆后，清水将重新染绿。', action: '观察药老补一滴' },
  { station: 'basin', operation: 'breathe', title: '继续承接新的药力', text: '保持呼吸，接续三步调息。即使停下来重试，已补入的这一滴仍留在本次容器记录中。', action: '继续调息' },
  { station: 'window', operation: 'hour', title: '一小时的故事时段', text: '这一段专注修炼持续约一小时，盆中深绿色又淡了几分。这里用一页回顾压缩时段，接着感知结果。', action: '记下时段 · 尚待感知' },
  { station: 'basin', operation: 'sense', title: '吐息后感知', text: '呼吸渐缓。先吐息，再静心感知体内斗气，确认这次跨越是否已经稳定。', action: '感知完成 · 记录故事七段' },
  { station: 'window', operation: 'archive', title: '把这一轮记下', text: '七段的故事结果已经成立。收好记录，后续吸掌与推风练习另行接续。', action: '归档房中七段' },
] as const
export const seventhEnergyLabels = { unobserved: '本次尚未入定', active: '本次绿色药液', fading: '本次药色渐淡',
  clear: '本次水已变清', restored: '老师一滴已入水，再现深绿', lighter: '补液后药色淡了几分' } as const
