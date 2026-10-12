import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { HallText, MapBackground } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstRoadMeetingBlock, moveRoadMeetingWalker, roadMeetingNear, roadMeetingPlaces, submitFirstRoadMeeting } from '../core/first-road-meeting'
import { firstRoadMeetingScenes } from '../content/first-road-meeting'
import { earlySnapshots } from '../core/early-snapshots'
import { firstRoadMeetingSaveSummary } from '../core/save-preview'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import './early-walk.css'
export default function FirstRoadMeeting({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstRoadMeeting, scene = firstRoadMeetingScenes[task.stage]
  const [p, setP] = useState({ ...(task.resumed ? roadMeetingPlaces.end : task.passed ? roadMeetingPlaces.pass : task.turned ? roadMeetingPlaces.turn : roadMeetingPlaces.start) })
  const [actor, setActor] = useState<'yan' | 'mei'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const near = roadMeetingNear(p, task.stage), blocked = firstRoadMeetingBlock(state), talking = task.stage >= 6 && task.stage <= 8
  const move = (direction: EarlyWalkDirection) => {
    if (!scene || actor !== 'yan' || document.hidden || talking) return
    setP(moveRoadMeetingWalker(p, direction))
  }
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstRoadMeeting(gameStore, p, { ...task, ...earlySnapshots(state, ['Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']), actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && near && actor === scene.actor) act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">石路 / 路口会面</span><h2>转路、招呼，再各自前行。</h2>
    <p id="road-meeting-help">方向或WASD由本人实际行走，近本步地点按E。关注来人发言不移动本人，停步问答期间先完成当前对话。刷新恢复断点。</p>
    <div className="early-walk-controls">
      <SecondaryButton aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人行走与答话</SecondaryButton>
      {task.identified && <SecondaryButton aria-pressed={actor === 'mei'} onClick={() => setActor('mei')}>关注萧媚发言</SecondaryButton>}
    </div>
    <EarlyMap ref={field} aria-label="石路会面地图" aria-describedby="road-meeting-help" viewBox="80 185 425 155" onKeyDown={key}>
      <MapBackground />
      <path d="M140 310 H240 V250 H440 M300 250 V210" stroke="#bfa46a" strokeWidth="18" opacity=".4" fill="none" />
      <HallText x="140" y="295">石路起点</HallText>
      <HallText x="240" y="278">转路口</HallText>
      <HallText x="440" y="278">继续前行</HallText>
      {task.group && <g aria-label={task.identified ? '萧媚与同伴' : '尚未辨认的少女们'} transform={`translate(300 ${task.parted ? 210 : 230})`}>
        <circle r="7" fill="#eed7ad" /><path d="M-6 9 L-10 27 H10 L6 9Z" fill="#b77f9c" />
        <circle cx="-18" r="5" fill="#d8c6a7" /><circle cx="18" r="5" fill="#d8c6a7" />
        <HallText y="-13">{task.identified ? '萧媚与同伴' : '几名少女'}</HallText>
      </g>}
      <g aria-label="萧炎本人行走位置" transform={`translate(${p.x} ${p.y})`}><MarketWalker /><HallText y="26">本人</HallText></g>
    </EarlyMap>
    {scene && actor === 'yan' && !talking && <div className="early-walk-controls"><WalkDirectionButtons prefix="会面" onMove={move} /></div>}
    <StatusParagraph>路口会面 {task.stage}/12 · {firstRoadMeetingSaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={scene.text} />
      <p>{!near ? '本人先实际走到本步位置。' : actor !== scene.actor ? '请选择当前发言人物。' : actor === 'mei' ? '当前关注：萧媚发言，本人位置保持。' : '当前人物：萧炎本人'}</p>
      <PrimaryButton disabled={!near || actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      <SecondaryButton onClick={() => act('fight')}>把招呼算作本人战斗胜利</SecondaryButton>
      <SecondaryButton onClick={() => act('hall')}>在路口直接签入堂借卷</SecondaryButton>
    </BondSummary> : <BondSummary><h3>路口会面与分路已归档。</h3><p>双方各自前行。实际入堂、东西区与卷轴由下一段接续，旧关系和奖励保持。</p></BondSummary>}
    <SecondaryButton onClick={onBack}>暂离路口会面 · 保留断点</SecondaryButton>
  </>
}
