import {useRef} from 'react'
import type {GameState} from '../core/model'
import type {EarlyWalkPosition} from '../core/early-walk'
import {gameStore} from '../core/store'
import {firstSaleAlleyBlock,submitFirstSaleAlley} from '../core/first-sale-alley'
import {saleAlleyRoutes} from '../core/first-sale-alley-state'
import {firstSaleAlleyScenes} from '../content/first-sale-alley'
import {earlySnapshots,saleAlleySnapshotKeys} from '../core/early-snapshots'
import {firstSaleAlleySaveSummary} from '../core/save-preview'
import {useSceneFocus} from './use-scene-focus'
import {EarlyMap,MapBackground,MapText} from './MapPrimitives'
import {returnButton,SecondaryButton} from './Buttons'
import {BondSummary,Eyebrow,RobeFigure,StatusParagraph,WalkControls} from './NativeRegions'
import {sceneHeading} from './SceneHeading'
import {walkKey} from './walk-key'
import HistoryBlocked from './HistoryBlocked'
import './early-walk.css'
export default function FirstSaleAlley({state,position,onBack,onAppraise}:{state:GameState;position:EarlyWalkPosition;onBack:()=>void;onAppraise?:()=>void}){
  const t=state.earlyTraining.firstSaleAlley,scene=firstSaleAlleyScenes[t.stage],field=useRef<SVGSVGElement>(null)
  useSceneFocus(field,true,[])
  const blocked=firstSaleAlleyBlock(state,position),walking=!!saleAlleyRoutes[t.stage]?.[t.walk]
  const act=(operation:string,actor:'yan'|'teacher'='yan')=>{
    if(!document.hidden)submitFirstSaleAlley(gameStore,position,t,t.location,{...t,...earlySnapshots(state,saleAlleySnapshotKeys),
      expectedConsignment:structuredClone(state.earlyTraining.consignment),actor,operation})
  }
  if(blocked)return <HistoryBlocked message={blocked} onBack={onBack}/>
  return <>
    <Eyebrow>首次寄售 / 隐巷完整流程</Eyebrow><h2>同批处理、同瓶藏稳，实际离巷赴拍。</h2>
    <p>本人用E操作；老师处理用专属按钮见证。巷口左左左下下，离巷前向上，赴拍右右右上上上。地图路线为原创。</p>
    {t.record==='recalled'&&<p>详细回顾；旧已交材料、已移交玉瓶及更高结算保持。</p>}
    <EarlyMap ref={field} aria-label="寄售隐巷与赴拍地图" viewBox="370 250 220 350" onKeyDown={event=>{
      if(event.repeat||event.shiftKey)return
      walkKey(event,direction=>{if(walking)act(`move-${direction}`)},()=>{if(scene&&!walking)act(scene.operation)})
    }}>
      <MapBackground fill="#172827"/>
      <path d="M540 410 H420 V550 M420 460 H540 V310" stroke="#8e8063" strokeWidth="12" fill="none"/>
      <path d="M380 480 H405 M435 480 H580" stroke="#5b6154" strokeWidth="7"/>
      <MapText x="570" y="450">瓶具处</MapText><MapText x="460" y="570">隐蔽巷</MapText>
      <rect x="514" y="275" width="52" height="22" fill="#665640"/><MapText x="465" y="288">拍卖门口</MapText>
      <g aria-label="隐巷本人独立位置" transform={`translate(${t.x} ${t.y})`}>
        <RobeFigure robe="#b9c0a4" skin="#edc79f"/><MapText y="-30">本人</MapText>
        <circle cx="13" cy="5" r="4" fill="none" stroke="#d7bf89"/>
        {t.bottled&&<rect aria-label={t.hidden?'同瓶藏稳历史':'同瓶封装历史'} x="-18" y="4" width="8" height="12" fill="#c5d5c7"/>}
      </g>
      {t.processing&&<MapText x="460" y="595">见证老师处理</MapText>}
      {t.color!=='unseen'&&<circle aria-label="斑驳绿色观察" cx="390" cy="570" r="8" fill="#697b3a" stroke="#344329"/>}
    </EarlyMap>
    <StatusParagraph>{firstSaleAlleySaveSummary(state,state.settings)}</StatusParagraph>
    {scene?<BondSummary>{sceneHeading(scene)}
      {walking?<WalkControls aria-label="隐巷与赴拍行走">
        {(['left','down','up','right'] as const).map(direction=><SecondaryButton key={direction} onClick={()=>act(`move-${direction}`)}>
          {{left:'隐巷向左走',down:'隐巷向下走',up:'隐巷向上走',right:'隐巷向右走'}[direction]}</SecondaryButton>)}
      </WalkControls>:<SecondaryButton onClick={()=>act(scene.operation,scene.actor)}>{scene.action}</SecondaryButton>}
    </BondSummary>:<BondSummary><h3>隐巷完整流程已归档。</h3><p>已实际抵达拍卖门口；同瓶与旧账保留，鉴定另续。</p></BondSummary>}
    {t.archived&&onAppraise&&<SecondaryButton onClick={onAppraise}>接续黑袍鉴定与首次拍卖</SecondaryButton>}
    {returnButton(onBack,'返回街巷采购 · 保留隐巷断点')}
  </>
}
