const sealedEarly = '前期记录 · 当前范围封存'
const sealedLater = '后续记录 · 当前范围封存'
const sealedRange = '当前范围封存'
const notStarted = '未参与'
const notRecalled = '未回看'
import { chapterById } from '../content/chapters'
import type { GameState, Settings } from './model'
import { bondSaveSummary } from './bonds'
import { NewerSaveVersionError, parseSave, type SaveRecord } from './save'

function earlySummarySealed(viewing: Settings, chapter: number): boolean {
  return viewing.spoiler === 'anime' && viewing.animeLimit < chapter
}
export function compactSaveSummaries(summaries: string[]): string {
  return summaries.filter((text, i) => !summaries.some((other, j) => j !== i && (other.length > text.length || j < i) && other.includes(text))).join(' · ')
}

export function earlyTrainingSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return '重修记录 · 当前范围封存'
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

export function earlyFamilyVisitSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.familyVisit
  return '家族来访 · ' + (task.stage === 17 ? saved.earlyTraining.familyContract.stage > 0 ? '前半程归档，' + earlyFamilyContractSaveSummary(saved, viewing)
    : saved.earlyTraining.familyCompensation.stage === 15 ? '前半程与后续交涉已归档，文书待续'
    : saved.earlyTraining.familyCompensation.stage > 0 ? '前半程已归档，后续交涉进行中' : '前半程归档，补偿与文书待续'
    : task.box === 'presented' ? '玉匣已展示，仍属来客' : task.pressure === 'withdrawn' ? '父亲已收势，补偿待展示'
    : task.pressure === 'raised' ? '双方戒备，尚未交手' : task.request === 'spoken' ? '请求已公开，双方反应待续'
    : task.identity === 'nalan' ? '身份已听清，尚未公开请求' : task.seat === 'shared' ? '已在薰儿身旁落座'
    : task.seat === 'missing' ? '座位遗漏，尚未落座' : task.stage ? '清晨与入厅记录进行中' : notStarted)
}

export function earlyFamilyCompensationSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.familyCompensation
  return '补偿交涉 · ' + (task.stage === 15 ? saved.earlyTraining.familyContract.stage > 0 ? '前段归档，' + earlyFamilyContractSaveSummary(saved, viewing) : '前段已归档，文书与立约待续'
    : task.terms === 'offer-only' ? '已核追加条件未领取，待归档' : task.extra === 'offered' ? '追加条件已提出，仍未领物入宗'
    : task.consent === 'not-given' ? '祖父未同意已听清' : task.consent === 'asked' ? '已问祖辈同意，尚待答复'
    : task.elders === 'seated' ? '薰儿支持发言，长老已落座' : task.objection === 'spoken' ? '本人提出异议，交涉待续'
    : task.stage ? '丹药与炼药师知识说明进行中' : notStarted)
}

export function earlyFamilyContractSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.familyContract
  return '文书与离厅 · ' + (task.stage === 33 ? '赴约、文书与双方离厅已归档'
    : task.guests === 'left' ? '来客已离厅，待归档' : task.box === 'ring' ? '本人已离厅，玉匣回纳戒'
    : task.box === 'returned' ? '本人已离厅，已退匣未入纳戒' : task.paper === 'nalan' ? '本人已离厅，纳兰持文书'
    : task.yan === 'left' ? '本人已离厅，旁观尚待纳兰持文书' : task.challenge === 'pledged' ? '本人已承诺赴约，仍未离厅'
    : task.declaration === 'explained' ? '文书含义已说明，父亲处致意待续' : task.paper === 'table' ? '文书已置桌，仍未解释'
    : task.paper === 'marked' ? '文书已有印记，尚未置桌' : task.paper === 'written' ? '文书已写成，尚未标记或置桌'
    : task.paper === 'preparing' ? '已备纸，尚未写成' : task.challenge === 'renewed' ? '再次约定，尚待本人承诺'
    : task.challenge === 'proposed' ? '仅提出三年条件，尚未本人承诺' : task.stage ? '情绪与立场交涉进行中' : notStarted)
}

export function earlyMountainRingSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.mountainRing
  return '后山与古戒 · ' + (task.stage === 21 ? saved.earlyTraining.apprentice.stage > 0
    ? '前段归档，' + earlyApprenticeSaveSummary(saved, viewing) : '前段归档，取气答复与本人拜师待续'
    : task.future === 'asked' ? '已问今后取气，尚待答复' : task.ring === 'floating' ? '古戒浮空返回，尚未再佩戴'
    : task.ring === 'thrown' ? '古戒已抛出，尚未返回' : task.qi === 'admitted' ? '流失原因已承认，未补资源'
    : task.qi === 'asked' ? '已问流失原因，尚待承认' : task.qi === 'hinted' ? '已听供养线索，仍待问答'
    : task.voice === 'located' ? '声音已定位古戒，身份未公开' : task.voice === 'hinted' ? '已听手指提示，未定位'
    : task.voice !== 'silent' ? '已听声音，尚未定位' : task.stage ? '独自上山与心愿回顾' : notStarted)
}

