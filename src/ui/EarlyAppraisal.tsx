import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyAppraisalBlock, submitEarlyAppraisal, type AppraisalStation } from '../core/early-appraisal'
import { appraisalScenes, appraisalOwnerLabels } from '../content/early-appraisal'
import { gameStore } from '../core/store'
import './early-walk.css'

const stations = { alley: '侧巷', entrance: '大厅入口', desk: '鉴定接待桌' } as const
export default function EarlyAppraisal({ state, position, onBack, onAuction }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onAuction?: () => void }) {
  const task = state.earlyTraining.appraisal, bottle = state.earlyTraining.consignment
  const scene = appraisalScenes[task.stage]
  const [station, setStation] = useState<AppraisalStation>('alley')
  const heading = useRef<HTMLHeadingElement>(null)
  const blocked = earlyAppraisalBlock(state, position)
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>米特尔拍卖场 / 首次寄售鉴定</Eyebrow>
    <h2 ref={heading} tabIndex={-1}>黑袍遮面，一瓶只交一次。</h2>
    <p>选择侧巷、大厅入口或鉴定桌，接续身份遮掩、药老代言与谷尼鉴别。这里交接的仍是此前装好的同一只白玉瓶。</p>
    <svg className="early-walk-map" viewBox="0 0 720 300" role="img" aria-label={`鉴定室：萧炎${task.cloaked ? '已穿黑袍' : '尚未穿黑袍'}；玉瓶由${appraisalOwnerLabels[bottle.owner]}保管；${task.tier === 2 ? '谷尼已确认二品' : '尚未确认品阶'}。`}>
      <rect width="720" height="300" fill="#293a33" />
      <path d="M25 25 H695 V276 H25Z" fill="#4b493b" stroke="#b5a073" strokeWidth="3" />
      <rect x="72" y="67" width="96" height="200" fill="#313e36" stroke="#a99064" />
      <MapText x="120" y="50" fill="#e8d1a6" fontSize="14">大厅入口</MapText>
      <g transform="translate(252 172)"><path d={task.cloaked ? 'M-27 65 Q-40-10 0-43 Q40-10 27 65Z' : 'M-22 65 L-12 0 H12 L22 65Z'} fill={task.cloaked ? '#20282a' : '#c7a06a'} />
        {!task.cloaked && <circle cy="-13" r="12" fill="#e5c499" />}
        <MapText y="86" fill="#e8d1a6">{task.speaker === 'yaolao' ? '药老代言 · 萧炎藏身' : '萧炎'}</MapText></g>
      <path d="M368 213 H623 V233 H368Z M386 233 V273 M605 233 V273" stroke="#c1a675" fill="#826a48" strokeWidth="3" />
      {task.stage >= 5 && <g transform="translate(560 128)"><path d="M-27 65 L-13 0 H13 L27 65Z" fill="#91a37a" /><circle cy="-15" r="14" fill="#dac4a4" /><path d="M-16-22 Q0-42 16-22" fill="#d7dbbf" /><MapText y="94" fill="#e8d1a6" fontSize="13">谷尼 · 鉴定者</MapText></g>}
      {task.stage < 7 && <g transform={`translate(${bottle.owner === 'xiaoyan' ? 295 : 433} 179)`}>
        <path d="M-8-19 H8 V-10 Q17-2 14 18 H-14 Q-17-2-8-10Z" fill="#dedfc8" stroke="#b5bea5" /><rect x="-9" y="-24" width="18" height="6" fill="#98764c" />
      </g>}
      {task.stage === 5 && <g><path d="M480 184 L466 209" stroke="#dbe1d2" strokeWidth="3" /><ellipse cx="463" cy="207" rx="7" ry="4" fill="#8dab68" /><text x="438" y="255" fill="#d5d8bf" fontSize="12">谷尼以银针鉴别</text></g>}
      {task.stage >= 6 && <text x="427" y="110" fill="#e4d59b" fontSize="14">二品制品 · 鉴定已记</text>}
      {task.card === 'black-entry' && <g><rect x="204" y="99" width="65" height="37" rx="3" fill="#202a29" stroke="#a88f63" /><MapText x="237" y="122" fill="#cfba85">入场卡</MapText></g>}
      <MapText x="360" y="294" fill="#e8d1a6" fontSize="13">待售实例保管：{appraisalOwnerLabels[bottle.owner]}</MapText>
    </svg>
    <WalkControls aria-label="鉴定路线位置">
      {(Object.keys(stations) as AppraisalStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </WalkControls>
    <StatusParagraph>寄售鉴定 {task.stage}/8 · {task.cloaked ? '黑袍已穿' : '身份尚未遮掩'} · {task.tier === 2 ? '制品二品' : '品阶待核'} · {task.card === 'black-entry' ? '持黑色入场卡' : '尚无入场卡'}</StatusParagraph>
    {scene ? station === scene.station ? <BondSummary aria-label="寄售鉴定步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      <PrimaryButton onClick={() => submitEarlyAppraisal(gameStore, position, station,
        { step: task.stage, owner: bottle.owner, operation: scene.operation })}>{scene.action}</PrimaryButton>
    </BondSummary> : <p className="muted">下一步请到{stations[scene.station]}：{scene.title}。</p>
      : <BondSummary><h3>第一拍卖室已入场</h3><p>同瓶当前由{appraisalOwnerLabels[bottle.owner]}保管，萧炎持黑色入场卡。{state.earlyTraining.auction.stage >= 6 ? '雅妃已敲槌，买方是萧战；收款和父亲赠回由各自记录接续。' : '入席后可旁观雅妃主持与其他人的竞价。'}</p>
        {onAuction && <PrimaryButton onClick={onAuction}>接续拍卖室 · 入席旁观</PrimaryButton>}</BondSummary>}
    <p className="muted">二品是这份制品的鉴定结果，不增加人物炼药等级。入场黑卡与后来的贵宾卡不同；{state.earlyTraining.settlement.net ? '寄售净款已在独立收款记录中保存。' : '寄售款尚未收到。'}</p>
    <SecondaryButton onClick={onBack}>暂离鉴定路线 · 保留断点</SecondaryButton>
  </>
}
