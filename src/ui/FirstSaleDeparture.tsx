import { useRef } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstSaleDepartureBlock, submitFirstSaleDeparture } from '../core/first-sale-departure'
import { firstSaleDepartureScenes } from '../content/first-sale-departure'
import { earlySnapshots, saleDepartureSnapshotKeys } from '../core/early-snapshots'
import { firstSaleDepartureSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { returnButton, sceneButton, SecondaryButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, WalkControls } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import { walkKey } from './walk-key'
import HistoryBlocked from './HistoryBlocked'
import { lazyScene } from './scene-load'
import { deferredRoute } from './DeferredScene'
import { useSceneRoutes } from './use-scene-routes'
import './early-walk.css'
const FirstSalePurchase = lazyScene(() => import('./FirstSalePurchase'))
export default function FirstSaleDeparture({ state, position, onBack }: { state: GameState; position: EarlyWalkPosition; onBack: () => void }) {
  const routes = useSceneRoutes(1)
  const t = state.earlyTraining.firstSaleDeparture, scene = firstSaleDepartureScenes[t.stage], field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstSaleDepartureBlock(state, position), walking = t.stage === 3 && t.walk < 5
  const act = (operation: string) => {
    if (!document.hidden) submitFirstSaleDeparture(gameStore, position, t, t.location, { ...t,
      ...earlySnapshots(state, saleDepartureSnapshotKeys), expectedConsignment: structuredClone(state.earlyTraining.consignment), actor: 'yan', operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  if (routes.active[0]) return deferredRoute(FirstSalePurchase, "正在接续街巷同单采购……", state, routes.back(0), { position })
  return <>
    <Eyebrow>首次寄售 / 拿物与正常离房</Eyebrow><h2>拿齐已有物品，从房门走出去。</h2>
    <p>本人按E或按钮逐项操作。门前路线：右右下下下；地图与路步为原创补间。</p>
    {t.record === 'recalled' && <p>详细回顾；既有采购、寄售与结算保持。</p>}
    <EarlyMap ref={field} aria-label="首次寄售离房地图" viewBox="225 215 220 300" onKeyDown={event => {
      if (event.repeat || event.shiftKey) return
      walkKey(event, direction => { if (walking) act(`move-${direction}`) }, () => { if (scene && !walking) act(scene.operation) })
    }}>
      <MapBackground />
      <rect x="270" y="238" width="60" height="70" rx="4" fill="#997c55" />
      <MapText x="265" y="230">原床边</MapText>
      <path d="M300 270 H380 V460" stroke="#c4a670" strokeWidth="3" strokeDasharray="5 6" fill="none" />
      <path d="M230 435 H350 M410 435 H440" stroke="#8b775e" strokeWidth="7" />
      <path d={t.doorOpen ? 'M410 435 V397' : 'M350 435 H410'} stroke="#bd9c69" strokeWidth="5" />
      <MapText x="280" y="425">原房内</MapText><MapText x="280" y="485">门外</MapText>
      <g aria-label="拿物离房本人位置" transform={`translate(${t.x} ${t.y})`}>
        <RobeFigure robe="#b9c0a4" skin="#edc79f" />
        <MapText y="-30">{t.standing ? '本人' : '床边坐着'}</MapText>
        <circle aria-label="同一古戒" cx="13" cy="5" r="4" fill="none" stroke="#d7bf89" />
        {t.purseHeld && <rect aria-label="已有专款随身" x="-19" y="4" width="9" height="12" rx="3" fill="#ba9465" />}
      </g>
    </EarlyMap>
    <StatusParagraph>{firstSaleDepartureSaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      {walking ? <WalkControls aria-label="离房沿路操作">
        {(['right', 'down', 'left', 'up'] as const).map(direction =>
          <SecondaryButton key={direction} onClick={() => act(`move-${direction}`)}>
            {{ right:'离房向右走', down:'离房向下走', left:'离房向左走', up:'离房向上走' }[direction]}
          </SecondaryButton>)}
      </WalkControls> : sceneButton(scene, false, act)}
    </BondSummary> : <BondSummary><h3>拿物与正常离房已归档。</h3><p>离房历史已保存，到店与采购可由下方入口继续。</p></BondSummary>}
    {t.archived && <SecondaryButton ref={routes.entry(0)} onClick={() => routes.set(0,true)}>接续街巷同单采购</SecondaryButton>}
    {returnButton(onBack, '返回床边方案 · 保留离房断点')}
  </>
}
