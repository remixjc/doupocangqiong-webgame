import { firstHallMatchStep } from './first-hall-match-replay'
import { firstHallReadingStep } from './first-hall-reading-replay'
import { firstHallEntryInput } from './first-hall-entry-replay'
import { advanceFirstHallEntry, hallEntryPlaces } from '../../src/core/first-hall-entry'
import { firstHallEntryScenes } from '../../src/content/first-hall-entry'
import { firstRoadMeetingInput } from './first-road-meeting-replay'
import { advanceFirstRoadMeeting, roadMeetingPlaces } from '../../src/core/first-road-meeting'
import { firstRoadMeetingScenes } from '../../src/content/first-road-meeting'
import { firstTechniqueInput } from './first-technique-replay'
import { firstBottleInput } from './first-bottle-replay'
import { firstDepartureInput } from './first-departure-replay'
import { advanceFirstDeparture, departurePlaces } from '../../src/core/first-departure'
import { firstDepartureScenes } from '../../src/content/first-departure'
import { advanceFirstTechnique, firstTechniqueBed } from '../../src/core/first-technique'
import { firstReviewInput } from './first-review-replay'
import { firstTrainingInput, firstTrainingPosition } from './first-training-replay'
import { advanceFirstTraining } from '../../src/core/first-training'
import { advanceEarlyRefining, refiningWater } from '../../src/core/early-refining'
import { refiningScenes } from '../../src/content/early-refining'
import { advanceEarlyIron, ironPlaces } from '../../src/core/early-iron'
import { ironScenes } from '../../src/content/early-iron'
import { advanceEarlyMarketReturn, marketReturnPlaces } from '../../src/core/early-market-return'
import { marketReturnScenes } from '../../src/content/early-market-return'
import { advanceEarlyMarketTrade, marketTradeExit, marketTradeLedger } from '../../src/core/early-market-trade'
import { marketTradeScenes } from '../../src/content/early-market-trade'
import { advanceEarlyCeremonyVerdict, verdictPlaces } from '../../src/core/early-ceremony-verdict'
import { ceremonyVerdictScenes } from '../../src/content/early-ceremony-verdict'
import { advanceEarlyQiPavilionEntry, qiPavilionPlaces } from '../../src/core/early-qi-pavilion'
import { qiPavilionEntryScenes } from '../../src/content/early-qi-pavilion'
import { advanceEarlyQiBarrier, qiBarrierPlaces } from '../../src/core/early-qi-barrier'
import { qiBarrierScenes } from '../../src/content/early-qi-barrier'
import { advanceEarlyQiScroll } from '../../src/core/early-qi-scroll'
import { qiScrollScenes } from '../../src/content/early-qi-scroll'
import { advanceEarlyQiAid, qiAidPlaces, qiAidOperation } from '../../src/core/early-qi-aid'
import { qiAidScenes } from '../../src/content/early-qi-aid'
import { advanceEarlyQiExchange } from '../../src/core/early-qi-exchange'
import { qiExchangeScenes } from '../../src/content/early-qi-exchange'
import { advanceEarlyNingSecond, ningSecondOperation } from '../../src/core/early-ning-second'
import { ningSecondScenes } from '../../src/content/early-ning-second'
import { advanceEarlyNingFirst, ningPlaces, ningFirstOperation } from '../../src/core/early-ning-first'
import { ningFirstScenes } from '../../src/content/early-ning-first'
import { advanceEarlyCeremonialTest, ceremonialPlaces } from '../../src/core/early-ceremonial-test'
import { ceremonialTestScenes } from '../../src/content/early-ceremonial-test'
import { advanceEarlyCeremonyGuests, ceremonyGuestPlaces } from '../../src/core/early-ceremony-guests'
import { ceremonyGuestScenes } from '../../src/content/early-ceremony-guests'
import { advanceEarlyEighthTraining, eighthPlaces, eighthTrainingBeats, eighthTrainingOperation } from '../../src/core/early-eighth-training'
import { eighthTrainingScenes } from '../../src/content/early-eighth-training'
import { expect } from 'vitest'
import { advanceEarlyMorningCard, morningCardPlaces } from '../../src/core/early-morning-card'
import { morningCardScenes } from '../../src/content/early-morning-card'
import { advanceEarlyCityPharmacy, cityPharmacyPlaces } from '../../src/core/early-city-pharmacy'
import { cityPharmacyScenes } from '../../src/content/early-city-pharmacy'
import { advanceEarlyMarketEscort, marketEscortPlaces } from '../../src/core/early-market-escort'
import { marketEscortObserver } from '../../src/core/early-market-escort-state'
import { marketEscortScenes } from '../../src/content/early-market-escort'
import { advanceEarlyMarketSearch, marketSearchPlaces } from '../../src/core/early-market-search'
import { marketSearchScenes } from '../../src/content/early-market-search'
import { advanceEarlyMarketBracelets } from '../../src/core/early-market-bracelets'
import { marketBraceletsScenes } from '../../src/content/early-market-bracelets'
import { advanceEarlyMarketStandoff, standoffPlaces } from '../../src/core/early-market-standoff'
import { marketStandoffScenes } from '../../src/content/early-market-standoff'
import { advanceEarlyMarketDiscovery, marketDiscoveryPlace } from '../../src/core/early-market-discovery'
import { marketDiscoveryScenes } from '../../src/content/early-market-discovery'
import type { GameState } from '../../src/core/model'
import { advanceEarlyTraining, beginEarlyTraining, type EarlyTrainingAction } from '../../src/core/early-training'
import { earlySupplies } from '../../src/core/early-training-state'
import { earlyLiquidScenes } from '../../src/content/early-liquid'
import { parseSave, serializeSave } from '../../src/core/save'
import { pulseMarker } from '../../src/core/events'
import { advanceEarlyBracelet } from '../../src/core/early-bracelet'
import { earlyBraceletScenes } from '../../src/content/early-bracelet'
import { earlyWalkPlaces } from '../../src/core/early-walk'
import { advanceEarlyGrowth } from '../../src/core/early-growth'
import { advanceEarlyHall, enterEarlyHall, earlyHallPlaces } from '../../src/core/early-hall'
import { earlyHallScenes } from '../../src/content/early-hall'
import { advanceEarlyTeaching } from '../../src/core/early-teaching'
import { earlyTeachingScenes } from '../../src/content/early-teaching'
import { advanceEarlySupervision, type EarlySupervisionAction } from '../../src/core/early-supervision'
import { advanceEarlyRecovery } from '../../src/core/early-recovery'
import { earlyRecoveryScenes } from '../../src/content/early-recovery'
import { advanceEarlyConsignment } from '../../src/core/early-consignment'
import { consignmentSupplies, type ConsignmentSupplyId } from '../../src/core/early-training-state'
import { advanceEarlyAppraisal } from '../../src/core/early-appraisal'
import { appraisalScenes } from '../../src/content/early-appraisal'
import { advanceEarlyAuction } from '../../src/core/early-auction'
import { auctionScenes } from '../../src/content/early-auction'
import { advanceEarlySettlement } from '../../src/core/early-settlement'
import { settlementScenes } from '../../src/content/early-settlement'
import { advanceEarlyFatherGift } from '../../src/core/early-father-gift'
import { fatherGiftScenes } from '../../src/content/early-father-gift'
import { advanceEarlyXunerVisit } from '../../src/core/early-xuner-visit'
import { xunerVisitScenes } from '../../src/content/early-xuner-visit'
import { advanceEarlyLongSupplies } from '../../src/core/early-long-supplies'
import { longSupplyScenes } from '../../src/content/early-long-supplies'
import { advanceEarlyForestStrike, forestPlaces, type ForestStrikeAction } from '../../src/core/early-forest-strike'
import { advanceEarlySeventhRoom } from '../../src/core/early-seventh-room'
import { seventhRoomScenes } from '../../src/content/early-seventh-room'
import { advanceEarlyPalmPair } from '../../src/core/early-palm-pair'
import { palmPairScenes } from '../../src/content/early-palm-pair'
import { advanceEarlyPreliminary, preliminaryPlaces } from '../../src/core/early-preliminary'
import { preliminaryScenes } from '../../src/content/early-preliminary'
import { advanceEarlyKeChallenge, keChallengePlaces, type KeChallengeAction } from '../../src/core/early-ke-challenge'
import { keChallengeScenes } from '../../src/content/early-ke-challenge'
import { advanceEarlyFamilyVisit, familyVisitPlaces } from '../../src/core/early-family-visit'
import { familyVisitScenes } from '../../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation } from '../../src/core/early-family-compensation'
import { familyCompensationScenes } from '../../src/content/early-family-compensation'
import { advanceEarlyFamilyContract, familyContractPlaces, type FamilyContractView } from '../../src/core/early-family-contract'
import { familyContractScenes } from '../../src/content/early-family-contract'
import { advanceEarlyMountainRing, mountainRingPlaces } from '../../src/core/early-mountain-ring'
import { mountainRingScenes } from '../../src/content/early-mountain-ring'
import { advanceEarlyApprentice } from '../../src/core/early-apprentice'
import { apprenticeScenes } from '../../src/content/early-apprentice'
import { advanceEarlyMethodDiscussion } from '../../src/core/early-method-discussion'
import { methodDiscussionScenes } from '../../src/content/early-method-discussion'
import { advanceEarlyPreparationBrief } from '../../src/core/early-preparation-brief'
import { preparationBriefScenes } from '../../src/content/early-preparation-brief'
import { advanceEarlyMountainVisitor, type MountainVisitorView } from '../../src/core/early-mountain-visitor'
import { mountainVisitorScenes } from '../../src/content/early-mountain-visitor'

