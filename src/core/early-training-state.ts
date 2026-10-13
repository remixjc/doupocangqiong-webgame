import { firstHallScrollReviewAt, validFirstHallScrollReview, type FirstHallScrollReviewState } from './first-hall-scroll-review-state'
import { firstHallTeacherAt, validFirstHallTeacher, type FirstHallTeacherState } from './first-hall-teacher-state'
import { firstHallEveningAt, validFirstHallEvening, type FirstHallEveningState } from './first-hall-evening-state'
import { firstHallAfternoonAt, validFirstHallAfternoon, type FirstHallAfternoonState } from './first-hall-afternoon-state'
import { firstHallApproachAt, validFirstHallApproach, type FirstHallApproachState } from './first-hall-approach-state'
import { firstHallTalkAt, validFirstHallTalk, hallTalkMinimum, type FirstHallTalkState } from './first-hall-talk-state'
import { firstHallMatchAt, validFirstHallMatch, hallMatchMinimum, type FirstHallMatchState } from './first-hall-match-state'
import { firstHallReadingAt, validFirstHallReading, type FirstHallReadingState } from './first-hall-reading-state'
import { firstHallEntryAt, validFirstHallEntry, type FirstHallEntryState } from './first-hall-entry-state'
import { firstRoadMeetingAt, validFirstRoadMeeting, type FirstRoadMeetingState } from './first-road-meeting-state'
import { firstDepartureAt, validFirstDeparture, type FirstDepartureState } from './first-departure-state'
import { firstTechniqueAt, validFirstTechnique, type FirstTechniqueState } from './first-technique-state'
import { firstTrainingAt, validFirstTraining, type FirstTrainingState } from './first-training-state'
import { refiningAt, refiningLiquidMinimum, validRefining, type RefiningState } from './early-refining-state'
import { ironAt, validIron, type IronState } from './early-iron-state'
import { marketReturnAt, validMarketReturn, type MarketReturnState } from './early-market-return-state'
import { marketTradeAt, marketTradeMinimum, validMarketTrade, type MarketTradeState } from './early-market-trade-state'
import { marketDiscoveryAt, validMarketDiscovery, type MarketDiscoveryState } from './early-market-discovery-state'
import { marketStandoffAt, validMarketStandoff, type MarketStandoffState } from './early-market-standoff-state'
import { boundedInteger, fieldsMatch, stagedFieldsMatch } from './state-guards'
import { familyVisitAt, validFamilyVisit, type FamilyVisitState } from './early-family-visit-state'
import { familyCompensationAt, validFamilyCompensation, type FamilyCompensationState } from './early-family-compensation-state'
import { familyContractAt, validFamilyContract, type FamilyContractState } from './early-family-contract-state'
import { mountainRingAt, validMountainRing, type MountainRingState } from './early-mountain-ring-state'
import { apprenticeAt, validApprentice, type ApprenticeState } from './early-apprentice-state'
import { methodDiscussionAt, validMethodDiscussion, type MethodDiscussionState } from './early-method-discussion-state'
import { preparationBriefAt, validPreparationBrief, type PreparationBriefState } from './early-preparation-brief-state'
import { mountainVisitorAt, validMountainVisitor, type MountainVisitorState } from './early-mountain-visitor-state'
import { morningCardAt, validMorningCard, type MorningCardState } from './early-morning-card-state'
import { cityPharmacyAt, validCityPharmacy, type CityPharmacyState } from './early-city-pharmacy-state'
import { marketEscortAt, validMarketEscort, type MarketEscortState } from './early-market-escort-state'
import { marketSearchAt, validMarketSearch, type MarketSearchState } from './early-market-search-state'
import { braceletMinimum, marketBraceletsAt, validMarketBracelets, type MarketBraceletsState } from './early-market-bracelets-state'

