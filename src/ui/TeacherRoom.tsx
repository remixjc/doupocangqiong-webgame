import { sceneButton } from './Buttons'
import { actorButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground } from './MapPrimitives'
import { SecondaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { ironNear } from '../core/early-iron'
import { moveCityWalker } from '../core/early-city-pharmacy'
import MarketWalker from './MarketWalker'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import './early-walk.css'
export interface RoomScene { actor: 'yan' | 'teacher'; operation: string; title: string; text: string; action: string }
export default function TeacherRoom({ title, heading, help, mapLabel, prefix, stage, total, summary, scene, blocked, start, near, draw, errors = [], onAction, onBack, finished, back, movable = true, controls }: {
  title: string; heading: string; help: string; mapLabel: string; prefix: string; stage: number; total: number; summary: string
  scene?: RoomScene; blocked: string; start: EarlyWalkPosition; near: (yan: EarlyWalkPosition) => boolean
  draw: (yan: EarlyWalkPosition) => ReactNode; errors?: { operation: string; label: string }[]
  onAction: (yan: EarlyWalkPosition, actor: RoomScene['actor'], operation: string) => void
  onBack: () => void; finished: string; back: string
  movable?: boolean; controls?: ReactNode
}) {
  const [yan, setYan] = useState({ ...start }), [actor, setActor] = useState<RoomScene['actor']>('yan')
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const close = near(yan), selected = !!scene && actor === scene.actor
  const move = (direction: EarlyWalkDirection) => {
    if (scene && movable && actor === 'yan' && !document.hidden) {
      const next = moveCityWalker(yan, direction)
      if (ironNear(next, 0)) setYan(next)
    }
  }
  const act = (operation: string) => {
    if (scene && !document.hidden) onAction(yan, actor, operation)
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!document.hidden) walkKey(event, move, () => { if (scene && selected && close) act(scene.operation) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>{title}</Eyebrow><h2>{heading}</h2>
    <p id="teacher-room-help">{help}</p>
    <WalkControls>
      {actorButton(actor, setActor, 'yan', "本人行走与操作")}
      {actorButton(actor, setActor, 'teacher', "旁观房中的老师")}
    </WalkControls>
    <EarlyMap ref={field} aria-label={mapLabel} aria-describedby="teacher-room-help" viewBox="80 290 245 125" onKeyDown={key}>
      <MapBackground /><rect x="95" y="325" width="220" height="82" fill="#937954" opacity=".3" />
      <g aria-label="老师固定房中位置" transform="translate(220 370)"><MarketWalker /><text y="-52" textAnchor="middle" fill="#eed7ad">老师</text></g>
      <rect x="250" y="346" width="35" height="15" fill="#937954" /><text x="250" y="338" fill="#eed7ad">桌面</text>
      <g aria-label="萧炎本人行走位置" transform={`translate(${yan.x} ${yan.y})`}><MarketWalker /><text y="26" textAnchor="middle" fill="#eed7ad">本人</text></g>
      {draw(yan)}
    </EarlyMap>
    {scene && movable && actor === 'yan' && <WalkControls><WalkDirectionButtons prefix={prefix} onMove={move} /></WalkControls>}
    <StatusParagraph>{prefix} {stage}/{total} · {summary}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      <p>{!selected ? '先明确选择本步人物。' : !close ? '先切回本人，走近当前交接地点。' : `当前人物：${actor === 'yan' ? '萧炎本人' : '房中的老师'}`}</p>
      {controls}
      {sceneButton(scene, !close || !selected, act)}
      {errors.map(error => <SecondaryButton key={error.operation} onClick={() => act(error.operation)}>{error.label}</SecondaryButton>)}
    </BondSummary> : <BondSummary><h3>{prefix}已归档。</h3><p>{finished}</p></BondSummary>}
    <SecondaryButton onClick={onBack}>{back} · 保留断点</SecondaryButton>
  </>
}