// Normal transactions only; bracelet uses the valid market position.
// Spatial walking has separate coverage; no progress/material edits or save injection.
export function replayEarlyTraining(input: GameState, failFirstBreath = false, onCheckpoint?: (state: GameState) => void, includeBracelet = false, includeGrowth = false, includeHall = false, includeTeaching = false, includeSupervision = false, includeRecovery = false, includeConsignment = false, includeAppraisal = false, includeAuction = false, includeSettlement = false, includeFatherGift = false, includeXunerVisit = false, includeLongSupplies = false, includeForestStrike = false, includeSeventhRoom = false, includePalmPair = false, includePreliminary = false, includeKeChallenge = false, includeEighthTraining = false, includeCeremonyGuests = false, includeCeremonialTest = false, includeNingFirst = false, includeNingSecond = false, includeCeremonyVerdict = false, includeQiPavilionEntry = false, includeQiBarrier = false, includeQiScroll = false, includeQiAid = false, includeQiExchange = false): GameState {
  if (includeQiAid) includeQiExchange = true
  if (includeQiExchange) includeQiScroll = true
  if (includeQiScroll) includeQiBarrier = true
  if (includeQiBarrier) includeQiPavilionEntry = true
  if (includeQiPavilionEntry) includeCeremonyVerdict = true
  if (includeCeremonyVerdict) includeNingSecond = true
  if (includeNingSecond) includeNingFirst = true
  if (includeNingFirst) includeCeremonialTest = true
  if (includeCeremonialTest) includeCeremonyGuests = true
  if (includeCeremonyGuests) includeEighthTraining = true
  if (includeEighthTraining) includeKeChallenge = true
  if (includeKeChallenge) includePreliminary = true
  if (includePreliminary) includePalmPair = true
  if (includePalmPair) includeSeventhRoom = true
  if (includeSeventhRoom) includeForestStrike = true
  if (includeForestStrike) includeLongSupplies = true
  if (includeLongSupplies) includeXunerVisit = true
  if (includeXunerVisit) includeFatherGift = true
  if (includeFatherGift) includeSettlement = true
  if (includeSettlement) includeAuction = true
  if (includeAuction) includeAppraisal = true
  if (includeAppraisal) includeConsignment = true
  let state = input
  // Full early-story replay includes the independent pre-teaching visit; partial legacy
  // replays retain their original scope. This is rule coverage, not browser play.
  if (includeQiAid) while (state.earlyTraining.familyVisit.stage < familyVisitScenes.length) {
    const task = state.earlyTraining.familyVisit, scene = familyVisitScenes[task.stage]
    const result = advanceEarlyFamilyVisit(state, familyVisitPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.familyCompensation.stage < familyCompensationScenes.length) {
    const task = state.earlyTraining.familyCompensation, scene = familyCompensationScenes[task.stage]
    const result = advanceEarlyFamilyCompensation(state, familyVisitPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.familyContract.stage < familyContractScenes.length) {
    const task = state.earlyTraining.familyContract, scene = familyContractScenes[task.stage]
    const view: FamilyContractView = task.yan === 'left' ? { kind: 'observer', place: scene.place } : { kind: 'yan', position: familyContractPlaces[scene.place] }
    const result = advanceEarlyFamilyContract(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.mountainRing.stage < mountainRingScenes.length) {
    const task = state.earlyTraining.mountainRing, scene = mountainRingScenes[task.stage]
    const result = advanceEarlyMountainRing(state, mountainRingPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.apprentice.stage < apprenticeScenes.length) {
    const task = state.earlyTraining.apprentice, scene = apprenticeScenes[task.stage]
    const result = advanceEarlyApprentice(state, mountainRingPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.methodDiscussion.stage < methodDiscussionScenes.length) {
    const task = state.earlyTraining.methodDiscussion, scene = methodDiscussionScenes[task.stage]
    const result = advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.preparationBrief.stage < preparationBriefScenes.length) {
    const task = state.earlyTraining.preparationBrief, scene = preparationBriefScenes[task.stage]
    const result = advanceEarlyPreparationBrief(state, mountainRingPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.mountainVisitor.stage < mountainVisitorScenes.length) {
    const task = state.earlyTraining.mountainVisitor, scene = mountainVisitorScenes[task.stage]
    const view: MountainVisitorView = task.yan === 'left' ? { kind: 'observer', place: scene.place } : { kind: 'yan', position: mountainRingPlaces[scene.place] }
    const result = advanceEarlyMountainVisitor(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  const act = (action: EarlyTrainingAction) => {
    const input = action.type === 'practice' ? { ...action, attempts: state.earlyTraining.practice.attempts } : action
    const result = advanceEarlyTraining(state, input)
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  const started = beginEarlyTraining(state); expect(started.ok).toBe(true)
  state = parseSave(serializeSave(started.state))
  onCheckpoint?.(state)
  if (includeQiAid) for (const scene of morningCardScenes) {
    const task = state.earlyTraining.morningCard, ledger = state.earlyTraining
    const result = advanceEarlyMorningCard(state, morningCardPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation,
      expectedStarted: ledger.started, expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (!state.earlyTraining.purse.borrowed) act({ type: 'borrow', expectedSpent: 0 })
  if (includeQiAid) for (const scene of cityPharmacyScenes) {
    const ledger = state.earlyTraining, task = ledger.cityPharmacy
    const result = advanceEarlyCityPharmacy(state, cityPharmacyPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation,
      expectedStarted: ledger.started, expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent,
      expectedLiquid: ledger.liquid.stage, expectedPrimary: ledger.receipts.bluegrass, expectedAuxiliary: ledger.receipts.boneflower, expectedCore: ledger.receipts.woodCore })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) for (const scene of marketEscortScenes) {
    const task = state.earlyTraining.marketEscort
    const view = marketEscortObserver(task.stage) ? { kind: 'observer' as const, place: scene.place } : { kind: 'yan' as const, position: marketEscortPlaces[scene.place] }
    const result = advanceEarlyMarketEscort(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) for (const scene of marketSearchScenes) {
    const task = state.earlyTraining.marketSearch
    const result = advanceEarlyMarketSearch(state, { kind: scene.view, position: marketSearchPlaces[scene.place] }, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  for (const item of ['boneflower', 'bluegrass'] as const) if (!state.earlyTraining.receipts[item])
    act({ type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent })
  if (includeQiAid) for (const scene of marketBraceletsScenes) {
    const task = state.earlyTraining.marketBracelets, gift = state.earlyTraining.bracelet
    const result = advanceEarlyMarketBracelets(state, { kind: scene.view, position: marketSearchPlaces.voice },
      { ...task, expectedBracelet: gift.stage, expectedGift: gift.gift, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeBracelet) {
    const market = earlyWalkPlaces.find(place => place.id === 'market')!
    for (let stage = state.earlyTraining.bracelet.stage; stage < earlyBraceletScenes.length; stage++) {
      const result = advanceEarlyBracelet(state, market, { stage, operation: earlyBraceletScenes[stage].operation })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state))
      onCheckpoint?.(state)
    }
  }
  if (includeQiAid) for (const scene of marketStandoffScenes) {
    const view = scene.view === 'yan' || scene.view === 'xuner' ? { kind: scene.view, position: standoffPlaces[scene.place] }
      : { kind: 'observer' as const, focus: scene.view, place: scene.place }
    const result = advanceEarlyMarketStandoff(state, view, { ...state.earlyTraining.marketStandoff, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) for (const scene of marketDiscoveryScenes) {
    const result = advanceEarlyMarketDiscovery(state, marketDiscoveryPlace, { ...state.earlyTraining.marketDiscovery, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) for (const scene of marketTradeScenes) {
    const task = state.earlyTraining.marketTrade
    const result = advanceEarlyMarketTrade(state, task.stage < 13 ? marketDiscoveryPlace : marketTradeExit,
      { ...task, expectedLedger: marketTradeLedger(state), actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) for (const scene of marketReturnScenes) {
    const result = advanceEarlyMarketReturn(state, marketReturnPlaces[scene.place],
      { ...state.earlyTraining.marketReturn, expectedLedger: marketTradeLedger(state), actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) for (const scene of ironScenes) {
    const result = advanceEarlyIron(state, scene.operation === 'pickup' ? ironPlaces.table : ironPlaces.teacher,
      { ...state.earlyTraining.iron, expectedLedger: marketTradeLedger(state), expectedReturn: { ...state.earlyTraining.marketReturn },
        actor: scene.actor, teacherPosition: { ...ironPlaces.teacher }, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (!state.earlyTraining.receipts.woodCore) act({ type: 'purchase', item: 'woodCore', price: 60, expectedSpent: 50 })
  for (let step = state.earlyTraining.market.stage; step < 4; step++) act({ type: 'market', step, expectedSpent: 110 })
  if (includeQiAid) for (const scene of refiningScenes) {
    const result = advanceEarlyRefining(state, refiningWater, { ...state.earlyTraining.refining, expectedLedger: marketTradeLedger(state),
      expectedIron: { ...state.earlyTraining.iron }, teacherPosition: { ...ironPlaces.teacher }, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstTraining.stage < 10) {
    const result = advanceFirstTraining(state, firstTrainingPosition(state), firstTrainingInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstTraining.stage < 17) {
    const result = advanceFirstTraining(state, { x: 160, y: 370 }, firstReviewInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstTechnique.stage < 9) {
    const result = advanceFirstTechnique(state, firstTechniqueBed, firstTechniqueInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstTechnique.stage < 19) {
    const result = advanceFirstTechnique(state, firstTechniqueBed, firstBottleInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstDeparture.stage < 9) {
    const scene = firstDepartureScenes[state.earlyTraining.firstDeparture.stage]
    const result = advanceFirstDeparture(state, departurePlaces[scene.place], scene.space, firstDepartureInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstRoadMeeting.stage < 12) {
    const scene = firstRoadMeetingScenes[state.earlyTraining.firstRoadMeeting.stage]
    const result = advanceFirstRoadMeeting(state, roadMeetingPlaces[scene.place], firstRoadMeetingInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstHallEntry.stage < 9) {
    const scene = firstHallEntryScenes[state.earlyTraining.firstHallEntry.stage]
    const result = advanceFirstHallEntry(state, hallEntryPlaces[scene.place], scene.space, firstHallEntryInput(state))
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstHallReading.stage < 8) {
    state = firstHallReadingStep(state); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.firstHallMatch.stage < 12) {
    state = firstHallMatchStep(state); onCheckpoint?.(state)
  }
  for (let step = state.earlyTraining.liquid.stage; step < 6; step++) act({ type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 })
  act({ type: 'practice', operation: 'begin', phase: 0, pulse: 0, expectedSpent: 110 })
  if (failFirstBreath) for (let pulse = 0; pulse < 3; pulse++)
    act({ type: 'practice', operation: 'pulse', phase: 1, pulse, marker: pulseMarker(0), expectedSpent: 110 })
  for (let pulse = 0; pulse < 3; pulse++)
    act({ type: 'practice', operation: 'pulse', phase: 1, pulse, marker: pulseMarker(900), expectedSpent: 110 })
  act({ type: 'practice', operation: 'attempt', phase: 2, pulse: 3, expectedSpent: 110 })
  act({ type: 'practice', operation: 'finish', phase: 3, pulse: 3, expectedSpent: 110 })
  expect(state.earlyTraining.practice.phase).toBe(4)
  if (includeGrowth) for (let step = 0; step < 3; step++) {
    const result = advanceEarlyGrowth(state, step)
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  if (includeHall || includeTeaching || includeSupervision || includeRecovery || includeConsignment) {
    const entered = enterEarlyHall(state, earlyWalkPlaces.find(place => place.id === 'teacher')!)
    expect(entered.ok, entered.message).toBe(true)
    state = parseSave(serializeSave(entered.state)); onCheckpoint?.(state)
    for (const scene of earlyHallScenes.filter(row => row.stage >= state.earlyTraining.hall.stage)) {
      const result = advanceEarlyHall(state, earlyHallPlaces.find(place => place.id === scene.place)!,
        { step: scene.stage, operation: scene.operation })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeTeaching || includeSupervision || includeRecovery || includeConsignment) for (const scene of earlyTeachingScenes) {
    const result = advanceEarlyTeaching(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeSupervision || includeRecovery || includeConsignment) {
    const supervised = (operation: EarlySupervisionAction['operation'], marker?: number) => {
      const result = advanceEarlySupervision(state, earlyWalkPlaces.find(place => place.id === 'teacher')!,
        { ...state.earlyTraining.supervision, operation, marker })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
    supervised('begin'); supervised('brace', 0)
    supervised('begin'); supervised('brace', .5); supervised('stop')
    supervised('begin')
    for (let pulse = 0; pulse < 4; pulse++) supervised('brace', .5)
  }
  if (includeRecovery || includeConsignment) for (const scene of earlyRecoveryScenes) {
    const result = advanceEarlyRecovery(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, energy: state.earlyTraining.recovery.energy, operation: scene.operation, marker: .5 })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeConsignment) {
    const teacher = earlyWalkPlaces.find(place => place.id === 'teacher')!
    const planned = advanceEarlyConsignment(state, teacher, 'plan', { stage: 0, spent: 0, operation: 'plan' })
    expect(planned.ok, planned.message).toBe(true)
    state = parseSave(serializeSave(planned.state)); onCheckpoint?.(state)
    for (const id of Object.keys(consignmentSupplies) as ConsignmentSupplyId[]) {
      const result = advanceEarlyConsignment(state, teacher, 'pharmacy', { stage: 1, spent: state.earlyTraining.consignment.spent,
        operation: 'buy', item: id, price: consignmentSupplies[id].price })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
    for (const operation of ['deliver', 'refine', 'bottle'] as const) {
      const result = advanceEarlyConsignment(state, teacher, 'alley', { stage: state.earlyTraining.consignment.stage,
        spent: state.earlyTraining.consignment.spent, operation })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeAppraisal) for (const scene of appraisalScenes) {
    const result = advanceEarlyAppraisal(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, owner: state.earlyTraining.consignment.owner, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeAuction) for (const scene of auctionScenes) {
    const result = advanceEarlyAuction(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, owner: state.earlyTraining.consignment.owner, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeSettlement) for (const scene of settlementScenes) {
    const task = state.earlyTraining.settlement
    const result = advanceEarlySettlement(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, net: task.net, vip: task.vip, owner: state.earlyTraining.consignment.owner, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeFatherGift) for (const scene of fatherGiftScenes) {
    const result = advanceEarlyFatherGift(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, owner: state.earlyTraining.consignment.owner, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeXunerVisit) for (const scene of xunerVisitScenes) {
    const result = advanceEarlyXunerVisit(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, card: state.earlyTraining.xunerVisit.card, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeLongSupplies) for (const scene of longSupplyScenes) {
    const task = state.earlyTraining.longSupplies
    const result = advanceEarlyLongSupplies(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, scene.station,
      { step: scene.step, herbs: task.herbs, cores: task.cores, operation: scene.operation,
        item: scene.step === 1 ? 'herbs' : scene.step === 2 ? 'cores' : undefined })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeForestStrike) {
    const teacher = earlyWalkPlaces.find(place => place.id === 'teacher')!
    const forestAct = (place: keyof typeof forestPlaces, operation: ForestStrikeAction['operation'], marker?: number) => {
      const result = advanceEarlyForestStrike(state, teacher, forestPlaces[place], { ...state.earlyTraining.forestStrike, operation, marker })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
    forestAct('stone', 'review'); forestAct('tree', 'begin')
    forestAct('tree', 'steady', 0); forestAct('tree', 'steady', .5); forestAct('tree', 'stop')
    forestAct('tree', 'begin')
    forestAct('tree', 'steady', .5); forestAct('tree', 'gather', .5); forestAct('tree', 'strike', .5)
    forestAct('stone', 'rest'); forestAct('stone', 'ask'); forestAct('stone', 'goal'); forestAct('trail', 'leave')
  }
  if (includeSeventhRoom) {
    const teacher = earlyWalkPlaces.find(place => place.id === 'teacher')!
    let failed = false
    while (state.earlyTraining.seventhRoom.stage < 8) {
      const task = state.earlyTraining.seventhRoom, scene = seventhRoomScenes[task.stage]
      const training = task.stage === 1 || task.stage === 4
      const marker = training ? task.stage === 4 && !failed ? 0 : .5 : undefined
      const result = advanceEarlySeventhRoom(state, teacher, scene.station, { ...task, operation: scene.operation, marker })
      expect(result.ok, result.message).toBe(true)
      if (marker === 0) failed = true
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includePalmPair) {
    const teacher = earlyWalkPlaces.find(place => place.id === 'teacher')!
    const failed = new Set<number>()
    while (state.earlyTraining.palmPair.stage < 10) {
      const task = state.earlyTraining.palmPair, scene = palmPairScenes[task.stage]
      const training = task.stage === 5 || task.stage === 8
      const marker = training ? failed.has(task.stage) ? .5 : 0 : undefined
      if (marker === 0) failed.add(task.stage)
      const result = advanceEarlyPalmPair(state, teacher, scene.station, { ...task, operation: scene.operation, marker })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includePreliminary) for (const scene of preliminaryScenes) {
    const result = advanceEarlyPreliminary(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, preliminaryPlaces[scene.place],
      { ...state.earlyTraining.preliminary, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeKeChallenge) {
    const failed = new Set<number>()
    while (state.earlyTraining.keChallenge.stage < 12) {
      const task = state.earlyTraining.keChallenge, scene = keChallengeScenes[task.stage]
      let operation: KeChallengeAction['operation'] = scene.operation
      if (task.stage === 3) {
        operation = !failed.has(task.beats) ? task.beats === 0 ? 'evade-right' : 'octane-blast' : task.beats === 0 ? 'evade-left' : 'low-palm'
        failed.add(task.beats)
      }
      const result = advanceEarlyKeChallenge(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, keChallengePlaces[scene.place],
        { ...task, operation, marker: task.stage === 3 ? .5 : undefined })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeEighthTraining) {
    const failed = new Set<number>()
    while (state.earlyTraining.eighthTraining.stage < 15) {
      const task = state.earlyTraining.eighthTraining, scene = eighthTrainingScenes[task.stage], training = eighthTrainingBeats(task.stage)
      const marker = training ? failed.has(task.stage) ? .5 : 0 : undefined
      if (marker === 0) failed.add(task.stage)
      const result = advanceEarlyEighthTraining(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, eighthPlaces[scene.place],
        { ...task, operation: eighthTrainingOperation(task), marker })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeCeremonyGuests) for (const scene of ceremonyGuestScenes) {
    const result = advanceEarlyCeremonyGuests(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, ceremonyGuestPlaces[scene.place],
      { ...state.earlyTraining.ceremonyGuests, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeCeremonialTest) for (const scene of ceremonialTestScenes) {
    const result = advanceEarlyCeremonialTest(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, ceremonialPlaces[scene.place],
      { ...state.earlyTraining.ceremonialTest, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeNingFirst) {
    let failed = false
    while (state.earlyTraining.ningFirst.stage < 10) {
      const task = state.earlyTraining.ningFirst, scene = ningFirstScenes[task.stage]
      const marker = task.stage === 6 ? failed ? .5 : 0 : undefined
      if (marker === 0) failed = true
      const result = advanceEarlyNingFirst(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, ningPlaces[scene.place],
        { ...task, actor: scene.actor, operation: ningFirstOperation(task), marker })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeNingSecond) {
    let failed = false
    while (state.earlyTraining.ningSecond.stage < 8) {
      const task = state.earlyTraining.ningSecond, scene = ningSecondScenes[task.stage]
      const marker = task.stage === 4 ? failed ? .5 : 0 : undefined
      if (marker === 0) failed = true
      const result = advanceEarlyNingSecond(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, ningPlaces[scene.place],
        { ...task, actor: scene.actor, operation: ningSecondOperation(task), marker })
      expect(result.ok, result.message).toBe(true)
      state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeCeremonyVerdict) for (const scene of ceremonyVerdictScenes) {
    const result = advanceEarlyCeremonyVerdict(state, earlyWalkPlaces.find(place => place.id === 'teacher')!, verdictPlaces[scene.place],
      { ...state.earlyTraining.ceremonyVerdict, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiPavilionEntry) for (const scene of qiPavilionEntryScenes) {
    const result = advanceEarlyQiPavilionEntry(state, qiPavilionPlaces[scene.place],
      { ...state.earlyTraining.qiPavilionEntry, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiBarrier) for (const scene of qiBarrierScenes) {
    if (scene.place === 'path') {
      const result = advanceEarlyQiBarrier(state, qiBarrierPlaces.path,
        { ...state.earlyTraining.qiPavilionBarrier, actor: scene.actor, operation: 'path', chosenPath: 3 })
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    } else if (state.earlyTraining.qiPavilionBarrier.stage === 6) {
      for (const operation of ['settle', 'gather', 'blast'] as const) {
        const task = state.earlyTraining.qiPavilionBarrier
        const result = advanceEarlyQiBarrier(state, qiBarrierPlaces.stance,
          { ...task, actor: scene.actor, operation, marker: .5 })
        expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
      }
    } else {
      const result = advanceEarlyQiBarrier(state, qiBarrierPlaces[scene.place],
        { ...state.earlyTraining.qiPavilionBarrier, actor: scene.actor, operation: scene.operation })
      expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
    }
  }
  if (includeQiScroll) for (const scene of qiScrollScenes) {
    const task = state.earlyTraining.qiPavilionScroll
    const result = advanceEarlyQiScroll(state, { ...task, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiExchange) for (const scene of qiExchangeScenes) {
    const task = state.earlyTraining.qiPavilionExchange
    const result = advanceEarlyQiExchange(state, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  if (includeQiAid) while (state.earlyTraining.qiPavilionAid.stage < 10) {
    const task = state.earlyTraining.qiPavilionAid
    const scene = qiAidScenes[task.stage]
    const result = advanceEarlyQiAid(state, qiAidPlaces[scene.place], { ...task, actor: scene.actor, operation: qiAidOperation(task), marker: task.stage === 6 ? .5 : undefined })
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state)); onCheckpoint?.(state)
  }
  return state
}
