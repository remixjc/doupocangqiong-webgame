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
import { earlyXunerVisitBlock, submitEarlyXunerVisit, type XunerVisitStation } from '../core/early-xuner-visit'
import { xunerVisitScenes } from '../content/early-xuner-visit'
import { gameStore } from '../core/store'
import './early-walk.css'

const stations = { room: '萧炎房中', corner: '院落转角', council: '议事房外' } as const
export default function EarlyXunerVisit({ state, position, onBack, onSupplies }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onSupplies?: () => void }) {
  const task = state.earlyTraining.xunerVisit, scene = xunerVisitScenes[task.stage]
  const [station, setStation] = useState<XunerVisitStation>('room')
  const heading = useRef<HTMLHeadingElement>(null), blocked = earlyXunerVisitBlock(state, position)
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  if (blocked) return <p>{blocked}</p>
  const xunerView = task.stage >= 4
  return <>
    <Eyebrow>萧家 / 薰儿来访与长老争执</Eyebrow>
    <h2 ref={heading} tabIndex={-1}>房中一句承诺，转角另一份心意。</h2>
    <p>{xunerView ? '当前跟随薰儿独自行动。萧炎留在房中，不知道长老房里的交卡交易。'
      : '先在房中接续萧炎与薰儿的谈话，再随手札转向离开的薰儿。'}</p>
    <svg className="early-walk-map" viewBox="0 0 720 280" role="img" aria-label={`人物事件：${xunerView ? '薰儿视角，萧炎不在场' : '房中来访'}；紫金卡${task.card === 'xuner' ? '由薰儿保管' : '已交长老，家族取得100000'}。`}>
      <rect width="720" height="280" fill="#293a33" />
      <path d="M24 35 H260 V235 H24Z M478 35 H696 V235 H478Z" fill="#4b493b" stroke="#b5a073" strokeWidth="3" />
      <path d="M260 166 H390 V104 H478" fill="none" stroke="#897957" strokeWidth="34" />
      <MapText x="142" y="61" fill="#e8d1a6" fontSize="15">萧炎房中</MapText>
      <MapText x="366" y="211" fill="#e8d1a6" fontSize="15">院落转角</MapText>
      <MapText x="587" y="61" fill="#e8d1a6" fontSize="15">长老议事房</MapText>
      <g transform="translate(101 140)" opacity={xunerView ? .4 : 1}><RobeFigure cy="-21" r="12" skin="#e6c8a2" cut="M-22 59 L-11-5 H11 L22 59Z" robe="#c79e66" /><MapText y="82" fill="#e8d1a6">萧炎{ xunerView ? '留在房中' : ''}</MapText></g>
      {task.stage > 0 && <g transform={`translate(${task.stage >= 5 ? 449 : xunerView ? 365 : 195} 140)`}><RobeFigure cy="-21" r="12" skin="#e6c8a2" cut="M-22 59 L-11-5 H11 L22 59Z" robe="#b9acd3" /><MapText y="82" fill="#e8d1a6">薰儿</MapText></g>}
      <g transform="translate(525 124)"><circle r="11" fill="#d4bea0" /><path d="M-18 62 L-9 14 H9 L18 62Z" fill="#a08252" /><MapText y="83" fill="#e8d1a6">萧战</MapText></g>
      {[584, 621, 658].map(x => <g key={x} transform={`translate(${x} 124)`}><circle r="10" fill="#d4bea0" /><path d="M-16 62 L-8 14 H8 L16 62Z" fill="#8a8761" /></g>)}
      {task.stage >= 5 && <rect x={task.card === 'xuner' ? 452 : 598} y="161" width="24" height="15" rx="2" fill="#9c75b7" stroke="#e6bc65" />}
      <MapText x="360" y="266" fill="#e8d1a6" fontSize="13">{task.card === 'xuner' ? '紫金卡由薰儿保管，尚未交给家族' : '紫金卡已交长老 · 家族取得100000 · 萧炎未领取'}</MapText>
    </svg>
    <WalkControls aria-label="薰儿事件位置">
      {(Object.keys(stations) as XunerVisitStation[]).map(id => <SecondaryButton key={id} aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</SecondaryButton>)}
    </WalkControls>
    <StatusParagraph>人物事件 {task.stage}/7 · {xunerView ? '薰儿视角，萧炎不在场' : '房中谈话'} · {task.card === 'xuner' ? '紫金卡由薰儿保管' : '紫金卡由长老保管，家族取得100000'}</StatusParagraph>
    {scene ? station === scene.station ? <BondSummary aria-label="薰儿事件步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      <PrimaryButton onClick={() => submitEarlyXunerVisit(gameStore, position, station,
        { step: task.stage, card: task.card, operation: scene.operation })}>{scene.action}</PrimaryButton>
    </BondSummary> : <MutedParagraph>下一步请到{stations[scene.station]}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>承诺与独自交卡的心意已记下。</h3><p>长老收卡并答应不再为难萧战。萧炎并不知情；同瓶仍由他保管，后续修炼另行接续。</p>
        {onSupplies && <PrimaryButton onClick={onSupplies}>回看长期物资 · 父亲来访之前</PrimaryButton>}</BondSummary>}
    <MutedParagraph>家族收到的是薰儿的紫金卡，与萧炎的寄售净款39200和采购账分开。这里记录人物事件，不增加玩家金币、物资、技能或关系值。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离薰儿事件 · 保留人物断点</SecondaryButton>
  </>
}
