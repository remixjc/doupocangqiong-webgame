export interface EarlyTrainingState {
  started: boolean
  purse: { own: number; borrowed: number; spent: number }
  supplies: { bluegrass: number; boneflower: number; woodCore: number }
  receipts: Record<EarlySupplyId, boolean>
  market: { stage: number; blackIron: number }
  liquid: { stage: number; water: boolean; ready: boolean }
  practice: { phase: number; pulse: number; score: number; attempts: number }
  bracelet: { stage: number; gift: 'none' | 'xuner' }
  growth: { stage: number }
  hall: { stage: number; scroll: 'none' | 'reading-first' | 'selected-second' | 'borrowed-second' }
  teaching: { stage: number }
  supervision: { stage: number; pulses: number; attempts: number }
  recovery: { stage: number; energy: 'unobserved' | 'active' | 'fading' | 'spent'; period: 'unreviewed' | 'reviewed'; result: 'none' | 'fifth-duan' }
  consignment: { stage: number; funds: number; spent: number; receipts: Record<ConsignmentSupplyId, boolean>;
    supplies: Record<ConsignmentSupplyId, number>; product: 'none' | 'mixture' | 'sealed'; owner: 'none' | 'xiaoyan' | 'inspection-desk' | 'guni' | 'auction' | 'xiaozhan' }
  appraisal: { stage: number; cloaked: boolean; speaker: 'self' | 'yaolao'; tier: number; card: 'none' | 'black-entry' }
  auction: { stage: number }
  settlement: { stage: number; net: number; vip: boolean }
  fatherGift: { stage: number }
  xunerVisit: { stage: number; card: 'xuner' | 'elders' }
  longSupplies: { stage: number; herbs: LongSupplyPlace; cores: LongSupplyPlace }
  forestStrike: ForestStrikeState
  seventhRoom: SeventhRoomState
  palmPair: PalmPairState
  preliminary: PreliminaryState
  keChallenge: KeChallengeState
  eighthTraining: EighthTrainingState
}
export interface EighthTrainingState { stage: number; beats: number; attempts: number;
  outing: 'none' | 'promised' | 'completed'; period: 'none' | 'reviewed';
  energy: 'unobserved' | 'active' | 'little'; result: 'none' | 'eighth-duan' }
export interface KeChallengeState { stage: number; beats: number; attempts: number;
  verdict: 'none' | 'pending' | 'xiaoyan'; invitation: 'none' | 'offered' }
export interface PreliminaryState { stage: number; mei: 'unmeasured' | 'eighth-duan';
  xuner: 'unmeasured' | 'one-star'; yan: 'unmeasured' | 'seventh-duan' }
export interface PalmPairState { stage: number; beats: number; attempts: number;
  first: 'intact' | 'pulled' | 'fragments'; second: 'intact' | 'pulled' | 'dust';
  teaching: 'unlearned' | 'explained' | 'basic'; period: 'unreviewed' | 'reviewed' }
export interface SeventhRoomState { stage: number; beats: number; attempts: number; drops: number;
  energy: 'unobserved' | 'active' | 'fading' | 'clear' | 'restored' | 'lighter';
  period: 'unreviewed' | 'reviewed'; result: 'none' | 'seventh-duan' }
