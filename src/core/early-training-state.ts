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
export const EARLY_TRAINING_ID = 'early-training-supplies'
export function blankEarlyTraining(): EarlyTrainingState {
  return { started: false, purse: { own: 0, borrowed: 0, spent: 0 },
    supplies: { bluegrass: 0, boneflower: 0, woodCore: 0 },
    receipts: { bluegrass: false, boneflower: false, woodCore: false },
    market: { stage: 0, blackIron: 0 },
    liquid: { stage: 0, water: false, ready: false },
    practice: { phase: 0, pulse: 0, score: 0, attempts: 0 },
    bracelet: { stage: 0, gift: 'none' }, growth: { stage: 0 }, hall: { stage: 0, scroll: 'none' }, teaching: { stage: 0 } }
}
export function parseEarlyTraining(value: unknown, completed: number[], legacyReceipts = false, legacyMarket = false, legacyLiquid = false, legacyPractice = false, legacyBracelet = false, legacyGrowth = false, legacyHall = false, legacyHallScroll = false, legacyTeaching = false): EarlyTrainingState {
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
  return result
}
