import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { familyVisitPlaces, moveFamilyVisitWalker, nearFamilyVisitPlace } from '../core/early-family-visit'
import { earlyFamilyCompensationBlock, submitEarlyFamilyCompensation, type FamilyCompensationAction } from '../core/early-family-compensation'
import { familyCompensationScenes } from '../content/early-family-compensation'
import FamilyHallMap from './FamilyHallMap'
import { earlyFamilyContractSaveSummary } from '../core/save-preview'

export default function EarlyFamilyCompensation({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.familyCompensation, scene = familyCompensationScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...familyVisitPlaces.entrance })
  const blocked = earlyFamilyCompensationBlock(state), near = !!scene && nearFamilyVisitPlace(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveFamilyVisitWalker(current, direction))
  const act = (operation: FamilyCompensationAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyFamilyCompensation(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} muted />
  return <>
    <span className="eyebrow">拜师之前 / 补偿与本人发言</span><h2>提议的价值，不能替本人答复。</h2>
    <p id="family-compensation-help">方向键或WASD行走，走近当前地点后按E或选择回应。交谈独立保存，可暂离再继续。</p>
    <FamilyHallMap label="补偿答复行走地图" helpId="family-compensation-help" prefix="补偿" position={position}
      place={scene?.place} box={state.earlyTraining.familyContract.box !== 'ring'}
      boxLabel={task.stage === 15 ? '历史补偿交涉时展示的玉匣' : '仍在来客席的玉匣'} near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    <p role="status">交涉 {task.stage}/15 · {task.objection === 'spoken' ? '本人已提出异议' : '尚待本人发言'} · {task.consent === 'not-given' ? '祖父未同意' : task.consent === 'asked' ? '已询问，尚待答复' : '祖辈同意尚未询问'} · {task.extra === 'offered' ? '追加条件仅提议、未领物' : '追加条件尚未提出'}</p>
    {scene ? <section className="bond-summary">
      <SceneHeading title={scene.title} text={near ? scene.text : `请先走近${familyVisitPlaces[scene.place].label}，继续这一段。`} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {near && task.stage === 1 && <SecondaryButton onClick={() => act('claim-alchemist')}>把读懂条件算作已成为炼药师</SecondaryButton>}
      {near && task.stage === 13 && <>
        <SecondaryButton onClick={() => act('take-extra')}>把追加三枚登记为已领取</SecondaryButton>
        <SecondaryButton onClick={() => act('join-now')}>把提议登记为已入宗学功法</SecondaryButton>
      </>}
    </section> : <section className="bond-summary"><h3>补偿交涉前段已归档。</h3><p>当时玉匣与追加条件均未接取；{state.earlyTraining.familyContract.stage > 0
      ? earlyFamilyContractSaveSummary(state, state.settings) + '。'
      : '文书与三年约定待续，萧炎仍在厅内。'}既有主线结局与奖励保留。</p></section>}
    <p className="muted">厅院比例、行走步长与核对选项是游戏改编。此次知识回顾不授予职业、功法或能力，不发丹药、金币或关系奖励。事件断点保存，行走位置不保存。</p>
    <SecondaryButton onClick={onBack}>暂离补偿交涉 · 保留断点</SecondaryButton>
  </>
}
