export const qiScrollScenes = [
  { operation: 'inspect', title: '四十三号房的家族卷轴', text: '红幕已破，石桌上放着一卷与火属性相合的家族功法。先确认归属，再决定是否取走。', action: '查看家族卷轴 · 先不修炼' },
  { operation: 'take-family', title: '取下唯一家族卷', text: '萧炎取下这一卷家族功法。卷轴是独立任务物，不会改写焚诀或主线斗技。', action: '取下家族卷 · 交由本人保管' },
  { operation: 'secure', title: '收好卷轴', text: '卷轴暂由萧炎保管，等待登记；没有立即修炼，也没有发放额外属性。', action: '收好卷轴 · 保持待登记' },
  { operation: 'offer', title: '薰儿提出额外支持', text: '薰儿提出另取一卷更高品阶的火属性家族卷。提议与实际持有分开记录，玩家可以婉拒。', action: '听完薰儿的提议' },
  { operation: 'decline', title: '婉拒额外卷轴', text: '萧炎婉拒额外支持，只保留四十三号房取下的唯一家族卷。', action: '婉拒 · 只保留家族卷' },
  { operation: 'archive', title: '卷轴保管归档', text: '家族卷已由萧炎保管，薰儿的额外卷轴提议已婉拒；登记和离阁结果留待后续合法正文。', action: '归档卷轴保管' },
] as const