export function earlyApprenticeSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.apprentice
  return '援助与拜师 · ' + (task.stage === 25 ? saved.earlyTraining.methodDiscussion.stage
    ? '本人礼成归档，' + earlyMethodDiscussionSaveSummary(saved, viewing) : '本人行礼与老师名字已归档，功法说明与正式返戒待续'
    : task.name === 'yaolao' ? '本人已行礼，已听老师名字，待归档'
    : task.rite === 'bowed' ? '本人已行礼，尚待听名字'
    : task.rite !== 'none' ? '青石前行礼要求已说明，尚未礼成'
    : task.choice === 'willing' ? '本人愿学，尚未行礼'
    : task.teacher === 'confirmed' ? '老师炼药资格已答复，尚未拜师'
    : task.alchemy === 'qualified' ? '本人资质已说明，尚未取得职业或拜师'
    : task.alchemy === 'eligibility-asked' ? '已问本人资质，尚待答复'
    : task.alchemy === 'offered' ? '炼药方向仅提议，资格与拜师待续'
    : task.aid === 'agreed' ? '援助交涉已答复，尚未拜师'
    : task.aid !== 'none' ? '本人援助条件交涉进行中'
    : task.target ? '一年七段仅目标，尚未达成'
    : task.promise === 'permission-required' ? '已听许可边界承诺，本人未授许可' : notStarted)
}

export function earlyMethodDiscussionSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.methodDiscussion
  return '功法说明 · ' + (task.stage === 28 ? saved.earlyTraining.preparationBrief.stage
    ? '仅说明已归档，未授卷；' + earlyPreparationBriefSaveSummary(saved, viewing) : '仅说明已归档，未授卷，准备与返戒待续'
    : task.viewing === 'deferred' ? '斗者后才传授，本段未授卷'
    : task.viewing === 'requested' ? '本人已请求查看，尚未给卷'
    : task.basis === 'method-text' ? '依据为功法文字，未视为实证'
    : task.otherTrial === 'untried' ? '老师与他人都未试，待问依据'
    : task.teacherTrial === 'untried' ? '老师未亲试，其他人待问答'
    : task.evolution !== 'unasked' ? '进化说明与本人追问进行中，未进化'
    : task.grade === 'low-huang' ? '未来功法黄阶低级答复，未取得'
    : task.offer !== 'none' ? '未来功法仅提议，未授卷'
    : task.sky === 'refused' ? '天阶请求被否定'
    : task.alchemy === 'prerequisites' ? '火属性与斗者前置已说明，未授职业'
    : task.foundation === 'explained' ? '基础已说明，炼药与功法问答待续'
    : task.stage ? '本人已问一年目标办法，待答' : notStarted)
}

export function earlyPreparationBriefSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.preparationBrief
  return '准备与返戒 · ' + (task.stage === 20 ? saved.earlyTraining.mountainVisitor.stage
    ? '历史说明归档，同戒返手；' + earlyMountainVisitorSaveSummary(saved, viewing) : '历史说明归档，同戒返手；既有借资采购进度保留'
    : task.visitor === 'purple-figure' ? '紫衣来人已看见，借资仍只打算'
    : task.funding === 'borrowing-planned' ? '本人决定借资，未到账'
    : task.funding !== 'unmentioned' ? '同戒返手，材料资金仍需筹措'
    : task.ring === 'worn' ? '同一古戒已返手，未新增装备'
    : task.elder === 'in-ring' ? '老师已入戒，古戒仍浮空'
    : task.woodCore ? '三类要求齐备，材料未取得'
    : task.main ? '材料要求逐项记录，尚未采购'
    : task.mild === 'proposed' ? '温和方案已提议，未调制'
    : task.oral === 'unsuitable' ? '当时不适合口服，方案待问'
    : task.training !== 'none' ? '一年目标与基础方案交涉中' : notStarted)
}

export function earlyMountainVisitorSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.mountainVisitor
  return '当晚来访 · ' + (task.stage === 26 ? saved.earlyTraining.morningCard.stage ? '当晚问答归档；' + earlyMorningCardSaveSummary(saved, viewing) : '本人离山与当晚问答归档，次晨交卡待续'
    : task.yan === 'left' ? '本人已离山，薰儿旁观反应待续'
    : task.yan === 'descending' ? '本人已走山径，离山确认待续'
    : task.invitation === 'tomorrow' ? '次日同行已邀请，尚未离山'
    : task.purpleCard === 'stowed' ? '紫金卡由薰儿收起，普通黑卡待次晨'
    : task.repayment === 'waived' ? '不必还回应已听，旧采购账未清'
    : task.repayment === 'promised' ? '本人承诺以后还，未实际还款'
    : task.purpleCard === 'displayed' ? '紫金卡仍由薰儿展示，未交本人'
    : task.funds === 'offered' ? '借资仅提议，尚未到账'
    : task.funds !== 'unasked' ? '资金需求问答进行中'
    : task.apology === 'answered' ? '本人歉意与薰儿回应已记'
    : task.apology === 'spoken' ? '本人已致歉，薰儿回应待续'
    : task.meeting === 'near' ? '已实际走近相见'
    : task.identity === 'xuner' ? '来人已确认，问候与相见进行中' : notStarted)
}

export function earlyMorningCardSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.morningCard
  return '晨间交卡 · ' + (task.stage === 14 ? saved.earlyTraining.cityPharmacy.stage ? '晨间交卡归档；' + earlyCityPharmacySaveSummary(saved, viewing) : '普通黑卡与同一采购账归档，入城待续'
    : task.stage >= 9 ? task.funds === 'credited' ? '本人接卡，唯一折算160已记账' : '本人接卡，旧账保持未重发'
      : task.card === 'offered' ? '普通卡已递出，本人未接，未新增到账'
        : task.yan === 'outside' ? '本人已出门，普通卡尚未递出'
          : task.savings === 'taken' ? '原有积蓄已取，仅历史回顾'
            : task.call === 'heard' ? '已听门外招呼，本人尚未出门'
              : task.stage ? '房中收气与感受回顾' : notStarted)
}

