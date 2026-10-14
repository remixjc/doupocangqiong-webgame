import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstSalePlanBlock, submitFirstSalePlan } from '../core/first-sale-plan'
import { firstSalePlanScenes } from '../content/first-sale-plan'
import { earlySnapshots, salePlanSnapshotKeys } from '../core/early-snapshots'
import { firstSalePlanSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { actorButton, returnButton, sceneButton, SecondaryButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, WalkControls } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import { walkKey } from './walk-key'
import HistoryBlocked from './HistoryBlocked'
import { lazyScene } from './scene-load'
import { deferredRoute } from './DeferredScene'
import { useSceneRoutes } from './use-scene-routes'
import './early-walk.css'
const FirstSaleDeparture = lazyScene(() => import('./FirstSaleDeparture'))
export default function FirstSalePlan({ state, position, onBack }: { state: GameState; position: EarlyWalkPosition; onBack: () => void }) {
  const routes = useSceneRoutes(1)
  const t = state.earlyTraining.firstSalePlan, scene = firstSalePlanScenes[t.stage]
  const [actor, setActor] = useState<'yan' | 'teacher'>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstSalePlanBlock(state, position), walking = t.stage === 1 && t.walk < 5
  const act = (operation: string) => {
    if (document.hidden) return
    submitFirstSalePlan(gameStore, position, t, t.location, { ...t, ...earlySnapshots(state, salePlanSnapshotKeys),
      expectedConsignment: structuredClone(state.earlyTraining.consignment), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  if (routes.active[0]) return deferredRoute(FirstSaleDeparture, "正在接续拿物与正常离房……", state, routes.back(0), { position })
  return <>
    <Eyebrow>原房 / 床边寄售方案</Eyebrow><h2>走到床边，把售药的想法说清。</h2>
    <p>选对人物后E或按钮继续；路步依次右右右上上。900故事余额与90专款分账。</p>
    {t.record === 'recalled' && <p>详细回顾；旧寄售与奖励保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', '床边本人操作')}{actorButton(actor, setActor, 'teacher', '古戒老师答复')}</WalkControls>
    <EarlyMap ref={field} aria-label="床边方案原房地图" viewBox="70 220 290 215" onKeyDown={event => {
      if (event.repeat || event.shiftKey) return
      walkKey(event, direction => { if (walking && actor === 'yan') act(`move-${direction}`) },
        () => { if (scene && !walking) act(scene.operation) })
    }}>
      <MapBackground />
      <g aria-label="原有床铺"><rect x="265" y="238" width="65" height="75" rx="4" fill="#997c55" />
        <MapText x="220" y="250">原床边</MapText></g>
      <g aria-label="床边本人独立位置" transform={`translate(${t.x} ${t.y})`}>
        <RobeFigure robe="#b9c0a4" skin="#edc79f" /><MapText y="-30">{t.seated ? '本人已坐下' : '本人沿路走'}</MapText>
        <g aria-label="同一古戒中的老师声音"><circle cx="13" cy="5" r="4" fill="none" stroke="#d7bf89" /></g>
      </g>
      <g aria-label="耗尽的原自用容器" transform="translate(120 390)">
        <path d="M-30-5L-25 30Q0 40 25 30L30-5" fill="#806747" stroke="#c6aa79" /><ellipse rx="30" ry="9" fill="#9badb0" />
      </g>
      <MapText x="120" y="428">同液已耗尽</MapText>
    </EarlyMap>
    <StatusParagraph>{firstSalePlanSaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      {walking ? <WalkControls aria-label="床边沿路操作">
        {(['right', 'up', 'left', 'down'] as const).map(direction =>
          <SecondaryButton key={direction} disabled={actor !== 'yan'} onClick={() => act(`move-${direction}`)}>
            {{ right:'床边向右走', up:'床边向上走', left:'床边向左走', down:'床边向下走' }[direction]}
          </SecondaryButton>)}
      </WalkControls> : sceneButton(scene, actor !== scene.actor, act)}
    </BondSummary> : <BondSummary><h3>床边方案全过程已归档。</h3><p>{state.earlyTraining.firstSaleDeparture.stage
      ? '床边全过程已保存；拿物与离房断点可由下方入口继续。'
      : '已接续90专款；本人仍在床边，离房采购与制造待续。'}</p></BondSummary>}
    {t.archived && <SecondaryButton ref={routes.entry(0)} onClick={() => routes.set(0, true)}>接续拿物与正常离房</SecondaryButton>}
    {returnButton(onBack, '暂离床边方案 · 保留断点')}
  </>
}
