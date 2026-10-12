import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallBackground, HallEastShelf, HallWestField, XunerReadingScroll } from './HallShelves'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallReadingPlaces } from '../core/first-hall-reading'
import { earlySnapshots } from '../core/early-snapshots'
import { firstHallApproachBlock, firstHallExitResponsePosition, submitFirstHallApproach, type FirstHallApproachAction } from '../core/first-hall-approach'
import { firstHallApproachScene } from '../content/first-hall-approach'
import { firstHallApproachSaveSummary } from '../core/save-preview'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { HallText } from './MapPrimitives'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import './early-walk.css'

export default function FirstHallApproach({ state, onBack, continuation = false, conflict = false, threat = false, exitResponse = false, checkout = false }: { state: GameState; onBack: () => void; continuation?: boolean; conflict?: boolean; threat?: boolean; exitResponse?: boolean; checkout?: boolean }) {
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScene(task.stage, continuation, conflict, threat, exitResponse, checkout)
  const moving = exitResponse || checkout
  const current = conflict || threat || moving
  const prefix = checkout ? '同卷管理者登记' : exitResponse ? '堂内移步与来年回应' : threat ? '成人礼威胁' : conflict ? '交锋与第二卷' : continuation ? '同卷归架' : '整衣靠近'
  const position = moving ? firstHallExitResponsePosition(task) : hallReadingPlaces.shelf
  const first = continuation || current ? task.first : task.stage >= 13 ? 'rolled' : 'open'
  const [actor, setActor] = useState<FirstHallApproachAction['actor']>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = firstHallApproachBlock(state, continuation, conflict, threat, exitResponse, checkout)
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallApproach(gameStore, position, 'hall', { ...task,
      expectedTalk: { ...t.firstHallTalk }, expectedReading: { ...t.firstHallReading }, expectedMatch: { ...t.firstHallMatch },
      ...earlySnapshots(state, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']), actor, operation, continuation, conflict, threat, exitResponse, checkout })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
    event.preventDefault()
    if (scene && actor === scene.actor) act(scene.operation)
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">斗技堂 / {prefix}</span><h2>{checkout ? '向管理者登记本人所持的同一第二卷。' : exitResponse ? '持同一第二卷移步，回应来年的话。' : threat ? '来年的威胁，当前仍持同一第二卷。' : conflict ? '分清她的临时卷与本人第二卷。' : continuation ? '回应提议，把同一第一卷放回书架。' : '他走近东架，本人收起同一卷。'}</h2>
    <p id="hall-approach-help">选人物后按E记录本步。刷新关注本人，三人位置独立；{current ? '她放卷与本人另取分存。' : '收卷与归架分存。'}</p>
    {!moving && task.stage >= 41 && <p>明确回顾当时的东架位置，后段已存堂内移步记录保持。</p>}
    {!checkout && task.stage >= 47 && <p>明确回顾登记前的断点，后段同卷借阅记录保持。</p>}
    <div className="early-walk-controls">
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人读卷与察觉</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'ning'} onClick={() => setActor('ning')}>{exitResponse ? '旁观萧宁误解与脸色' : threat ? '旁观萧宁威胁与未动手' : conflict ? '旁观萧宁讥讽与提议' : continuation ? '旁观萧宁提议与说法' : '旁观萧宁整衣与行走'}</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'bystander'} onClick={() => setActor('bystander')}>旁观堂中人群</SecondaryButton>
      {conflict && <SecondaryButton aria-pressed={actor === 'xuner'} onClick={() => setActor('xuner')}>旁观薰儿放卷与回应</SecondaryButton>}
    </div>
    <EarlyMap ref={field} aria-label={`${prefix}地图`} aria-describedby="hall-approach-help"
      viewBox={moving ? '100 190 390 175' : '100 190 390 120'} onKeyDown={key}>
      <HallBackground height={moving ? 175 : 120} />
      <HallWestField />
      <HallEastShelf />
      <g aria-label="萧宁独立位置" transform={task.ning === 'east' ? 'translate(450 280)' : task.ning === 'aisle' ? 'translate(320 244)' : 'translate(235 244)'}>
        <circle r="7" fill={task.clothes ? '#ceae83' : '#bd8d6b'} />
        {[2, 4].includes(task.stage) && <path aria-label="萧宁握拳" d="M-11 0 h3 M8 0 h3" stroke="#dcc6ae" strokeWidth="4" />}
        <HallText y="21" fontSize="9">萧宁{task.clothes ? ' · 已整衣' : ''}</HallText>
      </g>
      <g aria-label="薰儿仍坐东架" transform="translate(380 250)"><circle cy="5" r="7" fill="#ae8dbd" /><HallText y="-13" fontSize="9">薰儿</HallText></g>
      {current && task.ownPlaced ? <rect aria-label="薰儿自己的临时卷已放下" x="353" y="280" width="13" height="9" fill="#604572" stroke="#c2a679" /> : <XunerReadingScroll />}
      {moving && <HallText x="205" y="356">堂内入口 · 尚未跨门</HallText>}
      {checkout && <HallText x="280" y="310">管理者 · 同卷借阅</HallText>}
      <g aria-label={moving ? `萧炎本人实际位置 · ${task.yan}` : '萧炎本人仍在东架'} transform={`translate(${position.x} ${position.y})`}><MarketWalker /><HallText y="26" fontSize="9">本人 · {current && task.stage >= 28 ? '持第二卷' : first === 'returned' ? '已归架' : first === 'rolled' ? '已收卷' : '读第一卷'}</HallText></g>
      {current && task.stage >= 28 && <rect aria-label="本人另取的同一第二卷" x={position.x + 20} y={position.y - 5} width="9" height="15" fill="#415849" stroke="#bfa46a" />}
      <rect aria-label={first === 'returned' ? '同一第一卷实际放回书架' : first === 'rolled' ? '同一第一卷已卷起尚未归架' : '同一第一卷仍展开'}
        x="420" y={first === 'returned' ? 215 : 245} width={first === 'open' ? 28 : 8} height="15" fill="#161e20" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>{prefix} {checkout ? task.stage - 46 : exitResponse ? Math.min(task.stage, 46) - 40 : threat ? Math.min(task.stage, 40) - 31 : conflict ? Math.min(task.stage, 31) - 19 : continuation ? Math.min(task.stage, 19) - 14 : Math.min(task.stage, 14)}/{checkout ? 3 : exitResponse ? 6 : threat ? 9 : conflict ? 12 : continuation ? 5 : 14} · {firstHallApproachSaveSummary(state, state.settings)}</StatusParagraph>
    <p>{checkout && task.checkoutRecord !== 'none' ? task.checkoutRecord === 'recalled' ? '明确回顾当时管理者登记，当前更高保管保持。' : '同一第二卷实际登记借出，本人仍持卷尚未离堂。' : current ? (task.secondRecord === 'recalled' ? '明确回顾当时另取第二卷，现有更高保管保持。' : task.stage >= 28 ? '本人另取第二卷，未登记或离堂。' : '第一卷已归架，第二卷尚未取。') : task.stage >= 20 || t.firstHallReading.record === 'recalled' || task.returnRecord === 'recalled' || t.hall.stage >= 6 && first !== 'returned'
      ? '明确回顾当时第一卷，当前更高保管保持。' : first === 'returned' ? '同一第一卷已归架，第二卷尚未取。' : '本人仍持同一第一卷，尚未归架。'}{!current && (task.ownPlaced ? '回顾当时她仍持自己的临时卷，后段放卷记录保持。' : '薰儿仍持她自己的临时卷。')}旧卷账 {t.hall.stage}/9。</p>
    {current && <p>{task.ownPlaced ? '当前她自己的临时卷已经放下，旧会面拿卷历史保持。' : '她自己的临时卷仍在手中。'}切磋与未来威胁没有当前开战。</p>}
    {scene ? <BondSummary><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor === scene.actor ? '当前人物正确。' : '请切换到本步人物。'}</p>
      <PrimaryButton disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('return')}>把收卷当成第一卷已归架</SecondaryButton>
      <SecondaryButton onClick={() => act('second')}>{current ? '把她放下的卷交给本人' : '提前取本人第二卷'}</SecondaryButton>
    </BondSummary> : <BondSummary><h3>{prefix}已归档。</h3><p>{checkout ? '同一第二卷借阅已归档。同行交谈与实际跨门另续。' : exitResponse ? '本人已到堂内入口，同一第二卷尚未登记；同行与实际离堂待续。' : threat ? '未来威胁已归档，当前未登记或离堂。' : conflict ? '本人第二卷与她的临时卷独立。未来威胁、实际离堂待续。' : continuation ? '第一卷已归架，后续交锋与第二卷待续。' : '萧宁已到东架前，第一卷仅卷起。提议与实际归架待续。'}</p></BondSummary>}
    <SecondaryButton onClick={onBack}>暂离{prefix} · 保留断点</SecondaryButton>
  </>
}