export interface EarlyTrainingState {
  firstHallScrollReview: FirstHallScrollReviewState
  firstHallTeacher: FirstHallTeacherState
  firstHallEvening: FirstHallEveningState
  firstHallAfternoon: FirstHallAfternoonState
  firstHallApproach: FirstHallApproachState
  firstHallTalk: FirstHallTalkState
  firstHallMatch: FirstHallMatchState
  firstHallReading: FirstHallReadingState
  firstHallEntry: FirstHallEntryState
  firstRoadMeeting: FirstRoadMeetingState
  firstDeparture: FirstDepartureState
  firstTechnique: FirstTechniqueState
  firstTraining: FirstTrainingState
  familyVisit: FamilyVisitState
  familyCompensation: FamilyCompensationState
  familyContract: FamilyContractState
  mountainRing: MountainRingState
  apprentice: ApprenticeState
  methodDiscussion: MethodDiscussionState
  preparationBrief: PreparationBriefState
  mountainVisitor: MountainVisitorState
  morningCard: MorningCardState
  cityPharmacy: CityPharmacyState
  marketEscort: MarketEscortState
  marketSearch: MarketSearchState
  marketBracelets: MarketBraceletsState
  marketStandoff: MarketStandoffState
  marketDiscovery: MarketDiscoveryState
  marketTrade: MarketTradeState
  refining: RefiningState
  iron: IronState
  marketReturn: MarketReturnState
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
  ceremonyGuests: CeremonyGuestsState
  ceremonialTest: CeremonialTestState
  ningFirst: NingFirstState
  ningSecond: NingSecondState
  ceremonyVerdict: CeremonyVerdictState
  qiPavilionEntry: QiPavilionEntryState
  qiPavilionBarrier: QiBarrierState
  qiPavilionScroll: QiPavilionScrollState
  qiPavilionAid: QiPavilionAidState
  qiPavilionExchange: QiPavilionExchangeState
}
export interface QiBarrierState { stage: number; path: 0 | 3; beats: number; attempts: number; room37: boolean; room43: boolean; barrier: 'unobserved' | 'intact' | 'touched' | 'broken'; entered: boolean }
export interface QiPavilionEntryState { stage: number; door: 'closed' | 'open'; other: 'unmeasured' | 'wind'; yan: 'unmeasured' | 'fire'; xuner: 'unmeasured' | 'fire'; crystal: 'intact' | 'cracked' | 'broken'; hint: 'none' | 'fire-3-43'; permission: boolean; entered: boolean }
export interface QiPavilionScrollState { stage: number; family: 'none' | 'held'; offer: 'none' | 'offered' | 'declined'; owner: 'none' | 'xiaoyan' }
export interface QiPavilionAidState { stage: number; beats: number; attempts: number; group: 'none' | 'together'; xunerScroll: 'none' | 'xuner'; door: 'unseen' | 'intact' | 'broken'; returned: boolean; solo: boolean; thanks: 'none' | 'spoken' }
export interface QiPavilionExchangeState { stage: number; familyOwner: 'xiaoyan' | 'xuner'; support: 'hidden' | 'shown'; reply: 'none' | 'declined' }
export interface CeremonyVerdictState { stage: number; yu: 'none' | 'requested' | 'blocked'; xuner: 'none' | 'requested' | 'blocked'; penalty: 0 | 3; verdict: 'pending' | 'xiaoyan'; rite: 'none' | 'continued' | 'ended'; technique: 'none' | 'offered' | 'declined'; method: 'none' | 'offered' | 'declined'; nextHall: 'none' | 'five-days' }
export interface NingSecondState { stage: number; beats: number; attempts: number; pill: 'ning-held' | 'used'; ignored: boolean; contact: 'none' | 'met' | 'out'; verdict: 'pending' }
export interface NingFirstState { stage: number; beats: number; attempts: number; pill: 'unseen' | 'ning-held'; verdict: 'none' | 'pending' }
export interface CeremonialTestState { stage: number; rite: 'none' | 'begun' | 'reviewed' | 'ended'; inspected: boolean; result: 'unmeasured' | 'eighth-duan' }
export interface CeremonyGuestsState { stage: number; sword: 'none' | 'drawn' | 'sheathed'; introduced: boolean }
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
export const EARLY_CEREMONY_GUESTS_VERSION = '0.29.0'
export const EARLY_CEREMONIAL_TEST_VERSION = '0.30.0'
export const EARLY_NING_FIRST_VERSION = '0.31.0'
export const EARLY_NING_SECOND_VERSION = '0.32.0'
export const EARLY_CEREMONY_VERDICT_VERSION = '0.33.0'
export const EARLY_QI_PAVILION_ENTRY_VERSION = '0.34.0'
export const EARLY_QI_BARRIER_VERSION = '0.35.0'
export const EARLY_QI_SCROLL_VERSION = '0.36.0'
export const EARLY_QI_AID_VERSION = '0.37.0'
export const EARLY_QI_EXCHANGE_VERSION = '0.37.0'
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
  return { firstHallScrollReview: firstHallScrollReviewAt(0), firstHallTeacher: firstHallTeacherAt(0), firstHallEvening: firstHallEveningAt(0), firstHallAfternoon: firstHallAfternoonAt(0), firstHallApproach: firstHallApproachAt(0), firstHallTalk: firstHallTalkAt(0), firstHallMatch: firstHallMatchAt(0), firstHallReading: firstHallReadingAt(0), firstHallEntry: firstHallEntryAt(0), firstRoadMeeting: firstRoadMeetingAt(0), firstDeparture: firstDepartureAt(0), firstTechnique: firstTechniqueAt(0), firstTraining: firstTrainingAt(0), familyVisit: familyVisitAt(0), familyCompensation: familyCompensationAt(0), familyContract: familyContractAt(0), mountainRing: mountainRingAt(0), apprentice: apprenticeAt(0), methodDiscussion: methodDiscussionAt(0), preparationBrief: preparationBriefAt(0), mountainVisitor: mountainVisitorAt(0), morningCard: morningCardAt(0), cityPharmacy: cityPharmacyAt(0), marketEscort: marketEscortAt(0), marketSearch: marketSearchAt(0), marketBracelets: marketBraceletsAt(0), marketStandoff: marketStandoffAt(0), marketDiscovery: marketDiscoveryAt(0), marketTrade: marketTradeAt(0), marketReturn: marketReturnAt(0), iron: ironAt(0), refining: refiningAt(0), started: false, purse: { own: 0, borrowed: 0, spent: 0 },
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
    eighthTraining: { stage: 0, beats: 0, attempts: 0, outing: 'none', period: 'none', energy: 'unobserved', result: 'none' },
    ceremonyGuests: { stage: 0, sword: 'none', introduced: false },
    ceremonialTest: { stage: 0, rite: 'none', inspected: false, result: 'unmeasured' },
    ningFirst: { stage: 0, beats: 0, attempts: 0, pill: 'unseen', verdict: 'none' },
    ningSecond: { stage: 0, beats: 0, attempts: 0, pill: 'ning-held', ignored: false, contact: 'none', verdict: 'pending' },
    ceremonyVerdict: { stage: 0, ...ceremonyVerdictAt(0) },
    qiPavilionEntry: { stage: 0, ...qiPavilionEntryAt(0) },
    qiPavilionBarrier: { stage: 0, beats: 0, attempts: 0, ...qiBarrierAt(0) },
    qiPavilionScroll: { stage: 0, ...qiPavilionScrollAt(0) },
    qiPavilionAid: { stage: 0, beats: 0, attempts: 0, ...qiPavilionAidAt(0) },
    qiPavilionExchange: { stage: 0, ...qiPavilionExchangeAt(0) } }
}
export function parseEarlyTraining(value: unknown, completed: number[], legacyReceipts = false, legacyMarket = false, legacyLiquid = false, legacyPractice = false, legacyBracelet = false, legacyGrowth = false, legacyHall = false, legacyHallScroll = false, legacyTeaching = false, legacySupervision = false, legacyRecovery = false, legacyConsignment = false, legacyAppraisal = false, legacyAuction = false, legacySettlement = false, legacyFatherGift = false, legacyXunerVisit = false, legacyLongSupplies = false, legacyForestStrike = false, legacySeventhRoom = false, legacyPalmPair = false, legacyPreliminary = false, legacyKeChallenge = false, legacyEighthTraining = false, legacyCeremonyGuests = false, legacyCeremonialTest = false, legacyNingFirst = false, legacyNingSecond = false, legacyCeremonyVerdict = false, legacyQiPavilionEntry = false, legacyQiBarrier = false, legacyQiPavilionScroll = false, legacyQiPavilionAid = false, legacyFamilyVisit = false, legacyFamilyCompensation = false, legacyFamilyContract = false, legacyMountainRing = false, legacyApprentice = false, legacyMethodDiscussion = false, legacyPreparationBrief = false, legacyMountainVisitor = false, legacyMorningCard = false, legacyCityPharmacy = false, legacyMarketEscort = false, legacyMarketSearch = false, legacyMarketBracelets = false, legacyMarketStandoff = false, legacyMarketDiscovery = false, legacyMarketTrade = false, legacyMarketReturn = false, legacyIron = false, legacyRefining = false, legacyFirstTraining = false, legacyFirstReview = false, legacyFirstTechnique = false, legacyFirstBottle = false, legacyFirstDeparture = false, legacyFirstRoadMeeting = false, legacyFirstHallEntry = false, legacyFirstHallReading = false, legacyFirstHallMatch = false, legacyFirstHallTalk = false, legacyFirstHallApproach = false, legacyFirstHallFirstReturn = false, legacyFirstHallConflict = false, legacyFirstHallThreat = false, legacyFirstHallExitResponse = false, legacyFirstHallCheckout = false, legacyFirstHallLeaving = false, legacyFirstHallAftermath = false, legacyFirstHallAfternoon = false, legacyFirstHallEvening = false, legacyFirstHallTeacher = false, legacyFirstHallScrollReview = false): EarlyTrainingState {
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
  function candidate<K extends keyof EarlyTrainingState>(key: K, legacy: boolean): EarlyTrainingState[K] | Record<string, unknown> {
    return data[key] === undefined && legacy ? result[key] : object(data[key])
  }
  function history<T extends { stage: number }>(key: string, legacy: boolean,
    valid: (value: Record<string, unknown> | T) => value is T, derive: (stage: number) => T, prerequisite: boolean): T {
    const candidate = data[key] === undefined && legacy ? derive(0) : object(data[key])
    if (!valid(candidate) || candidate.stage > 0 && !prerequisite) return invalid()
    const parsed = derive(candidate.stage)
    ;(result as unknown as Record<string, unknown>)[key] = parsed
    return parsed
  }
  const familyVisit = history('familyVisit', legacyFamilyVisit, validFamilyVisit, familyVisitAt, !(!completed.includes(2)))
  const familyCompensation = history('familyCompensation', legacyFamilyCompensation, validFamilyCompensation, familyCompensationAt, !(familyVisit.stage !== 17))
  const familyContract = history('familyContract', legacyFamilyContract, validFamilyContract, familyContractAt, !(familyCompensation.stage !== 15))
  const mountainRing = history('mountainRing', legacyMountainRing, validMountainRing, mountainRingAt, !(familyContract.stage !== 33))
  const apprentice = history('apprentice', legacyApprentice, validApprentice, apprenticeAt, !(mountainRing.stage !== 21))
  const methodDiscussion = history('methodDiscussion', legacyMethodDiscussion, validMethodDiscussion, methodDiscussionAt, !(apprentice.stage !== 25))
  const preparationBrief = history('preparationBrief', legacyPreparationBrief, validPreparationBrief, preparationBriefAt, !(methodDiscussion.stage !== 28))
  const mountainVisitor = history('mountainVisitor', legacyMountainVisitor, validMountainVisitor, mountainVisitorAt, !(preparationBrief.stage !== 20))
  const morningCard = candidate('morningCard', legacyMorningCard)
  if (!validMorningCard(morningCard) || morningCard.stage > 0 && mountainVisitor.stage !== 26
    || morningCard.stage >= 9 && (!data.started || purse.borrowed !== EARLY_LOAN)) return invalid()
  result.morningCard = morningCardAt(morningCard.stage, morningCard.funds)
  const cityPharmacy = candidate('cityPharmacy', legacyCityPharmacy)
  if (!validCityPharmacy(cityPharmacy) || cityPharmacy.stage > 0 && morningCard.stage !== 14
    || cityPharmacy.stage >= 11 && receipts.bluegrass !== true || cityPharmacy.stage >= 12 && receipts.boneflower !== true) return invalid()
  result.cityPharmacy = cityPharmacyAt(cityPharmacy.stage, cityPharmacy.primaryOrder, cityPharmacy.auxiliaryOrder)
  const marketEscort = history('marketEscort', legacyMarketEscort, validMarketEscort, marketEscortAt, !(cityPharmacy.stage !== 15))
  const marketSearch = history('marketSearch', legacyMarketSearch, validMarketSearch, marketSearchAt, !(marketEscort.stage !== 24))
  const marketBracelets = history('marketBracelets', legacyMarketBracelets, validMarketBracelets, marketBraceletsAt, !(marketSearch.stage !== 20))
  const marketStandoff = history('marketStandoff', legacyMarketStandoff, validMarketStandoff, marketStandoffAt, !(marketBracelets.stage !== 28))
  const marketDiscovery = history('marketDiscovery', legacyMarketDiscovery, validMarketDiscovery, marketDiscoveryAt, !(marketStandoff.stage !== 34))
  const marketTrade = candidate('marketTrade', legacyMarketTrade)
  if (!validMarketTrade(marketTrade) || marketTrade.stage > 0 && marketDiscovery.stage !== 10) return invalid()
  result.marketTrade = marketTradeAt(marketTrade.stage, marketTrade.settlement)
  const marketReturn = history('marketReturn', legacyMarketReturn, validMarketReturn, marketReturnAt, !(marketTrade.stage !== 17))
  const iron = history('iron', legacyIron, validIron, ironAt, !(marketReturn.stage !== 9))
  const refining = history('refining', legacyRefining, validRefining, refiningAt, iron.stage === 18)
  const firstTraining = data.firstTraining === undefined && legacyFirstTraining ? result.firstTraining
    : { ...(legacyFirstReview ? { period: 'none', teacherReaction: false, pale: false, dressed: false } : {}), ...object(data.firstTraining) }
  if (!validFirstTraining(firstTraining) || firstTraining.stage > 0 && refining.stage !== 22) return invalid()
  result.firstTraining = firstTrainingAt(firstTraining.stage, firstTraining.beats, firstTraining.attempts)
  const firstTechnique = data.firstTechnique === undefined && legacyFirstTechnique ? result.firstTechnique
    : { ...(legacyFirstBottle ? { beats: 0, attempts: 0, bottle: 'unobserved', limited: false, insufficient: false, needed: 0, seekLow: false } : {}), ...object(data.firstTechnique) }
  if (!validFirstTechnique(firstTechnique) || firstTechnique.stage > 0 && (firstTraining.stage !== 17 || iron.stage !== 18)) return invalid()
  result.firstTechnique = firstTechniqueAt(firstTechnique.stage, firstTechnique.beats, firstTechnique.attempts)
  const firstDeparture = history('firstDeparture', legacyFirstDeparture, validFirstDeparture, firstDepartureAt, firstTechnique.stage === 19)
  const firstRoadMeeting = history('firstRoadMeeting', legacyFirstRoadMeeting, validFirstRoadMeeting, firstRoadMeetingAt, firstDeparture.stage === 9)
  const firstHallEntry = history('firstHallEntry', legacyFirstHallEntry, validFirstHallEntry, firstHallEntryAt, firstRoadMeeting.stage === 12)
  const firstHallReading = candidate('firstHallReading', legacyFirstHallReading)
  if (!validFirstHallReading(firstHallReading) || firstHallReading.stage > 0 && firstHallEntry.stage !== 9) return invalid()
  result.firstHallReading = firstHallReadingAt(firstHallReading.stage, firstHallReading.record)
  const firstHallMatch = history('firstHallMatch', legacyFirstHallMatch, validFirstHallMatch, firstHallMatchAt, firstHallReading.stage === 8)
  const firstHallTalk = history('firstHallTalk', legacyFirstHallTalk, validFirstHallTalk, firstHallTalkAt, firstHallMatch.stage === 20)
  const firstHallApproach = data.firstHallApproach === undefined && legacyFirstHallApproach ? result.firstHallApproach
    : { ...(legacyFirstHallFirstReturn ? { returnRecord: 'none' } : {}), ...(legacyFirstHallConflict ? { ownPlaced: false, secondRecord: 'none' } : {}), ...(legacyFirstHallThreat ? { threatHeard: false } : {}), ...(legacyFirstHallExitResponse ? { yan: 'east' } : {}), ...(legacyFirstHallCheckout ? { checkoutRecord: 'none' } : {}), ...(legacyFirstHallLeaving ? { xunerPos: 'east', exitRecord: 'none' } : {}), ...(legacyFirstHallAftermath ? { ningAngry: false, handprint: false } : {}), ...object(data.firstHallApproach) }
  if (!validFirstHallApproach(firstHallApproach) || firstHallApproach.stage > 0 && firstHallTalk.stage !== 20) return invalid()
  result.firstHallApproach = firstHallApproachAt(firstHallApproach.stage, firstHallApproach.returnRecord, firstHallApproach.secondRecord, firstHallApproach.checkoutRecord, firstHallApproach.exitRecord)
  const firstHallAfternoon = candidate('firstHallAfternoon', legacyFirstHallAfternoon)
  if (!validFirstHallAfternoon(firstHallAfternoon) || (firstHallAfternoon.stage > 0 || firstHallAfternoon.walk > 0)
    && (firstHallApproach.stage !== 57 || firstHallAfternoon.record !== firstHallApproach.exitRecord)) return invalid()
  result.firstHallAfternoon = firstHallAfternoonAt(firstHallAfternoon.stage, firstHallAfternoon.walk, firstHallAfternoon.record)
  const firstHallEvening = candidate('firstHallEvening', legacyFirstHallEvening)
  if (!validFirstHallEvening(firstHallEvening) || (firstHallEvening.stage > 0 || firstHallEvening.walk > 0)
    && (firstHallAfternoon.stage !== 10 || firstHallEvening.record !== firstHallAfternoon.record)) return invalid()
  result.firstHallEvening = firstHallEveningAt(firstHallEvening.stage, firstHallEvening.walk, firstHallEvening.record)
  const firstHallTeacher = candidate('firstHallTeacher', legacyFirstHallTeacher)
  if (!validFirstHallTeacher(firstHallTeacher) || firstHallTeacher.stage > 0
    && (firstHallEvening.stage !== 9 || firstHallTeacher.record !== firstHallEvening.record)) return invalid()
  result.firstHallTeacher = firstHallTeacherAt(firstHallTeacher.stage, firstHallTeacher.record)
  const firstHallScrollReview = candidate('firstHallScrollReview', legacyFirstHallScrollReview)
  if (!validFirstHallScrollReview(firstHallScrollReview) || (firstHallScrollReview.stage > 0 || firstHallScrollReview.walk > 0)
    && (firstHallTeacher.stage !== 7 || firstHallScrollReview.record !== firstHallTeacher.record)) return invalid()
  result.firstHallScrollReview = firstHallScrollReviewAt(firstHallScrollReview.stage, firstHallScrollReview.walk, firstHallScrollReview.record)
  const liquid = candidate('liquid', legacyLiquid)
  if (!boundedInteger(liquid.stage, 6)
    || liquid.water !== (liquid.stage >= 2) || liquid.ready !== (liquid.stage === 6)) return invalid()
  result.liquid = { stage: liquid.stage, water: liquid.water as boolean, ready: liquid.ready as boolean }
  if (liquid.stage < refiningLiquidMinimum(refining.stage)) return invalid()
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
  const market = candidate('market', legacyMarket)
  if (!boundedInteger(market.stage, 4)
    || market.blackIron !== (market.stage === 4 ? 1 : 0)) return invalid()
  if (market.stage > 0 && (!result.started || !result.receipts.bluegrass || !result.receipts.boneflower)) return invalid()
  if (market.stage === 4 && !result.receipts.woodCore) return invalid()
  if (market.stage < marketTradeMinimum(marketTrade.stage)) return invalid()
  result.market = { stage: market.stage, blackIron: market.blackIron as number }
  if (liquid.stage > 0 && (!result.receipts.woodCore || market.stage !== 4)) return invalid()
  const practice = candidate('practice', legacyPractice)
  if (!boundedInteger(practice.phase, 4) || !boundedInteger(practice.pulse, 3)
    || !boundedInteger(practice.score, 300) || !boundedInteger(practice.attempts, 1_000_000)) return invalid()
  if (practice.phase > 0 && !result.liquid.ready) return invalid()
  if (practice.phase === 0 && (practice.pulse || practice.score || practice.attempts)) return invalid()
  if (practice.phase === 1 && (practice.pulse > 2 || practice.score > practice.pulse * 100)) return invalid()
  if (practice.phase >= 2 && (practice.pulse !== 3 || practice.score < 180)) return invalid()
  result.practice = { phase: practice.phase, pulse: practice.pulse, score: practice.score, attempts: practice.attempts }
  const bracelet = candidate('bracelet', legacyBracelet)
  if (!boundedInteger(bracelet.stage, 6) || bracelet.stage < braceletMinimum(marketBracelets.stage) || bracelet.gift !== (bracelet.stage >= 5 ? 'xuner' : 'none')
    || bracelet.stage > 0 && (!result.started || !result.receipts.bluegrass || !result.receipts.boneflower)) return invalid()
  result.bracelet = { stage: bracelet.stage, gift: bracelet.gift as 'none' | 'xuner' }
  const growth = candidate('growth', legacyGrowth)
  if (!boundedInteger(growth.stage, 3) || growth.stage > 0 && practice.phase !== 4) return invalid()
  result.growth = { stage: growth.stage }
  const hall = candidate('hall', legacyHall)
  if (!boundedInteger(hall.stage, 9) || hall.stage > 0 && practice.phase !== 4
    && !(firstHallReading.picked && hall.stage >= 2 && hall.stage <= (firstHallApproach.stage >= 52 ? 9 : firstHallApproach.stage >= 48 ? 8 : firstHallApproach.stage >= 28 ? 7 : firstHallApproach.stage >= 18 ? 6 : firstHallTalk.stage > 0 ? hallTalkMinimum(firstHallTalk.stage) : hallMatchMinimum(firstHallMatch.stage)))) return invalid()
  if (firstHallApproach.stage >= 18 && hall.stage < (firstHallApproach.stage >= 52 ? 9 : firstHallApproach.stage >= 48 ? 8 : firstHallApproach.stage >= 28 ? 7 : 6)) return invalid()
  if (firstHallTalk.stage > 0 && hall.stage < hallTalkMinimum(firstHallTalk.stage)) return invalid()
  if (firstHallMatch.stage > 0 && hall.stage < hallMatchMinimum(firstHallMatch.stage)) return invalid()
  if (firstHallReading.picked && (hall.stage < 2 || firstHallReading.record === 'recalled' && hall.stage < 6)) return invalid()
  const scroll = hall.scroll === undefined && legacyHallScroll && hall.stage <= 1 ? 'none' : hall.scroll
  const expectedScroll = hall.stage >= 8 ? 'borrowed-second' : hall.stage === 7 ? 'selected-second'
    : hall.stage >= 2 && hall.stage <= 5 ? 'reading-first' : 'none'
  if (scroll !== expectedScroll) return invalid()
  result.hall = { stage: hall.stage, scroll: scroll as EarlyTrainingState['hall']['scroll'] }
  const teaching = candidate('teaching', legacyTeaching)
  if (!boundedInteger(teaching.stage, 5) || teaching.stage > 0 && hall.stage !== 9) return invalid()
  result.teaching = { stage: teaching.stage }
  const supervision = candidate('supervision', legacySupervision)
  if (!boundedInteger(supervision.stage, 2) || !boundedInteger(supervision.pulses, 4) || !boundedInteger(supervision.attempts, 1_000_000)
    || ((supervision.stage > 0 || supervision.attempts > 0) && teaching.stage !== 5)
    || supervision.stage === 0 && supervision.pulses !== 0
    || supervision.stage === 1 && supervision.pulses >= 4
    || supervision.stage === 2 && supervision.pulses !== 4) return invalid()
  result.supervision = { stage: supervision.stage, pulses: supervision.pulses, attempts: supervision.attempts }
  const recovery = candidate('recovery', legacyRecovery)
  if (!boundedInteger(recovery.stage, 7) || recovery.stage > 0 && supervision.stage !== 2
    || recovery.energy !== recoveryEnergyAt(recovery.stage)
    || recovery.period !== (recovery.stage >= 6 ? 'reviewed' : 'unreviewed')
    || recovery.result !== (recovery.stage === 7 ? 'fifth-duan' : 'none')) return invalid()
  result.recovery = { stage: recovery.stage, energy: recovery.energy as EarlyTrainingState['recovery']['energy'],
    period: recovery.period as EarlyTrainingState['recovery']['period'], result: recovery.result as EarlyTrainingState['recovery']['result'] }
  const consignment = candidate('consignment', legacyConsignment)
  const appraisal = candidate('appraisal', legacyAppraisal)
  if (!boundedInteger(appraisal.stage, 8) || appraisal.stage > 0 && consignment.stage !== 5
    || appraisal.cloaked !== (appraisal.stage >= 1) || appraisal.speaker !== (appraisal.stage >= 4 ? 'yaolao' : 'self')
    || appraisal.tier !== (appraisal.stage >= 6 ? 2 : 0) || appraisal.card !== (appraisal.stage >= 7 ? 'black-entry' : 'none')) return invalid()
  result.appraisal = { stage: appraisal.stage, cloaked: appraisal.cloaked as boolean, speaker: appraisal.speaker as EarlyTrainingState['appraisal']['speaker'],
    tier: appraisal.tier as number, card: appraisal.card as EarlyTrainingState['appraisal']['card'] }
  const fatherGift = candidate('fatherGift', legacyFatherGift)
  if (!boundedInteger(fatherGift.stage, 6)) return invalid()
  result.fatherGift = { stage: fatherGift.stage }
  if (!boundedInteger(consignment.stage, 5) || consignment.stage > 0 && recovery.stage !== 7
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
  const auction = candidate('auction', legacyAuction)
  if (!boundedInteger(auction.stage, 7) || auction.stage > 0 && appraisal.stage !== 8) return invalid()
  result.auction = { stage: auction.stage }
  const settlement = candidate('settlement', legacySettlement)
  if (!boundedInteger(settlement.stage, 7) || settlement.stage > 0 && auction.stage !== 7
    || settlement.vip !== (settlement.stage >= 4) || settlement.net !== (settlement.stage >= 6 ? 39200 : 0)) return invalid()
  result.settlement = { stage: settlement.stage, net: settlement.net as number, vip: settlement.vip as boolean }
  if (fatherGift.stage > 0 && settlement.stage !== 7) return invalid()
  const xunerVisit = candidate('xunerVisit', legacyXunerVisit)
  if (!boundedInteger(xunerVisit.stage, 7) || xunerVisit.stage > 0 && fatherGift.stage !== 6
    || xunerVisit.card !== xunerCardAt(xunerVisit.stage)) return invalid()
  result.xunerVisit = { stage: xunerVisit.stage, card: xunerVisit.card as EarlyTrainingState['xunerVisit']['card'] }
  const longSupplies = candidate('longSupplies', legacyLongSupplies)
  if (!boundedInteger(longSupplies.stage, 6) || longSupplies.stage > 0 && xunerVisit.stage !== 7
    || longSupplies.herbs !== longSupplyPlaceAt(longSupplies.stage, 'herbs')
    || longSupplies.cores !== longSupplyPlaceAt(longSupplies.stage, 'cores')) return invalid()
  result.longSupplies = { stage: longSupplies.stage, herbs: longSupplies.herbs as LongSupplyPlace, cores: longSupplies.cores as LongSupplyPlace }
  const forestStrike = candidate('forestStrike', legacyForestStrike)
  if (!validForestStrike(forestStrike) || forestStrike.stage > 0 && longSupplies.stage !== 6) return invalid()
  result.forestStrike = { stage: forestStrike.stage, beats: forestStrike.beats, attempts: forestStrike.attempts,
    tree: forestStrike.tree, result: forestStrike.result }
  const seventhRoom = candidate('seventhRoom', legacySeventhRoom)
  if (!validSeventhRoom(seventhRoom) || seventhRoom.stage > 0 && forestStrike.stage !== 7) return invalid()
  result.seventhRoom = { stage: seventhRoom.stage, beats: seventhRoom.beats, attempts: seventhRoom.attempts,
    drops: seventhRoom.drops, energy: seventhRoom.energy, period: seventhRoom.period, result: seventhRoom.result }
  const palmPair = candidate('palmPair', legacyPalmPair)
  if (!validPalmPair(palmPair) || palmPair.stage > 0 && seventhRoom.stage !== 8) return invalid()
  result.palmPair = { stage: palmPair.stage, beats: palmPair.beats, attempts: palmPair.attempts,
    first: palmPair.first, second: palmPair.second, teaching: palmPair.teaching, period: palmPair.period }
  const preliminary = candidate('preliminary', legacyPreliminary)
  if (!validPreliminary(preliminary) || preliminary.stage > 0 && palmPair.stage !== 10) return invalid()
  result.preliminary = { stage: preliminary.stage, mei: preliminary.mei, xuner: preliminary.xuner, yan: preliminary.yan }
  const keChallenge = candidate('keChallenge', legacyKeChallenge)
  if (!validKeChallenge(keChallenge) || (keChallenge.stage > 0 || keChallenge.attempts > 0) && preliminary.stage !== 16) return invalid()
  result.keChallenge = { stage: keChallenge.stage, beats: keChallenge.beats, attempts: keChallenge.attempts,
    verdict: keChallenge.verdict, invitation: keChallenge.invitation }
  const eighthTraining = candidate('eighthTraining', legacyEighthTraining)
  if (!validEighthTraining(eighthTraining) || eighthTraining.stage > 0 && keChallenge.stage !== 12) return invalid()
  result.eighthTraining = { stage: eighthTraining.stage, beats: eighthTraining.beats, attempts: eighthTraining.attempts,
    outing: eighthTraining.outing, period: eighthTraining.period, energy: eighthTraining.energy, result: eighthTraining.result }
  const ceremonyGuests = candidate('ceremonyGuests', legacyCeremonyGuests)
  if (!validCeremonyGuests(ceremonyGuests) || ceremonyGuests.stage > 0 && eighthTraining.stage !== 15) return invalid()
  result.ceremonyGuests = { stage: ceremonyGuests.stage, sword: ceremonyGuests.sword, introduced: ceremonyGuests.introduced }
  const ceremonialTest = candidate('ceremonialTest', legacyCeremonialTest)
  if (!validCeremonialTest(ceremonialTest) || ceremonialTest.stage > 0 && ceremonyGuests.stage !== 12) return invalid()
  result.ceremonialTest = { stage: ceremonialTest.stage, rite: ceremonialTest.rite, inspected: ceremonialTest.inspected, result: ceremonialTest.result }
  const ningFirst = candidate('ningFirst', legacyNingFirst)
  if (!validNingFirst(ningFirst) || (ningFirst.stage > 0 || ningFirst.attempts > 0) && ceremonialTest.stage !== 13) return invalid()
  result.ningFirst = { stage: ningFirst.stage, beats: ningFirst.beats, attempts: ningFirst.attempts, pill: ningFirst.pill, verdict: ningFirst.verdict }
  const ningSecond = candidate('ningSecond', legacyNingSecond)
  if (!validNingSecond(ningSecond) || (ningSecond.stage > 0 || ningSecond.attempts > 0) && ningFirst.stage !== 10) return invalid()
  result.ningSecond = { stage: ningSecond.stage, beats: ningSecond.beats, attempts: ningSecond.attempts, pill: ningSecond.pill,
    ignored: ningSecond.ignored, contact: ningSecond.contact, verdict: ningSecond.verdict }
  const ceremonyVerdict = candidate('ceremonyVerdict', legacyCeremonyVerdict)
  if (!validCeremonyVerdict(ceremonyVerdict) || ceremonyVerdict.stage > 0 && ningSecond.stage !== 8) return invalid()
  result.ceremonyVerdict = { stage: ceremonyVerdict.stage, ...ceremonyVerdictAt(ceremonyVerdict.stage) }
  const qiPavilionEntry = candidate('qiPavilionEntry', legacyQiPavilionEntry)
  if (!validQiPavilionEntry(qiPavilionEntry) || qiPavilionEntry.stage > 0 && ceremonyVerdict.stage !== 16) return invalid()
  result.qiPavilionEntry = { stage: qiPavilionEntry.stage, ...qiPavilionEntryAt(qiPavilionEntry.stage) }
  const qiBarrier = candidate('qiPavilionBarrier', legacyQiBarrier)
  if (!validQiBarrier(qiBarrier) || (qiBarrier.stage > 0 || qiBarrier.attempts > 0) && qiPavilionEntry.stage !== 12) return invalid()
  result.qiPavilionBarrier = { stage: qiBarrier.stage, beats: qiBarrier.beats, attempts: qiBarrier.attempts, ...qiBarrierAt(qiBarrier.stage) }
  const qiScroll = candidate('qiPavilionScroll', legacyQiPavilionScroll)
  if (!validQiPavilionScroll(qiScroll) || qiScroll.stage > 0 && qiBarrier.stage !== 10) return invalid()
  result.qiPavilionScroll = { stage: qiScroll.stage, ...qiPavilionScrollAt(qiScroll.stage) }
  const qiExchange = candidate('qiPavilionExchange', legacyQiPavilionAid)
  if (!validQiPavilionExchange(qiExchange) || qiExchange.stage > 0 && qiScroll.stage !== 6) return invalid()
  result.qiPavilionExchange = { stage: qiExchange.stage, ...qiPavilionExchangeAt(qiExchange.stage) }
  const qiAid = candidate('qiPavilionAid', legacyQiPavilionAid)
  if (!validQiPavilionAid(qiAid) || (qiAid.stage > 0 || qiAid.attempts > 0) && qiExchange.stage !== 8) return invalid()
  result.qiPavilionAid = { stage: qiAid.stage, beats: qiAid.beats, attempts: qiAid.attempts, ...qiPavilionAidAt(qiAid.stage) }
  return result
}

export function eighthTrainingAt(stage: number): Pick<EighthTrainingState, 'outing' | 'period' | 'energy' | 'result'> {
  return { outing: stage >= 6 ? 'completed' : stage >= 1 ? 'promised' : 'none', period: stage >= 10 ? 'reviewed' : 'none',
    energy: stage >= 12 ? 'little' : stage >= 3 ? 'active' : 'unobserved', result: stage >= 14 ? 'eighth-duan' : 'none' }
}
export function validEighthTraining(task: Record<string, unknown> | EighthTrainingState): task is EighthTrainingState {
  if (!boundedInteger(task.stage, 15) || !boundedInteger(task.beats, task.stage === 8 ? 2 : task.stage === 7 || task.stage === 12 ? 1 : 0)
    || !boundedInteger(task.attempts, task.stage < 7 ? 0 : 1_000_000)) return false
  const expected = eighthTrainingAt(task.stage)
  return fieldsMatch(task, expected)
}

export function validKeChallenge(task: Record<string, unknown> | KeChallengeState): task is KeChallengeState {
  return boundedInteger(task.stage, 12) && boundedInteger(task.beats, 2) && boundedInteger(task.attempts, 1_000_000)
    && (task.stage < 2 ? task.beats === 0 && task.attempts === 0 : task.stage === 2 ? task.beats === 0 : task.stage === 3 ? task.beats < 2 : task.beats === 2)
    && task.verdict === (task.stage >= 5 ? 'xiaoyan' : task.stage === 4 ? 'pending' : 'none')
    && task.invitation === (task.stage >= 11 ? 'offered' : 'none')
}

export function preliminaryAt(stage: number): Omit<PreliminaryState, 'stage'> {
  return { mei: stage >= 6 ? 'eighth-duan' : 'unmeasured', xuner: stage >= 8 ? 'one-star' : 'unmeasured',
    yan: stage >= 11 ? 'seventh-duan' : 'unmeasured' }
}
export function validPreliminary(task: Record<string, unknown> | PreliminaryState): task is PreliminaryState {
  if (!boundedInteger(task.stage, 16)) return false
  return fieldsMatch(task, preliminaryAt(task.stage))
}

export function palmPairAt(stage: number): Pick<PalmPairState, 'first' | 'second' | 'teaching' | 'period'> {
  return { first: stage >= 4 ? 'fragments' : stage === 3 ? 'pulled' : 'intact',
    second: stage >= 9 ? 'dust' : stage === 8 ? 'pulled' : 'intact',
    teaching: stage >= 6 ? 'basic' : stage === 5 ? 'explained' : 'unlearned',
    period: stage >= 7 ? 'reviewed' : 'unreviewed' }
}
export function validPalmPair(task: Record<string, unknown> | PalmPairState): task is PalmPairState {
  if (!boundedInteger(task.stage, 10) || !boundedInteger(task.beats, 2) || !boundedInteger(task.attempts, 1_000_000)) return false
  const expected = palmPairAt(task.stage)
  return (task.stage < 5 ? task.beats === 0 && task.attempts === 0 : task.stage === 5 ? task.beats < 2 : task.beats === 2)
    && task.first === expected.first && task.second === expected.second && task.teaching === expected.teaching && task.period === expected.period
}

export function seventhEnergyAt(stage: number): SeventhRoomState['energy'] {
  return stage === 0 ? 'unobserved' : stage === 1 ? 'active' : stage === 2 ? 'fading'
    : stage === 3 ? 'clear' : stage === 4 ? 'restored' : 'lighter'
}
export function validSeventhRoom(task: Record<string, unknown> | SeventhRoomState): task is SeventhRoomState {
  return boundedInteger(task.stage, 8) && boundedInteger(task.beats, 3) && boundedInteger(task.attempts, 1_000_000)
    && (task.stage === 0 ? task.beats === 0 && task.attempts === 0
      : task.stage === 1 ? task.beats <= 1 : task.stage <= 3 ? task.beats === 2
      : task.stage === 4 ? task.beats <= 2 : task.beats === 3)
    && task.drops === (task.stage >= 4 ? 1 : 0) && task.energy === seventhEnergyAt(task.stage)
    && task.period === (task.stage >= 6 ? 'reviewed' : 'unreviewed')
    && task.result === (task.stage >= 7 ? 'seventh-duan' : 'none')
}

export function validForestStrike(task: Record<string, unknown> | ForestStrikeState): task is ForestStrikeState {
  return boundedInteger(task.stage, 7) && boundedInteger(task.beats, 3) && boundedInteger(task.attempts, 1_000_000)
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

export function ceremonyGuestsAt(stage: number): Omit<CeremonyGuestsState, 'stage'> {
  return { sword: stage >= 7 ? 'sheathed' : stage >= 5 ? 'drawn' : 'none', introduced: stage >= 10 }
}
export function validCeremonyGuests(task: Record<string, unknown> | CeremonyGuestsState): task is CeremonyGuestsState {
  if (!boundedInteger(task.stage, 12)) return false
  return fieldsMatch(task, ceremonyGuestsAt(task.stage))
}

export function ceremonialTestAt(stage: number): Omit<CeremonialTestState, 'stage'> {
  return { rite: stage >= 6 ? 'ended' : stage >= 5 ? 'reviewed' : stage >= 4 ? 'begun' : 'none', inspected: stage >= 8,
    result: stage >= 9 ? 'eighth-duan' : 'unmeasured' }
}
export function validCeremonialTest(task: Record<string, unknown> | CeremonialTestState): task is CeremonialTestState {
  if (!boundedInteger(task.stage, 13)) return false
  return fieldsMatch(task, ceremonialTestAt(task.stage))
}

export function validNingFirst(task: Record<string, unknown> | NingFirstState): task is NingFirstState {
  return boundedInteger(task.stage, 10) && boundedInteger(task.beats, 3) && boundedInteger(task.attempts, task.stage < 5 ? 0 : 1_000_000)
    && (task.stage < 6 ? task.beats === 0 : task.stage === 6 ? task.beats < 3 : task.beats === 3)
    && task.pill === (task.stage >= 2 ? 'ning-held' : 'unseen') && task.verdict === (task.stage >= 7 ? 'pending' : 'none')
}

export function validNingSecond(task: Record<string, unknown> | NingSecondState): task is NingSecondState {
  return boundedInteger(task.stage, 8) && boundedInteger(task.beats, 2) && boundedInteger(task.attempts, task.stage < 3 ? 0 : 1_000_000)
    && (task.stage < 4 ? task.beats === 0 : task.stage === 4 ? task.beats < 2 : task.beats === 2)
    && task.pill === (task.stage === 0 ? 'ning-held' : 'used') && task.ignored === (task.stage >= 2)
    && task.contact === (task.stage >= 5 ? 'out' : task.stage === 4 && task.beats === 1 ? 'met' : 'none')
    && task.verdict === 'pending'
}

export function ceremonyVerdictAt(stage: number): Omit<CeremonyVerdictState, 'stage'> {
  return { yu: stage >= 3 ? 'blocked' : stage >= 2 ? 'requested' : 'none', xuner: stage >= 5 ? 'blocked' : stage >= 4 ? 'requested' : 'none',
    penalty: stage >= 6 ? 3 : 0, verdict: stage >= 7 ? 'xiaoyan' : 'pending', rite: stage >= 10 ? 'ended' : stage >= 8 ? 'continued' : 'none',
    technique: stage >= 13 ? 'declined' : stage >= 12 ? 'offered' : 'none', method: stage >= 15 ? 'declined' : stage >= 14 ? 'offered' : 'none',
    nextHall: stage >= 15 ? 'five-days' : 'none' }
}
export function validCeremonyVerdict(task: Record<string, unknown> | CeremonyVerdictState): task is CeremonyVerdictState {
  return stagedFieldsMatch(task, 16, ceremonyVerdictAt)
}
export function qiPavilionEntryAt(stage: number): Omit<QiPavilionEntryState, 'stage'> {
  return { door: stage >= 3 ? 'open' : 'closed', other: stage >= 4 ? 'wind' : 'unmeasured',
    yan: stage >= 5 ? 'fire' : 'unmeasured', xuner: stage >= 7 ? 'fire' : 'unmeasured',
    crystal: stage >= 11 ? 'broken' : stage >= 7 ? 'cracked' : 'intact',
    hint: stage >= 6 ? 'fire-3-43' : 'none', permission: stage >= 8, entered: stage >= 10 }
}
export function validQiPavilionEntry(task: Record<string, unknown> | QiPavilionEntryState): task is QiPavilionEntryState {
  return stagedFieldsMatch(task, 12, qiPavilionEntryAt)
}
export function qiBarrierAt(stage: number): Pick<QiBarrierState, 'path' | 'room37' | 'room43' | 'barrier' | 'entered'> {
  return { path: stage >= 2 ? 3 : 0, room37: stage >= 3, room43: stage >= 4,
    barrier: stage >= 7 ? 'broken' : stage >= 5 ? 'touched' : stage >= 4 ? 'intact' : 'unobserved', entered: stage >= 9 }
}
export function validQiBarrier(task: Record<string, unknown> | QiBarrierState): task is QiBarrierState {
  if (!boundedInteger(task.stage, 10) || !boundedInteger(task.beats, 3) || !boundedInteger(task.attempts, task.stage === 0 ? 0 : 1_000_000)
    || (task.stage < 6 ? task.beats !== 0 : task.stage === 6 ? task.beats >= 3 : task.beats !== 3)) return false
  const expected = qiBarrierAt(task.stage)
  return fieldsMatch(task, expected)
}

export function qiPavilionScrollAt(stage: number): Pick<QiPavilionScrollState, 'family' | 'offer' | 'owner'> {
  return { family: stage >= 2 ? 'held' : 'none', offer: stage >= 4 ? (stage >= 5 ? 'declined' : 'offered') : 'none', owner: stage >= 3 ? 'xiaoyan' : 'none' }
}
export function validQiPavilionScroll(task: Record<string, unknown> | QiPavilionScrollState): task is QiPavilionScrollState {
  return stagedFieldsMatch(task, 6, qiPavilionScrollAt)
}
export function qiPavilionAidAt(stage: number): Omit<QiPavilionAidState, 'stage' | 'beats' | 'attempts'> {
  return { group: stage >= 1 ? 'together' : 'none', xunerScroll: stage >= 2 ? 'xuner' : 'none',
    door: stage >= 4 ? (stage >= 7 ? 'broken' : 'intact') : 'unseen',
    returned: stage >= 6, solo: stage >= 7, thanks: stage >= 8 ? 'spoken' : 'none' }
}
export function validQiPavilionAid(task: Record<string, unknown> | QiPavilionAidState): task is QiPavilionAidState {
  if (!boundedInteger(task.stage, 10) || !boundedInteger(task.attempts, task.stage < 6 ? 0 : 1_000_000)
    || !boundedInteger(task.beats, task.stage < 6 ? 0 : task.stage === 6 ? 1 : 2) || task.stage > 6 && task.beats !== 2) return false
  const expected = qiPavilionAidAt(task.stage)
  return fieldsMatch(task, expected)
}
export function qiPavilionExchangeAt(stage: number): Omit<QiPavilionExchangeState, 'stage'> {
  return { familyOwner: stage >= 3 && stage < 5 ? 'xuner' : 'xiaoyan',
    support: stage >= 4 ? 'shown' : 'hidden', reply: stage >= 6 ? 'declined' : 'none' }
}
export function validQiPavilionExchange(task: Record<string, unknown> | QiPavilionExchangeState): task is QiPavilionExchangeState {
  return stagedFieldsMatch(task, 8, qiPavilionExchangeAt)
}
