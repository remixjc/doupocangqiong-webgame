export const qiAidScenes = [
  { place: 'fire', actor: 'xiaoyan', operation: 'walk-together', title: '出四十三号房，与薰儿同行', text: '萧炎持家族卷走出房间，等薰儿一同沿火通道前行；仍未离阁。', action: '与薰儿开始同行' },
  { place: 'room', actor: 'xuner', operation: 'select-second', title: '薰儿在火通道另选一卷', text: '薰儿进入一间小房取出玄阶低级卷，由她保管。这不是先前展示的支持卷，也不交给萧炎。', action: '薰儿取卷 · 独立保管' },
  { place: 'clock', actor: 'xiaoyan', operation: 'check-time', title: '看过其他通道，时限将近', text: '两人行看阁内。萧炎查看时间，准备向出口走。两小时以故事回顾呈现，不进行现实两小时计时或编造超时结果。', action: '核时限将近 · 向出口走' },
  { place: 'wind', actor: 'xiaoyan', operation: 'meet-barrier', title: '萧媚的风属性房门', text: '萧媚想取得黄阶高级风属性卷，门障仍完整。多人同时攻击会增强防御；旁人此前未能帮她破开。', action: '观察风属性门障' },
  { place: 'pass', actor: 'xiaoyan', operation: 'pass-by', title: '先经过门前', text: '萧炎先从萧媚身旁经过。此时红幕完整，援助尚未发生。', action: '确认已经过 · 门障仍完整' },
  { place: 'wind', actor: 'xiaoyan', operation: 'return', title: '回返萧媚房门', text: '萧炎转身走回，让萧媚让开，准备由自己独自发力。', action: '确认回返 · 独自准备' },
  { place: 'wind', actor: 'xiaoyan', operation: 'settle', title: '独自站定，再踢破门障', text: '先独自站定，再发力踢击；两步35%–65%时机为原创操作。失误可免费重来，门障与卷轴归属保留。', action: '独自站定 · 第一动作' },
  { place: 'wind', actor: 'mei', operation: 'thanks', title: '萧媚致谢与道歉', text: '门障破开后，萧媚向萧炎致谢并为先前态度道歉。没有关系积分或第二卷奖励。', action: '听完致谢与道歉' },
  { place: 'pass', actor: 'xiaoyan', operation: 'rejoin', title: '回到薰儿身边', text: '萧炎收脚、点头回应后走向薰儿，两人继续向出口方向走。登记和实际离阁尚未记下。', action: '与薰儿会合 · 仍在阁内' },
  { place: 'pass', actor: 'xiaoyan', operation: 'archive', title: '功法阁援助归档', text: '先经过、回返、独自破障与致谢道歉均已保存。各卷归属与正式登记、离阁保持独立。', action: '归档援助 · 登记待续' },
] as const