export function earlyCityPharmacySaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.cityPharmacy
  return '同行药铺 · ' + (task.stage === 15 ? saved.earlyTraining.marketEscort.stage ? '同行两药归档；' + earlyMarketEscortSaveSummary(saved, viewing) : '同行两药归档，历史木核待后段'
    : task.stage >= 12 ? '两药原收据已核，不重复采购'
      : task.stage >= 11 ? '主药原收据已核，辅药待续'
        : task.location === 'pharmacy' ? '已到药铺，年份与同单采购进行中'
          : task.outing === 'stalls' ? '城中逛摊，未在本段购药'
            : task.location === 'city' ? '已离族，入城同行进行中' : task.stage ? '族内同行，尚未离族' : notStarted)
}

export function earlyMarketEscortSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.marketEscort
  return '入坊巡卫 · ' + (task.stage === 24 ? saved.earlyTraining.marketSearch.stage ? '入坊护卫归档；' + earlyMarketSearchSaveSummary(saved, viewing) : '入坊与护卫归档，寻核待续'
    : task.patrol ? '队长巡街，三人跟随，同行待续' : task.following ? '三人已实际跟随，队长巡街待续'
      : task.stage >= 14 ? '已派三人，实际跟随待续' : task.stage >= 13 ? '本人入人群，护卫旁观待续'
        : task.captain === 'introduced' ? '队长已介绍，交谈进行中' : task.entered ? '已入市，队长身份未明' : task.stage ? '南坊门前，尚未入市' : notStarted)
}

export function earlyMarketSearchSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.marketSearch
  return '坊市寻核 · ' + (task.stage === 20 ? saved.earlyTraining.marketBracelets.stage ? '寻核放回归档；' + earlyMarketBraceletsSaveSummary(saved, viewing) : '寻核与放回归档，来人交谈待续'
    : task.stranger === 'seen' ? '已看见来人，姓名未揭' : task.stranger === 'heard' ? '听见招呼，尚未看清来人'
      : task.bracelet === 'returned' ? '普通手链放回未购，寻核继续' : task.bracelet === 'xuner-viewing' ? '普通手链只拿看，仍属摊主'
        : task.stage >= 8 ? '本人寻核，薰儿离开同行' : task.promise ? '承诺已记，两人先后前行' : notStarted)
}

export function earlyMarketBraceletsSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.marketBracelets
  return '让路手链 · ' + (task.stage === 28 ? saved.earlyTraining.marketStandoff.stage ? '两手链归档；' + earlyMarketStandoffSaveSummary(saved, viewing) : '两手链分别归档，围堵待续'
    : task.thanked ? '普通绿链已戴并致谢，蓝金未交付' : task.green === 'worn' ? '绿链已戴，致谢待续'
      : task.green === 'received' ? '绿链已收到，尚未戴上' : task.green === 'shown' ? '绿链由本人持有，尚未交付'
        : task.expensive === 'retained' ? '已阻止接取，蓝金及木核仍由来人持有' : task.expensive === 'offered' ? '蓝金赠核提议，尚未交付'
          : task.identity === 'named' ? '已称呼加列奥，请求让路' : task.blocked ? '青年拦路，姓名未揭' : task.stage ? '转身离开，来人姓名未揭' : notStarted)
}

export function earlyMarketStandoffSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.marketStandoff
  return '围堵离场 · ' + (task.stage === 34 ? saved.earlyTraining.marketDiscovery.stage ? '离场归档；' + earlyMarketDiscoverySaveSummary(saved, viewing) : '非战斗离场归档，发现成交待续' : task.walkedDeep ? '二人已深入，尚未发现成交'
    : task.guards === 'left' ? '护卫已离开，继续寻核待续' : task.chase === 'stopped' ? '已阻止追赶，护卫尚在'
      : task.opponent === 'left' ? '来人已离开，护卫尚在' : task.opponent === 'paused' ? '来人停步讥讽，尚未离开'
        : task.opponent === 'withdrawing' ? '来人开始撤走，尚未离开' : task.challenge === 'refused' ? '本人拒绝单挑，来人仍在'
          : task.challenge === 'proposed' ? '来人提出单挑，未交战' : task.guards === 'surrounding' ? '护卫控制外层，未交战'
            : task.guards === 'approaching' ? '护卫已赶到，外层待续' : task.called ? '本人已呼叫，护卫未到'
              : task.ring === 'closed' ? '随从已围住二人，尚未呼叫' : task.stage ? '来人怒意，围堵未起' : notStarted)
}

export function earlyMarketDiscoverySaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const task = saved.earlyTraining.marketDiscovery
  return '摊位发现 · ' + (task.stage === 10 ? '发现与建议归档，未询价成交' : task.advice ? '老师心中建议购买，尚未成交'
    : task.iron === 'examined' ? '只见铁片古旧，尚未辨明' : task.iron === 'noticed' ? '看到黑铁片，未取得'
      : task.feeling ? '感应异常，铁片尚未注意' : task.core === 'seen' ? '只见绿核，未询价成交' : task.stage ? '已到摊前，尚未发现' : notStarted)
}

export function earlyMarketTradeSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.marketTrade
  return '唯一成交 · ' + (t.stage === 17 ? '成交离摊归档，回族解释待续' : t.left ? '已离摊，心中交谈待续'
    : t.settlement !== 'none' ? '已核唯一订单，尚未离摊' : t.bundle === 'agreed' ? '卖家同意，尚未实际付款'
      : t.quote ? `报价${t.quote}，尚未成交` : t.stage ? '来源询问，尚未报价' : notStarted)
}

