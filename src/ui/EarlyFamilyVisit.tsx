import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { earlyFamilyVisitBlock, familyVisitPlaces, moveFamilyVisitWalker, nearFamilyVisitPlace, submitEarlyFamilyVisit, type FamilyVisitAction } from '../core/early-family-visit'
import { familyVisitScenes } from '../content/early-family-visit'
import FamilyHallMap from './FamilyHallMap'
import { earlyFamilyContractSaveSummary } from '../core/save-preview'

export default function EarlyFamilyVisit({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.familyVisit, scene = familyVisitScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...familyVisitPlaces.room })
  const blocked = earlyFamilyVisitBlock(state)
  const near = !!scene && nearFamilyVisitPlace(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveFamilyVisitWalker(current, direction))
  const act = (operation: FamilyVisitAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyFamilyVisit(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <><p className="muted">{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">拜师之前 / 家族来访</span><h2>这一场来访，从入席说起。</h2>
    <p id="family-visit-help">方向键或WASD行走，靠近当前人物或地点后按E。每次交谈与观察独立保存，可暂离后继续。</p>
    <FamilyHallMap label="家族来访行走地图" helpId="family-visit-help" prefix="来访" position={position}
      place={scene?.place} box={task.box === 'presented' && state.earlyTraining.familyContract.box !== 'ring'}
      boxLabel={task.stage === 17 ? '历史来访时展示的玉匣' : '仍在来客席的玉匣'} near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    <p role="status">来访 {task.stage}/17 · {task.seat === 'shared' ? '已在薰儿身旁落座' : task.seat === 'missing' ? '自己的座位遗漏' : '尚未察看座位'} · {task.request === 'spoken' ? '退婚请求已公开' : '来意尚未说出'} · {task.pressure === 'raised' ? '双方戒备、尚未交手' : task.pressure === 'withdrawn' ? '父亲已收势' : '尚未起冲突'}</p>
    {scene ? <section className="bond-summary">
      <h3>{scene.title}</h3><p>{near ? scene.text : `请先走近${familyVisitPlaces[scene.place].label}，继续这一段。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {near && task.stage === 12 && <button className="secondary" onClick={() => act('accept-for-father')}>尝试替父亲直接应允</button>}
      {near && task.stage === 15 && <button className="secondary" onClick={() => act('take-box')}>尝试直接收取玉匣</button>}
    </section> : <section className="bond-summary"><h3>来访前半程已归档。</h3><p>{state.earlyTraining.familyContract.stage > 0
      ? `当时玉匣仅展示；${earlyFamilyContractSaveSummary(state, state.settings)}。`
      : state.earlyTraining.familyCompensation.stage > 0
      ? `当时玉匣仅展示；后续补偿交涉${state.earlyTraining.familyCompensation.stage === 15 ? '已归档' : '进行中'}，文书、三年约定与实际离厅待续。`
      : '玉匣仍属来客，补偿尚未答复；文书、三年约定与实际离厅需要接续。'}现有第二章奖励和拜师记录保留。</p></section>}
    <p className="muted">厅院布局与20步长为游戏改编。这里回到拜师前的故事，不重发丹药、功法、金币、境界或主线奖励；暂离会保留事件，行走位置不保存。</p>
    <button className="secondary" onClick={onBack}>暂离家族来访 · 保留断点</button>
  </>
}
