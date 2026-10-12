// Original short adaptation of the end of licensed English13; purchase is in14.
export const marketDiscoveryScenes = [
  { actor: 'yan', operation: 'approach', title: '走过几处摊位', text: '二人继续走过摊位，萧炎在前方一个摊子停下。必须走近，尚未发现材料。', action: '本人带薰儿实际走近前方摊位' },
  { actor: 'yan', operation: 'find-core', title: '终于看见绿核', text: '萧炎俯身看向摊上的绿核，认出所找的魔核。它仍属于摊主，尚未询价或成交。', action: '本人发现摊上绿核' },
  { actor: 'yan', operation: 'reach', title: '手伸向摊面', text: '萧炎的手掠过摊面，准备查看魔核。这不是购买或交付。', action: '本人伸手准备查看魔核' },
  { actor: 'yan', operation: 'feel', title: '手忽然停住', text: '手到摊前时，萧炎察觉一丝异常的感应，动作顿住。', action: '本人察觉异常感应并停手' },
  { actor: 'yan', operation: 'scan', title: '目光扫过其他物品', text: '他没有立刻说明兴趣，目光转向摊上的其他货物。', action: '本人目光扫过摊上其他物品' },
  { actor: 'yan', operation: 'notice-iron', title: '看到一片黑色金属', text: '视线落在魔核旁的黑色金属片上。看见它不等于取得它。', action: '本人注意到魔核旁黑铁片' },
  { actor: 'yan', operation: 'inspect', title: '锈迹与泥土', text: '黑铁片显得古旧，表面有锈点和泥土，像刚被挖出。此时仍不能认定其中有什么。', action: '本人查看铁片的锈迹与泥土' },
  { actor: 'teacher', operation: 'advise', title: '心中传来的建议', text: '药老在萧炎心中传话，建议买下黑铁片，说它是好东西。建议不会代替卖家同意与付款。', action: '本人听见老师心中建议购买' },
  { actor: 'yan', operation: 'consider', title: '准备询价', text: '萧炎记下建议，准备继续和摊主交涉。尚未报价或付款，也未解释黑铁片中的斗技。', action: '本人记下建议，准备询价' },
  { actor: 'yan', operation: 'archive', title: '发现与购买建议归档', text: '绿核和黑铁片仍在摊上。询问来源、议价、同意与实际成交另段继续，原有收据保留。', action: '归档发现与心中购买建议' },
] as const
