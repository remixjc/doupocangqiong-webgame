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
    supplies: Record<ConsignmentSupplyId, number>; product: 'none' | 'mixture' | 'sealed'; owner: 'none' | 'xiaoyan' | 'inspection-desk' | 'guni' | 'auction' }
  appraisal: { stage: number; cloaked: boolean; speaker: 'self' | 'yaolao'; tier: number; card: 'none' | 'black-entry' }
  auction: { stage: number }
}
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
    appraisal: { stage: 0, cloaked: false, speaker: 'self', tier: 0, card: 'none' }, auction: { stage: 0 } }
}
export function parseEarlyTraining(value: unknown, completed: number[], legacyReceipts = false, legacyMarket = false, legacyLiquid = false, legacyPractice = false, legacyBracelet = false, legacyGrowth = false, legacyHall = false, legacyHallScroll = false, legacyTeaching = false, legacySupervision = false, legacyRecovery = false, legacyConsignment = false, legacyAppraisal = false, legacyAuction = false): EarlyTrainingState {
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
    || consignment.owner !== (consignment.stage === 5 ? appraisalOwnerAt(appraisal.stage) : 'none')) return invalid()
  result.consignment = { ...parsed, stage: consignment.stage, funds: consignment.funds as number, spent: saleSpent,
    product: consignment.product as EarlyTrainingState['consignment']['product'], owner: consignment.owner as EarlyTrainingState['consignment']['owner'] }
  const auction = data.auction === undefined && legacyAuction ? result.auction : object(data.auction)
  if (!integer(auction.stage, 7) || auction.stage > 0 && appraisal.stage !== 8) return invalid()
  result.auction = { stage: auction.stage }
  return result
}

export function recoveryEnergyAt(stage: number): EarlyTrainingState['recovery']['energy'] {
  return stage < 2 ? 'unobserved' : stage === 2 ? 'active' : stage === 3 ? 'fading' : 'spent'
}

export function appraisalOwnerAt(stage: number): EarlyTrainingState['consignment']['owner'] {
  return stage < 3 ? 'xiaoyan' : stage < 5 ? 'inspection-desk' : stage < 7 ? 'guni' : 'auction'
}
