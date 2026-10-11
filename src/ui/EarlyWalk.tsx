import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
import { loadSceneModule } from './scene-load'
import './early-walk.css'

const EarlyHall = lazy(() => loadSceneModule(() => import('./EarlyHall')))
const EarlyTeaching = lazy(() => loadSceneModule(() => import('./EarlyTeaching')))
const EarlySupervision = lazy(() => loadSceneModule(() => import('./EarlySupervision')))
const EarlyRecovery = lazy(() => loadSceneModule(() => import('./EarlyRecovery')))
const EarlyConsignment = lazy(() => loadSceneModule(() => import('./EarlyConsignment')))
const EarlyAppraisal = lazy(() => loadSceneModule(() => import('./EarlyAppraisal')))
const EarlyAuction = lazy(() => loadSceneModule(() => import('./EarlyAuction')))

export default function EarlyWalk({ state, onBack, onContinue }: { state: GameState; onBack: () => void; onContinue?: () => void }) {
  const [position, setPosition] = useState({ ...earlyWalkStart })
  const [reading, setReading] = useState<string>()
  const [indoors, setIndoors] = useState(false)
  const [hall, setHall] = useState(false)
  const [teaching, setTeaching] = useState(false)
  const [supervising, setSupervising] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [consigning, setConsigning] = useState(false)
  const [appraising, setAppraising] = useState(false)
  const [auctioning, setAuctioning] = useState(false)
  const field = useRef<SVGSVGElement>(null)
  const roomEntry = useRef<HTMLButtonElement>(null)
  const hallEntry = useRef<HTMLButtonElement>(null)
  const returningHall = useRef(false)
  const teachingEntry = useRef<HTMLButtonElement>(null)
  const returningTeaching = useRef(false)
  const supervisionEntry = useRef<HTMLButtonElement>(null)
  const returningSupervision = useRef(false)
  const recoveryEntry = useRef<HTMLButtonElement>(null)
  const returningRecovery = useRef(false)
  const consignmentEntry = useRef<HTMLButtonElement>(null)
  const returningConsignment = useRef(false)
  const appraisalEntry = useRef<HTMLButtonElement>(null)
  const returningAppraisal = useRef(false)
  const auctionEntry = useRef<HTMLButtonElement>(null)
  const returningAuction = useRef(false)
  const returning = useRef(false)
  const blocked = earlyTrainingBlock(state)
  const place = nearbyEarlyWalkPlace(position)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  useEffect(() => {
    if (!indoors && returning.current) { returning.current = false; roomEntry.current?.focus() }
  }, [indoors])
  useEffect(() => {
    if (!hall && returningHall.current) { returningHall.current = false; hallEntry.current?.focus() }
  }, [hall])
  useEffect(() => {
    if (!teaching && returningTeaching.current) { returningTeaching.current = false; teachingEntry.current?.focus() }
  }, [teaching])
  useEffect(() => {
    if (!supervising && returningSupervision.current) { returningSupervision.current = false; supervisionEntry.current?.focus() }
  }, [supervising])
  useEffect(() => {
    if (!recovering && returningRecovery.current) { returningRecovery.current = false; recoveryEntry.current?.focus() }
  }, [recovering])
  useEffect(() => {
    if (!consigning && returningConsignment.current) { returningConsignment.current = false; consignmentEntry.current?.focus() }
  }, [consigning])
  useEffect(() => {
    if (!appraising && returningAppraisal.current) { returningAppraisal.current = false; appraisalEntry.current?.focus() }
  }, [appraising])
  useEffect(() => {
    if (!auctioning && returningAuction.current) { returningAuction.current = false; auctionEntry.current?.focus() }
  }, [auctioning])
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
  const move = (direction: EarlyWalkDirection) => { setReading(undefined); setPosition(current => moveEarlyWalker(current, direction)) }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right' } as Record<string, EarlyWalkDirection>)[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (direction) { event.preventDefault(); move(direction) }
    if (event.key.toLowerCase() === 'e') { event.preventDefault(); if (place) setReading(place.id) }
  }
  if (blocked) return <p>{blocked}</p>
  if (auctioning) return <Suspense fallback={<p role="status">正在进入第一拍卖室……</p>}><EarlyAuction state={state} position={position}
    onBack={() => { returningAuction.current = true; setAuctioning(false) }} /></Suspense>
  if (appraising) return <Suspense fallback={<p role="status">正在展开寄售鉴定路线……</p>}><EarlyAppraisal state={state} position={position}
    onAuction={openAuction}
    onBack={() => { returningAppraisal.current = true; setAppraising(false) }} /></Suspense>
  if (consigning) return <Suspense fallback={<p role="status">正在展开首次寄售准备……</p>}><EarlyConsignment state={state} position={position}
    onAppraise={openAppraisal}
    onBack={() => { returningConsignment.current = true; setConsigning(false) }} /></Suspense>
  if (recovering) return <Suspense fallback={<p role="status">正在打开训练后的恢复房间……</p>}><EarlyRecovery state={state} position={position}
    onConsign={openConsignment}
    onBack={() => { returningRecovery.current = true; setRecovering(false) }} /></Suspense>
  if (supervising) return <Suspense fallback={<p role="status">正在展开后山督练……</p>}><EarlySupervision state={state} position={position}
    onRecover={openRecovery}
    onBack={() => { returningSupervision.current = true; setSupervising(false) }} /></Suspense>
  if (teaching) return <Suspense fallback={<p role="status">正在打开老师传技房间……</p>}><EarlyTeaching state={state} position={position}
    onSupervise={openSupervision}
    onBack={() => { returningTeaching.current = true; setTeaching(false) }} /></Suspense>
  if (hall) return <Suspense fallback={<p role="status">正在展开斗技堂……</p>}><EarlyHall state={state}
    onTeach={openTeaching}
    onBack={() => { returningHall.current = true; setHall(false) }} /></Suspense>
  if (indoors) return <EarlyRoom state={state} position={position} onContinue={onContinue} onBack={() => { returning.current = true; setIndoors(false) }} />
  return <>
    <span className="eyebrow">乌坦城 / 往事准备路线</span>
    <h2>走过街巷，再把准备做齐。</h2>
    <p className="muted" id="early-walk-help">聚焦地图后用方向键或WASD行走，靠近地点按E交互；下方方向按钮也可操作。接取、借资、采购和交涉后，回到药老容器处继续调制、加水与初期练习。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="往事路线地图"
      aria-describedby="early-walk-help" viewBox={`0 0 ${earlyWalkSize.width} ${earlyWalkSize.height}`} onKeyDown={key}>
      <title>萧家院落、药铺与坊市的原创压缩布局</title>
      <rect width="720" height="420" fill="#182d29" />
      <path d="M0 25 Q165 80 320 20 T720 35 V0 H0Z" fill="#31453d" />
      <path d="M28 400 Q160 360 250 408 T720 375 V420 H0Z" fill="#344139" />
      <path d="M135 355 V143 H580 V350 H140 M270 145 V355 M450 145 V355" fill="none" stroke="#6d6551" strokeWidth="38" strokeLinejoin="round" />
      <path d="M135 355 V143 H580 V350 H140" fill="none" stroke="#a28f63" strokeOpacity=".2" strokeWidth="2" strokeDasharray="5 14" />
      {earlyWalkObstacles.slice(0, 2).map((rect, index) => <g key={rect.x}>
        <rect {...rect} rx="4" fill="#39473b" stroke="#ad9365" />
        <path d={`M${rect.x - 12} ${rect.y + 10} L${rect.x + rect.width / 2} ${rect.y - 25} L${rect.x + rect.width + 12} ${rect.y + 10}Z`} fill="#614c3b" stroke="#bb9460" />
        <rect x={rect.x + rect.width / 2 - 14} y={rect.y + 18} width="28" height="50" fill="#223430" />
        <text x={rect.x + rect.width / 2} y={rect.y + 8} textAnchor="middle" fill="#f0d7a4" fontSize="15">{index === 0 ? '药 铺' : '萧 家 坊 市'}</text>
      </g>)}
      <g><rect {...earlyWalkObstacles[2]} rx="10" fill="#394b47" stroke="#829381" /><ellipse cx="360" cy="208" rx="34" ry="13" fill="#49766d" /><path d="M352 202 Q360 175 368 202" fill="none" stroke="#a0c2af" strokeWidth="2" /></g>
      {[{ x: 30, y: 190 }, { x: 680, y: 210 }, { x: 290, y: 75 }, { x: 430, y: 380 }].map(tree => <g key={tree.x}><path d={`M${tree.x} ${tree.y} v34`} stroke="#6d5741" strokeWidth="5" /><circle cx={tree.x} cy={tree.y} r="24" fill="#3c5a42" /><circle cx={tree.x - 8} cy={tree.y - 8} r="14" fill="#4d6c4d" /></g>)}
      <g><ellipse cx="575" cy="318" rx="23" ry="9" fill="#274d4e" stroke="#a6ac88" /><rect x="555" y="295" width="40" height="21" rx="4" fill="#645b44" /><ellipse cx="575" cy="295" rx="20" ry="7" fill="#79a89c" /></g>
      {earlyWalkPlaces.map(item => <g key={item.id}>
        <circle cx={item.x} cy={item.y} r="27" fill={place?.id === item.id ? '#e4bc7335' : '#e4bc7312'} stroke="#c9ab70" strokeDasharray={place?.id === item.id ? undefined : '3 5'} />
        <text x={item.x} y={item.y - 35} textAnchor="middle" fill="#edcea0" fontSize="13">{item.label}</text>
        {item.id === 'xuner' && <><path d={`M${item.x - 10} ${item.y + 12} Q${item.x} ${item.y - 15} ${item.x + 10} ${item.y + 12}Z`} fill="#bcb8db" /><circle cx={item.x} cy={item.y - 10} r="7" fill="#e9c6a1" /></>}
        {item.id === 'teacher' && <circle cx={item.x} cy={item.y - 6} r="9" fill="#aec9ce" opacity=".8" />}
      </g>)}
      <g aria-hidden="true" data-player-x={position.x} data-player-y={position.y} transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="14" rx="13" ry="5" fill="#0005" /><path d="M-10 12 L-6-2 H6 L11 12Z" fill="#d3a567" /><circle cy="-8" r="7" fill="#edc79f" /><path d="M-7-11 Q0-20 7-10" fill="#26322f" /><path d="M-12 3 L-8 11 M12 3 L8 11" stroke="#8e653c" strokeWidth="3" />
      </g>
      <text x="360" y="402" textAnchor="middle" fill="#a7b9a9" fontSize="12">院门 · 每次进入从这里出发</text>
    </svg>
    <p role="status" className="early-walk-status">{place ? `附近：${place.label} · 可查看地点` : '沿街巷行走，靠近金色路标查看。'}</p>
    <div className="early-walk-controls" aria-label="往事行走操作">
      <button className="secondary" onClick={() => move('up')} aria-label="往事向上走">↑</button>
      <button className="secondary" onClick={() => move('left')} aria-label="往事向左走">←</button>
      <button className="secondary" onClick={() => move('down')} aria-label="往事向下走">↓</button>
      <button className="secondary" onClick={() => move('right')} aria-label="往事向右走">→</button>
      <button className="primary" disabled={!place} onClick={() => place && setReading(place.id)}>查看附近地点</button>
    </div>
    {reading && place?.id === reading && <>
      <section className="bond-summary" aria-label="往事地点说明"><b>{place.label}</b><p>{place.text}</p></section>
      {place.id === 'teacher' && state.earlyTraining.market.stage === 4 && <button ref={roomEntry} className="primary" onClick={() => setIndoors(true)}>进入药老调制室</button>}
      {place.id === 'teacher' && !earlyHallBlock(state) && <button ref={hallEntry} className="secondary" onClick={() => {
        if (submitEarlyHallEntry(gameStore, position)) setHall(true)
      }}>接续往事 · 前往斗技堂</button>}
      {place.id === 'teacher' && !earlyTeachingRoomBlock(state, position) && <button ref={teachingEntry} className="primary" onClick={openTeaching}>回房请药老正式传技</button>}
      {place.id === 'teacher' && !earlySupervisionBlock(state, position) && <button ref={supervisionEntry} className="secondary" onClick={openSupervision}>前往后山 · 接受药老督练</button>}
      {place.id === 'teacher' && !earlyRecoveryBlock(state, position) && <button ref={recoveryEntry} className="primary" onClick={openRecovery}>回房恢复 · 查看自用药液</button>}
      {place.id === 'teacher' && !earlyConsignmentBlock(state, position) && <button ref={consignmentEntry} className="secondary" onClick={openConsignment}>筹备首次寄售 · 另备待售药液</button>}
      {place.id === 'teacher' && !earlyAppraisalBlock(state, position) && <button ref={appraisalEntry} className="primary" onClick={openAppraisal}>前往拍卖场 · 黑袍与谷尼鉴定</button>}
      {place.id === 'teacher' && !earlyAuctionBlock(state, position) && <button ref={auctionEntry} className="secondary" onClick={openAuction}>入席旁观 · 雅妃主持首次拍卖</button>}
      <EarlyWalkInteraction state={state} position={position} onContinue={onContinue} />
    </>}
    <p className="muted">{earlyTrainingSaveSummary(state, state.settings)}。本图位置仅在当前窗口保留；关闭或刷新回院门，准备单中的已完成步骤仍保存。街巷尺寸、道路和行走步长是原创布局。</p>
    <button className="secondary" onClick={onBack}>回到重修准备单</button>
  </>
}
