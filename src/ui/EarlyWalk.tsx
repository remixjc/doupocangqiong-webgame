import { returnButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { lazyScene } from './scene-load'
import { RobeFigure } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useReturningScene } from './use-returning-scene'
import { deferredRoute } from './DeferredScene'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { earlyTrainingBlock } from '../core/early-training'
import { earlyWalkPlaces, earlyWalkObstacles, earlyWalkStart, earlyWalkSize, moveEarlyWalker, nearbyEarlyWalkPlace, type EarlyWalkDirection } from '../core/early-walk'
import { earlyTrainingSaveSummary } from '../core/save-preview'
import EarlyWalkInteraction from './EarlyWalkInteraction'
import EarlyRoom from './EarlyRoom'
import { earlyHallBlock, submitEarlyHallEntry } from '../core/early-hall'
import { gameStore } from '../core/store'
import { earlyTeachingRoomBlock } from '../core/early-teaching'
import { earlySupervisionBlock } from '../core/early-supervision'
import { earlyRecoveryBlock } from '../core/early-recovery'
import { earlyConsignmentBlock } from '../core/early-consignment'
import { earlyAppraisalBlock } from '../core/early-appraisal'
import { earlyAuctionBlock } from '../core/early-auction'
import { earlySettlementBlock } from '../core/early-settlement'
import { earlyFatherGiftBlock } from '../core/early-father-gift'
import { earlyXunerVisitBlock } from '../core/early-xuner-visit'
import { earlyLongSuppliesBlock } from '../core/early-long-supplies'
import { earlyForestStrikeBlock } from '../core/early-forest-strike'
import { earlySeventhRoomBlock } from '../core/early-seventh-room'
import { earlyPalmPairBlock } from '../core/early-palm-pair'
import { earlyPreliminaryBlock } from '../core/early-preliminary'
import { earlyKeChallengeBlock } from '../core/early-ke-challenge'
import { earlyEighthTrainingBlock } from '../core/early-eighth-training'
import { earlyCeremonyGuestsBlock } from '../core/early-ceremony-guests'
import { earlyCeremonialTestBlock } from '../core/early-ceremonial-test'
import { earlyNingFirstBlock } from '../core/early-ning-first'
import { earlyNingSecondBlock } from '../core/early-ning-second'
import { earlyCeremonyVerdictBlock } from '../core/early-ceremony-verdict'
import './early-walk.css'

const EarlyHall = lazyScene(() => import('./EarlyHall'))
const EarlyTeaching = lazyScene(() => import('./EarlyTeaching'))
const EarlySupervision = lazyScene(() => import('./EarlySupervision'))
const EarlyRecovery = lazyScene(() => import('./EarlyRecovery'))
const EarlyConsignment = lazyScene(() => import('./EarlyConsignment'))
const EarlyAppraisal = lazyScene(() => import('./EarlyAppraisal'))
const EarlyAuction = lazyScene(() => import('./EarlyAuction'))
const EarlySettlement = lazyScene(() => import('./EarlySettlement'))
const EarlyFatherGift = lazyScene(() => import('./EarlyFatherGift'))
const EarlyXunerVisit = lazyScene(() => import('./EarlyXunerVisit'))
const EarlyLongSupplies = lazyScene(() => import('./EarlyLongSupplies'))
const EarlyForestStrike = lazyScene(() => import('./EarlyForestStrike'))
const EarlySeventhRoom = lazyScene(() => import('./EarlySeventhRoom'))
const EarlyPalmPair = lazyScene(() => import('./EarlyPalmPair'))
const EarlyPreliminary = lazyScene(() => import('./EarlyPreliminary'))
const EarlyKeChallenge = lazyScene(() => import('./EarlyKeChallenge'))
const EarlyEighthTraining = lazyScene(() => import('./EarlyEighthTraining'))
const EarlyCeremonyGuests = lazyScene(() => import('./EarlyCeremonyGuests'))
const EarlyCeremonialTest = lazyScene(() => import('./EarlyCeremonialTest'))
const EarlyNingFirst = lazyScene(() => import('./EarlyNingFirst'))
const EarlyNingSecond = lazyScene(() => import('./EarlyNingSecond'))
const EarlyCeremonyVerdict = lazyScene(() => import('./EarlyCeremonyVerdict'))