export function firstHallApproachSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstHallApproach
  return '整衣靠近 · ' + (t.stage === 31 ? '交锋与第二卷归档，离堂待续' : t.stage >= 28 ? '本人另取第二卷，未离堂' : t.ownPlaced ? '她的临时卷已放下，本人未取第二卷' : t.stage >= 20 ? '言语交锋进行中，未开战' : t.stage === 19 ? '同卷归架归档，第二卷待续' : t.first === 'returned' ? '第一卷已归架，未取第二卷' : t.stage >= 15 ? '帮选交涉进行中，未归架' : t.stage === 14 ? '收卷归档，实际归架待续' : t.first === 'rolled' ? '同一第一卷仅卷起' : t.memorized ? '读法已记，无授技' : t.ning === 'east' ? '萧宁已到东架前' : t.ning === 'aisle' ? '萧宁已到堂中' : t.clothes ? '整衣已记，尚未走近' : t.stage ? '西侧情绪进行中' : notStarted)
}
export function firstHallTalkSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstHallTalk
  return '东架会面 · ' + (t.stage === 20 ? '问答归档，两卷交涉待续' : t.timePromised ? '时间承诺已记，借资未还' : t.fourthConfirmed ? '当时四段已确认，问答继续' : t.ownScroll === 'xuner' ? '她自己的卷拿看，非本人第二卷' : t.seated ? '薰儿已坐旁，临时卷未取' : t.greeted ? '当面招呼，问答待续' : notStarted)
}
export function firstHallMatchSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstHallMatch
  return '东架旁观 · ' + (t.stage === 20 ? '赛后东架归档，问答待续' : t.stage >= 17 ? '薰儿已到东架，问答待续' : t.stage >= 13 ? '赛后行走进行中' : t.stage === 12 ? '比赛归档，走向东架待续' : t.applauded ? '薰儿取胜，非本人胜利' : t.outside ? '萧宁已退场' : t.palm ? '金色掌击已见' : t.attacks ? '西场攻防已见' : t.identified ? '对手已辨认' : notStarted)
}
export function firstHallReadingSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstHallReading
  return '东侧阅读 · ' + (t.stage === 8 ? '同一第一卷归档，西赛待续' : t.method ? '东架方法已读，西赛待续' : t.leaned ? '本人靠架阅读'
    : t.grade ? '黄阶中级已见' : t.opened ? '第一黑卷已展开' : t.picked ? '同一第一卷拿取已记录' : t.shelf ? '本人已到东架，尚未拿卷' : notStarted)
    + (t.record === 'recalled' ? '（回顾当时阅读，当前旧保管保持）' : '')
}
export function firstHallEntrySaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstHallEntry
  return '实际入堂 · ' + (t.stage === 9 ? '入堂与东西区归档，东卷待续' : t.girl ? '已辨认场中少女，尚未取卷' : t.fieldLook ? '先望训练场，尚未取卷'
    : t.layout ? '东西区已分清' : t.entered ? '本人已入堂，所见待续' : t.noise ? '门外闻声，尚未跨门' : t.plaque ? '堂牌已见，尚未入堂' : t.turned ? '转角已过，堂门待行' : notStarted)
}

export function firstRoadMeetingSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstRoadMeeting
  return '路口会面 · ' + (t.stage === 12 ? '双方分路归档，实际入堂待续' : t.parted ? '双方已分路' : t.resumed ? '本人已继续前行'
    : t.nothing ? '来人答话结束' : t.replied ? '本人停步问话已记录' : t.called ? '身后招呼已记录' : t.passed ? '本人已走过一行人'
    : t.identified ? '已辨认来人，走过与对话待续' : t.group ? '看见来人，身份待辨认' : t.laughter ? '听到笑声，来人待看' : t.turned ? '已转路' : notStarted)
}

export function firstDepartureSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstDeparture
  return '出门石路 · ' + (t.stage === 9 ? '室外关门与石路归档，路口待续' : t.path ? '已入石路，尚未转路'
    : t.closed ? '室外已关门，石路待行' : t.sunlight ? '日光已适应，门尚待关' : t.outside ? '已跨门，室外关门待续'
    : t.stage === 3 ? '已到房门，尚未跨出' : t.ringStill ? '古戒仍静止，门口待行' : t.risen ? '本人已起身，古戒待看' : notStarted)
}

export function firstTechniqueSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstTechnique
  return '首次铁片研究 · ' + (t.stage === 19 ? '有限试瓶已归档，真实出门待续' : t.seekLow ? '另找低阶已决定，尚未出门'
    : t.needed === 7 ? '七段仅条件，吸人未发生' : t.insufficient ? '当时功力不足已记'
    : t.bottle === 'fragments' ? '落地碎裂，无战利品' : t.bottle === 'fallen' ? '已从桌上落下，碎裂待记'
    : t.bottle === 'turning' ? '有限吸力已转瓶' : t.stage === 11 ? `有限吸力${t.beats}/2，重试${t.attempts}`
    : t.bottle === 'intact' ? '桌上完整瓷瓶待试' : t.stage === 9 ? '感知成爪已归档，有限试瓶待续' : t.claw ? '右手成爪，尚未试瓶'
    : t.sensed ? '本人已感知，收束待续' : t.eyes === 'closed' ? '夹片闭眼中' : t.guidance ? '研究与指点已回顾'
    : t.period === 'rest-study' ? '半月研究已回顾' : t.clean ? '清锈表面已观察' : t.iron === 'hands' ? '本人已取同片' : notStarted)
}

export function firstTrainingSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.firstTraining
  return '持续调息 · ' + (t.stage === 17 ? '半月四段与衣着已归档，五段仍是预计' : t.result === 'fourth-duan' ? '当时四段已记，药色衣着接续'
    : t.period === 'half-month' ? '半月已回顾，实际结果待记' : t.stage === 10 ? '当前轮归档，预计五段尚非实际结果' : t.forecast === 'two-months' ? '两个月五段仅为预计'
    : t.stage === 8 ? '已离容器，预计待记' : t.stage === 7 ? '本轮收束，离容器待续' : t.stage === 2 ? `调息${t.beats}/3，重试${t.attempts}` : t.seated ? '坐定中' : t.stage ? '当前轮待续' : notStarted)
}

