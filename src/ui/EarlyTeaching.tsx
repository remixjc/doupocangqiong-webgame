import SceneHeading from './SceneHeading'
import { useRef, useEffect, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { earlyTeachingRoomBlock, submitEarlyTeaching, type EarlyTeachingStation } from '../core/early-teaching'
import { earlyTeachingScenes } from '../content/early-teaching'
import { gameStore } from '../core/store'
import './early-walk.css'

export default function EarlyTeaching({ state, position, onBack, onSupervise }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onSupervise?: () => void }) {
  const [station, setStation] = useState<EarlyTeachingStation>('table')
  const first = useRef<HTMLButtonElement>(null)
  const blocked = earlyTeachingRoomBlock(state, position)
  const stage = state.earlyTraining.teaching.stage
  const scene = earlyTeachingScenes[stage]
  useEffect(() => { if (!blocked) first.current?.focus() }, [blocked])
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">往事回房 / 药老正式传技</span>
    <h2>技法记下，还须打好基础。</h2>
    <p className="muted">选择卷册桌或老师处查看，再确认当前步骤。这里记录传授过程；第一章提前展示的八极崩教学保留，不重复发放技能或提高攻击。</p>
    <svg className="early-walk-map" role="img" aria-label={stage >= 3 ? '药老已传授八极崩知识，萧炎仍须准备身体基础' : '借卷放在房间桌上，萧炎向药老请教'} viewBox="0 0 720 320">
      <rect width="720" height="320" fill="#243633" />
      <path d="M20 20 H700 V285 H20Z" fill="#3c4137" stroke="#baa072" strokeWidth="3" />
      <rect x="75" y="45" width="120" height="70" fill="#677d7a" stroke="#d4c19b" /><path d="M135 45 V115 M75 80 H195" stroke="#d4c19b" />
      <path d="M60 205 H230 V225 H60Z M85 225 V270 M205 225 V270" fill="#816947" stroke="#c5ae7c" strokeWidth="3" />
      <rect x="100" y="185" width="92" height="20" rx="8" fill="#293538" stroke="#ddc68a" />
      <path d="M120 190 H175 M120 198 H168" stroke="#d6ba7f" />
      <text x="145" y="293" textAnchor="middle" fill="#efd5a5" fontSize="14">借卷 · 萧炎保管</text>
      <g transform="translate(390 180)"><ellipse cy="55" rx="24" ry="7" fill="#0004" /><path d="M-20 48 L-10 0 H10 L20 48Z" fill="#cfa469" /><circle cy="-14" r="13" fill="#eac79e" /><path d="M-13-20 Q0-36 13-20" fill="#26312c" /></g>
      <g transform="translate(500 140)" opacity=".85"><path d="M-24 95 Q-16 35 0 5 Q16 35 24 95Z" fill="#b9d1ca" /><circle cy="-5" r="13" fill="#d7dfcd" /><path d="M-10 0 Q0 24 10 0" fill="#eaf0e6" /><text x="0" y="125" textAnchor="middle" fill="#e5e5c9" fontSize="14">药老</text></g>
      {stage >= 3 && <g>
        <path d="M485 160 L405 166" stroke="#ead49c" strokeWidth="3" strokeDasharray="4 6" />
        {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={390 + Math.cos(i * Math.PI / 4) * 28} cy={165 + Math.sin(i * Math.PI / 4) * 28} r="3" fill="#eac885" />)}
        <text x="405" y="70" textAnchor="middle" fill="#e8d8b8" fontSize="14">知识传授 · 尚待练习</text>
      </g>}
      <text x="360" y="310" textAnchor="middle" fill="#bfb79b" fontSize="12">原创房间与静态演出 · 无额外奖励</text>
    </svg>
    <div className="early-walk-controls" aria-label="传技房间位置">
      <button ref={first} className="secondary" aria-pressed={station === 'table'} onClick={() => setStation('table')}>查看卷册桌</button>
      <button className="secondary" aria-pressed={station === 'teacher'} onClick={() => setStation('teacher')}>走到老师处 · 请教</button>
    </div>
    <p role="status">正式传技 {stage}/5 · {stage >= 3 ? '技法知识已记下' : '尚未接受技法知识'} · {stage >= 4 ? '身体要求已记下' : '身体要求待确认'}</p>
    {station === 'table' && <section className="bond-summary"><h3>房间的卷册桌</h3><p>这里是斗技堂登记借出的第二卷；第一卷此前已归回书架。借卷仍由萧炎保管，不进入可售行囊，也没有新增副本。</p></section>}
    {scene ? <>
      {station === scene.station ? <section className="bond-summary" aria-label="老师正式传技步骤"><SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
        <button className="primary" onClick={() => submitEarlyTeaching(gameStore, position, station, { step: scene.step, operation: scene.operation })}>{scene.action}</button></section>
        : <p className="muted">下一步请到{scene.station === 'table' ? '卷册桌' : '老师处'}：{scene.title}。</p>}
    </> : <section className="bond-summary"><h3>正式传技已归档</h3><p>八极崩的知识与身体基础要求已记录。可接续后山监督训练，药液恢复和实际掌握分别继续。</p>
      {onSupervise && <button className="primary" onClick={onSupervise}>接续后山 · 接受老师督练</button>}</section>}
    <button className="secondary" onClick={onBack}>暂离传技房间 · 回准备路线</button>
  </>
}
