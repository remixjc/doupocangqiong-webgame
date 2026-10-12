import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import WalkDirectionButtons from './WalkDirectionButtons'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { earlyHallBlock, earlyHallStart, earlyHallPlaces, earlyHallObstacles, moveEarlyHall, nearbyEarlyHallPlace, submitEarlyHall } from '../core/early-hall'
import { earlyHallScenes } from '../content/early-hall'
import { gameStore } from '../core/store'
import type { EarlyWalkDirection } from '../core/early-walk'
import './early-walk.css'

export default function EarlyHall({ state, onBack, onTeach }: { state: GameState; onBack: () => void; onTeach?: () => void }) {
  const [position, setPosition] = useState({ ...earlyHallStart })
  const [reading, setReading] = useState<string>()
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyHallBlock(state)
  const place = nearbyEarlyHallPlace(position)
  const task = state.earlyTraining.hall
  const scene = earlyHallScenes.find(scene => scene.stage === task.stage)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => {
    setReading(undefined); setPosition(current => moveEarlyHall(current, direction))
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const input = event.key.length === 1 ? event.key.toLowerCase() : event.key
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right' } as Record<string, EarlyWalkDirection>)[input]
    if (direction) { event.preventDefault(); move(direction) }
    if (input === 'e') { event.preventDefault(); if (place) setReading(place.id) }
  }
  if (blocked || state.earlyTraining.hall.stage === 0) return <p>{blocked || '先从药老处接续前往斗技堂。'}</p>
  return <>
    <Eyebrow>重修往事 / 斗技堂到访</Eyebrow>
    <h2>东侧藏卷，西侧习武。</h2>
    <MutedParagraph id="early-hall-help">方向键或WASD行走，靠近路标按E查看；也可使用下方按钮。堂内位置在退出或刷新后回堂口，到访记录保留。</MutedParagraph>
    <EarlyMap ref={field} aria-label="斗技堂地图"
      aria-describedby="early-hall-help" viewBox="0 0 720 420" onKeyDown={key}>
      <title>斗技堂东西两区原创布局</title>
      <MapBackground fill="#202d2c" />
      <rect x="24" y="24" width="672" height="372" rx="5" fill="#394139" stroke="#b59864" strokeWidth="3" />
      <path d="M360 45 V260 M300 390 H420" stroke="#c8b082" strokeWidth="3" strokeDasharray="9 9" />
      <rect x="115" y="70" width="185" height="200" fill="#78674b" stroke="#c2ac7d" />
      <circle cx="207" cy="167" r="60" fill="none" stroke="#c3b086" strokeDasharray="5 8" />
      {earlyHallObstacles.map((rect, index) => <g key={rect.x}>
        <rect {...rect} rx="3" fill="#5a4937" stroke="#c3a16d" />
        {index === 0 && Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${446 + i * 21} 52 v30`} stroke={i % 2 ? '#b8c3a0' : '#d0ad75'} strokeWidth="10" />)}
      </g>)}
      <rect x="320" y="285" width="80" height="15" fill="#79613e" stroke="#dac28f" />
      <MapText x="550" y="185" fill="#dec99f" fontSize="17">藏 卷 区</MapText>
      <MapText x="180" y="240" fill="#dec99f" fontSize="17">练 习 区</MapText>
      {task.stage >= 2 && task.stage <= 4 && <g role="img" aria-label={task.stage >= 4 ? '薰儿胜出，萧宁退至练习区外' : '薰儿与萧宁切磋，萧炎在旁观察'}>
        <g transform={`translate(${task.stage === 3 ? 155 : 180} 145)`}><path d="M-10 14 L-6-2 H6 L11 14Z" fill="#bfb3db" /><circle cy="-9" r="7" fill="#edc79f" /><MapText y="35">薰儿</MapText></g>
        <g transform={`translate(${task.stage >= 4 ? 325 : 245} 145)`}><path d="M-10 14 L-6-2 H6 L11 14Z" fill="#7190a3" /><circle cy="-9" r="7" fill="#edc79f" /><MapText y="35">萧宁</MapText></g>
        {task.stage === 3 && <path d="M218 145 L177 145" stroke="#e3c890" strokeWidth="3" strokeDasharray="4 4" />}
      </g>}
      {task.stage >= 5 && task.stage <= 7 && <g role="img" aria-label="薰儿与萧宁在藏卷处交涉">
        <circle cx="585" cy="163" r="8" fill="#bfb3db" /><MapText x="585" y="189" fill="#ead8ef">薰儿</MapText>
        <circle cx="475" cy="180" r="8" fill="#7190a3" /><MapText x="475" y="203" fill="#dce8ec">萧宁</MapText>
      </g>}
      {earlyHallPlaces.map(item => <g key={item.id}>
        <circle cx={item.x} cy={item.y} r="27" fill={place?.id === item.id ? '#f0c57940' : '#f0c57912'} stroke="#dfc18a" />
        <MapText x={item.x} y={item.y - 35} fontSize="13">{item.label}</MapText>
      </g>)}
      <g aria-hidden="true" data-player-x={position.x} data-player-y={position.y} transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="14" rx="13" ry="5" fill="#0005" /><path d="M-10 12 L-6-2 H6 L11 12Z" fill="#d3a567" />
        <circle cy="-8" r="7" fill="#edc79f" /><path d="M-7-11 Q0-20 7-10" fill="#26322f" />
      </g>
      <MapText x="360" y="406" fill="#dbc59e">堂口 · 原创比例与陈设</MapText>
    </EarlyMap>
    <StatusParagraph className="early-walk-status">{place ? `附近：${place.label}` : '沿两区行走，靠近金色路标查看。'}</StatusParagraph>
    <WalkControls aria-label="斗技堂行走操作">
      <WalkDirectionButtons prefix="堂内" onMove={move} />
      <PrimaryButton disabled={!place} onClick={() => place && setReading(place.id)}>查看堂内地点</PrimaryButton>
    </WalkControls>
    <StatusParagraph>堂内记录 {Math.max(0, task.stage - 1)}/8 · {task.scroll === 'borrowed-second' ? '第二卷已登记，由萧炎保管'
      : task.scroll === 'selected-second' ? '第二卷已选好，尚由堂内保管' : task.scroll === 'reading-first' ? '第一卷在堂内阅读，尚未借出' : '尚无卷册借出'}</StatusParagraph>
    {scene && <MutedParagraph>下一步：{earlyHallPlaces.find(place => place.id === scene.place)?.label} · {scene.title}</MutedParagraph>}
    {reading && place?.id === reading && <BondSummary aria-label="斗技堂地点说明">
      <h3>{place.label}</h3><p>{place.text}</p>
      {scene?.place === place.id && <><SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
        <PrimaryButton onClick={() => submitEarlyHall(gameStore, position, { step: scene.stage, operation: scene.operation })}>{scene.action}</PrimaryButton></>}
    </BondSummary>}
    {task.stage === 9 && <BondSummary><h3>离堂与回房已记录</h3><p>借卷由萧炎保管。药老的正式传授在回房后独立记录，不由本次借阅代签。</p>
      {onTeach && <PrimaryButton onClick={onTeach}>接续回房 · 请药老正式传技</PrimaryButton>}</BondSummary>}
    <MutedParagraph>动作、分段图形和对白为原创压缩改编。查看不推进记录；确认当前步骤才保存，不改变主线战斗技能、金币或境界。</MutedParagraph>
    <SecondaryButton onClick={onBack}>{task.stage === 9 ? '离开斗技堂 · 回准备路线' : '暂回准备路线 · 保留堂内断点'}</SecondaryButton>
  </>
}