export function earlyRefiningSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.refining
  return '主辅药调制 · ' + (t.stage === 22 ? '魔核入水与期限已归档' : t.stage >= 18 ? '已入水，回应与期限待续'
    : t.stage >= 14 ? '白焰已熄，尚未入水' : t.stage >= 12 ? '魔核炼化中'
      : t.fused ? '药性已融合，魔核与入水待续' : t.primary ? '主药处理中' : t.water ? '清水已备' : t.stage ? '备水待续' : notStarted)
}

export function earlyIronSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.iron
  return '铁片辨认 · ' + (t.stage === 18 ? '已收好归档，详细调制待续' : t.limit ? '当时能力限制已说明' : t.tier ? '名称与品阶已说明，未授技能' : t.technique ? '斗技记录已说明' : t.stage ? '取出与交接待续' : notStarted)
}

export function earlyMarketReturnSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 2)) return sealedEarly
  const t = saved.earlyTraining.marketReturn
  return '回族房中 · ' + (t.stage === 9 ? '准备归档，铁片解释待续' : t.materials ? '当时材料已摆桌，尚未炼化'
    : t.locked ? '已锁门，材料待摆桌' : t.room ? '已到房中，尚未锁门' : t.parted ? '已分路，独自回房待续'
      : t.home ? '已回族，尚未分路' : t.departed ? '已出坊，回族待续' : notStarted)
}

export function savePreviewSummary(saved: GameState, viewing: Settings): string {
  const limit = viewing.spoiler === 'novel' ? Infinity : viewing.animeLimit
  const chapter = saved.chapter <= limit ? `第 ${saved.chapter} 章 · ${chapterById(saved.chapter).title}` : '封存篇章'
  const completed = saved.completed.filter(id => id <= limit).length
  const summaries = [
    chapter, `已完成 ${completed} 章`, bondSaveSummary(saved, viewing),
  ]
  if (limit >= 2) summaries.push(firstHallApproachSaveSummary(saved, viewing), firstHallTalkSaveSummary(saved, viewing), firstHallMatchSaveSummary(saved, viewing), firstHallReadingSaveSummary(saved, viewing), firstHallEntrySaveSummary(saved, viewing), firstRoadMeetingSaveSummary(saved, viewing), firstDepartureSaveSummary(saved, viewing), firstTechniqueSaveSummary(saved, viewing), firstTrainingSaveSummary(saved, viewing), earlyFamilyVisitSaveSummary(saved, viewing), earlyFamilyCompensationSaveSummary(saved, viewing), earlyFamilyContractSaveSummary(saved, viewing), earlyMountainRingSaveSummary(saved, viewing), earlyApprenticeSaveSummary(saved, viewing), earlyMethodDiscussionSaveSummary(saved, viewing), earlyPreparationBriefSaveSummary(saved, viewing), earlyMountainVisitorSaveSummary(saved, viewing), earlyMorningCardSaveSummary(saved, viewing), earlyCityPharmacySaveSummary(saved, viewing), earlyMarketEscortSaveSummary(saved, viewing), earlyMarketSearchSaveSummary(saved, viewing), earlyMarketBraceletsSaveSummary(saved, viewing), earlyMarketStandoffSaveSummary(saved, viewing), earlyMarketDiscoverySaveSummary(saved, viewing), earlyMarketTradeSaveSummary(saved, viewing), earlyMarketReturnSaveSummary(saved, viewing), earlyIronSaveSummary(saved, viewing), earlyRefiningSaveSummary(saved, viewing), earlyTrainingSaveSummary(saved, viewing), earlyBraceletSaveSummary(saved, viewing))
  if (limit >= 3) {
    const details = [
      earlyGrowthSaveSummary, earlyHallSaveSummary, earlyTeachingSaveSummary, earlySupervisionSaveSummary,
      earlyRecoverySaveSummary, earlyConsignmentSaveSummary, earlyAppraisalSaveSummary, earlyAuctionSaveSummary,
      earlySettlementSaveSummary, earlyFatherGiftSaveSummary, earlyXunerVisitSaveSummary, earlyLongSuppliesSaveSummary,
      earlyForestStrikeSaveSummary, earlySeventhRoomSaveSummary, earlyPalmPairSaveSummary, earlyPreliminarySaveSummary,
      earlyKeChallengeSaveSummary, earlyEighthTrainingSaveSummary, earlyCeremonyGuestsSaveSummary, earlyCeremonialTestSaveSummary,
      earlyNingFirstSaveSummary, earlyNingSecondSaveSummary, earlyCeremonyVerdictSaveSummary, earlyQiPavilionEntrySaveSummary, earlyQiBarrierSaveSummary, earlyQiPavilionScrollSaveSummary, earlyQiPavilionAidSaveSummary, earlyQiPavilionExchangeSaveSummary,
    ]
    summaries.push(...details.map(summary => summary(saved, viewing)))
  } else summaries.push(sealedLater)
  return compactSaveSummaries(summaries)
}