export default function EarlyWalk({ state, onBack, onContinue }: { state: GameState; onBack: () => void; onContinue?: () => void }) {
  const [position, setPosition] = useState({ ...earlyWalkStart })
  const [reading, setReading] = useState<string>()
  const [indoors, setIndoors, roomEntry, indoorsBack] = useReturningScene()
  const [hall, setHall, hallEntry, hallBack] = useReturningScene()
  const [teaching, setTeaching, teachingEntry, teachingBack] = useReturningScene()
  const [supervising, setSupervising, supervisionEntry, supervisingBack] = useReturningScene()
  const [recovering, setRecovering, recoveryEntry, recoveringBack] = useReturningScene()
  const [consigning, setConsigning, consignmentEntry, consigningBack] = useReturningScene()
  const [appraising, setAppraising, appraisalEntry, appraisingBack] = useReturningScene()
  const [auctioning, setAuctioning, auctionEntry, auctioningBack] = useReturningScene()
  const [settling, setSettling, settlementEntry, settlingBack] = useReturningScene()
  const [fatherVisiting, setFatherVisiting, fatherGiftEntry, fatherVisitingBack] = useReturningScene()
  const [xunerVisiting, setXunerVisiting, xunerVisitEntry, xunerVisitingBack] = useReturningScene()
  const [storingSupplies, setStoringSupplies, longSuppliesEntry, storingSuppliesBack] = useReturningScene()
  const [forestTraining, setForestTraining, forestEntry, forestTrainingBack] = useReturningScene()
  const [seventhTraining, setSeventhTraining, seventhEntry, seventhTrainingBack] = useReturningScene()
  const [palmTraining, setPalmTraining, palmEntry, palmTrainingBack] = useReturningScene()
  const [preliminary, setPreliminary, preliminaryEntry, preliminaryBack] = useReturningScene()
  const [keChallenge, setKeChallenge, keChallengeEntry, keChallengeBack] = useReturningScene()
  const [eighthTraining, setEighthTraining, eighthEntry, eighthTrainingBack] = useReturningScene()
  const [ceremonyGuests, setCeremonyGuests, guestsEntry, ceremonyGuestsBack] = useReturningScene()
  const [ceremonialTest, setCeremonialTest, ceremonialEntry, ceremonialTestBack] = useReturningScene()
  const [ningFirst, setNingFirst, ningFirstEntry, ningFirstBack] = useReturningScene()
  const [ningSecond, setNingSecond, ningSecondEntry, ningSecondBack] = useReturningScene()
  const [ceremonyVerdict, setCeremonyVerdict, verdictEntry, ceremonyVerdictBack] = useReturningScene()
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyTrainingBlock(state)
  const place = nearbyEarlyWalkPlace(position)
  useSceneFocus(field, !blocked, [blocked])
  function openTeaching() {
    const blocked = earlyTeachingRoomBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setHall(false); setTeaching(true)
  }
  function openSupervision() {
    const blocked = earlySupervisionBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setTeaching(false); setSupervising(true)
  }
  function openRecovery() {
    const blocked = earlyRecoveryBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setSupervising(false); setRecovering(true)
  }
  function openConsignment() {
    const blocked = earlyConsignmentBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setRecovering(false); setConsigning(true)
  }
  function openAppraisal() {
    const blocked = earlyAppraisalBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setConsigning(false); setAppraising(true)
  }
  function openAuction() {
    const blocked = earlyAuctionBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setAppraising(false); setAuctioning(true)
  }
  function openSettlement() {
    const blocked = earlySettlementBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setAuctioning(false); setSettling(true)
  }
  function openFatherGift() {
    const blocked = earlyFatherGiftBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setSettling(false); setFatherVisiting(true)
  }
  function openXunerVisit() {
    const blocked = earlyXunerVisitBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setFatherVisiting(false); setXunerVisiting(true)
  }
  function openLongSupplies() {
    const blocked = earlyLongSuppliesBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setXunerVisiting(false); setStoringSupplies(true)
  }
  function openForest() {
    const blocked = earlyForestStrikeBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setStoringSupplies(false); setForestTraining(true)
  }
  function openSeventh() {
    const blocked = earlySeventhRoomBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setForestTraining(false); setSeventhTraining(true)
  }
  function openPalm() {
    const blocked = earlyPalmPairBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setSeventhTraining(false); setPalmTraining(true)
  }
  function openPreliminary() {
    const blocked = earlyPreliminaryBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setPalmTraining(false); setPreliminary(true)
  }
  function openCeremonyVerdict() {
    const blocked = earlyCeremonyVerdictBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setNingSecond(false); setCeremonyVerdict(true)
  }
  function openNingSecond() {
    const blocked = earlyNingSecondBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setNingFirst(false); setNingSecond(true)
  }
  function openNingFirst() {
    const blocked = earlyNingFirstBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setCeremonialTest(false); setNingFirst(true)
  }
  function openCeremonialTest() {
    const blocked = earlyCeremonialTestBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setCeremonyGuests(false); setCeremonialTest(true)
  }
  function openCeremonyGuests() {
    const blocked = earlyCeremonyGuestsBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setEighthTraining(false); setCeremonyGuests(true)
  }
  function openEighthTraining() {
    const blocked = earlyEighthTrainingBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setKeChallenge(false); setEighthTraining(true)
  }
  function openKeChallenge() {
    const blocked = earlyKeChallengeBlock(gameStore.getSnapshot().state, position)
    if (blocked) { gameStore.notify(blocked); return }
    setPreliminary(false); setKeChallenge(true)
  }
  const move = (direction: EarlyWalkDirection) => { setReading(undefined); setPosition(current => moveEarlyWalker(current, direction)) }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right' } as Record<string, EarlyWalkDirection>)[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (direction) { event.preventDefault(); move(direction) }
    if (event.key.toLowerCase() === 'e') { event.preventDefault(); if (place) setReading(place.id) }
  }
  if (blocked) return <p>{blocked}</p>
  if (ceremonyVerdict) return deferredRoute(EarlyCeremonyVerdict, "正在接续正式裁定与礼终……", state, ceremonyVerdictBack, { position: position })
  if (ningSecond) return deferredRoute(EarlyNingSecond, "正在接续违规再攻与迎击……", state, ningSecondBack, { position: position, onVerdict: openCeremonyVerdict })
  if (ningFirst) return deferredRoute(EarlyNingFirst, "正在接续萧宁首轮推拉交锋……", state, ningFirstBack, { position: position, onSecond: openNingSecond })
  if (ceremonialTest) return deferredRoute(EarlyCeremonialTest, "正在接续正式仪式与验碑……", state, ceremonialTestBack, { position: position, onChallenge: openNingFirst })
  if (ceremonyGuests) return deferredRoute(EarlyCeremonyGuests, "正在进入正式礼宾客场地……", state, ceremonyGuestsBack, { position: position, onCeremony: openCeremonialTest })
  if (eighthTraining) return deferredRoute(EarlyEighthTraining, "正在接续同行与礼前训练……", state, eighthTrainingBack, { position: position, onGuests: openCeremonyGuests })
  if (keChallenge) return deferredRoute(EarlyKeChallenge, "正在接续萧克六段挑战……", state, keChallengeBack, { position: position, onTraining: openEighthTraining })
  if (preliminary) return deferredRoute(EarlyPreliminary, "正在进入一月前预测……", state, preliminaryBack, { position: position, onChallenge: openKeChallenge })
  if (palmTraining) return deferredRoute(EarlyPalmPair, "正在展开吸推两瓶练习……", state, palmTrainingBack, { position: position, onPreliminary: openPreliminary })
  if (seventhTraining) return deferredRoute(EarlySeventhRoom, "正在回房接续七段调息……", state, seventhTrainingBack, { position: position, onPalm: openPalm })
  if (forestTraining) return deferredRoute(EarlyForestStrike, "正在走入练技森林……", state, forestTrainingBack, { position: position, onSeventh: openSeventh })
  if (storingSupplies) return deferredRoute(EarlyLongSupplies, "正在回看房中物资……", state, storingSuppliesBack, { position: position, onForest: openForest })
  if (xunerVisiting) return deferredRoute(EarlyXunerVisit, "正在接续薰儿来访……", state, xunerVisitingBack, { position: position, onSupplies: openLongSupplies })
  if (fatherVisiting) return deferredRoute(EarlyFatherGift, "正在回房接续父亲来访……", state, fatherVisitingBack, { position: position, onXunerVisit: openXunerVisit })
  if (settling) return deferredRoute(EarlySettlement, "正在展开寄售手续……", state, settlingBack, { position: position, onFatherGift: openFatherGift })
  if (auctioning) return deferredRoute(EarlyAuction, "正在进入第一拍卖室……", state, auctioningBack, { position: position, onSettle: openSettlement })
  if (appraising) return deferredRoute(EarlyAppraisal, "正在展开寄售鉴定路线……", state, appraisingBack, { position: position, onAuction: openAuction })
  if (consigning) return deferredRoute(EarlyConsignment, "正在展开首次寄售准备……", state, consigningBack, { position: position, onAppraise: openAppraisal })
  if (recovering) return deferredRoute(EarlyRecovery, "正在打开训练后的恢复房间……", state, recoveringBack, { position: position, onConsign: openConsignment })
  if (supervising) return deferredRoute(EarlySupervision, "正在展开后山督练……", state, supervisingBack, { position: position, onRecover: openRecovery })
  if (teaching) return deferredRoute(EarlyTeaching, "正在打开老师传技房间……", state, teachingBack, { position: position, onSupervise: openSupervision })
  if (hall) return deferredRoute(EarlyHall, "正在展开斗技堂……", state, hallBack, { onTeach: openTeaching })
  if (indoors) return <EarlyRoom state={state} position={position} onContinue={onContinue} onBack={indoorsBack} />
  return <>
    <Eyebrow>乌坦城 / 往事准备路线</Eyebrow>
    <h2>走过街巷，再把准备做齐。</h2>
    <MutedParagraph id="early-walk-help">聚焦地图后用方向键或WASD行走，靠近地点按E交互；下方方向按钮也可操作。接取、借资、采购和交涉后，回到药老容器处继续调制、加水与初期练习。</MutedParagraph>
    <EarlyMap ref={field} aria-label="往事路线地图"
      aria-describedby="early-walk-help" viewBox={`0 0 ${earlyWalkSize.width} ${earlyWalkSize.height}`} onKeyDown={key}>
      <title>萧家院落、药铺与坊市的原创压缩布局</title>
      <MapBackground fill="#182d29" />
      <path d="M0 25 Q165 80 320 20 T720 35 V0 H0Z" fill="#31453d" />
      <path d="M28 400 Q160 360 250 408 T720 375 V420 H0Z" fill="#344139" />
      <path d="M135 355 V143 H580 V350 H140 M270 145 V355 M450 145 V355" fill="none" stroke="#6d6551" strokeWidth="38" strokeLinejoin="round" />
      <path d="M135 355 V143 H580 V350 H140" fill="none" stroke="#a28f63" strokeOpacity=".2" strokeWidth="2" strokeDasharray="5 14" />
      {earlyWalkObstacles.slice(0, 2).map((rect, index) => <g key={rect.x}>
        <rect {...rect} rx="4" fill="#39473b" stroke="#ad9365" />
        <path d={`M${rect.x - 12} ${rect.y + 10} L${rect.x + rect.width / 2} ${rect.y - 25} L${rect.x + rect.width + 12} ${rect.y + 10}Z`} fill="#614c3b" stroke="#bb9460" />
        <rect x={rect.x + rect.width / 2 - 14} y={rect.y + 18} width="28" height="50" fill="#223430" />
        <MapText x={rect.x + rect.width / 2} y={rect.y + 8} fill="#f0d7a4" fontSize="15">{index === 0 ? '药 铺' : '萧 家 坊 市'}</MapText>
      </g>)}
      <g><rect {...earlyWalkObstacles[2]} rx="10" fill="#394b47" stroke="#829381" /><ellipse cx="360" cy="208" rx="34" ry="13" fill="#49766d" /><path d="M352 202 Q360 175 368 202" fill="none" stroke="#a0c2af" strokeWidth="2" /></g>
      {[{ x: 30, y: 190 }, { x: 680, y: 210 }, { x: 290, y: 75 }, { x: 430, y: 380 }].map(tree => <g key={tree.x}><path d={`M${tree.x} ${tree.y} v34`} stroke="#6d5741" strokeWidth="5" /><circle cx={tree.x} cy={tree.y} r="24" fill="#3c5a42" /><circle cx={tree.x - 8} cy={tree.y - 8} r="14" fill="#4d6c4d" /></g>)}
      <g><ellipse cx="575" cy="318" rx="23" ry="9" fill="#274d4e" stroke="#a6ac88" /><rect x="555" y="295" width="40" height="21" rx="4" fill="#645b44" /><ellipse cx="575" cy="295" rx="20" ry="7" fill="#79a89c" /></g>
      {earlyWalkPlaces.map(item => <g key={item.id}>
        <circle cx={item.x} cy={item.y} r="27" fill={place?.id === item.id ? '#e4bc7335' : '#e4bc7312'} stroke="#c9ab70" strokeDasharray={place?.id === item.id ? undefined : '3 5'} />
        <MapText x={item.x} y={item.y - 35} fill="#edcea0" fontSize="13">{item.label}</MapText>
        {item.id === 'xuner' && <><path d={`M${item.x - 10} ${item.y + 12} Q${item.x} ${item.y - 15} ${item.x + 10} ${item.y + 12}Z`} fill="#bcb8db" /><circle cx={item.x} cy={item.y - 10} r="7" fill="#e9c6a1" /></>}
        {item.id === 'teacher' && <circle cx={item.x} cy={item.y - 6} r="9" fill="#aec9ce" opacity=".8" />}
      </g>)}
      <g aria-hidden="true" data-player-x={position.x} data-player-y={position.y} transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="14" rx="13" ry="5" fill="#0005" /><RobeFigure cut="M-10 12 L-6-2 H6 L11 12Z" robe="#d3a567" cy="-8" r="7" skin="#edc79f" bodyFirst /><path d="M-7-11 Q0-20 7-10" fill="#26322f" /><path d="M-12 3 L-8 11 M12 3 L8 11" stroke="#8e653c" strokeWidth="3" />
      </g>
      <MapText x="360" y="402" fill="#a7b9a9">院门 · 每次进入从这里出发</MapText>
    </EarlyMap>
    <StatusParagraph className="early-walk-status">{place ? `附近：${place.label} · 可查看地点` : '沿街巷行走，靠近金色路标查看。'}</StatusParagraph>
    <WalkControls aria-label="往事行走操作">
      <SecondaryButton onClick={() => move('up')} aria-label="往事向上走">↑</SecondaryButton>
      <SecondaryButton onClick={() => move('left')} aria-label="往事向左走">←</SecondaryButton>
      <SecondaryButton onClick={() => move('down')} aria-label="往事向下走">↓</SecondaryButton>
      <SecondaryButton onClick={() => move('right')} aria-label="往事向右走">→</SecondaryButton>
      <PrimaryButton disabled={!place} onClick={() => place && setReading(place.id)}>查看附近地点</PrimaryButton>
    </WalkControls>
    {reading && place?.id === reading && <>
      <BondSummary aria-label="往事地点说明"><b>{place.label}</b><p>{place.text}</p></BondSummary>
      {place.id === 'teacher' && state.earlyTraining.market.stage === 4 && <PrimaryButton ref={roomEntry} onClick={() => setIndoors(true)}>进入药老调制室</PrimaryButton>}
      {place.id === 'teacher' && !earlyHallBlock(state) && <SecondaryButton ref={hallEntry} onClick={() => {
        if (submitEarlyHallEntry(gameStore, position)) setHall(true)
      }}>接续往事 · 前往斗技堂</SecondaryButton>}
      {place.id === 'teacher' && !earlyTeachingRoomBlock(state, position) && <PrimaryButton ref={teachingEntry} onClick={openTeaching}>回房请药老正式传技</PrimaryButton>}
      {place.id === 'teacher' && !earlySupervisionBlock(state, position) && <SecondaryButton ref={supervisionEntry} onClick={openSupervision}>前往后山 · 接受药老督练</SecondaryButton>}
      {place.id === 'teacher' && !earlyRecoveryBlock(state, position) && <PrimaryButton ref={recoveryEntry} onClick={openRecovery}>回房恢复 · 查看自用药液</PrimaryButton>}
      {place.id === 'teacher' && !earlyConsignmentBlock(state, position) && <SecondaryButton ref={consignmentEntry} onClick={openConsignment}>筹备首次寄售 · 另备待售药液</SecondaryButton>}
      {place.id === 'teacher' && !earlyAppraisalBlock(state, position) && <PrimaryButton ref={appraisalEntry} onClick={openAppraisal}>前往拍卖场 · 黑袍与谷尼鉴定</PrimaryButton>}
      {place.id === 'teacher' && !earlyAuctionBlock(state, position) && <SecondaryButton ref={auctionEntry} onClick={openAuction}>入席旁观 · 雅妃主持首次拍卖</SecondaryButton>}
      {place.id === 'teacher' && !earlySettlementBlock(state, position) && <PrimaryButton ref={settlementEntry} onClick={openSettlement}>回鉴定室 · 贵宾卡与寄售收款</PrimaryButton>}
      {place.id === 'teacher' && !earlyFatherGiftBlock(state, position) && <SecondaryButton ref={fatherGiftEntry} onClick={openFatherGift}>回萧家房中 · 父亲赠回同瓶</SecondaryButton>}
      {place.id === 'teacher' && !earlyXunerVisitBlock(state, position) && <PrimaryButton ref={xunerVisitEntry} onClick={openXunerVisit}>接续薰儿来访 · 独自处理长老争执</PrimaryButton>}
      {place.id === 'teacher' && !earlyLongSuppliesBlock(state, position) && <SecondaryButton ref={longSuppliesEntry} onClick={openLongSupplies}>回看已购长期物资 · 分拣与藏柜</SecondaryButton>}
      {place.id === 'teacher' && !earlyForestStrikeBlock(state, position) && <PrimaryButton ref={forestEntry} onClick={openForest}>走入后山森林 · 首次成功八极崩</PrimaryButton>}
      {place.id === 'teacher' && !earlySeventhRoomBlock(state, position) && <SecondaryButton ref={seventhEntry} onClick={openSeventh}>回房冲向七段 · 老师从古戒补一滴</SecondaryButton>}
      {place.id === 'teacher' && !earlyPalmPairBlock(state, position) && <PrimaryButton ref={palmEntry} onClick={openPalm}>接续吸推两瓶 · 请药老传吹火掌</PrimaryButton>}
      {place.id === 'teacher' && !earlyPreliminaryBlock(state, position) && <SecondaryButton ref={preliminaryEntry} onClick={openPreliminary}>前往一月前预测 · 名簿与黑碑</SecondaryButton>}
      {place.id === 'teacher' && !earlyKeChallengeBlock(state, position) && <PrimaryButton ref={keChallengeEntry} onClick={openKeChallenge}>接续萧克六段挑战 · 侧避与低阶掌法</PrimaryButton>}
      {place.id === 'teacher' && !earlyEighthTrainingBlock(state, position) && <PrimaryButton ref={eighthEntry} onClick={openEighthTraining}>接续同行与礼前八段 · 实际训练</PrimaryButton>}
      {place.id === 'teacher' && !earlyCeremonyGuestsBlock(state, position) && <PrimaryButton ref={guestsEntry} onClick={openCeremonyGuests}>前往正式礼宾客 · 观察收剑中止</PrimaryButton>}
      {place.id === 'teacher' && !earlyCeremonialTestBlock(state, position) && <PrimaryButton ref={ceremonialEntry} onClick={openCeremonialTest}>接续正式仪式 · 二长老验碑与八段</PrimaryButton>}
      {place.id === 'teacher' && !earlyNingFirstBlock(state, position) && <PrimaryButton ref={ningFirstEntry} onClick={openNingFirst}>接续萧宁首轮 · 推拉推与待裁判</PrimaryButton>}
      {place.id === 'teacher' && !earlyNingSecondBlock(state, position) && <PrimaryButton ref={ningSecondEntry} onClick={openNingSecond}>接续违规再攻 · 八极崩与追加拳击</PrimaryButton>}
      {place.id === 'teacher' && !earlyCeremonyVerdictBlock(state, position) && <PrimaryButton ref={verdictEntry} onClick={openCeremonyVerdict}>接续正式裁定 · 双请求与礼终离场</PrimaryButton>}
      <EarlyWalkInteraction state={state} position={position} onContinue={onContinue} />
    </>}
    <MutedParagraph>{earlyTrainingSaveSummary(state, state.settings)}。本图位置仅在当前窗口保留；关闭或刷新回院门，准备单中的已完成步骤仍保存。街巷尺寸、道路和行走步长是原创布局。</MutedParagraph>
    {returnButton(onBack, "回到重修准备单")}
  </>
}
