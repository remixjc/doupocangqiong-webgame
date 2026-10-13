import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyConsignmentBlock, submitEarlyConsignment, type ConsignmentStation } from '../core/early-consignment'
import { consignmentSupplies, type ConsignmentSupplyId } from '../core/early-training-state'
import { gameStore } from '../core/store'
import { appraisalOwnerLabels } from '../content/early-appraisal'
import './early-walk.css'

const stations = { plan: '方案桌', pharmacy: '采购柜', alley: '隐蔽巷' } as const
export default function EarlyConsignment({ state, position, onBack, onAppraise }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onAppraise?: () => void }) {
  const task = state.earlyTraining.consignment
  const [station, setStation] = useState<ConsignmentStation>('plan')
  const heading = useRef<HTMLHeadingElement>(null)
  const blocked = earlyConsignmentBlock(state, position)
  useSceneFocus(heading, !blocked, [blocked])
  if (blocked) return <p>{blocked}</p>
  const expectedStation = task.stage === 0 ? 'plan' : task.stage === 1 ? 'pharmacy' : 'alley'
  function act(operation: 'plan' | 'deliver' | 'refine' | 'bottle') {
    submitEarlyConsignment(gameStore, position, station, { stage: task.stage, spent: task.spent, operation })
  }
  return <>
    <Eyebrow>乌坦城 / 首次寄售准备</Eyebrow>
    <h2 ref={heading} tabIndex={-1}>另备一份药液，筹下一程的材料。</h2>
    <p>自用容器中的药力已经耗尽。萧炎提出用较低品质材料另制待售品，药老同意；采购后在隐蔽巷中交由老师调制，再用白玉瓶装好。</p>
    <svg className="early-walk-map" viewBox="0 0 720 290" role="img" aria-label={`首次寄售准备：${task.product === 'sealed' ? `一个寄售玉瓶由${appraisalOwnerLabels[task.owner]}保管` : task.product === 'mixture' ? '老师已调制斑杂绿色药液，待装瓶' : '较低品质材料的独立准备路线'}。`}>
      <rect width="720" height="290" fill="#293d34" />
      <rect x="28" y="38" width="150" height="165" fill="#5b5641" stroke="#bea16d" />
      <MapText x="103" y="65" fill="#e7d2a9" fontSize="14">筹款方案</MapText>
      <path d="M40 154 H163 M55 154 V190 M148 154 V190" stroke="#ba9d6f" strokeWidth="6" />
      <rect x="73" y="139" width="50" height="12" fill="#c1ae80" />
      <rect x="218" y="38" width="202" height="165" fill="#555d44" stroke="#bea16d" />
      <MapText x="319" y="65" fill="#e7d2a9" fontSize="14">药铺采购</MapText>
      <path d="M242 123 H396 M242 165 H396" stroke="#bea16d" strokeWidth="6" />
      {(Object.keys(consignmentSupplies) as ConsignmentSupplyId[]).map((id, index) => <g key={id} transform={`translate(${258 + index * 44} 105)`}>
        <circle r="11" fill={task.receipts[id] ? '#a3b77a' : '#88765a'} />
        <MapText y="42" fill="#e4d0a4" fontSize="11">{task.receipts[id] ? '已购' : '待购'}</MapText>
      </g>)}
      <rect x="458" y="38" width="230" height="165" fill="#344139" stroke="#bea16d" />
      <MapText x="573" y="65" fill="#e7d2a9" fontSize="14">隐蔽巷 · 药老调制</MapText>
      <g transform="translate(525 124)"><RobeFigure cut="M-22 55 Q-10-15 0-15 Q10-15 22 55Z" robe="#b6cec0" cy="-24" r="12" skin="#d8deca" bodyFirst />
        {task.stage === 3 && <path d="M22 13 Q30-25 45-34 Q36-5 48 0 Q50 22 22 13Z" fill="#e0ead3" />}</g>
      {task.product === 'mixture' && <g transform="translate(627 143)"><ellipse rx="30" ry="13" fill="#7e9b4e" /><circle cx="8" cy="-4" r="5" fill="#a1aa65" /><circle cx="-12" cy="3" r="4" fill="#637d41" /></g>}
      {task.product === 'sealed' && <g transform="translate(627 144)"><path d="M-10-25 H10 V-13 Q23-3 19 25 H-19 Q-23-3-10-13Z" fill="#dfdfc7" stroke="#b7bea2" /><rect x="-12" y="-30" width="24" height="7" fill="#957547" /><MapText y="46" fill="#e4d0a4">{state.earlyTraining.auction.stage >= 6 ? '同瓶' : '待售'} · {appraisalOwnerLabels[task.owner]}保管</MapText></g>}
      <path d="M104 230 H572" stroke="#a79769" strokeDasharray="8 7" strokeWidth="3" />
      <MapText x="360" y="270" fill="#e4d0a4" fontSize="13">另一次备料 · 同一寄售实例 · 自用容器保留</MapText>
    </svg>
    <WalkControls aria-label="寄售准备位置">
      {(Object.keys(stations) as ConsignmentStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id}
        onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </WalkControls>
    <StatusParagraph>寄售准备 {task.stage}/5 · 已购 {Object.values(task.receipts).filter(Boolean).length}/4 · 专用余额 {task.funds - task.spent} · 已付 {task.spent}</StatusParagraph>
    <MutedParagraph>任务余额90和价格10/10/25/5是游戏折算，原作此时剩余900金币。此账本独立于早期借资和行囊金币；采购按批记录，由老师处理材料。</MutedParagraph>
    {task.stage === 5 ? <BondSummary><h3>寄售玉瓶记录</h3><p>药老调制的斑杂绿色制品装入白玉瓶，一个封存寄售实例当前由{appraisalOwnerLabels[task.owner]}保管。自用药液仍耗尽，没有回补或第二份收入。</p><p>拍卖场的黑袍、老师代言、谷尼鉴定与入场凭据独立记录；{state.earlyTraining.settlement.net ? '寄售净款与贵宾卡已在独立手续中记录。' : state.earlyTraining.settlement.vip ? '水晶贵宾卡已收，寄售款尚待领取。' : '寄售款和贵宾卡尚未领取。'}</p>
      {onAppraise && <PrimaryButton onClick={onAppraise}>接续拍卖场 · 遮掩身份并鉴定</PrimaryButton>}</BondSummary>
      : station !== expectedStation ? <MutedParagraph>当前步骤请到{stations[expectedStation]}继续。</MutedParagraph>
      : task.stage === 0 ? <BondSummary><h3>把寄售方案告诉老师</h3><p>萧炎不愿再借资，提出另买较低品质材料，制出供寄售的药液；获得款项后再买后续修炼材料。药老同意。</p>
        <PrimaryButton onClick={() => act('plan')}>请老师同意寄售方案 · 记下专用余额</PrimaryButton></BondSummary>
      : task.stage === 1 ? <BondSummary aria-label="首次寄售采购">
        {(Object.keys(consignmentSupplies) as ConsignmentSupplyId[]).map(id => <article className="recap-line" key={id}>
          <b>{consignmentSupplies[id].label} · {consignmentSupplies[id].price}专用资金</b>
          <p>{task.receipts[id] ? '收据已记下，待交老师处理或装瓶。' : '这是另一次采购，和自用药液的旧材料分开。'}</p>
          <SecondaryButton disabled={task.receipts[id]} onClick={() => submitEarlyConsignment(gameStore, position, station,
            { stage: task.stage, spent: task.spent, operation: 'buy', item: id, price: consignmentSupplies[id].price })}>{task.receipts[id] ? '本笔收据已保留' : `购买${consignmentSupplies[id].label}`}</SecondaryButton>
        </article>)}
      </BondSummary> : <BondSummary>
        <h3>{task.stage === 2 ? '采购齐备，在巷中交材' : task.stage === 3 ? '老师调制，制品颜色不同' : '装入白玉瓶，藏好待售'}</h3>
        <p>{task.stage === 2 ? '萧炎带着另一批两种药草与廉价木属性魔核来到隐蔽巷，交由老师处理。玉瓶留待装售品。'
          : task.stage === 3 ? '药老处理这一次材料。较低品质制品呈斑杂绿色，与自用药液不同；由老师调制，玩家在旁观察。'
          : '萧炎将这一份待售制品装入已购白玉瓶，封好并藏妥。药液与玉瓶合为一个实例，不再留一份散装副本。'}</p>
        <PrimaryButton onClick={() => act(task.stage === 2 ? 'deliver' : task.stage === 3 ? 'refine' : 'bottle')}>
          {task.stage === 2 ? '交老师处理材料 · 保留采购收据' : task.stage === 3 ? '观察老师完成调制 · 待装瓶' : '装瓶封好 · 由萧炎保管'}
        </PrimaryButton>
      </BondSummary>}
    <SecondaryButton onClick={onBack}>暂离寄售准备 · 保留断点</SecondaryButton>
  </>
}