export function earlyPalmPairSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.palmPair
  return '吸推两瓶 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 10 ? '第一只碎片与第二只细末已归档' : task.stage === 9 ? '第二只已成细末，待归档'
    : task.stage === 8 ? '第二只已吸近，待吹火掌切换' : task.stage === 7 ? '时段已记，第二只待吸'
    : task.stage === 6 ? '老师初练已过，待回顾时段' : task.stage === 5 ? `老师已讲解，初练${task.beats}/2`
    : task.stage === 4 ? '第一只已碎，尚未学吹火掌' : task.stage === 3 ? '第一只已吸近，待直接推风'
    : task.stage === 2 ? '直接风只摇动瓶，尚未外放' : task.stage === 1 ? '两只练习瓶就位' : notStarted)
}

export function earlyPreliminarySaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.preliminary
  return '一月前预测 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 0 ? notStarted : task.stage === 16 ? saved.earlyTraining.keChallenge.stage === 12 ? '三人结果与后续应战已归档'
      : saved.earlyTraining.keChallenge.stage > 0 ? '三人结果已归档，后续应战进行中' : '三人结果已归档，待挑战'
    : task.stage >= 15 ? '预测已结束，待归档' : task.stage >= 13 ? '萧炎七段已宣读合格'
    : task.stage >= 11 ? '萧炎七段已触碑，待宣读' : task.stage >= 9 ? '已点名萧炎，待本人触碑'
    : task.stage >= 8 ? '薰儿一星斗者已记' : task.stage >= 7 ? '已点名薰儿，待测'
    : task.stage >= 6 ? '萧媚八段已记' : task.stage >= 5 ? '已点名萧媚，待测' : `入场候测 ${task.stage}/4`)
}

export function earlyKeChallengeSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.keChallenge
  return '萧克挑战 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 0 ? notStarted : task.stage === 12 ? '胜负与离场邀请已归档'
    : task.stage >= 11 ? '次日邀请已记，待归档' : task.stage >= 5 ? `父亲已宣布胜负，离场${task.stage - 5}/6`
    : task.stage === 4 ? '萧克倒地，待父亲宣布' : task.stage === 3 ? `侧避反击${task.beats}/2，重开${task.attempts}次` : '准备应战')
}

export function earlySeventhRoomSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.seventhRoom
  return '房中七段 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 8 ? '故事七段已归档，一滴补液保留' : task.stage === 7 ? '故事七段已感知，待归档'
    : task.stage === 6 ? '时段已回顾，尚待感知七段' : task.stage === 5 ? '补液后调息已完成，待回顾时段'
    : task.stage === 4 ? `老师一滴已入水，继续调息${task.beats}/3` : task.stage === 3 ? '本次水已清，尚待老师补液'
    : task.stage === 2 ? '本次药色渐淡，待观察'
    : task.stage === 1 ? `本次绿色药液，调息${task.beats}/2` : notStarted)
}

export function earlyLongSuppliesSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.longSupplies
  return '长期物资回溯 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 6 ? '两类物资已藏柜归档' : task.stage === 5 ? '原包已移入柜，待合柜'
    : task.stage === 4 ? '标签已核，待藏柜' : task.stage === 3 ? '两格已分好，待核标签'
    : task.stage === 2 ? '药材已分格，魔核待分' : task.stage === 1 ? '已展开另购原包，待分拣' : notStarted)
}

export function earlyForestStrikeSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.forestStrike
  return '林中首次练技 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 7 ? '成功与下山已归档，当时七段仍是目标'
    : task.stage >= 4 ? '首次成功后已休息，待下山'
    : task.stage === 3 ? '树倒后当前耗尽，待青石休息'
    : task.stage === 2 ? `故事六段，连贯${task.beats}/3，重试${task.attempts}次`
    : task.stage === 1 ? '六段回顾已记，待首次成功练技' : notStarted)
}

export function earlyXunerVisitSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.xunerVisit
  return '薰儿事件 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 7 ? '长老收卡并回应，萧炎不知情'
    : task.stage === 6 ? '家族取得100000，待长老回应' : task.stage >= 4 ? '薰儿独自行动，尚未交卡'
    : task.stage > 0 ? `房中来访 ${task.stage}/7` : notStarted)
}

export function earlyFatherGiftSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.fatherGift
  return '父亲赠回 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 6 ? '同瓶已收好，由萧炎保管'
    : task.stage >= 4 ? '同瓶已交萧炎，待归档' : task.stage >= 2 ? '父亲携原瓶，待赠回'
    : task.stage > 0 ? '已回房，待来访' : notStarted)
}

export function earlySettlementSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.settlement
  return '寄售手续 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 7 ? '净款39200与贵宾卡已收，已离场'
    : task.net ? '净款39200已收，待离场' : task.stage === 5 ? '账单已核，待收绿色卡'
    : task.vip ? '贵宾卡已收，尚未收款' : task.stage > 0 ? `进行中 ${task.stage}/7` : notStarted)
}

export function earlyAuctionSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.auction
  return '首次拍卖 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage >= 6 ? saved.earlyTraining.fatherGift.stage >= 4 ? '成交后父亲已赠回同瓶' : saved.earlyTraining.fatherGift.stage >= 2 ? '萧战已携同瓶来访' : saved.earlyTraining.settlement.net ? '成交归萧战，净款已收，待交付' : '成交归萧战，待结算与交付'
    : task.stage === 5 ? '萧战已出价，待落槌'
    : task.stage > 0 ? `旁观 ${task.stage}/7` : notStarted)
}
export function earlyAppraisalSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.appraisal
  return '寄售鉴定 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 8 ? saved.earlyTraining.fatherGift.stage >= 4 ? '鉴定与入场已记，同瓶已赠回萧炎' : saved.earlyTraining.fatherGift.stage >= 2 ? '鉴定与入场已记，同瓶由萧战保管' : '持黑卡已入场，药液由拍卖方保管'
    : task.stage >= 7 ? '持入场黑卡，待入场' : task.stage >= 6 ? '二品已鉴定，待委托'
    : task.stage > 0 ? `进行中 ${task.stage}/8` : notStarted)
}

