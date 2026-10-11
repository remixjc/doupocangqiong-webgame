// Chapter 28: the first gust fails to externalize Qi, but the later
// pull + direct wind DOES break vase one before the teacher's lesson.
export const palmPairScenes = [
  { station: 'door', operation: 'ready', title: '七段之后，试试新想法', text: '本轮七段已经感知稳定。萧炎收拾妥当，在房中以两只花瓶观察吸力与推力。', action: '就位 · 分清两只练习瓶' },
  { station: 'table', operation: 'gust', title: '直接推风的局限', text: '直接催动斗气，只吹出一阵风，花瓶晃动。这次没有做到真正的斗气外放，不能记成大斗师能力。', action: '试出一阵风 · 观察局限' },
  { station: 'table', operation: 'pull-first', title: '第一只，先吸近', text: '退开几步，以吸掌把第一只花瓶拉近。第二只仍放在桌边，售品原瓶收好。', action: '吸掌 · 拉近第一只' },
  { station: 'table', operation: 'wind-first', title: '吸力与直接推风相接', text: '停下吸力，改用直接推风。这次两股力量相接，会把第一只花瓶击碎；这是初次试验，还没有老师的吹火掌。', action: '停吸转风 · 第一只成碎片' },
  { station: 'teacher', operation: 'teach', title: '药老看过碎片，正式讲解', text: '首次试验耗气很大。药老指出吸推组合的思路，随后传授能产生强风的吹火掌；它源自锻造炉火的经验。', action: '听药老讲解吹火掌' },
  { station: 'teacher', operation: 'practice', title: '先学基础，再做组合', text: '依老师指导做两步基础练习。失误可免费重试，不需要另造花瓶，第一只的碎片也不会复原。', action: '练习吹火掌基础' },
  { station: 'teacher', operation: 'period', title: '约两小时的学习时段', text: '在老师帮助下，约两小时后初步掌握。这是一页故事时段回顾，表示入门，不表示已经完全精通。', action: '记下初步学习时段' },
  { station: 'table', operation: 'pull-second', title: '最后一只，吸掌拉近', text: '对准剩下的第二只花瓶，先把它拉近，再停吸转为吹火掌。注意两种动作的切换。', action: '吸掌 · 拉近第二只' },
  { station: 'table', operation: 'palm-second', title: '停吸，再用吹火掌推出', text: '在35%–65%的原创窗口接上推掌，完成这一轮吸推组合。失误只让第二只归位重拉，第一只碎片保留。', action: '停吸转吹火掌 · 完成组合' },
  { station: 'door', operation: 'archive', title: '两个结果，一项新练习', text: '第一只留下碎片，第二只化为细末。吸推组合已试成，接下来仍要练习连贯切换，再迎接族中预测。', action: '归档吸推组合 · 记下后续练习' },
] as const
