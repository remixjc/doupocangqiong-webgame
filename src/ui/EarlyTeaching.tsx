import { actorButton } from './Buttons'
import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { spokenSceneHeading } from './SceneHeading'
import { useRef, useState } from 'react'
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
  useSceneFocus(first, !blocked, [blocked])
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>往事回房 / 药老正式传技</Eyebrow>
    <h2>技法记下，还须打好基础。</h2>
    <MutedParagraph>选择卷册桌或老师处查看，再确认当前步骤。这里记录传授过程；第一章提前展示的八极崩教学保留，不重复发放技能或提高攻击。</MutedParagraph>
    <svg className="early-walk-map" role="img" aria-label={stage >= 3 ? '药老已传授八极崩知识，萧炎仍须准备身体基础' : '借卷放在房间桌上，萧炎向药老请教'} viewBox="0 0 720 320">
      <rect width="720" height="320" fill="#243633" />
      <path d="M20 20 H700 V285 H20Z" fill="#3c4137" stroke="#baa072" strokeWidth="3" />
      <rect x="75" y="45" width="120" height="70" fill="#677d7a" stroke="#d4c19b" /><path d="M135 45 V115 M75 80 H195" stroke="#d4c19b" />
      <path d="M60 205 H230 V225 H60Z M85 225 V270 M205 225 V270" fill="#816947" stroke="#c5ae7c" strokeWidth="3" />
      <rect x="100" y="185" width="92" height="20" rx="8" fill="#293538" stroke="#ddc68a" />
      <path d="M120 190 H175 M120 198 H168" stroke="#d6ba7f" />
      <MapText x="145" y="293" fill="#efd5a5" fontSize="14">借卷 · 萧炎保管</MapText>
      <g transform="translate(390 180)"><ellipse cy="55" rx="24" ry="7" fill="#0004" /><RobeFigure cut="M-20 48 L-10 0 H10 L20 48Z" robe="#cfa469" cy="-14" r="13" skin="#eac79e" bodyFirst /><path d="M-13-20 Q0-36 13-20" fill="#26312c" /></g>
      <g transform="translate(500 140)" opacity=".85"><RobeFigure cut="M-24 95 Q-16 35 0 5 Q16 35 24 95Z" robe="#b9d1ca" cy="-5" r="13" skin="#d7dfcd" bodyFirst /><path d="M-10 0 Q0 24 10 0" fill="#eaf0e6" /><MapText x="0" y="125" fill="#e5e5c9" fontSize="14">药老</MapText></g>
      {stage >= 3 && <g>
        <path d="M485 160 L405 166" stroke="#ead49c" strokeWidth="3" strokeDasharray="4 6" />
        {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={390 + Math.cos(i * Math.PI / 4) * 28} cy={165 + Math.sin(i * Math.PI / 4) * 28} r="3" fill="#eac885" />)}
        <MapText x="405" y="70" fill="#e8d8b8" fontSize="14">知识传授 · 尚待练习</MapText>
      </g>}
      <MapText x="360" y="310" fill="#bfb79b">原创房间与静态演出 · 无额外奖励</MapText>
    </svg>
    <WalkControls aria-label="传技房间位置">
      <SecondaryButton ref={first} aria-pressed={station === 'table'} onClick={() => setStation('table')}>查看卷册桌</SecondaryButton>
      {actorButton(station, setStation, 'teacher', "走到老师处 · 请教")}
    </WalkControls>
    <StatusParagraph>正式传技 {stage}/5 · {stage >= 3 ? '技法知识已记下' : '尚未接受技法知识'} · {stage >= 4 ? '身体要求已记下' : '身体要求待确认'}</StatusParagraph>
    {station === 'table' && <BondSummary><h3>房间的卷册桌</h3><p>这里是斗技堂登记借出的第二卷；第一卷此前已归回书架。借卷仍由萧炎保管，不进入可售行囊，也没有新增副本。</p></BondSummary>}
    {scene ? <>
      {station === scene.station ? <BondSummary aria-label="老师正式传技步骤">{spokenSceneHeading(scene)}
        <PrimaryButton onClick={() => submitEarlyTeaching(gameStore, position, station, { step: scene.step, operation: scene.operation })}>{scene.action}</PrimaryButton></BondSummary>
        : <MutedParagraph>下一步请到{scene.station === 'table' ? '卷册桌' : '老师处'}：{scene.title}。</MutedParagraph>}
    </> : <BondSummary><h3>正式传技已归档</h3><p>八极崩的知识与身体基础要求已记录。可接续后山监督训练，药液恢复和实际掌握分别继续。</p>
      {onSupervise && <PrimaryButton onClick={onSupervise}>接续后山 · 接受老师督练</PrimaryButton>}</BondSummary>}
    <SecondaryButton onClick={onBack}>暂离传技房间 · 回准备路线</SecondaryButton>
  </>
}
