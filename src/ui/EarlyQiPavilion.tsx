import { RobeFigure } from './NativeRegions'
import { HallWalker } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition, EarlyWalkDirection } from '../core/early-walk'
import { qiPavilionPlaces, qiPavilionWalls, qiPavilionGate, moveQiPavilionWalker, nearQiPavilionPlace, earlyQiPavilionBlock, submitEarlyQiPavilionEntry, type QiPavilionEntryAction } from '../core/early-qi-pavilion'
import { qiPavilionEntryScenes } from '../content/early-qi-pavilion'
import { gameStore } from '../core/store'
import './early-walk.css'

export default function EarlyQiPavilion({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.qiPavilionEntry, scene = qiPavilionEntryScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...qiPavilionPlaces.forecourt })
  const field = useRef<SVGSVGElement>(null), blocked = earlyQiPavilionBlock(state)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => { if (!document.hidden) setPosition(current => moveQiPavilionWalker(current, direction, task.stage)) }
  function act(operation: QiPavilionEntryAction['operation']) {
    if (document.hidden || !scene) return
    submitEarlyQiPavilionEntry(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene ? () => act(scene.operation) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>五天之后 / 功法阁入阁</Eyebrow><h2>先认属性，再过阁门。</h2>
    <p id="qi-pavilion-help">方向键或WASD行走，靠近当前地点按E或按钮。门开、许可与跨门分别记录；关闭或刷新保留步骤，重入从阁前出发。</p>
    <EarlyMap ref={field} aria-label="功法阁属性测定地图" aria-describedby="qi-pavilion-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#34463b" /><rect width="720" height="170" fill="#273834" />
      <path d="M180 350 H360 V100 M360 310 L500 290" fill="none" stroke="#85856f" strokeWidth="24" strokeLinejoin="round" />
      {qiPavilionWalls.map((rect, i) => <rect key={i} {...rect} fill="#9c8861" />)}
      <rect {...qiPavilionGate} fill={task.door === 'open' ? '#425448' : '#483b2c'} stroke="#dec18d" />
      {task.stage < 9 && <MapText x="360" y="183" fill="#ead9b6" fontSize="10">{task.door === 'open' ? '门已开 · 候测与听讲' : '大门未开'}</MapText>}
      <MapText x="360" y="60" fill="#dec18d" fontSize="18">功法阁 · 入阁后择卷待续</MapText>
      <g transform="translate(500 290)" role="img" aria-label={`水晶球${task.crystal === 'broken' ? '已碎，无玩家拾取' : task.crystal === 'cracked' ? '出现细裂，尚未碎' : '仍完整'}`}>
        <rect x="-10" y="3" width="20" height="20" fill="#a1a38a" />
        {task.crystal !== 'broken' ? <><circle cy="-9" r="15" fill={task.xuner === 'fire' ? '#e5a87d' : task.yan === 'fire' ? '#d38a6a' : task.other === 'wind' ? '#7ea48b' : '#bacac7'} stroke="#e6e2c2" />
          {task.crystal === 'cracked' && <path d="M-8-20 L-2-11 L-7-4 M6-20 L3-12 L9-3" fill="none" stroke="#584333" strokeWidth="2" />}</>
          : <path d="M-15-4 L-4-9 L-8 0Z M1-11 L13-4 L3 0Z" fill="#c8b69e" />}
      </g>
      <g transform="translate(385 310)" aria-hidden="true"><RobeFigure robe="#b6bba8" /></g>
      <g transform={`translate(${task.entered ? 395 : 465} ${task.entered ? 105 : 325})`} aria-hidden="true"><RobeFigure /></g>
      {Object.entries(qiPavilionPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="37" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><MapText x={place.x} y={place.y + 47} fill="#ead9b6" fontSize="11">{place.label}</MapText></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><HallWalker /></g>
    </EarlyMap>
    <WalkControls aria-label="功法阁行走操作">{<WalkDirectionButtons prefix="功法阁" onMove={move} />}</WalkControls>
    <StatusParagraph>入阁 {task.stage}/12 · 萧炎{task.yan === 'fire' ? '火属性' : '未测'} · 薰儿{task.xuner === 'fire' ? '火属性' : '未测'} · 水晶{task.crystal === 'broken' ? '已碎' : task.crystal === 'cracked' ? '有裂纹尚未碎' : '完整'} · {task.entered ? '已实际入阁' : task.permission ? '有许可尚未过门' : '尚未许可入阁'} · 尚无新卷轴</StatusParagraph>
    {scene ? nearQiPavilionPlace(position, scene.place, task.stage) ? <BondSummary aria-label="功法阁入阁步骤"><SceneHeading title={scene.title} text={scene.text} />
      <PrimaryButton onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage >= 5 && <SecondaryButton onClick={() => act('take-scroll')}>尝试取卷 · 尚未择卷</SecondaryButton>}
      {task.crystal !== 'intact' && <SecondaryButton onClick={() => act('take-crystal')}>尝试拾水晶 · 无玩家物品</SecondaryButton>}
    </BondSummary> : <MutedParagraph>下一步请走近{qiPavilionPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>测定与入阁已归档。</h3><p>火通道第三路四十三号房线索保留。门障、取得功法、回应薰儿与出阁登记还待接续；此前斗技堂借卷与主线技能分别保持。</p></BondSummary>}
    <MutedParagraph>布局与步长为原创，五天与两小时为故事时段；本段不发金币、功法、技能或境界。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离功法阁 · 保留入阁断点</SecondaryButton>
  </>
}
