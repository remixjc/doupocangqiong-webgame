import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallText, MapBackground } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstHallEntryBlock, hallEntryNear, hallEntryPlaces, moveHallEntryWalker, submitFirstHallEntry, type HallEntrySpace } from '../core/first-hall-entry'
import { firstHallEntryScenes } from '../content/first-hall-entry'
import { fieldsMatch } from '../core/state-guards'
import { earlySnapshots } from '../core/early-snapshots'
import { firstHallEntrySaveSummary } from '../core/save-preview'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import './early-walk.css'
export default function FirstHallEntry({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallEntry, scene = firstHallEntryScenes[task.stage]
  const [space, setSpace] = useState<HallEntrySpace>(task.entered ? 'hall' : 'outside')
  const [outside, setOutside] = useState({ ...(task.plaque ? hallEntryPlaces.door : task.turned ? hallEntryPlaces.turn : hallEntryPlaces.start) })
  const [inside, setInside] = useState({ ...hallEntryPlaces.entry })
  const [actor, setActor] = useState<'yan' | 'bystander'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const p = space === 'hall' ? inside : outside, near = hallEntryNear(p, space, task.stage), blocked = firstHallEntryBlock(state)
  const move = (direction: EarlyWalkDirection) => {
    if (!scene || actor !== 'yan' || document.hidden) return
    const next = moveHallEntryWalker(p, direction)
    if (space === 'hall') setInside(next); else setOutside(next)
  }
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    const committed = submitFirstHallEntry(gameStore, p, space, { ...task, ...earlySnapshots(state, ['Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']), actor, operation })
    if (committed && task.stage === 3) setSpace('hall')
  }
  const crossBack = () => {
    if (!scene || !task.entered || actor !== 'yan' || document.hidden || !fieldsMatch(p, space === 'hall' ? hallEntryPlaces.entry : hallEntryPlaces.door)) return
    setSpace(space === 'hall' ? 'outside' : 'hall'); field.current?.focus()
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && near && actor === 'yan') act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">族内后部 / 实际入堂</span><h2>走到堂门，再看见东西两区。</h2>
    <p id="hall-entry-help">方向或WASD由本人实际行走，近本步地点按E。门外与堂内位置分开，入堂后可在门口正常往返，往返不追加历史；刷新恢复本段断点。</p>
    <div className="early-walk-controls">
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人行走与观察</SecondaryButton>
      <SecondaryButton aria-pressed={actor === 'bystander'} onClick={() => setActor('bystander')}>只关注旁观声音</SecondaryButton>
    </div>
    <EarlyMap ref={field} aria-label="实际入堂地图" aria-describedby="hall-entry-help" viewBox="80 185 425 155" onKeyDown={key}>
      <MapBackground />
      {space === 'outside' ? <>
        <path d="M140 310 H240 V250 H340" stroke="#bfa46a" strokeWidth="18" opacity=".4" fill="none" />
        <rect x="317" y="202" width="46" height="35" fill="#59664a" />
        <HallText x="340" y="195">{task.plaque ? '斗技堂' : '前方房屋'}</HallText>
        <HallText x="240" y="278">转角</HallText>
      </> : <>
        <rect x="100" y="200" width="380" height="125" fill="#937954" opacity=".15" />
        <rect x="160" y="220" width="110" height="45" fill="none" stroke="#bfa46a" />
        <rect x="345" y="210" width="110" height="20" fill="#937954" />
        <HallText x="215" y="211">{task.layout ? '西侧训练场' : '场地'}</HallText>
        <HallText x="400" y="247">{task.layout ? '东侧书架' : '书架'}</HallText>
        <HallText x="140" y="289">堂内门口</HallText>
        {task.fieldLook && <g aria-label={task.girl ? '训练场中的薰儿与对手' : '训练场中两人'}><circle cx="200" cy="244" r="7" fill="#ae8dbd" /><circle cx="235" cy="244" r="7" fill="#bd8d6b" /></g>}
      </>}
      <g aria-label="萧炎本人行走位置" transform={`translate(${p.x} ${p.y})`}><MarketWalker /><HallText y="26">{space === 'hall' ? '本人 · 堂内' : '本人 · 门外'}</HallText></g>
    </EarlyMap>
    {scene && actor === 'yan' && <div className="early-walk-controls"><WalkDirectionButtons prefix="入堂" onMove={move} /></div>}
    {scene && task.entered && <SecondaryButton disabled={actor !== 'yan' || !fieldsMatch(p, space === 'hall' ? hallEntryPlaces.entry : hallEntryPlaces.door)} onClick={crossBack}>{space === 'hall' ? '从堂内返回门外' : '再从堂门进入堂内'} · 不追加历史</SecondaryButton>}
    <StatusParagraph>实际入堂 {task.stage}/9 · 当前{space === 'hall' ? '堂内' : '门外'} · {firstHallEntrySaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor !== 'yan' ? '旁观声音不能替本人入堂。' : !near ? '本人先实际走到本步门外或堂内地点。' : '当前人物：萧炎本人'}</p>
      <PrimaryButton disabled={!near || actor !== 'yan'} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('scroll')}>站在堂门代签取得卷轴</SecondaryButton>
      <SecondaryButton onClick={() => act('win')}>把欢呼算作本人胜利</SecondaryButton>
    </BondSummary> : <BondSummary><h3>实际入堂与东西分区已归档。</h3><p>本人已入堂并先看向训练场。东侧拿卷、阅读和西侧比赛由下一段继续，旧借卷保管保持。</p></BondSummary>}
    <SecondaryButton onClick={onBack}>暂离实际入堂 · 保留断点</SecondaryButton>
  </>
}