export function earlyConsignmentSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.consignment
  return '首次寄售准备 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 5 ? saved.earlyTraining.fatherGift.stage >= 4 ? '父亲已赠回同瓶，萧炎保管' : task.owner === 'xiaozhan' ? '寄售同瓶由父亲萧战保管' : task.owner === 'xiaoyan' ? '待售玉瓶由萧炎保管，待鉴定' : task.owner === 'auction' ? '待售玉瓶由拍卖方保管' : '待售玉瓶已交鉴定'
    : task.stage === 4 ? '老师已调制，待装瓶' : task.stage >= 2 ? `齐备，巷中进行 ${task.stage}/5`
    : task.stage === 1 ? `采购 ${Object.values(task.receipts).filter(Boolean).length}/4 · 余额${task.funds - task.spent}` : notStarted)
}

export function earlyRecoverySaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.recovery
  return '回房恢复 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 7 ? '药力耗尽，五段故事结果已记下'
    : task.stage === 6 ? '时段已回顾，待感知结果'
    : task.stage >= 4 ? `药力耗尽，进行中 ${task.stage}/7`
    : task.stage === 3 ? '药色渐淡，进行中 3/7' : task.stage > 0 ? `进行中 ${task.stage}/7` : notStarted)
}

export function earlySupervisionSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.supervision
  return '后山督练 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 2 ? saved.earlyTraining.recovery.stage >= 5 ? '本轮已记下，已回房恢复' : '本轮已记下，待恢复' : task.stage === 1 ? `承接 ${task.pulses}/4`
    : task.attempts > 0 ? `本轮已停下，重开${task.attempts}次` : notStarted)
}

export function earlyTeachingSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.teaching.stage
  return '老师传技 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : stage === 0 ? notStarted : stage === 5 ? saved.earlyTraining.supervision.stage > 0 ? '已归档' : '已归档，尚待监督训练' : `进行中 ${stage}/5`)
}

export function earlyHallSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.hall.stage
  return '斗技堂 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : stage === 0 ? '未到访' : stage === 1 ? '已到访，待借卷' : stage === 9 ? '已离堂，借卷由萧炎保管'
    : stage >= 8 ? '借阅已登记，待离堂' : stage === 7 ? '已选另一卷，待登记' : `堂内进行中 ${stage - 1}/8`)
}

export function earlyGrowthSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.growth.stage
  return '成长过渡 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : stage === 3 ? '已翻阅' : stage === 0 ? '未翻阅' : `翻阅中 ${stage}/3`)
}

export function earlyBraceletSaveSummary(saved: GameState, viewing: Settings): string {
  const stage = saved.earlyTraining.bracelet.stage
  return '手链往事 · ' + (earlySummarySealed(viewing, 2) ? sealedRange
    : stage === 6 ? '已归档' : stage === 0 ? notStarted : `进行中 ${stage}/6`)
}

export function saveRecordSummary(entry: SaveRecord, viewing: Settings): string {
  try { return savePreviewSummary(parseSave(entry.text), viewing) }
  catch (error) {
    return error instanceof NewerSaveVersionError
      ? '存档来自较新版本，请更新游戏后读取；原有记录保持。'
      : '存档异常，可尝试恢复上一份自动备份'
  }
}

export function earlyEighthTrainingSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.eighthTraining
  return '礼前八段 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 15 ? '同行与故事八段已归档' : task.stage === 14 ? '故事八段已感知，待归档'
    : task.stage === 13 ? '夜间调息已过，尚待感知八段' : task.stage === 12 ? `夜间少量药力，调息${task.beats}/2`
    : task.stage >= 10 ? '未突破的时段已记，待夜间练习' : task.stage === 9 ? '本轮练技与调息已过，待回顾时段'
    : task.stage === 8 ? `回房调息${task.beats}/3` : task.stage === 7 ? `清晨吸推复习${task.beats}/2`
    : task.stage >= 6 ? '次日同行已完成，待实际练习' : task.stage >= 1 ? '已约好，次日同行未完成' : notStarted)
}

export function earlyCeremonyGuestsSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.ceremonyGuests
  return '礼前宾客 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 12 ? saved.earlyTraining.ceremonialTest.stage === 13 ? '宾客与收剑、正式验碑已归档'
      : saved.earlyTraining.ceremonialTest.stage > 0 ? '宾客与收剑已归档，正式礼进行中' : '宾客与收剑已归档，尚待开礼'
    : task.stage >= 10 ? '父亲介绍已记，待回应与归档'
    : task.stage >= 7 ? '萧玉已收剑，没有战斗' : task.stage >= 5 ? '佩剑出鞘，尚未交锋'
    : task.stage > 0 ? `候礼观察${task.stage}/4` : notStarted)
}

export function earlyCeremonialTestSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.ceremonialTest
  return '正式验碑 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 13 ? saved.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '仪式与正式八段已归档，挑战胜负已宣布' : saved.earlyTraining.ningFirst.stage > 0 ? '仪式与正式八段已归档，萧宁挑战待裁定' : '仪式与正式八段已归档，尚待挑战' : task.stage >= 9 ? '正式八段已触碑，反应与归档待续'
    : task.stage === 8 ? '二长老已验碑，本人尚未测' : task.stage >= 6 ? '仪式结束，尚待验碑'
    : task.stage === 5 ? '半小时回顾已记，尚待仪式结束' : task.stage === 4 ? '二长老主持中，尚未完成礼程'
    : task.stage > 0 ? `候礼登台${task.stage}/3` : notStarted)
}

