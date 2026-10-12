import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { earlyMountainRingBlock, mountainRingPlaces, mountainRingStart, mountainRingNear,
  moveMountainRingWalker, submitEarlyMountainRing, type MountainRingAction } from '../core/early-mountain-ring'
import { mountainRingScenes } from '../content/early-mountain-ring'
import { earlyMountainRingSaveSummary, earlyApprenticeSaveSummary } from '../core/save-preview'
import MountainWalkMap from './MountainWalkMap'

export default function EarlyMountainRing({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.mountainRing, scene = mountainRingScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...mountainRingStart })
  const blocked = earlyMountainRingBlock(state), near = !!scene && mountainRingNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveMountainRingWalker(current, direction))
  const act = (operation: MountainRingAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyMountainRing(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} muted />
  return <>
    <span className="eyebrow">拜师之前 / 后山与古戒</span><h2>声音从哪里来，古戒又去了哪里。</h2>
    <p id="mountain-ring-help">方向键或WASD沿安全山径行走，近当前地点后按E或回应。崖外和山石会阻挡，不提供跳崖操作。</p>
    <MountainWalkMap label="后山古戒行走地图" helpId="mountain-ring-help" position={position} place={scene?.place}
      ring={task.ring} elderVisible={task.elder === 'visible'} near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    <p role="status">后山与古戒 {task.stage}/21 · {earlyMountainRingSaveSummary(state, state.settings)}</p>
    <p>{task.stage === 21 ? '本段当时记录 · ' : ''}古戒：{task.ring === 'floating' ? '老人处浮空，尚未再佩戴' : task.ring === 'thrown' ? '已抛出，尚未返回' : '仍佩戴在右手'} · 身份：未公开 · 今后取气：{task.future === 'asked' ? '本人已询问，尚待答复' : '尚未询问'}</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={near ? scene.text : `请先走近${mountainRingPlaces[scene.place].label}。`} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 4 && <SecondaryButton disabled={!near} onClick={() => act('claim-cause')}>尝试直接登记流失原因</SecondaryButton>}
      {task.stage === 14 && <SecondaryButton disabled={!near} onClick={() => act('wear-now')}>尝试在返回之前再佩戴古戒</SecondaryButton>}
      {task.stage === 18 && <SecondaryButton disabled={!near} onClick={() => act('claim-recovery')}>尝试把得知原因算作资源全恢复</SecondaryButton>}
      {task.stage === 20 && <SecondaryButton disabled={!near} onClick={() => act('claim-promise')}>尝试把问话算作已经承诺或拜师</SecondaryButton>}
    </section> : <section className="bond-summary"><h3>后山与古戒前段已归档。</h3><p>当时老人未公开姓名，同一古戒在他身旁浮空。{state.earlyTraining.apprentice.stage
      ? earlyApprenticeSaveSummary(state, state.settings) + '。' : '取气边界答复、期限援助谈判与本人行礼拜师继续接续。'}</p></section>}
    <p className="muted">山路比例、障碍与20步长/38接近距离为原创。抛戒只作抽象回顾，事件不删除主线装备，不改变生命、资源、技能或已结算奖励。位置不保存，断点保存。</p>
    <SecondaryButton onClick={onBack}>暂离后山与古戒 · 保留断点</SecondaryButton>
  </>
}