export interface ForestStrikeState { stage: number; beats: number; attempts: number; tree: 'intact' | 'fallen'; result: 'none' | 'sixth-duan' }
export type LongSupplyPlace = 'none' | 'parcel' | 'shelf' | 'cabinet'
export type EarlySupplyId = 'bluegrass' | 'boneflower' | 'woodCore'
export const EARLY_LOAN = 160
export const earlySupplies: Record<EarlySupplyId, { label: string; quantity: number; price: number }> = {
  bluegrass: { label: '主药草 · 三株', quantity: 3, price: 30 },
  boneflower: { label: '辅药草 · 两株', quantity: 2, price: 20 },
  woodCore: { label: '一阶木属性魔核 · 一枚', quantity: 1, price: 60 },
}
export const EARLY_TRAINING_VERSION = '0.15.0'
export const EARLY_GROWTH_VERSION = '0.16.7'
export const EARLY_HALL_VERSION = '0.17.0'
export const EARLY_HALL_SCROLL_VERSION = '0.17.1'
export const EARLY_TEACHING_VERSION = '0.17.2'
export const EARLY_SUPERVISION_VERSION = '0.18.0'
export const EARLY_RECOVERY_VERSION = '0.18.1'
export const EARLY_CONSIGNMENT_VERSION = '0.19.0'
export const EARLY_APPRAISAL_VERSION = '0.19.1'
export const EARLY_AUCTION_VERSION = '0.20.0'
export const EARLY_SETTLEMENT_VERSION = '0.20.1'
export const EARLY_FATHER_GIFT_VERSION = '0.20.2'
export const EARLY_XUNER_VISIT_VERSION = '0.21.0'
export const EARLY_LONG_SUPPLIES_VERSION = '0.22.0'
export const EARLY_FOREST_STRIKE_VERSION = '0.23.0'
export const EARLY_SEVENTH_ROOM_VERSION = '0.24.0'
export const EARLY_PALM_PAIR_VERSION = '0.25.0'
export const EARLY_PRELIMINARY_VERSION = '0.26.0'
export const EARLY_KE_CHALLENGE_VERSION = '0.27.0'
export const EARLY_EIGHTH_TRAINING_VERSION = '0.28.0'
export type ConsignmentSupplyId = 'youngPrimary' | 'youngAuxiliary' | 'woodCore' | 'jadeBottle'
export const consignmentSupplies: Record<ConsignmentSupplyId, { label: string; price: number }> = {
  youngPrimary: { label: '较低品质主药 · 一笔订单', price: 10 },
  youngAuxiliary: { label: '较低品质辅药 · 一笔订单', price: 10 },
  woodCore: { label: '廉价木属性魔核 · 一笔订单', price: 25 },
  jadeBottle: { label: '装售品的白玉瓶', price: 5 },
}
export const CONSIGNMENT_FUNDS = 90
export const EARLY_TRAINING_ID = 'early-training-supplies'
export function blankEarlyTraining(): EarlyTrainingState {
  return { started: false, purse: { own: 0, borrowed: 0, spent: 0 },
    supplies: { bluegrass: 0, boneflower: 0, woodCore: 0 },
    receipts: { bluegrass: false, boneflower: false, woodCore: false },
    market: { stage: 0, blackIron: 0 },
    liquid: { stage: 0, water: false, ready: false },
    practice: { phase: 0, pulse: 0, score: 0, attempts: 0 },
    bracelet: { stage: 0, gift: 'none' }, growth: { stage: 0 }, hall: { stage: 0, scroll: 'none' }, teaching: { stage: 0 },
    supervision: { stage: 0, pulses: 0, attempts: 0 },
    recovery: { stage: 0, energy: 'unobserved', period: 'unreviewed', result: 'none' },
    consignment: { stage: 0, funds: 0, spent: 0,
      receipts: { youngPrimary: false, youngAuxiliary: false, woodCore: false, jadeBottle: false },
      supplies: { youngPrimary: 0, youngAuxiliary: 0, woodCore: 0, jadeBottle: 0 }, product: 'none', owner: 'none' },
    appraisal: { stage: 0, cloaked: false, speaker: 'self', tier: 0, card: 'none' }, auction: { stage: 0 },
    settlement: { stage: 0, net: 0, vip: false }, fatherGift: { stage: 0 }, xunerVisit: { stage: 0, card: 'xuner' },
    longSupplies: { stage: 0, herbs: 'none', cores: 'none' },
    forestStrike: { stage: 0, beats: 0, attempts: 0, tree: 'intact', result: 'none' },
    seventhRoom: { stage: 0, beats: 0, attempts: 0, drops: 0, energy: 'unobserved', period: 'unreviewed', result: 'none' },
    palmPair: { stage: 0, beats: 0, attempts: 0, first: 'intact', second: 'intact', teaching: 'unlearned', period: 'unreviewed' },
    preliminary: { stage: 0, mei: 'unmeasured', xuner: 'unmeasured', yan: 'unmeasured' },
    keChallenge: { stage: 0, beats: 0, attempts: 0, verdict: 'none', invitation: 'none' },
    eighthTraining: { stage: 0, beats: 0, attempts: 0, outing: 'none', period: 'none', energy: 'unobserved', result: 'none' } }
}
export function parseEarlyTraining(value: unknown, completed: number[], legacyReceipts = false, legacyMarket = false, legacyLiquid = false, legacyPractice = false, legacyBracelet = false, legacyGrowth = false, legacyHall = false, legacyHallScroll = false, legacyTeaching = false, legacySupervision = false, legacyRecovery = false, legacyConsignment = false, legacyAppraisal = false, legacyAuction = false, legacySettlement = false, legacyFatherGift = false, legacyXunerVisit = false, legacyLongSupplies = false, legacyForestStrike = false, legacySeventhRoom = false, legacyPalmPair = false, legacyPreliminary = false, legacyKeChallenge = false, legacyEighthTraining = false): EarlyTrainingState {
  const invalid = () => { throw new Error('重修往事的任务记录无效。') }
  const object = (input: unknown): Record<string, unknown> => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid()
    return input as Record<string, unknown>
  }
  const data = object(value), purse = object(data.purse), supplies = object(data.supplies)
  if (typeof data.started !== 'boolean' || (data.started && !completed.includes(2))) return invalid()
  if (data.receipts === undefined && legacyReceipts) {
    for (const key of ['own', 'borrowed', 'spent']) if (purse[key] !== 0) return invalid()
    for (const key of ['bluegrass', 'boneflower', 'woodCore']) if (supplies[key] !== 0) return invalid()
    return { ...blankEarlyTraining(), started: data.started }
  }
  const receipts = object(data.receipts)
  if (purse.own !== 0 || ![0, EARLY_LOAN].includes(purse.borrowed as number)
    || (!data.started && purse.borrowed !== 0)) return invalid()
  const result = { ...blankEarlyTraining(), started: data.started }
  const liquid = data.liquid === undefined && legacyLiquid ? result.liquid : object(data.liquid)
  if (typeof liquid.stage !== 'number' || !Number.isSafeInteger(liquid.stage) || liquid.stage < 0 || liquid.stage > 6
    || liquid.water !== (liquid.stage >= 2) || liquid.ready !== (liquid.stage === 6)) return invalid()
  result.liquid = { stage: liquid.stage, water: liquid.water as boolean, ready: liquid.ready as boolean }
  let spent = 0
  for (const id of Object.keys(earlySupplies) as EarlySupplyId[]) {
    if (typeof receipts[id] !== 'boolean') return invalid()
    const purchased = receipts[id] as boolean
    if (purchased && (!data.started || purse.borrowed !== EARLY_LOAN)) return invalid()
    const consumed = liquid.stage >= ({ bluegrass: 3, boneflower: 4, woodCore: 5 }[id])
    if (supplies[id] !== (purchased && !consumed ? earlySupplies[id].quantity : 0)) return invalid()
    result.receipts[id] = purchased; result.supplies[id] = supplies[id] as number
    if (purchased) spent += earlySupplies[id].price
  }
  if (result.receipts.woodCore && (!result.receipts.bluegrass || !result.receipts.boneflower)) return invalid()
  if (purse.spent !== spent || spent > (purse.borrowed as number)) return invalid()
  result.purse = { own: 0, borrowed: purse.borrowed as number, spent }
  const market = data.market === undefined && legacyMarket ? result.market : object(data.market)
  if (typeof market.stage !== 'number' || !Number.isSafeInteger(market.stage) || market.stage < 0 || market.stage > 4
    || market.blackIron !== (market.stage === 4 ? 1 : 0)) return invalid()
  if (market.stage > 0 && (!result.started || !result.receipts.bluegrass || !result.receipts.boneflower)) return invalid()
  if (market.stage === 4 && !result.receipts.woodCore) return invalid()
  result.market = { stage: market.stage, blackIron: market.blackIron as number }
  if (liquid.stage > 0 && (!result.receipts.woodCore || market.stage !== 4)) return invalid()
  const practice = data.practice === undefined && legacyPractice ? result.practice : object(data.practice)
  const integer = (input: unknown, max: number): input is number =>
    typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 && input <= max
  if (!integer(practice.phase, 4) || !integer(practice.pulse, 3)
    || !integer(practice.score, 300) || !integer(practice.attempts, 1_000_000)) return invalid()
  if (practice.phase > 0 && !result.liquid.ready) return invalid()
  if (practice.phase === 0 && (practice.pulse || practice.score || practice.attempts)) return invalid()
  if (practice.phase === 1 && (practice.pulse > 2 || practice.score > practice.pulse * 100)) return invalid()
  if (practice.phase >= 2 && (practice.pulse !== 3 || practice.score < 180)) return invalid()
  result.practice = { phase: practice.phase, pulse: practice.pulse, score: practice.score, attempts: practice.attempts }
  const bracelet = data.bracelet === undefined && legacyBracelet ? result.bracelet : object(data.bracelet)
  if (!integer(bracelet.stage, 6) || bracelet.gift !== (bracelet.stage >= 5 ? 'xuner' : 'none')
    || bracelet.stage > 0 && (!result.started || !result.receipts.bluegrass || !result.receipts.boneflower)) return invalid()
  result.bracelet = { stage: bracelet.stage, gift: bracelet.gift as 'none' | 'xuner' }
  const growth = data.growth === undefined && legacyGrowth ? result.growth : object(data.growth)
  if (!integer(growth.stage, 3) || growth.stage > 0 && practice.phase !== 4) return invalid()
  result.growth = { stage: growth.stage }
  const hall = data.hall === undefined && legacyHall ? result.hall : object(data.hall)
  if (!integer(hall.stage, 9) || hall.stage > 0 && practice.phase !== 4) return invalid()
  const scroll = hall.scroll === undefined && legacyHallScroll && hall.stage <= 1 ? 'none' : hall.scroll
  const expectedScroll = hall.stage >= 8 ? 'borrowed-second' : hall.stage === 7 ? 'selected-second'
    : hall.stage >= 2 && hall.stage <= 5 ? 'reading-first' : 'none'
  if (scroll !== expectedScroll) return invalid()
  result.hall = { stage: hall.stage, scroll: scroll as EarlyTrainingState['hall']['scroll'] }
  const teaching = data.teaching === undefined && legacyTeaching ? result.teaching : object(data.teaching)
  if (!integer(teaching.stage, 5) || teaching.stage > 0 && hall.stage !== 9) return invalid()
  result.teaching = { stage: teaching.stage }
  const supervision = data.supervision === undefined && legacySupervision ? result.supervision : object(data.supervision)
  if (!integer(supervision.stage, 2) || !integer(supervision.pulses, 4) || !integer(supervision.attempts, 1_000_000)
    || ((supervision.stage > 0 || supervision.attempts > 0) && teaching.stage !== 5)
    || supervision.stage === 0 && supervision.pulses !== 0
    || supervision.stage === 1 && supervision.pulses >= 4
    || supervision.stage === 2 && supervision.pulses !== 4) return invalid()
  result.supervision = { stage: supervision.stage, pulses: supervision.pulses, attempts: supervision.attempts }
  const recovery = data.recovery === undefined && legacyRecovery ? result.recovery : object(data.recovery)
  if (!integer(recovery.stage, 7) || recovery.stage > 0 && supervision.stage !== 2
    || recovery.energy !== recoveryEnergyAt(recovery.stage)
    || recovery.period !== (recovery.stage >= 6 ? 'reviewed' : 'unreviewed')
    || recovery.result !== (recovery.stage === 7 ? 'fifth-duan' : 'none')) return invalid()
  result.recovery = { stage: recovery.stage, energy: recovery.energy as EarlyTrainingState['recovery']['energy'],
    period: recovery.period as EarlyTrainingState['recovery']['period'], result: recovery.result as EarlyTrainingState['recovery']['result'] }
  const consignment = data.consignment === undefined && legacyConsignment ? result.consignment : object(data.consignment)
  const appraisal = data.appraisal === undefined && legacyAppraisal ? result.appraisal : object(data.appraisal)
  if (!integer(appraisal.stage, 8) || appraisal.stage > 0 && consignment.stage !== 5
    || appraisal.cloaked !== (appraisal.stage >= 1) || appraisal.speaker !== (appraisal.stage >= 4 ? 'yaolao' : 'self')
    || appraisal.tier !== (appraisal.stage >= 6 ? 2 : 0) || appraisal.card !== (appraisal.stage >= 7 ? 'black-entry' : 'none')) return invalid()
  result.appraisal = { stage: appraisal.stage, cloaked: appraisal.cloaked as boolean, speaker: appraisal.speaker as EarlyTrainingState['appraisal']['speaker'],
    tier: appraisal.tier as number, card: appraisal.card as EarlyTrainingState['appraisal']['card'] }
  const fatherGift = data.fatherGift === undefined && legacyFatherGift ? result.fatherGift : object(data.fatherGift)
  if (!integer(fatherGift.stage, 6)) return invalid()
  result.fatherGift = { stage: fatherGift.stage }
  if (!integer(consignment.stage, 5) || consignment.stage > 0 && recovery.stage !== 7
    || consignment.funds !== (consignment.stage > 0 ? CONSIGNMENT_FUNDS : 0)) return invalid()
  const saleReceipts = object(consignment.receipts), saleSupplies = object(consignment.supplies)
  let saleSpent = 0, saleOrders = 0
  const parsed = structuredClone(result.consignment)
  for (const id of Object.keys(consignmentSupplies) as ConsignmentSupplyId[]) {
    if (typeof saleReceipts[id] !== 'boolean' || saleReceipts[id] && consignment.stage === 0) return invalid()
    const bought = saleReceipts[id] as boolean
    if (saleSupplies[id] !== (bought && consignment.stage < (id === 'jadeBottle' ? 5 : 3) ? 1 : 0)) return invalid()
    parsed.receipts[id] = bought; parsed.supplies[id] = saleSupplies[id] as number
    if (bought) { saleSpent += consignmentSupplies[id].price; saleOrders++ }
  }
  if (consignment.spent !== saleSpent || saleSpent > (consignment.funds as number)
    || consignment.stage >= 2 && saleOrders !== 4 || consignment.stage === 1 && saleOrders >= 4
    || consignment.product !== (consignment.stage === 5 ? 'sealed' : consignment.stage === 4 ? 'mixture' : 'none')
    || consignment.owner !== (consignment.stage === 5 ? consignmentOwnerAt(appraisal.stage, fatherGift.stage) : 'none')) return invalid()
  result.consignment = { ...parsed, stage: consignment.stage, funds: consignment.funds as number, spent: saleSpent,
    product: consignment.product as EarlyTrainingState['consignment']['product'], owner: consignment.owner as EarlyTrainingState['consignment']['owner'] }
  const auction = data.auction === undefined && legacyAuction ? result.auction : object(data.auction)
  if (!integer(auction.stage, 7) || auction.stage > 0 && appraisal.stage !== 8) return invalid()
  result.auction = { stage: auction.stage }
  const settlement = data.settlement === undefined && legacySettlement ? result.settlement : object(data.settlement)
  if (!integer(settlement.stage, 7) || settlement.stage > 0 && auction.stage !== 7
    || settlement.vip !== (settlement.stage >= 4) || settlement.net !== (settlement.stage >= 6 ? 39200 : 0)) return invalid()
  result.settlement = { stage: settlement.stage, net: settlement.net as number, vip: settlement.vip as boolean }
  if (fatherGift.stage > 0 && settlement.stage !== 7) return invalid()
  const xunerVisit = data.xunerVisit === undefined && legacyXunerVisit ? result.xunerVisit : object(data.xunerVisit)
  if (!integer(xunerVisit.stage, 7) || xunerVisit.stage > 0 && fatherGift.stage !== 6
    || xunerVisit.card !== xunerCardAt(xunerVisit.stage)) return invalid()
  result.xunerVisit = { stage: xunerVisit.stage, card: xunerVisit.card as EarlyTrainingState['xunerVisit']['card'] }
  const longSupplies = data.longSupplies === undefined && legacyLongSupplies ? result.longSupplies : object(data.longSupplies)
  if (!integer(longSupplies.stage, 6) || longSupplies.stage > 0 && xunerVisit.stage !== 7
    || longSupplies.herbs !== longSupplyPlaceAt(longSupplies.stage, 'herbs')
    || longSupplies.cores !== longSupplyPlaceAt(longSupplies.stage, 'cores')) return invalid()
  result.longSupplies = { stage: longSupplies.stage, herbs: longSupplies.herbs as LongSupplyPlace, cores: longSupplies.cores as LongSupplyPlace }
  const forestStrike = data.forestStrike === undefined && legacyForestStrike ? result.forestStrike : object(data.forestStrike)
  if (!validForestStrike(forestStrike) || forestStrike.stage > 0 && longSupplies.stage !== 6) return invalid()
  result.forestStrike = { stage: forestStrike.stage, beats: forestStrike.beats, attempts: forestStrike.attempts,
    tree: forestStrike.tree, result: forestStrike.result }
  const seventhRoom = data.seventhRoom === undefined && legacySeventhRoom ? result.seventhRoom : object(data.seventhRoom)
  if (!validSeventhRoom(seventhRoom) || seventhRoom.stage > 0 && forestStrike.stage !== 7) return invalid()
  result.seventhRoom = { stage: seventhRoom.stage, beats: seventhRoom.beats, attempts: seventhRoom.attempts,
    drops: seventhRoom.drops, energy: seventhRoom.energy, period: seventhRoom.period, result: seventhRoom.result }
  const palmPair = data.palmPair === undefined && legacyPalmPair ? result.palmPair : object(data.palmPair)
  if (!validPalmPair(palmPair) || palmPair.stage > 0 && seventhRoom.stage !== 8) return invalid()
  result.palmPair = { stage: palmPair.stage, beats: palmPair.beats, attempts: palmPair.attempts,
    first: palmPair.first, second: palmPair.second, teaching: palmPair.teaching, period: palmPair.period }
  const preliminary = data.preliminary === undefined && legacyPreliminary ? result.preliminary : object(data.preliminary)
  if (!validPreliminary(preliminary) || preliminary.stage > 0 && palmPair.stage !== 10) return invalid()
  result.preliminary = { stage: preliminary.stage, mei: preliminary.mei, xuner: preliminary.xuner, yan: preliminary.yan }
  const keChallenge = data.keChallenge === undefined && legacyKeChallenge ? result.keChallenge : object(data.keChallenge)
  if (!validKeChallenge(keChallenge) || (keChallenge.stage > 0 || keChallenge.attempts > 0) && preliminary.stage !== 16) return invalid()
  result.keChallenge = { stage: keChallenge.stage, beats: keChallenge.beats, attempts: keChallenge.attempts,
    verdict: keChallenge.verdict, invitation: keChallenge.invitation }
  const eighthTraining = data.eighthTraining === undefined && legacyEighthTraining ? result.eighthTraining : object(data.eighthTraining)
  if (!validEighthTraining(eighthTraining) || eighthTraining.stage > 0 && keChallenge.stage !== 12) return invalid()
  result.eighthTraining = { stage: eighthTraining.stage, beats: eighthTraining.beats, attempts: eighthTraining.attempts,
    outing: eighthTraining.outing, period: eighthTraining.period, energy: eighthTraining.energy, result: eighthTraining.result }
  return result
}

