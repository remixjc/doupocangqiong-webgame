import { chapterById } from '../content/chapters'
import type { GameState, Settings } from './model'
import { bondSaveSummary } from './bonds'
import { parseSave, type SaveRecord } from './save'

export function earlyTrainingSaveSummary(saved: GameState, viewing: Settings): string {
  if (viewing.spoiler === 'anime' && viewing.animeLimit < 2) return '重修记录 · 当前范围封存'
  if (!saved.completed.includes(2)) return '重修记录 · 第2章首通后开放'
  const task = saved.earlyTraining
  if (!task.started) return '重修记录 · 尚未接取'
  const prefix = '重修记录 · '
  if (task.practice.phase === 4) return prefix + '初期尝试已归档'
  if (task.practice.phase === 3) return prefix + '斗技结果待记下'
  if (task.practice.phase === 2) return prefix + '调息通过，待试斗技'
  if (task.practice.phase === 1) return prefix + `调息 ${task.practice.pulse}/3 · ${task.practice.score}/300 · 重试${task.practice.attempts}次`
  if (task.liquid.ready) return prefix + '药液已备好，待调息'
  if (task.market.stage === 4) return prefix + `老师调制 ${task.liquid.stage}/6`
  const bought = Object.values(task.receipts).filter(Boolean).length
  if (bought === 3) return prefix + `采购齐备 · 坊市 ${task.market.stage}/4`
  if (bought > 0) return prefix + `采购 ${bought}/3 · 余额${task.purse.borrowed - task.purse.spent}`
  return prefix + (task.purse.borrowed ? '借资已记账，待采购' : '准备单已记下，待借资')
}

export function savePreviewSummary(saved: GameState, viewing: Settings): string {
  const visible = viewing.spoiler === 'novel' || saved.chapter <= viewing.animeLimit
  return `第 ${saved.chapter} 章 · ${visible ? chapterById(saved.chapter).title : '封存篇章'} · 已完成 ${saved.completed.length} 章 · ${bondSaveSummary(saved, viewing)} · ${earlyTrainingSaveSummary(saved, viewing)} · ${earlyBraceletSaveSummary(saved, viewing)} · ${earlyGrowthSaveSummary(saved, viewing)} · ${earlyHallSaveSummary(saved, viewing)} · ${earlyTeachingSaveSummary(saved, viewing)} · ${earlySupervisionSaveSummary(saved, viewing)} · ${earlyRecoverySaveSummary(saved, viewing)} · ${earlyConsignmentSaveSummary(saved, viewing)} · ${earlyAppraisalSaveSummary(saved, viewing)} · ${earlyAuctionSaveSummary(saved, viewing)} · ${earlySettlementSaveSummary(saved, viewing)} · ${earlyFatherGiftSaveSummary(saved, viewing)} · ${earlyXunerVisitSaveSummary(saved, viewing)} · ${earlyLongSuppliesSaveSummary(saved, viewing)} · ${earlyForestStrikeSaveSummary(saved, viewing)} · ${earlySeventhRoomSaveSummary(saved, viewing)} · ${earlyPalmPairSaveSummary(saved, viewing)} · ${earlyPreliminarySaveSummary(saved, viewing)} · ${earlyKeChallengeSaveSummary(saved, viewing)} · ${earlyEighthTrainingSaveSummary(saved, viewing)}`
}

export function earlyPalmPairSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.palmPair
  return '吸推两瓶 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 10 ? '第一只碎片与第二只细末已归档' : task.stage === 9 ? '第二只已成细末，待归档'
    : task.stage === 8 ? '第二只已吸近，待吹火掌切换' : task.stage === 7 ? '时段已记，第二只待吸'
    : task.stage === 6 ? '老师初练已过，待回顾时段' : task.stage === 5 ? `老师已讲解，初练${task.beats}/2`
    : task.stage === 4 ? '第一只已碎，尚未学吹火掌' : task.stage === 3 ? '第一只已吸近，待直接推风'
    : task.stage === 2 ? '直接风只摇动瓶，尚未外放' : task.stage === 1 ? '两只练习瓶就位' : '未参与')
}

