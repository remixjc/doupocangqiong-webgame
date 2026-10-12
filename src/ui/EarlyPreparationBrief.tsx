import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { mountainRingNear, mountainRingPlaces, mountainRingStart, moveMountainRingWalker } from '../core/early-mountain-ring'
import { earlyPreparationBriefBlock, submitEarlyPreparationBrief, type PreparationBriefAction } from '../core/early-preparation-brief'
import { preparationBriefScenes } from '../content/early-preparation-brief'
import { earlyPreparationBriefSaveSummary, earlyMountainVisitorSaveSummary } from '../core/save-preview'
import MountainWalkMap from './MountainWalkMap'
export default function EarlyPreparationBrief({ state, onBack, onRoute }: { state: GameState; onBack: () => void; onRoute: () => void }) {
  const task = state.earlyTraining.preparationBrief, scene = preparationBriefScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...mountainRingStart })
  const blocked = earlyPreparationBriefBlock(state), near = !!scene && mountainRingNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveMountainRingWalker(current, direction))
  const act = (operation: PreparationBriefAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyPreparationBrief(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <><p className="muted">{blocked}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
  return <>
    <span className="eyebrow">后山 / 温和方案与正式返戒</span><h2>记清准备要求，再看同一古戒返手。</h2>
    <p id="preparation-brief-help">方向或WASD行走，近当前地点按E。老师入戒、古戒返手与借资打算分开保存。</p>
    <MountainWalkMap label="准备返戒行走地图" helpId="preparation-brief-help" prefix="返戒" position={position} place={scene?.place}
      ring={task.ring} elderVisible={task.elder === 'outside'} elderNamed={true} seated={true} bowed={true}
      purpleVisible={task.visitor === 'purple-figure'} near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    <p role="status">准备与返戒 {task.stage}/20 · {earlyPreparationBriefSaveSummary(state, state.settings)}</p>
    <p>老师：{task.elder === 'in-ring' ? '已进入同一古戒' : '仍在青石旁'} · 古戒：{task.ring === 'worn' ? '同一古戒已返手佩戴' : '仍浮空，尚未返手'}</p>
    <p>历史准备单：主药{task.main}株 / 辅药{task.auxiliary}株 / 一阶木核{task.woodCore}枚 · 只记要求，任务袋和收据保持</p>
    {scene ? <section className="bond-summary"><h3>{scene.title}</h3><p>{near ? scene.text : `请先走近${mountainRingPlaces[scene.place].label}。`}</p>
      <button className="primary" disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage === 12 && <button className="secondary" disabled={!near} onClick={() => act('claim-materials')}>尝试把准备单登记为材料已取得</button>}
      {task.stage === 14 && <button className="secondary" disabled={!near} onClick={() => act('wear-early')}>尝试把老师入戒当作古戒已返手</button>}
      {task.stage === 18 && <button className="secondary" disabled={!near} onClick={() => act('claim-money')}>尝试按借资打算领取资金</button>}
      {task.stage === 19 && <button className="secondary" disabled={!near} onClick={() => act('claim-liquid')}>尝试把温和方案登记为药液已调制</button>}
    </section> : <section className="bond-summary"><h3>准备说明与正式返戒已归档。</h3><p>老师入戒、同戒返手、资金顾虑与紫衣来人分别留存。已有借资/采购/药液进度和任务袋保持。{state.earlyTraining.mountainVisitor.stage ? earlyMountainVisitorSaveSummary(state, state.settings) + '。' : ''}</p>
      <button className="primary" onClick={onRoute}>接续既有准备路线 · 接取与借资</button>
    </section>}
    <p className="muted">历史准备要求不代表新增库存；借资打算不代表到账。本段不自动接取或重置已有准备，不增发资金，不改主线装备与已结算奖励。位置不保存。</p>
    <button className="secondary" onClick={onBack}>暂离准备与返戒 · 保留断点</button>
  </>
}
