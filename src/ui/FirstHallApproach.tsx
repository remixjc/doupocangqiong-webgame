import { useSceneFocus } from './use-scene-focus'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallBackground, HallEastShelf, HallWestField, XunerReadingScroll } from './HallShelves'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallReadingPlaces } from '../core/first-hall-reading'
import { hallApproachSnapshotKeys, earlySnapshots } from '../core/early-snapshots'
import { firstHallApproachBlock, firstHallExitResponsePosition, submitFirstHallApproach, type FirstHallApproachAction } from '../core/first-hall-approach'
import { firstHallApproachScene } from '../content/first-hall-approach'
import { firstHallApproachSaveSummary } from '../core/save-preview'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { HallText } from './MapPrimitives'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import './early-walk.css'

export default function FirstHallApproach({ state, onBack, continuation = false, conflict = false, threat = false, exitResponse = false, checkout = false, leaving = false, aftermath = false }: { state: GameState; onBack: () => void; continuation?: boolean; conflict?: boolean; threat?: boolean; exitResponse?: boolean; checkout?: boolean; leaving?: boolean; aftermath?: boolean }) {
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScene(task.stage, continuation, conflict, threat, exitResponse, checkout, leaving, aftermath)
  const departing = leaving || aftermath
  const moving = exitResponse || checkout || departing
  const current = conflict || threat || moving
  const prefix = aftermath ? '离堂后萧宁反应' : leaving ? '同行与实际离堂' : checkout ? '同卷管理者登记' : exitResponse ? '堂内移步与来年回应' : threat ? '成人礼威胁' : conflict ? '交锋与第二卷' : continuation ? '同卷归架' : '整衣靠近'
  const position = moving ? firstHallExitResponsePosition(!departing && task.yan === 'outside' ? { ...task, yan: 'entrance' } : task) : hallReadingPlaces.shelf
  const xunerPosition = departing ? task.xunerPos : 'east'
  const outside = departing && task.yan === 'outside'
  const first = continuation || current ? task.first : task.stage >= 13 ? 'rolled' : 'open'
  const [actor, setActor] = useState<FirstHallApproachAction['actor']>('yan')
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstHallApproachBlock(state, continuation, conflict, threat, exitResponse, checkout, leaving, aftermath)
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallApproach(gameStore, position, outside ? 'outside' : 'hall', { ...task,
      ...earlySnapshots(state, hallApproachSnapshotKeys), actor, operation, continuation, conflict, threat, exitResponse, checkout, leaving, aftermath })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
    event.preventDefault()
    if (scene && actor === scene.actor) act(scene.operation)
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>斗技堂 / {prefix}</Eyebrow><h2>{aftermath ? '堂内留下轻掌印，两人仍在堂外。' : leaving ? '持借卷同行跨门。' : checkout ? '向管理者登记本人所持的同一第二卷。' : exitResponse ? '持同一第二卷移步，回应来年的话。' : threat ? '来年的威胁，当前仍持同一第二卷。' : conflict ? '分清她的临时卷与本人第二卷。' : continuation ? '回应提议，把同一第一卷放回书架。' : '他走近东架，本人收起同一卷。'}</h2>
    <p id="hall-approach-help">选人物后按E记录本步。刷新关注本人，三人位置独立；{current ? '她放卷与本人另取分存。' : '收卷与归架分存。'}</p>
    {!moving && task.stage >= 41 && <p>明确回顾当时的东架位置，后段已存堂内移步记录保持。</p>}
    {!checkout && !departing && task.stage >= 47 && <p>明确回顾登记前的断点，后段同卷借阅记录保持。</p>}
    {!departing && task.stage >= 50 && <p>明确回顾同行跨门前的位置。</p>}
    {(t.firstHallAfternoon.stage > 0 || t.firstHallAfternoon.walk > 0) && <p>明确回顾当时堂内外位置；当前午后位置另存。</p>}
    <WalkControls>
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人读卷与察觉</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'ning'} onClick={() => setActor('ning')}>{aftermath ? '旁观萧宁离堂后反应' : exitResponse ? '旁观萧宁误解与脸色' : threat ? '旁观萧宁威胁与未动手' : conflict ? '旁观萧宁讥讽与提议' : continuation ? '旁观萧宁提议与说法' : '旁观萧宁整衣与行走'}</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'bystander'} onClick={() => setActor('bystander')}>旁观堂中人群</SecondaryButton>
      {(conflict || departing) && <SecondaryButton aria-pressed={actor === 'xuner'} onClick={() => setActor('xuner')}>{departing ? '薰儿同行' : '旁观薰儿放卷与回应'}</SecondaryButton>}
    </WalkControls>
    <EarlyMap ref={field} aria-label={`${prefix}地图`} aria-describedby="hall-approach-help"
      viewBox={departing ? '20 190 470 175' : moving ? '100 190 390 175' : '100 190 390 120'} onKeyDown={key}>
      <HallBackground height={moving ? 175 : 120} />
      {departing && <><path d="M115 275 v65" stroke="#bfa46a" /><HallText x="65" y="356">堂外</HallText></>}
      <HallWestField />
      <HallEastShelf />
      {aftermath && task.handprint && <path aria-label="萧宁留下的书架轻掌印" d="M438 224 v-10 m3 10 v-13 m3 13 v-11 m3 11 v-7 m-9 7 q4 5 9 0" fill="none" stroke="#32291e" strokeOpacity=".45" />}
      {aftermath && <HallText x="450" y="329" fontSize="9">堂内旁观</HallText>}
      <g aria-label="萧宁独立位置" transform={task.ning === 'east' ? 'translate(450 280)' : task.ning === 'aisle' ? 'translate(320 244)' : 'translate(235 244)'}>
        <circle r="7" fill={task.clothes ? '#ceae83' : '#bd8d6b'} />
        {[2, 4].includes(task.stage) && <path aria-label="萧宁握拳" d="M-11 0 h3 M8 0 h3" stroke="#dcc6ae" strokeWidth="4" />}
        <HallText y="21" fontSize="9">萧宁{task.clothes ? ' · 已整衣' : ''}</HallText>
      </g>
      <g aria-label={xunerPosition === 'east' ? '薰儿仍坐东架' : `薰儿实际位置 · ${xunerPosition}`} transform={xunerPosition === 'outside' ? 'translate(85 280)' : xunerPosition === 'entrance' ? 'translate(175 280)' : 'translate(380 250)'}><circle cy="5" r="7" fill="#ae8dbd" /><HallText y="-13" fontSize="9">薰儿</HallText></g>
      {current && task.ownPlaced ? <rect aria-label="薰儿自己的临时卷已放下" x="353" y="280" width="13" height="9" fill="#604572" stroke="#c2a679" /> : <XunerReadingScroll />}
      {moving && <HallText x="205" y="356">{outside ? '堂内入口' : '堂内入口 · 尚未跨门'}</HallText>}
      {checkout && <HallText x="280" y="310">管理者 · 同卷借阅</HallText>}
      <g aria-label={moving ? `萧炎本人实际位置 · ${!departing && task.yan === 'outside' ? 'entrance' : task.yan}` : '萧炎本人仍在东架'} transform={`translate(${position.x} ${position.y})`}><MarketWalker /><HallText y="26" fontSize="9">本人 · {current && task.stage >= 28 ? '持第二卷' : first === 'returned' ? '已归架' : first === 'rolled' ? '已收卷' : '读第一卷'}</HallText></g>
      {current && task.stage >= 28 && <rect aria-label="本人另取的同一第二卷" x={position.x + 20} y={position.y - 5} width="9" height="15" fill="#415849" stroke="#bfa46a" />}
      <rect aria-label={first === 'returned' ? '同一第一卷实际放回书架' : first === 'rolled' ? '同一第一卷已卷起尚未归架' : '同一第一卷仍展开'}
        x="420" y={first === 'returned' ? 215 : 245} width={first === 'open' ? 28 : 8} height="15" fill="#161e20" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>{prefix} {aftermath ? Math.min(task.stage, 57) - 53 : leaving ? Math.min(task.stage, 53) - 49 : checkout ? Math.min(task.stage, 49) - 46 : exitResponse ? Math.min(task.stage, 46) - 40 : threat ? Math.min(task.stage, 40) - 31 : conflict ? Math.min(task.stage, 31) - 19 : continuation ? Math.min(task.stage, 19) - 14 : Math.min(task.stage, 14)}/{aftermath || leaving ? 4 : checkout ? 3 : exitResponse ? 6 : threat ? 9 : conflict ? 12 : continuation ? 5 : 14} · {firstHallApproachSaveSummary(state, state.settings)}</StatusParagraph>
    <p>{departing ? task.exitRecord === 'recalled' ? '明确回顾当时离堂，更高保管保持。' : outside ? '两人已跨门，仍持同一借卷。' : '借卷已登记，尚未跨门。' : checkout && task.checkoutRecord !== 'none' ? task.checkoutRecord === 'recalled' ? '明确回顾当时管理者登记，当前更高保管保持。' : '同一第二卷实际登记借出，本人仍持卷尚未离堂。' : current ? (task.secondRecord === 'recalled' ? '明确回顾当时另取第二卷，现有更高保管保持。' : task.stage >= 28 ? '本人另取第二卷，未登记或离堂。' : '第一卷已归架，第二卷尚未取。') : task.stage >= 20 || t.firstHallReading.record === 'recalled' || task.returnRecord === 'recalled' || t.hall.stage >= 6 && first !== 'returned'
      ? '明确回顾当时第一卷，当前更高保管保持。' : first === 'returned' ? '同一第一卷已归架，第二卷尚未取。' : '本人仍持同一第一卷，尚未归架。'}{!current && (task.ownPlaced ? '回顾当时她仍持自己的临时卷，后段放卷记录保持。' : '薰儿仍持她自己的临时卷。')}旧卷账 {t.hall.stage}/9。</p>
    {current && <p>{task.ownPlaced ? '当前她自己的临时卷已经放下，旧会面拿卷历史保持。' : '她自己的临时卷仍在手中。'}切磋与未来威胁没有当前开战。</p>}
    {scene ? <BondSummary><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor === scene.actor ? '当前人物正确。' : '请切换到本步人物。'}</p>
      <PrimaryButton disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('return')}>把收卷当成第一卷已归架</SecondaryButton>
      <SecondaryButton onClick={() => act('second')}>{current ? '把她放下的卷交给本人' : '提前取本人第二卷'}</SecondaryButton>
    </BondSummary> : <BondSummary><h3>{prefix}已归档。</h3><p>{aftermath ? '萧宁反应已归档，整个午后另续。' : leaving ? '已离堂，午后与回房另续。' : checkout ? '同一第二卷借阅已归档。同行交谈与实际跨门另续。' : exitResponse ? '本人已到堂内入口，同一第二卷尚未登记；同行与实际离堂待续。' : threat ? '未来威胁已归档，当前未登记或离堂。' : conflict ? '本人第二卷与她的临时卷独立。未来威胁、实际离堂待续。' : continuation ? '第一卷已归架，后续交锋与第二卷待续。' : '萧宁已到东架前，第一卷仅卷起。提议与实际归架待续。'}</p></BondSummary>}
    <SecondaryButton onClick={onBack}>暂离{prefix} · 保留断点</SecondaryButton>
  </>
}