export function earlyPreliminarySaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.preliminary
  return '一月前预测 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 0 ? '未参与' : task.stage === 16 ? saved.earlyTraining.keChallenge.stage === 12 ? '三人结果与后续应战已归档'
      : saved.earlyTraining.keChallenge.stage > 0 ? '三人结果已归档，后续应战进行中' : '三人结果已归档，待挑战'
    : task.stage >= 15 ? '预测已结束，待归档' : task.stage >= 13 ? '萧炎七段已宣读合格'
    : task.stage >= 11 ? '萧炎七段已触碑，待宣读' : task.stage >= 9 ? '已点名萧炎，待本人触碑'
    : task.stage >= 8 ? '薰儿一星斗者已记' : task.stage >= 7 ? '已点名薰儿，待测'
    : task.stage >= 6 ? '萧媚八段已记' : task.stage >= 5 ? '已点名萧媚，待测' : `入场候测 ${task.stage}/4`)
}

export function earlyKeChallengeSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.keChallenge
  return '萧克挑战 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 0 ? '未参与' : task.stage === 12 ? '胜负与离场邀请已归档'
    : task.stage >= 11 ? '次日邀请已记，待归档' : task.stage >= 5 ? `父亲已宣布胜负，离场${task.stage - 5}/6`
    : task.stage === 4 ? '萧克倒地，待父亲宣布' : task.stage === 3 ? `侧避反击${task.beats}/2，重开${task.attempts}次` : '准备应战')
}

export function earlySeventhRoomSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.seventhRoom
  return '房中七段 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 8 ? '故事七段已归档，一滴补液保留' : task.stage === 7 ? '故事七段已感知，待归档'
    : task.stage === 6 ? '时段已回顾，尚待感知七段' : task.stage === 5 ? '补液后调息已完成，待回顾时段'
    : task.stage === 4 ? `老师一滴已入水，继续调息${task.beats}/3` : task.stage === 3 ? '本次水已清，尚待老师补液'
    : task.stage === 2 ? '本次药色渐淡，待观察'
    : task.stage === 1 ? `本次绿色药液，调息${task.beats}/2` : '未参与')
}

export function earlyLongSuppliesSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.longSupplies
  return '长期物资回溯 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 6 ? '两类物资已藏柜归档' : task.stage === 5 ? '原包已移入柜，待合柜'
    : task.stage === 4 ? '标签已核，待藏柜' : task.stage === 3 ? '两格已分好，待核标签'
    : task.stage === 2 ? '药材已分格，魔核待分' : task.stage === 1 ? '已展开另购原包，待分拣' : '未参与')
}

export function earlyForestStrikeSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.forestStrike
  return '林中首次练技 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 7 ? '成功与下山已归档，当时七段仍是目标'
    : task.stage >= 4 ? '首次成功后已休息，待下山'
    : task.stage === 3 ? '树倒后当前耗尽，待青石休息'
    : task.stage === 2 ? `故事六段，连贯${task.beats}/3，重试${task.attempts}次`
    : task.stage === 1 ? '六段回顾已记，待首次成功练技' : '未参与')
}

export function earlyXunerVisitSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.xunerVisit
  return '薰儿事件 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 7 ? '长老收卡并回应，萧炎不知情'
    : task.stage === 6 ? '家族取得100000，待长老回应' : task.stage >= 4 ? '薰儿独自行动，尚未交卡'
    : task.stage > 0 ? `房中来访 ${task.stage}/7` : '未参与')
}

export function earlyFatherGiftSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.fatherGift
  return '父亲赠回 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 6 ? '同瓶已收好，由萧炎保管'
    : task.stage >= 4 ? '同瓶已交萧炎，待归档' : task.stage >= 2 ? '父亲携原瓶，待赠回'
    : task.stage > 0 ? '已回房，待来访' : '未参与')
}

export function earlySettlementSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.settlement
  return '寄售手续 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 7 ? '净款39200与贵宾卡已收，已离场'
    : task.net ? '净款39200已收，待离场' : task.stage === 5 ? '账单已核，待收绿色卡'
    : task.vip ? '贵宾卡已收，尚未收款' : task.stage > 0 ? `进行中 ${task.stage}/7` : '未参与')
}

export function earlyAuctionSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.auction
  return '首次拍卖 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage >= 6 ? saved.earlyTraining.fatherGift.stage >= 4 ? '成交后父亲已赠回同瓶' : saved.earlyTraining.fatherGift.stage >= 2 ? '萧战已携同瓶来访' : saved.earlyTraining.settlement.net ? '成交归萧战，净款已收，待交付' : '成交归萧战，待结算与交付'
    : task.stage === 5 ? '萧战已出价，待落槌'
    : task.stage > 0 ? `旁观 ${task.stage}/7` : '未参与')
}
export function earlyAppraisalSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.appraisal
  return '寄售鉴定 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 8 ? saved.earlyTraining.fatherGift.stage >= 4 ? '鉴定与入场已记，同瓶已赠回萧炎' : saved.earlyTraining.fatherGift.stage >= 2 ? '鉴定与入场已记，同瓶由萧战保管' : '持黑卡已入场，药液由拍卖方保管'
    : task.stage >= 7 ? '持入场黑卡，待入场' : task.stage >= 6 ? '二品已鉴定，待委托'
    : task.stage > 0 ? `进行中 ${task.stage}/8` : '未参与')
}