export function eighthTrainingAt(stage: number): Pick<EighthTrainingState, 'outing' | 'period' | 'energy' | 'result'> {
  return { outing: stage >= 6 ? 'completed' : stage >= 1 ? 'promised' : 'none', period: stage >= 10 ? 'reviewed' : 'none',
    energy: stage >= 12 ? 'little' : stage >= 3 ? 'active' : 'unobserved', result: stage >= 14 ? 'eighth-duan' : 'none' }
}
export function validEighthTraining(task: Record<string, unknown> | EighthTrainingState): task is EighthTrainingState {
  const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
  if (!integer(task.stage, 15) || !integer(task.beats, task.stage === 8 ? 2 : task.stage === 7 || task.stage === 12 ? 1 : 0)
    || !integer(task.attempts, task.stage < 7 ? 0 : 1_000_000)) return false
  const expected = eighthTrainingAt(task.stage)
  return (Object.keys(expected) as (keyof typeof expected)[]).every(key => task[key] === expected[key])
}

export function validKeChallenge(task: Record<string, unknown> | KeChallengeState): task is KeChallengeState {
  const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
  return integer(task.stage, 12) && integer(task.beats, 2) && integer(task.attempts, 1_000_000)
    && (task.stage < 2 ? task.beats === 0 && task.attempts === 0 : task.stage === 2 ? task.beats === 0 : task.stage === 3 ? task.beats < 2 : task.beats === 2)
    && task.verdict === (task.stage >= 5 ? 'xiaoyan' : task.stage === 4 ? 'pending' : 'none')
    && task.invitation === (task.stage >= 11 ? 'offered' : 'none')
}

