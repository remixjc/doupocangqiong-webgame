export const auctionScenes = [
  { step: 0, station: 'entrance', operation: 'seat', title: '女侍引入，找一处偏僻座位', speaker: '往事手札',
    text: '女侍引萧炎进入已经开始的拍卖。他保持黑袍遮面，在偏僻处坐下，看见父亲与另外两家的头领在前排。',
    action: '随女侍入席 · 保持身份遮掩' },
  { step: 1, station: 'stage', operation: 'introduce', title: '雅妃介绍同一瓶制品', speaker: '雅妃',
    text: '女侍把装有白玉瓶的玉盘送到台上。雅妃介绍这份二品制品，并说明谷尼已经亲自鉴定；萧炎只是旁观自己的寄售。',
    action: '聆听雅妃介绍 · 核对同瓶来源' },
  { step: 2, station: 'seat', operation: 'early-bids', title: '竞价从人群转到前排', speaker: '往事手札',
    text: '人群从8500、9000抬到13000。加列毕出20000，奥巴帕跟到23000。萧炎安静坐着，自己没有出价。',
    action: '旁观竞价 · 记录23000' },
  { step: 3, station: 'seat', operation: 'rival-bids', title: '两家竞争至31000', speaker: '往事手札',
    text: '加列毕与奥巴帕继续竞争，报价来到31000。瓶仍在拍卖台，尚未落槌，萧炎还没有收到寄售款。',
    action: '观察两家竞价 · 记录31000' },
  { step: 4, station: 'seat', operation: 'father-bid', title: '萧战出价40000', speaker: '萧战',
    text: '萧战突然出价40000。另外两家的头领考虑后停止加价，雅妃再次询问是否有人跟价；这一刻仍待落槌。',
    action: '聆听父亲出价 · 等待落槌' },
  { step: 5, station: 'stage', operation: 'hammer', title: '雅妃敲槌，成交归萧战', speaker: '雅妃',
    text: '无人继续加价，雅妃敲槌，确认这瓶以40000成交给萧战。拍卖方暂时保管同瓶等待交付；萧炎尚未办理寄售收款。',
    action: '观察雅妃落槌 · 记录买方萧战' },
  { step: 6, station: 'stage', operation: 'next-lot', title: '下一件是另一只功法卷', speaker: '往事手札',
    text: '白玉瓶放回玉盘，雅妃推出银盘上的绿色功法卷，介绍为玄阶高级功法。这是另一个拍品，观察不会把它变成萧炎的技能。',
    action: '观察下件功法拍品 · 保留寄售成交记录' },
] as const

// Story amounts, never credited to any wallet. A bid is not a completed sale.
export function auctionBidAt(stage: number): number {
  return stage < 3 ? 0 : stage === 3 ? 23000 : stage === 4 ? 31000 : 40000
}
