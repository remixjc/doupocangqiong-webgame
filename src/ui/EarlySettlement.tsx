import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlySettlementBlock, submitEarlySettlement, type SettlementStation } from '../core/early-settlement'
import { settlementScenes, FIRST_SALE_GROSS, FIRST_SALE_FEE, FIRST_SALE_NET } from '../content/early-settlement'
import { gameStore } from '../core/store'
import { appraisalOwnerLabels } from '../content/early-appraisal'
import './early-walk.css'

const stations = { entrance: '来往入口', meeting: '会面处', desk: '结算桌' } as const
export default function EarlySettlement({ state, position, onBack, onFatherGift }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onFatherGift?: () => void }) {
  const task = state.earlyTraining.settlement, scene = settlementScenes[task.stage]
  const [station, setStation] = useState<SettlementStation>('entrance')
  const heading = useRef<HTMLHeadingElement>(null), blocked = earlySettlementBlock(state, position)
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">米特尔鉴定室 / 首次寄售手续</span>
    <h2 ref={heading} tabIndex={-1}>一张贵宾卡，一笔寄售款。</h2>
    <p>旁观结束后回原鉴定室。药老代言保密，先接水晶贵宾卡，再核账并收绿色储款卡，两张卡各有用途。</p>
    <svg className="early-walk-map" viewBox="0 0 720 300" role="img" aria-label={`寄售手续：${task.vip ? '已持水晶贵宾卡' : '未领贵宾卡'}；${task.net ? '净款39200已收' : '尚未收款'}；同瓶由${appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管。`}>
      <rect width="720" height="300" fill="#293a33" />
      <path d="M25 25 H695 V275 H25Z" fill="#4b493b" stroke="#b5a073" strokeWidth="3" />
      <rect x="66" y="67" width="96" height="200" fill="#313e36" stroke="#a99064" />
      <MapText x="114" y="50" fill="#e8d1a6" fontSize="14">来往入口</MapText>
      <g transform="translate(230 155)"><path d="M-27 74 Q-40-10 0-43 Q40-10 27 74Z" fill="#20282a" /><MapText y="100" fill="#e8d1a6">黑袍 · 药老代言</MapText></g>
      {task.stage >= 2 && <g>
        {[410, 570].map((x, index) => <g key={x} transform={`translate(${x} 145)`}><circle cy="-17" r="13" fill="#e1c8a5" /><path d="M-24 68 L-11 0 H11 L24 68Z" fill={index ? '#91a37a' : '#a34640'} /><MapText y="-40" fill="#e8d1a6" fontSize="14">{index ? '谷尼' : '雅妃'}</MapText></g>)}
        <path d="M360 223 H635 V241 H360Z M375 241 V270 M618 241 V270" stroke="#c1a675" fill="#826a48" strokeWidth="3" />
      </g>}
      {task.vip && <g><rect x="270" y="127" width="72" height="44" rx="3" fill="#adc9c7" stroke="#e1c58d" /><MapText x="306" y="154" fill="#263d35">水晶贵宾卡</MapText></g>}
      {task.stage >= 5 && <g><rect x={task.net ? 270 : 483} y="190" width="72" height="38" rx="3" fill="#577b56" stroke="#b7c398" /><MapText x={task.net ? 306 : 519} y="214" fill="#e4dcbd">{task.net ? '39200已收' : '储款待领'}</MapText></g>}
      <MapText x="360" y="294" fill="#e8d1a6" fontSize="13">{task.stage < 5 ? '贵宾凭据与收款分别办理' : `成交${FIRST_SALE_GROSS} − 手续费${FIRST_SALE_FEE} = 净款${FIRST_SALE_NET}`}</MapText>
    </svg>
    <div className="early-walk-controls" aria-label="寄售手续位置">
      {(Object.keys(stations) as SettlementStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </div>
    <StatusParagraph>寄售手续 {task.stage}/7 · {task.vip ? '水晶贵宾卡已收' : '贵宾卡未领'} · {task.net ? `净款${task.net}已收` : '尚未收款'} · 同瓶{appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管</StatusParagraph>
    {task.stage >= 5 && <BondSummary aria-label="首次寄售账单">
      <p>药液成交 {FIRST_SALE_GROSS} · 贵宾费率2% · 手续费 {FIRST_SALE_FEE} · 净额 {FIRST_SALE_NET}</p>
      <p>{task.net ? '绿色储款卡已接收，唯一收款记录保留。' : '账单已核对，储款卡还未接收。'}</p>
    </BondSummary>}
    {scene ? station === scene.station ? <BondSummary aria-label="寄售手续步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      <PrimaryButton onClick={() => submitEarlySettlement(gameStore, position, station,
        { step: task.stage, net: task.net, vip: task.vip, owner: state.earlyTraining.consignment.owner, operation: scene.operation })}>{scene.action}</PrimaryButton>
    </BondSummary> : <p className="muted">下一步请到{stations[scene.station]}：{scene.title}。</p>
      : <BondSummary><h3>寄售手续已办完</h3><p>净款和贵宾卡已记录，萧炎带两张卡离场。同瓶当前由{appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管，父亲来访与赠回独立记录。</p>
        {onFatherGift && <PrimaryButton onClick={onFatherGift}>接续父亲来访 · 回萧家房中</PrimaryButton>}</BondSummary>}
    <p className="muted">绿色卡中的故事净款与行囊金币、备料余额分账，只收一次。入场黑卡、水晶贵宾卡、绿色储款卡分别记录；这里不会复制药液或功法。</p>
    <SecondaryButton onClick={onBack}>暂离寄售手续 · 保留收款断点</SecondaryButton>
  </>
}
