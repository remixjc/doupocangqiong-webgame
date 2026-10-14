import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstAwakeningBlock, submitFirstAwakening } from '../core/first-awakening'
import { firstAwakeningScenes } from '../content/first-awakening'
import { earlySnapshots, awakeningSnapshotKeys } from '../core/early-snapshots'
import { firstAwakeningSaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { actorButton, returnButton, sceneButton, SecondaryButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, WalkControls } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import { walkKey } from './walk-key'
import HistoryBlocked from './HistoryBlocked'
import './early-walk.css'
export default function FirstAwakening({ state, position, onBack, onConsign }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onConsign?: () => void }) {
  const t = state.earlyTraining.firstAwakening, scene = firstAwakeningScenes[t.stage]
  const [actor, setActor] = useState<'yan' | 'teacher'>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstAwakeningBlock(state, position)
  const act = (operation: string) => {
    if (document.hidden) return
    submitFirstAwakening(gameStore, position, t, t.location, { ...t, ...earlySnapshots(state, awakeningSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>原房 / 醒后与同液耗尽</Eyebrow><h2>从醒来走到容器外，再感知这次成长。</h2>
    <p>本人逐步操作，E执行当前动作；跨出时也可按右方向。闭眼期间不能移动。故事五段与时段回顾分存，不发主线数值或奖励。</p>
    {t.record === 'recalled' && <p>本次是详细历史回顾；旧耗尽、五段、物资和奖励保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', '醒后本人操作')}{actorButton(actor, setActor, 'teacher', '旁观原有古戒')}</WalkControls>
    <EarlyMap ref={field} aria-label="醒后原房地图" viewBox="70 290 290 145" onKeyDown={event => {
      if (event.repeat || event.shiftKey) return
      walkKey(event, direction => { if (t.stage === 2 && actor === 'yan') act(`move-${direction}`) },
        () => { if (scene && actor === 'yan') act(scene.operation) })
    }}>
      <MapBackground /><rect x="80" y="320" width="265" height="103" fill="#605642" />
      <path d="M300 340V406" stroke="#b69c76" strokeWidth="6" /><MapText x="302" y="334">原房门</MapText>
      <rect x="180" y="302" width="60" height="25" fill="#edd8a0" /><path d="M180 327L140 410H280L240 327Z" fill="#f2daa623" />
      <g aria-label="醒后本人独立位置" transform={`translate(${t.x} ${t.y})`}>
        <RobeFigure robe="#b9c0a4" skin="#edc79f" />
        {t.eyes === 'closed' && <path d="M-8 0h5m6 0h5" stroke="#423b32" strokeWidth="2" />}
        <MapText y="-28">{t.exited ? t.eyes === 'closed' ? '容器外 · 闭眼' : '本人已在容器外' : '已醒 · 仍在容器'}</MapText>
      </g>
      <g aria-label="同一自用容器" transform="translate(120 390)">
        <path d="M-30-5L-25 30Q0 40 25 30L30-5" fill="#806747" stroke="#c6aa79" />
        <ellipse rx="30" ry="9" fill={t.clear || state.earlyTraining.recovery.energy === 'spent' ? '#9badb0' : '#a8b89b'} />
      </g>
      <MapText x="120" y="428">{t.clear ? '透明清水 · 原容器' : '原有药液 · 待观察'}</MapText>
      <path aria-label="留在房中的原外衣" d="M260 390l-15 20h35l-10-20" fill="#ae895e" />
    </EarlyMap>
    <StatusParagraph>醒后记录 {t.stage}/11 · {firstAwakeningSaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}<p>{actor === 'yan' ? '当前由本人操作。' : '老师留在古戒，本步由本人完成。'}</p>
      {sceneButton(scene, actor !== 'yan', act)}
    </BondSummary> : <BondSummary><h3>醒后全过程已归档。</h3><p>自用药力已尽，五段故事结果已记；主线属性与奖励保持，下一份待售药液须另筹。</p>
      {onConsign && <SecondaryButton onClick={onConsign}>接续首次寄售筹备</SecondaryButton>}
    </BondSummary>}
    {returnButton(onBack, '暂离醒后记录 · 保留断点')}
  </>
}
