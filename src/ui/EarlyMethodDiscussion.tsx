import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { mountainRingNear, mountainRingStart, moveMountainRingWalker } from '../core/early-mountain-ring'
import { earlyMethodDiscussionBlock, submitEarlyMethodDiscussion, type MethodDiscussionAction } from '../core/early-method-discussion'
import { methodDiscussionScenes } from '../content/early-method-discussion'
import { earlyMethodDiscussionSaveSummary, earlyPreparationBriefSaveSummary } from '../core/save-preview'
import MountainWalkMap from './MountainWalkMap'

export default function EarlyMethodDiscussion({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.methodDiscussion, scene = methodDiscussionScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...mountainRingStart })
  const blocked = earlyMethodDiscussionBlock(state), near = !!scene && mountainRingNear(position, 'stone')
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveMountainRingWalker(current, direction))
  const act = (operation: MethodDiscussionAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyMethodDiscussion(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} muted />
  return <>
    <Eyebrow>青石前 / 功法说明</Eyebrow><h2>问清前置和依据，保留尚未授卷。</h2>
    <p id="method-discussion-help">方向或WASD走近青石后按E。老师说明、本人追问与暂缓授卷分别保存。</p>
    <MountainWalkMap label="功法说明行走地图" helpId="method-discussion-help" prefix="问法" position={position} place={scene ? 'stone' : undefined}
      ring="floating" elderVisible={true} elderNamed={true} seated={true} bowed={true}
      near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    <StatusParagraph>功法说明 {task.stage}/28 · {earlyMethodDiscussionSaveSummary(state, state.settings)}</StatusParagraph>
    <p>{task.stage === 28 ? '本段当时记录 · ' : ''}药老 · 本人行礼与名字已记 · 同一古戒仍浮空 · 本片段未授功法卷轴</p>
    <p>老师亲试：{task.teacherTrial === 'untried' ? '没有亲试' : task.teacherTrial === 'asked' ? '已问，待答' : '尚未询问'} · 他人尝试：{task.otherTrial === 'untried' ? '没有他人尝试' : task.otherTrial === 'asked' ? '已问，待答' : '尚未询问'}</p>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={near ? scene.text : '请先实际走近山顶青石。'} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 4 && <SecondaryButton disabled={!near} onClick={() => act('claim-profession')}>尝试把前置说明登记为炼药职业</SecondaryButton>}
      {task.stage === 13 && <SecondaryButton disabled={!near} onClick={() => act('grant-evolution')}>尝试把口头说明登记为功法已进化</SecondaryButton>}
      {task.stage === 25 && <SecondaryButton disabled={!near} onClick={() => act('claim-trial')}>尝试把文字依据登记为试验成功</SecondaryButton>}
      {task.stage === 27 && <SecondaryButton disabled={!near} onClick={() => act('claim-scroll')}>尝试在暂缓传授后取得卷轴</SecondaryButton>}
    </BondSummary> : <BondSummary><h3>功法说明已归档。</h3><p>火属性与斗者前置、未来功法的说法与未试验依据留存。本片段未授卷。{state.earlyTraining.preparationBrief.stage
      ? earlyPreparationBriefSaveSummary(state, state.settings) + '。' : '温和准备方案与老师返戒继续接续。'}</p></BondSummary>}
    <MutedParagraph>本段为原创短摘要与核对操作，只补历史事件。主线当前功法、境界、职业、资源、准备链和已结算奖励保留，位置不保存。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离功法说明 · 保留断点</SecondaryButton>
  </>
}