export function earlyNingFirstSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.ningFirst
  return '萧宁首轮 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage >= 7 ? saved.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '首轮历史已记，最终胜负已宣布' : saved.earlyTraining.ningSecond.stage > 0 ? '首轮已记，违规再攻仍待裁判' : '首轮倒地，仍待裁判与后续变化' : task.stage === 6 ? `推拉推${task.beats}/3，重开${task.attempts}次`
    : task.stage >= 2 ? '药物由萧宁持有未服，挑战准备中' : task.stage > 0 ? '规则已听，待场边交付' : notStarted)
}

export function earlyNingSecondSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.ningSecond
  return '萧宁再攻 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage >= 5 ? saved.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '违规出场已记，最终胜负已宣布' : '追加拳击后已出场，仍待最终裁定' : task.stage === 4 ? task.beats === 1 ? '八极崩已迎击，尚待追加拳击' : '迎击准备中'
    : task.stage >= 2 ? '药物已用、叫停无效，迎击待续' : task.stage === 1 ? '违规增力再攻，尚待叫停' : notStarted)
}

export function earlyCeremonyVerdictSaveSummary(saved: GameState, viewing: Settings): string {
  const task = saved.earlyTraining.ceremonyVerdict
  return '礼终裁定 · ' + (earlySummarySealed(viewing, 3) ? sealedRange
    : task.stage === 16 ? '胜负、礼终离场与两次婉拒已归档' : task.stage >= 15 ? '两次婉拒已记，五天后功法阁待归档'
    : task.stage >= 10 ? '午后礼终，离场与提议待续' : task.stage >= 7 ? '正式萧炎获胜，整场礼程待续'
    : task.stage === 6 ? '萧宁禁足三个月已宣布，胜负尚待宣布' : task.stage >= 5 ? '双方请求被阻止，处分待宣布'
    : task.stage > 0 ? '场外交接与双请求待续' : notStarted)
}
export function earlyQiPavilionEntrySaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 3)) return sealedLater
  const task = saved.earlyTraining.qiPavilionEntry
  return '功法阁入阁 · ' + (task.stage === 12 ? saved.earlyTraining.qiPavilionScroll.family === 'held' ? '测定与入阁已归档，后续已取得家族卷' : '测定与入阁已归档，择卷待续'
    : task.entered ? '已实际入阁，归档待续' : task.permission ? '已许可，实际过门待续'
    : task.xuner === 'fire' ? '两人火属性已测，球有细裂尚未碎' : task.yan === 'fire' ? '本人火属性已测，薰儿未测'
    : task.stage > 0 ? '阁前规则与候测进行中' : notStarted)
}
export function earlyQiBarrierSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 3)) return sealedLater
  const task = saved.earlyTraining.qiPavilionBarrier
  return '功法阁门障 · ' + (task.stage === 10 ? saved.earlyTraining.qiPavilionScroll.family === 'held' ? '火路、破幕与入室已归档，后续已取得家族卷' : '火路、破幕与入室已归档，取卷待续' : task.entered ? '已入室，卷轴仍在桌上'
    : task.barrier === 'broken' ? '红幕已破，收势与入室待续' : task.stage === 6 ? `破幕动作${task.beats}/3，免费重试${task.attempts}次`
    : task.room43 ? '四十三号已核，红幕完整' : task.path === 3 ? '第三路已选，门牌待核' : task.stage > 0 ? '五路辨认中' : notStarted)
}
export function earlyQiPavilionScrollSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 3)) return sealedLater
  const task = saved.earlyTraining.qiPavilionScroll
  return '功法阁卷轴保管 · ' + (task.stage === 6 ? '家族卷已保管，额外提议已婉拒，登记待续'
    : task.stage === 5 ? '家族卷已保管，额外提议已婉拒待归档'
    : task.stage === 4 ? '家族卷已保管，薰儿额外卷轴已提议'
    : task.stage >= 3 ? '家族卷已由萧炎保管，额外提议待续'
    : task.stage >= 2 ? '家族卷已取下，待收好'
    : task.stage === 1 ? '四十三号房卷轴已查看，待取下' : notStarted)
}
export function earlyQiPavilionAidSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 3)) return sealedLater
  const task = saved.earlyTraining.qiPavilionAid
  return '功法阁同行援助 · ' + (task.stage === 10 ? '独自破障与阁内会合已归档，登记待续'
    : task.stage >= 8 ? '致谢道歉已记，阁内会合待归档'
    : task.stage >= 7 ? '独自踢破门障，萧媚回应待续'
    : task.stage === 6 ? `已回返，出手${task.beats}/2，免费重试${task.attempts}`
    : task.stage >= 5 ? '已经过门前，待实际回返'
    : task.stage >= 3 ? '时限将近，风属性门障待续'
    : task.stage >= 2 ? '薰儿另选卷轴，风属性门障待观察'
    : task.stage === 1 ? '同行已开始，待记下薰儿选择' : notStarted)
}
export function earlyQiPavilionExchangeSaveSummary(saved: GameState, viewing: Settings): string {
  if (earlySummarySealed(viewing, 3)) return sealedLater
  const task = saved.earlyTraining.qiPavilionExchange
  return '功法阁双卷回看 · ' + (task.stage === 8 ? '同卷拿看、展示、取回与婉拒已归档' : task.stage >= 6 ? '已婉拒，说明与归档待续'
    : task.stage === 5 ? '家族卷已取回，支持卷仍属薰儿'
    : task.stage === 4 ? '薰儿一手一卷，支持未交付'
    : task.stage === 3 ? '同一家族卷由薰儿拿看，支持卷未展示' : task.stage > 0 ? '回看开始，品阶与交接待续' : notRecalled)
}
