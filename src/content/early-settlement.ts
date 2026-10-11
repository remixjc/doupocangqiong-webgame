export const FIRST_SALE_GROSS = 40000
export const FIRST_SALE_FEE = FIRST_SALE_GROSS * 2 / 100
export const FIRST_SALE_NET = FIRST_SALE_GROSS - FIRST_SALE_FEE
export const settlementScenes = [
  { step: 0, station: 'entrance', operation: 'finish-lot', title: '功法卷归加列毕，旁观结束', speaker: '往事手札',
    text: '功法卷的竞争继续，最终加列毕出550000，萧战退出竞价。雅妃落槌，这件功法归加列毕；萧炎起身准备离席。',
    action: '观察功法卷成交 · 结束旁观' },
  { step: 1, station: 'entrance', operation: 'return', title: '回到原鉴定室等候', speaker: '往事手札',
    text: '萧炎离开第一拍卖室，回到原鉴定室等候。雅妃与谷尼来到，手续仍在办理；黑袍身份保持隐蔽。',
    action: '回鉴定室 · 等雅妃与谷尼' },
  { step: 2, station: 'meeting', operation: 'privacy', title: '药老代言，守住身份', speaker: '药老',
    text: '雅妃询问来者身份。药老以苍老声音回应，表示不愿透露姓名；雅妃不再追问，萧炎继续藏在黑袍下。',
    action: '请药老回应 · 保持身份隐蔽' },
  { step: 3, station: 'meeting', operation: 'vip', title: '先收水晶贵宾卡', speaker: '雅妃',
    text: '雅妃交来带米特尔标识的水晶贵宾卡，说明持卡的拍卖手续费由5%降至2%。萧炎收卡，寄售款还没交付。',
    action: '接过水晶贵宾卡 · 记录2%费率' },
  { step: 4, station: 'desk', operation: 'bill', title: '核对药液成交与手续费', speaker: '雅妃',
    text: '女侍送来绿色储款卡。雅妃说明药液成交40000，按2%扣800手续费，净额39200；核对账单后再接收款卡。',
    action: '核对40000 − 800 = 39200 · 尚不收款' },
  { step: 5, station: 'desk', operation: 'collect', title: '接过绿色储款卡', speaker: '萧炎',
    text: '萧炎收下绿色储款卡，里面是这次药液寄售的净款39200。独立收款记录只记一次，行囊金币与备料余额分别保留。',
    action: '接受储款卡 · 唯一记录净款39200' },
  { step: 6, station: 'entrance', operation: 'leave', title: '办完手续，离开拍卖场', speaker: '往事手札',
    text: '药老确认可以离开，萧炎带着两张不同用途的卡告辞。药液的买方是萧战，同瓶仍待拍卖方交付。',
    action: '离开拍卖场 · 归档本次寄售手续' },
] as const