export function preliminaryAt(stage: number): Omit<PreliminaryState, 'stage'> {
  return { mei: stage >= 6 ? 'eighth-duan' : 'unmeasured', xuner: stage >= 8 ? 'one-star' : 'unmeasured',
    yan: stage >= 11 ? 'seventh-duan' : 'unmeasured' }
}
export function validPreliminary(task: Record<string, unknown> | PreliminaryState): task is PreliminaryState {
  if (typeof task.stage !== 'number' || !Number.isSafeInteger(task.stage) || task.stage < 0 || task.stage > 16) return false
  const expected = preliminaryAt(task.stage)
  return task.mei === expected.mei && task.xuner === expected.xuner && task.yan === expected.yan
}

export function palmPairAt(stage: number): Pick<PalmPairState, 'first' | 'second' | 'teaching' | 'period'> {
  return { first: stage >= 4 ? 'fragments' : stage === 3 ? 'pulled' : 'intact',
    second: stage >= 9 ? 'dust' : stage === 8 ? 'pulled' : 'intact',
    teaching: stage >= 6 ? 'basic' : stage === 5 ? 'explained' : 'unlearned',
    period: stage >= 7 ? 'reviewed' : 'unreviewed' }
}
export function validPalmPair(task: Record<string, unknown> | PalmPairState): task is PalmPairState {
  const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
  if (!integer(task.stage, 10) || !integer(task.beats, 2) || !integer(task.attempts, 1_000_000)) return false
  const expected = palmPairAt(task.stage)
  return (task.stage < 5 ? task.beats === 0 && task.attempts === 0 : task.stage === 5 ? task.beats < 2 : task.beats === 2)
    && task.first === expected.first && task.second === expected.second && task.teaching === expected.teaching && task.period === expected.period
}

