import { useRef, useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { firstRecoveryBlock, submitFirstRecovery } from '../core/first-recovery'
import { firstRecoveryScenes } from '../content/first-recovery'
import { earlySnapshots, externalLimitSnapshotKeys } from '../core/early-snapshots'
import { firstRecoverySaveSummary } from '../core/save-preview'
import { useSceneFocus } from './use-scene-focus'
import { EarlyMap, MapBackground, MapText } from './MapPrimitives'
import { actorButton, returnButton, sceneButton } from './Buttons'
import { BondSummary, Eyebrow, RobeFigure, StatusParagraph, WalkControls } from './NativeRegions'
import { sceneHeading } from './SceneHeading'
import { walkKey } from './walk-key'
import WalkDirectionButtons from './WalkDirectionButtons'
import HistoryBlocked from './HistoryBlocked'
import './early-walk.css'
export default function FirstRecovery({ state, position, onBack }: { state: GameState; position: EarlyWalkPosition; onBack: () => void }) {
  const t = state.earlyTraining.firstRecovery, scene = firstRecoveryScenes[t.stage]
  const [actor, setActor] = useState<'yan' | 'teacher'>('yan'), field = useRef<SVGSVGElement>(null)
  useSceneFocus(field, true, [])
  const blocked = firstRecoveryBlock(state, position), moving = t.stage === 1 && t.walk < 4
  const act = (operation: string) => {
    if (document.hidden) return
    submitFirstRecovery(gameStore, position, t, t.location, { ...t, ...earlySnapshots(state, externalLimitSnapshotKeys), actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <Eyebrow>回房 / 同一药液细分恢复</Eyebrow><h2>把疲惫交给原有药液，逐步记下恢复。</h2>
    <p>从原房门向左走近同一容器。方向或按钮保存每一路步，E执行当前动作。睡眠是故事记录，不发等待收益；醒后耗尽与五段另续。</p>
    {t.record === 'recalled' && <p>本次是详细历史回顾；旧耗尽、五段、物资和奖励保持。</p>}
    <WalkControls>{actorButton(actor, setActor, 'yan', '同液恢复本人操作')}{actorButton(actor, setActor, 'teacher', '旁观同一古戒')}</WalkControls>
    <EarlyMap ref={field} aria-label="同液恢复房中地图" viewBox="70 290 290 145" onKeyDown={event => {
      if (event.repeat || event.shiftKey) return
      walkKey(event, direction => { if (moving && actor === 'yan') act(`move-${direction}`) },
        () => { if (scene && actor === 'yan' && !moving) act(scene.operation) })
    }}>
      <MapBackground /><rect x="80" y="320" width="265" height="103" fill="#605642" />
      <path d="M300 340V406" stroke="#b69c76" strokeWidth="6" /><MapText x="302" y="334">原房门</MapText>
      <rect x="180" y="302" width="60" height="25" fill={t.awake ? '#edd8a0' : '#7b9181'} />
      {t.awake && <path d="M180 327L140 410H280L240 327Z" fill="#f2daa623" />}
      <g aria-label="同液恢复本人独立位置" transform={`translate(${t.x} ${t.y})`}>
        <RobeFigure robe={t.robe === 'on' ? '#ae895e' : '#b9c0a4'} skin="#edc79f" />
        {t.eyes === 'closed' && <path d="M-8 0h5m6 0h5" stroke="#423b32" strokeWidth="2" />}
        <MapText y="-28">{t.asleep ? '睡眠中' : t.awake ? '已醒，仍在容器' : '萧炎本人'}</MapText>
      </g>
      <g aria-label="原有木质盛水容器" transform="translate(120 390)">
        <path d="M-30-5L-25 30Q0 40 25 30L30-5" fill="#806747" stroke="#c6aa79" />
        <ellipse rx="30" ry="9" fill={t.record === 'recalled' && state.earlyTraining.recovery.energy === 'spent' ? '#9badb0' : t.pale ? '#a8b89b' : '#75ad87'} />
      </g>
      <MapText x="120" y="428">同一自用容器</MapText>
      {t.robe === 'off' && <path aria-label="留在房中的外衣" d="M260 390l-15 20h35l-10-20" fill="#ae895e" />}
    </EarlyMap>
    {moving && <WalkControls><WalkDirectionButtons prefix="同液恢复" onMove={direction => { if (actor === 'yan') act(`move-${direction}`) }} /></WalkControls>}
    <StatusParagraph>同液恢复 {t.stage}/11 · 原房路步{t.walk}/4 · {firstRecoverySaveSummary(state, state.settings)}</StatusParagraph>
    {scene ? <BondSummary>{sceneHeading(scene)}<p>{actor !== 'yan' ? '老师已经返戒，本步由本人完成。' : moving ? '先向左走完原房路步。' : '当前由本人操作。'}</p>
      {sceneButton(scene, actor !== 'yan' || moving, act)}
    </BondSummary> : <BondSummary><h3>醒来断点已保存。</h3><p>仍在原容器内；舒展、离容器、清水与耗尽、感知五段另续，未发主线属性或奖励。</p></BondSummary>}
    {returnButton(onBack, '暂离同液恢复 · 保留断点')}
  </>
}
