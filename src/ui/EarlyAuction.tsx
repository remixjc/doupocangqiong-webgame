import { RobeFigure } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyAuctionBlock, submitEarlyAuction, type AuctionStation } from '../core/early-auction'
import { auctionScenes, auctionBidAt } from '../content/early-auction'
import { gameStore } from '../core/store'
import { appraisalOwnerLabels } from '../content/early-appraisal'
import './early-walk.css'

const stations = { entrance: '拍卖室入口', seat: '偏僻座位', stage: '主持台' } as const
export default function EarlyAuction({ state, position, onBack, onSettle }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onSettle?: () => void }) {
  const task = state.earlyTraining.auction, scene = auctionScenes[task.stage]
  const bid = auctionBidAt(task.stage), sold = task.stage >= 6
  const [station, setStation] = useState<AuctionStation>('entrance')
  const heading = useRef<HTMLHeadingElement>(null)
  const blocked = earlyAuctionBlock(state, position)
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>米特尔第一拍卖室 / 首次寄售旁观</Eyebrow>
    <h2 ref={heading} tabIndex={-1}>台上落槌，席间藏名。</h2>
    <p>选择入口、偏僻座位与主持台，观察雅妃主持和其他人的出价。萧炎藏在黑袍下，寄售的仍是先前交鉴定的那一瓶。</p>
    <svg className="early-walk-map" viewBox="0 0 720 300" role="img" aria-label={`第一拍卖室：雅妃主持，萧炎旁观；${sold ? '已以40000成交归萧战' : bid ? `当前报价${bid}，尚未落槌` : '等待药液拍卖'}；同瓶当前由${appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管。`}>
      <rect width="720" height="300" fill="#252f2c" />
      <path d="M25 25 H695 V275 H25Z" fill="#393c34" stroke="#b5a073" strokeWidth="3" />
      <path d="M325 68 H651 V177 H325Z" fill="#59463c" />
      <g transform="translate(489 93)"><RobeFigure cy="-18" r="12" skin="#e6c8a2" cut="M-25 55 L-11-2 H11 L25 55Z" robe="#a34640" /><MapText x="0" y="-38" fill="#ebd4a9" fontSize="14">雅妃 · 主持</MapText></g>
      <path d="M403 147 H585 V167 H403Z M419 167 V185 M567 167 V185" fill="#8b704b" stroke="#c1a675" strokeWidth="3" />
      {task.stage >= 2 && task.stage < 7 && <g transform="translate(445 127)"><ellipse cy="16" rx="31" ry="4" fill="#adb99a" /><path d="M-7-10 H7 V-3 Q15 3 12 13 H-12 Q-15 3-7-3Z" fill="#dedfc8" /><rect x="-8" y="-14" width="16" height="5" fill="#98764c" /></g>}
      {task.stage === 7 && <g><ellipse cx="444" cy="144" rx="35" ry="6" fill="#c7cdcf" /><rect x="417" y="130" width="54" height="11" rx="4" fill="#83a877" /><MapText x="489" y="201" fill="#e8d1a6">下一拍品 · 只观察</MapText></g>}
      {sold && <path d="M548 130 L568 117 M561 111 L573 123" stroke="#e1bf87" strokeWidth="6" />}
      <g transform="translate(109 176)"><path d="M-24 70 Q-35-5 0-37 Q35-5 24 70Z" fill="#171f21" /><MapText y="92" fill="#e8d1a6" fontSize="13">黑袍萧炎 · 旁观</MapText></g>
      {[275, 355, 635].map((x, index) => <g key={x} transform={`translate(${x} 223)`}><circle cy="-14" r="10" fill="#d1ba97" /><path d="M-17 36 L-10 0 H10 L17 36Z" fill={index === 0 ? '#a88a59' : '#687969'} /><MapText y="53" fill="#e8d1a6">{['萧战', '加列毕', '奥巴帕'][index]}</MapText></g>)}
      <MapText x="360" y="294" fill="#e8d1a6" fontSize="13">{sold ? `成交：萧战 / 40000 · 同瓶${appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管` : bid ? `当前报价：${bid} · 尚未落槌` : '同瓶等待介绍 · 萧炎不出价'}</MapText>
    </svg>
    <WalkControls aria-label="拍卖观察位置">
      {(Object.keys(stations) as AuctionStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </WalkControls>
    <StatusParagraph>首次拍卖 {task.stage}/7 · {sold ? '买方萧战 · 成交40000' : bid ? `报价${bid} · 尚未成交` : '尚未报价'} · 同瓶{appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管 · {state.earlyTraining.settlement.net ? '净款已收' : '尚未结算'}</StatusParagraph>
    {scene ? station === scene.station ? <BondSummary aria-label="首次拍卖步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      <PrimaryButton onClick={() => submitEarlyAuction(gameStore, position, station,
        { step: task.stage, owner: state.earlyTraining.consignment.owner, operation: scene.operation })}>{scene.action}</PrimaryButton>
    </BondSummary> : <MutedParagraph>下一步请到{stations[scene.station]}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>药液成交，接续寄售手续。</h3><p>萧战买得同瓶，药液当前由{appraisalOwnerLabels[state.earlyTraining.consignment.owner]}保管。{state.earlyTraining.settlement.net ? '寄售净款已收到，父亲来访独立记录。' : '先观察功法卷成交，再回鉴定室办理凭据与收款。'}</p>
        {onSettle && <PrimaryButton onClick={onSettle}>接续寄售手续 · 回鉴定室</PrimaryButton>}</BondSummary>}
    <MutedParagraph>这里的报价是故事金币金额，只记录其他人的竞价。观察与落槌不增减行囊金币或备料余额，不获得功法卷或新技能。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离拍卖室 · 保留旁观断点</SecondaryButton>
  </>
}
