import { useRef, useState } from 'react'
import { gameStore } from '../core/store'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection } from '../core/early-walk'
import { qiExitScenes } from '../content/early-qi-exit'
import { earlyQiExitBlock, qiExitStart, qiExitPlaces, qiExitWalls, moveQiExitWalker, nearQiExitPlace, submitEarlyQiExit, type QiExitAction } from '../core/early-qi-exit'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, StatusParagraph, MutedParagraph, WalkControls, hallWalkerAt, robeFigureGroup } from './NativeRegions'
import { returnButton, sceneButton, SecondaryButton } from './Buttons'
import WalkDirectionButtons from './WalkDirectionButtons'
import { sceneHeading } from './SceneHeading'
import { useSceneFocus } from './use-scene-focus'
import { walkKey } from './walk-key'
import './early-walk.css'

export default function EarlyQiExit({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.qiPavilionExit, scene = qiExitScenes[task.stage], blocked = earlyQiExitBlock(state)
  const [position, setPosition] = useState(() => qiExitStart(task.stage)), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, !blocked, [blocked])
  const near = scene && nearQiExitPlace(position, scene.place, task.stage)
  const move = (direction: EarlyWalkDirection) => { if (!document.hidden) setPosition(p => moveQiExitWalker(p, direction, task.stage)) }
  function act(operation: QiExitAction['operation']) {
    if (!document.hidden && scene) submitEarlyQiExit(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <><p>{blocked}</p>{returnButton(onBack, '返回重修准备')}</>
  return <>
    <h2>登记各自的卷轴，再一起离阁。</h2>
    <p id="qi-exit-help">方向键或WASD行走，近当前地点按E或按钮。交卷、返还、等候与跨门分别保存；刷新保留步骤，从同侧路线起点继续。</p>
    <EarlyMap ref={field} aria-label="功法阁登记离阁地图" aria-describedby="qi-exit-help" viewBox="0 0 720 420"
      onKeyDown={event => walkKey(event, move, scene && near ? () => act(scene.operation) : undefined)}>
      <MapBackground fill="#304038" /><rect width="720" height="130" fill="#53634d" />
      <path d="M180 330 V230 H420 M360 230 V90 H500" fill="none" stroke="#827151" strokeWidth="30" />
      {qiExitWalls.map((wall, i) => <rect key={i} {...wall} fill="#9b8963" />)}
      <rect x="310" y="130" width="100" height="20" fill={task.stage >= 8 ? '#647553' : '#493e32'} />
      <MapText x="360" y="156" fontSize="10" fill="#f3dab1">{task.stage >= 8 ? '登记齐全 · 可沿门洞出阁' : '守卫候核 · 不能提前出阁'}</MapText>
      {Object.entries(qiExitPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="28" stroke={scene?.place === id ? '#f4d098' : '#8f9f83'} fill="none" strokeDasharray="4 5" /><MapText x={place.x} y={place.y + 43} fontSize="11" fill="#f0d6af">{place.label}</MapText></g>)}
      {robeFigureGroup({ transform: 'translate(340 190)', 'aria-hidden': true }, { robe: '#b4b5a3' })}
      {robeFigureGroup({ transform: task.exited ? 'translate(400 85)' : 'translate(460 230)', 'aria-hidden': true }, {})}
      {robeFigureGroup({ transform: 'translate(530 80)', 'aria-hidden': true }, { robe: '#a8aa88' })}
      {hallWalkerAt(position)}
    </EarlyMap>
    <WalkControls aria-label="登记离阁行走操作"><WalkDirectionButtons prefix="离阁" onMove={move} /></WalkControls>
    <StatusParagraph>离阁 {task.stage}/13 · 家族卷{task.family === 'elder' ? '登记人暂持' : '本人保管'} · 本人{task.registered ? '已登记' : '未登记'} · 薰儿{task.xuner === 'registered' ? '已登记返还' : task.xuner === 'elder' ? '登记中' : '自持卷'} · {task.exited ? '已出阁，仍在萧家' : '尚未出阁'}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="登记离阁当前步骤">{sceneHeading(scene)}{sceneButton(scene, undefined, act)}
      <SecondaryButton onClick={() => act('take-support')}>尝试领取支持卷</SecondaryButton>
      <SecondaryButton onClick={() => act('leave-clan')}>尝试带卷离开家族</SecondaryButton>
    </BondSummary> : <MutedParagraph>请走近{qiExitPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>登记离阁已归档。</h3><p>炼火焚归本人，薰儿自选卷登记后归她。不得损伤、不得带出家族、一年后交还的约定保留。父亲问答与药老心中保证已记下，继续修炼的条件仍待主线进展。</p></BondSummary>}
    <MutedParagraph>路线、坐标与步长为原创；薰儿登记后返还为保管补间。规则记为故事约定，不进行一年现实计时。</MutedParagraph>
    {returnButton(onBack, '返回重修准备 · 保留离阁断点')}
  </>
}
