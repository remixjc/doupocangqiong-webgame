import SceneHeading from './SceneHeading'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyFatherGiftBlock, submitEarlyFatherGift, type FatherGiftStation } from '../core/early-father-gift'
import { fatherGiftScenes } from '../content/early-father-gift'
import { appraisalOwnerLabels } from '../content/early-appraisal'
import { gameStore } from '../core/store'
import './early-walk.css'

const stations = { door: '房门', meeting: '父子会面处', cabinet: '收瓶处' } as const
export default function EarlyFatherGift({ state, position, onBack, onXunerVisit }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onXunerVisit?: () => void }) {
  const task = state.earlyTraining.fatherGift, bottle = state.earlyTraining.consignment, scene = fatherGiftScenes[task.stage]
  const [station, setStation] = useState<FatherGiftStation>('door')
  const heading = useRef<HTMLHeadingElement>(null), blocked = earlyFatherGiftBlock(state, position)
  useEffect(() => { if (!blocked) heading.current?.focus() }, [blocked])
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">萧家房中 / 父亲赠回同瓶</span>
    <h2 ref={heading} tabIndex={-1}>绕了一程，回到少年手中。</h2>
    <p>在房门、父子会面处与收瓶处接续来访。同瓶曾由老师调制、谷尼鉴定、雅妃主持成交，这次是父亲买得后交回。</p>
    <svg className="early-walk-map" viewBox="0 0 720 300" role="img" aria-label={`父子来访：${task.stage >= 2 && task.stage < 6 ? '萧战在场' : '父亲尚未在场或已离开'}；同瓶由${appraisalOwnerLabels[bottle.owner]}保管；自用药液仍耗尽。`}>
      <rect width="720" height="300" fill="#293a33" />
      <path d="M25 25 H695 V275 H25Z" fill="#4b493b" stroke="#b5a073" strokeWidth="3" />
      <rect x="60" y="55" width="97" height="210" fill="#313e36" stroke="#a99064" />
      <text x="108" y="46" textAnchor="middle" fill="#e8d1a6" fontSize="14">房门</text>
      <g transform="translate(375 155)"><circle cy="-21" r="13" fill="#e6c8a2" /><path d="M-25 68 L-12-5 H12 L25 68Z" fill="#c79e66" /><text y="92" textAnchor="middle" fill="#e8d1a6" fontSize="13">萧炎</text></g>
      {task.stage >= 2 && task.stage < 6 && <g transform="translate(260 148)"><circle cy="-23" r="15" fill="#dec4a2" /><path d="M-29 76 L-14-5 H14 L29 76Z" fill="#a08252" /><text y="100" textAnchor="middle" fill="#e8d1a6" fontSize="13">萧战</text></g>}
      <rect x="540" y="110" width="98" height="138" fill="#685d42" stroke="#b5a073" />
      <text x="589" y="96" textAnchor="middle" fill="#e8d1a6" fontSize="14">收瓶处</text>
      {task.stage >= 2 && <g transform={`translate(${task.stage >= 6 ? 589 : bottle.owner === 'xiaozhan' ? 297 : 412} ${task.stage >= 6 ? 162 : 184})`}>
        <path d="M-7-15 H7 V-8 Q15-1 12 17 H-12 Q-15-1-7-8Z" fill="#dedfc8" stroke="#b5bea5" /><rect x="-8" y="-20" width="16" height="5" fill="#98764c" />
      </g>}
      <text x="360" y="294" textAnchor="middle" fill="#e8d1a6" fontSize="13">同瓶保管：{appraisalOwnerLabels[bottle.owner]} · 非新增制品</text>
    </svg>
    <div className="early-walk-controls" aria-label="父子来访位置">
      {(Object.keys(stations) as FatherGiftStation[]).map(id => <button key={id} className="secondary" aria-pressed={station === id} onClick={() => setStation(id)}>查看{stations[id]}</button>)}
    </div>
    <p role="status">父亲赠回 {task.stage}/6 · 同瓶{appraisalOwnerLabels[bottle.owner]}保管 · 净款{state.earlyTraining.settlement.net}保留 · 自用药力耗尽</p>
    {scene ? station === scene.station ? <section className="bond-summary" aria-label="父子来访步骤">
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      <button className="primary" onClick={() => submitEarlyFatherGift(gameStore, position, station,
        { step: task.stage, owner: bottle.owner, operation: scene.operation })}>{scene.action}</button>
    </section> : <p className="muted">下一步请到{stations[scene.station]}：{scene.title}。</p>
      : <section className="bond-summary"><h3>同瓶已收好，父亲支持已记下。</h3><p>原来的寄售瓶经萧战购得再赠回，由萧炎保管。接下来展开薰儿来访，长期物资筹备另行接续。</p>
        {onXunerVisit && <button className="primary" onClick={onXunerVisit}>接续薰儿来访 · 房中与转角</button>}</section>}
    <p className="muted">父亲的40000是已记录的故事购买金额，不再扣玩家的钱。赠回只改变原瓶保管，不增加材料、技能或第二份药液，也不回补已耗尽的自用容器。</p>
    <button className="secondary" onClick={onBack}>暂离父子来访 · 保留同瓶断点</button>
  </>
}
