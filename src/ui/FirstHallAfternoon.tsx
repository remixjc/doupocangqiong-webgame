import { sceneButton } from './Buttons'
import { actorButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallAfternoonSnapshotKeys, earlySnapshots } from '../core/early-snapshots'
import { firstHallAfternoonBlock, submitFirstHallAfternoon, type FirstHallAfternoonAction } from '../core/first-hall-afternoon'
import { afternoonRoute, firstHallAfternoonAt } from '../core/first-hall-afternoon-state'
import { firstHallAfternoonScenes } from '../content/first-hall-afternoon'
import { firstHallAfternoonSaveSummary } from '../core/save-preview'
import { walkKey } from './walk-key'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { BondSummary, Eyebrow, StatusParagraph, WalkControls } from './NativeRegions'
import { SecondaryButton } from './Buttons'
import WalkDirectionButtons from './WalkDirectionButtons'
import MarketWalker from './MarketWalker'
import HistoryBlocked from './HistoryBlocked'
import { sceneHeading } from './SceneHeading'
import './early-walk.css'
export default function FirstHallAfternoon({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallAfternoon, route = afternoonRoute(task.stage), scene = firstHallAfternoonScenes[task.stage]
  const [actor, setActor] = useState<FirstHallAfternoonAction['actor']>('yan')
  const field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstHallAfternoonBlock(state)
  const moving = route && task.walk < route.length
  const act = (operation: string) => {
    if (document.hidden) return
    submitFirstHallAfternoon(gameStore, { x: task.x, y: task.y }, task.location, { ...task, actor, operation,
      ...earlySnapshots(state, hallAfternoonSnapshotKeys) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  const points = [firstHallAfternoonAt(0), ...[0, 2, 4].flatMap(stage => Array.from({ length: 6 }, (_, i) => firstHallAfternoonAt(stage, i + 1)))]
  return <>
    <Eyebrow>离堂之后 / 整个午后</Eyebrow><h2>同行山路，直到天黑。</h2>
    <p>方向键/WASD走路并保存，E记时段。原创路线与游戏时段。</p>
    {(state.earlyTraining.firstHallEvening.stage > 0 || state.earlyTraining.firstHallEvening.walk > 0) && <p>此图回顾当时山上位置，夜间实际位置另存。</p>}
    <p>{task.record === 'recalled' ? '历史回顾，更高保管保持。' : '本人持同一第二借卷。'}第一卷归架、她的卷留堂。回房另续。</p>
    <WalkControls>{actorButton(actor, setActor, 'yan', "本人行走与记录")}
      {actorButton(actor, setActor, 'xuner', "薰儿同行")}
      <WalkDirectionButtons prefix="午后本人" onMove={direction => act(`move-${direction}`)} />
    </WalkControls>
    <EarlyMap ref={field} aria-label="整个午后同行地图" viewBox="0 0 480 380" onKeyDown={event => {
      if (!event.repeat) walkKey(event, direction => act(`move-${direction}`), () => { if (!moving && scene) act(scene.operation) })
    }}>
      <MapBackground width="480" height="380" fill={task.period === 'dark' ? '#111e27' : task.period === 'twilight' ? '#453d3d' : '#293e36'} />
      <path d="M40 350 L100 180 L140 250 L200 30 L270 110 L320 30 L450 350Z" fill="#192e2b" />
      <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#bfa46a" strokeDasharray="5 4" />
      <MapText x="60" y="355">堂外</MapText><MapText x="350" y="300">附近山路</MapText>
      <g aria-label="午后薰儿位置" transform={`translate(${task.xunerX} ${task.xunerY})`}><circle r="7" fill="#ae8dbd" /><MapText y="-15">薰儿</MapText></g>
      <g aria-label="午后本人位置" transform={`translate(${task.x} ${task.y})`}><MarketWalker /><MapText y="28">本人</MapText></g>
      <rect aria-label="午后同一第二借卷" x={task.x + 20} y={task.y - 5} width="9" height="15" fill="#415849" stroke="#bfa46a" />
    </EarlyMap>
    <StatusParagraph>午后 {task.stage}/10 · 本段行走 {task.walk}/{route ? 6 : 0} · {firstHallAfternoonSaveSummary(state, state.settings)}</StatusParagraph>
    {moving ? <BondSummary><h3>沿山路同行</h3><p>下一步向{({ up: '上', down: '下', left: '左', right: '右' })[route[task.walk]]}走。</p></BondSummary>
      : scene ? <BondSummary>{sceneHeading(scene)}{sceneButton(scene, actor !== 'yan', act)}</BondSummary>
        : <BondSummary><h3>整个午后已归档</h3><p>三段同行与夜色保持，仍在山上。</p></BondSummary>}
    <SecondaryButton onClick={onBack}>暂离整个午后 · 保留断点</SecondaryButton>
  </>
}
