import { useRef } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstSalePurchaseBlock, submitFirstSalePurchase } from '../core/first-sale-purchase'
import { salePurchaseRoutes, salePurchaseItem } from '../core/first-sale-purchase-state'
import { consignmentSupplies } from '../core/early-training-state'
import { firstSalePurchaseScenes } from '../content/first-sale-purchase'
import { earlySnapshots, salePurchaseSnapshotKeys } from '../core/early-snapshots'
import { firstSalePurchaseSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { returnButton, sceneButton, SecondaryButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, WalkControls } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import { walkKey } from './walk-key'
import HistoryBlocked from './HistoryBlocked'
import './early-walk.css'
export default function FirstSalePurchase({ state, position, onBack }: { state: GameState; position: EarlyWalkPosition; onBack: () => void }) {
  const t = state.earlyTraining.firstSalePurchase, scene = firstSalePurchaseScenes[t.stage], field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstSalePurchaseBlock(state, position), walking = !!salePurchaseRoutes[t.stage]?.[t.walk]
  const act = (operation: string, wrong = false) => {
    const item = salePurchaseItem(t.stage), selected = wrong ? item === 'woodCore' ? 'jadeBottle' : 'woodCore' : item
    if (!document.hidden) submitFirstSalePurchase(gameStore, position, t, t.location, { ...t,
      ...earlySnapshots(state, salePurchaseSnapshotKeys), expectedConsignment: structuredClone(state.earlyTraining.consignment),
      actor:'yan', operation, ...(selected ? { item:selected, price:consignmentSupplies[selected].price } : {}) })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>首次寄售 / 街巷同单采购</Eyebrow><h2>走到各处店位，购齐同一批低品材料。</h2>
    <p>本人按E或按钮操作；药铺左左上上、木核摊右右右右、瓶具摊右右下。路线与报价为原创。</p>
    {t.record === 'recalled' && <p>详细回顾；已有收据不重扣，更高寄售结果保持。</p>}
    <EarlyMap ref={field} aria-label="寄售采购街巷地图" viewBox="250 285 340 230" onKeyDown={event => {
      if (event.repeat || event.shiftKey) return
      walkKey(event, direction => { if (walking) act(`move-${direction}`) }, () => { if (scene && !walking) act(scene.operation) })
    }}>
      <MapBackground fill="#182d29" />
      <path d="M380 460 H300 V360 H540 V410" stroke="#8e8063" strokeWidth="20" fill="none" />
      {[{x:300,y:310,label:'药铺'},{x:460,y:310,label:'木核摊'},{x:540,y:450,label:'瓶具摊'}].map(shop =>
        <g key={shop.label}><rect x={shop.x-25} y={shop.y-18} width="50" height="34" fill="#665640" stroke="#c6aa79" />
          <MapText x={shop.x} y={shop.y+5}>{shop.label}</MapText></g>)}
      <MapText x="380" y="495">原房门外</MapText>
      <g aria-label="采购本人独立位置" transform={`translate(${t.x} ${t.y})`}>
        <RobeFigure robe="#b9c0a4" skin="#edc79f" /><MapText y="-30">本人</MapText>
        <circle cx="13" cy="5" r="4" fill="none" stroke="#d7bf89" />
        {t.held && <rect aria-label="同单物资保管记录" x="-19" y="4" width="9" height="12" rx="3" fill="#ba9465" />}
      </g>
    </EarlyMap>
    <StatusParagraph>{firstSalePurchaseSaveSummary(state,state.settings)} · 专款余额{state.earlyTraining.consignment.funds-state.earlyTraining.consignment.spent}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}
      {walking ? <WalkControls aria-label="采购街巷行走">
        {(['left','up','right','down'] as const).map(direction =>
          <SecondaryButton key={direction} onClick={() => act(`move-${direction}`)}>
            {{left:'采购向左走',up:'采购向上走',right:'采购向右走',down:'采购向下走'}[direction]}
          </SecondaryButton>)}
      </WalkControls> : <>{sceneButton(scene,false,act)}
        {salePurchaseItem(t.stage) && <SecondaryButton onClick={() => act(scene.operation,true)}>试选不符此单的物资</SecondaryButton>}</>}
    </BondSummary> : <BondSummary><h3>街巷同单采购已归档。</h3><p>两种幼株、廉价木核与白玉瓶凭据保存；隐巷交料与处理待续。</p></BondSummary>}
    {returnButton(onBack,'返回拿物离房 · 保留采购断点')}
  </>
}