export function seventhEnergyAt(stage: number): SeventhRoomState['energy'] {
  return stage === 0 ? 'unobserved' : stage === 1 ? 'active' : stage === 2 ? 'fading'
    : stage === 3 ? 'clear' : stage === 4 ? 'restored' : 'lighter'
}
export function validSeventhRoom(task: Record<string, unknown> | SeventhRoomState): task is SeventhRoomState {
  const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
  return integer(task.stage, 8) && integer(task.beats, 3) && integer(task.attempts, 1_000_000)
    && (task.stage === 0 ? task.beats === 0 && task.attempts === 0
      : task.stage === 1 ? task.beats <= 1 : task.stage <= 3 ? task.beats === 2
      : task.stage === 4 ? task.beats <= 2 : task.beats === 3)
    && task.drops === (task.stage >= 4 ? 1 : 0) && task.energy === seventhEnergyAt(task.stage)
    && task.period === (task.stage >= 6 ? 'reviewed' : 'unreviewed')
    && task.result === (task.stage >= 7 ? 'seventh-duan' : 'none')
}

export function validForestStrike(task: Record<string, unknown> | ForestStrikeState): task is ForestStrikeState {
  const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
  return integer(task.stage, 7) && integer(task.beats, 3) && integer(task.attempts, 1_000_000)
    && (task.stage >= 3 ? task.beats === 3 : task.stage === 2 ? task.beats <= 2 : task.beats === 0)
    && (task.stage !== 0 || task.attempts === 0)
    && task.tree === (task.stage >= 3 ? 'fallen' : 'intact')
    && task.result === (task.stage > 0 ? 'sixth-duan' : 'none')
}

export function longSupplyPlaceAt(stage: number, item: 'herbs' | 'cores'): LongSupplyPlace {
  return stage === 0 ? 'none' : stage >= 5 ? 'cabinet' : stage >= (item === 'herbs' ? 2 : 3) ? 'shelf' : 'parcel'
}

export function xunerCardAt(stage: number): EarlyTrainingState['xunerVisit']['card'] {
  return stage >= 6 ? 'elders' : 'xuner'
}

export function recoveryEnergyAt(stage: number): EarlyTrainingState['recovery']['energy'] {
  return stage < 2 ? 'unobserved' : stage === 2 ? 'active' : stage === 3 ? 'fading' : 'spent'
}

export function appraisalOwnerAt(stage: number): EarlyTrainingState['consignment']['owner'] {
  return stage < 3 ? 'xiaoyan' : stage < 5 ? 'inspection-desk' : stage < 7 ? 'guni' : 'auction'
}
export function consignmentOwnerAt(appraisalStage: number, fatherGiftStage: number): EarlyTrainingState['consignment']['owner'] {
  return fatherGiftStage >= 4 ? 'xiaoyan' : fatherGiftStage >= 2 ? 'xiaozhan' : appraisalOwnerAt(appraisalStage)
}