export function earlyConsignmentSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.consignment
  return '首次寄售准备 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 5 ? saved.earlyTraining.fatherGift.stage >= 4 ? '父亲已赠回同瓶，萧炎保管' : task.owner === 'xiaozhan' ? '寄售同瓶由父亲萧战保管' : task.owner === 'xiaoyan' ? '待售玉瓶由萧炎保管，待鉴定' : task.owner === 'auction' ? '待售玉瓶由拍卖方保管' : '待售玉瓶已交鉴定'
    : task.stage === 4 ? '老师已调制，待装瓶' : task.stage >= 2 ? `齐备，巷中进行 ${task.stage}/5`
    : task.stage === 1 ? `采购 ${Object.values(task.receipts).filter(Boolean).length}/4 · 余额${task.funds - task.spent}` : '未参与')
}

export function earlyRecoverySaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.recovery
  return '回房恢复 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 7 ? '药力耗尽，五段故事结果已记下'
    : task.stage === 6 ? '时段已回顾，待感知结果'
    : task.stage >= 4 ? `药力耗尽，进行中 ${task.stage}/7`
    : task.stage === 3 ? '药色渐淡，进行中 3/7' : task.stage > 0 ? `进行中 ${task.stage}/7` : '未参与')
}

export function earlySupervisionSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.supervision
  return '后山督练 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 2 ? saved.earlyTraining.recovery.stage >= 5 ? '本轮已记下，已回房恢复' : '本轮已记下，待恢复' : task.stage === 1 ? `承接 ${task.pulses}/4`
    : task.attempts > 0 ? `本轮已停下，重开${task.attempts}次` : '未参与')
}

export function earlyTeachingSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.teaching.stage
  return '老师传技 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : stage === 0 ? '未参与' : stage === 5 ? saved.earlyTraining.supervision.stage > 0 ? '已归档' : '已归档，尚待监督训练' : `进行中 ${stage}/5`)
}

export function earlyHallSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.hall.stage
  return '斗技堂 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : stage === 0 ? '未到访' : stage === 1 ? '已到访，待借卷' : stage === 9 ? '已离堂，借卷由萧炎保管'
    : stage >= 8 ? '借阅已登记，待离堂' : stage === 7 ? '已选另一卷，待登记' : `堂内进行中 ${stage - 1}/8`)
}

export function earlyGrowthSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.growth.stage
  return '成长过渡 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : stage === 3 ? '已翻阅' : stage === 0 ? '未翻阅' : `翻阅中 ${stage}/3`)
}

export function earlyBraceletSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.bracelet.stage
  return '手链往事 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 2 ? '当前范围封存'
    : stage === 6 ? '已归档' : stage === 0 ? '未参与' : `进行中 ${stage}/6`)
}

export function saveRecordSummary(entry: SaveRecord, viewing: Settings): string {
  try { return savePreviewSummary(parseSave(entry.text), viewing) }
  catch { return '存档异常，可尝试恢复上一份自动备份' }
}

export function earlyEighthTrainingSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.eighthTraining
  return '礼前八段 · ' + (viewing.spoiler === 'anime' && viewing.animeLimit < 3 ? '当前范围封存'
    : task.stage === 15 ? '同行与故事八段已归档' : task.stage === 14 ? '故事八段已感知，待归档'
    : task.stage === 13 ? '夜间调息已过，尚待感知八段' : task.stage === 12 ? `夜间少量药力，调息${task.beats}/2`
    : task.stage >= 10 ? '未突破的时段已记，待夜间练习' : task.stage === 9 ? '本轮练技与调息已过，待回顾时段'
    : task.stage === 8 ? `回房调息${task.beats}/3` : task.stage === 7 ? `清晨吸推复习${task.beats}/2`
    : task.stage >= 6 ? '次日同行已完成，待实际练习' : task.stage >= 1 ? '已约好，次日同行未完成' : '未参与')
}
