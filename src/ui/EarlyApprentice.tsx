import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { mountainRingNear, mountainRingPlaces, mountainRingStart, moveMountainRingWalker } from '../core/early-mountain-ring'
import { earlyApprenticeBlock, submitEarlyApprentice, type ApprenticeAction } from '../core/early-apprentice'
import { apprenticeScenes } from '../content/early-apprentice'
import { earlyApprenticeSaveSummary, earlyMethodDiscussionSaveSummary } from '../core/save-preview'
import MountainWalkMap from './MountainWalkMap'

export default function EarlyApprentice({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.apprentice, scene = apprenticeScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...mountainRingStart })
  const blocked = earlyApprenticeBlock(state), near = !!scene && mountainRingNear(position, scene.place)
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveMountainRingWalker(current, direction))
  const act = (operation: ApprenticeAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyApprentice(gameStore, position, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} muted />
  return <>
    <span className="eyebrow">后山 / 援助与本人拜师</span><h2>先谈清条件，再亲自完成师徒礼。</h2>
    <p id="apprentice-help">方向键或WASD行走，近当前地点后按E。本人愿学、实际青石前行礼、听老师名字各自保存。</p>
    <MountainWalkMap label="援助拜师行走地图" helpId="apprentice-help" prefix="拜师" position={position} place={scene?.place}
      ring="floating" elderVisible={true} elderNamed={task.name === 'yaolao'} seated={task.stage >= 20} bowed={task.rite === 'bowed'}
      near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    <p role="status">援助与拜师 {task.stage}/25 · {earlyApprenticeSaveSummary(state, state.settings)}</p>
    <p>{task.stage === 25 ? '本段当时记录 · ' : ''}当前称呼：{task.name === 'yaolao' ? '药老 · 本人行礼后已听名字' : '古戒老人 · 姓名未报'} · 取气边界：{task.promise === 'permission-required' ? '未经许可不取气，本人未授许可' : '尚待老人承诺'} · 古戒：仍在老人处浮空</p>
    <p>一年七段：{task.target ? '故事目标，尚未由本段达成' : '尚未提出'} · 本人：{task.rite === 'bowed' ? '已正式行礼' : task.choice === 'willing' ? '愿学，尚未行礼' : '尚未表达愿学'}</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={near ? scene.text : `请先走近${mountainRingPlaces[scene.place].label}。`} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 1 && <SecondaryButton disabled={!near} onClick={() => act('grant-permission')}>尝试把承诺算作已授取气许可</SecondaryButton>}
      {task.stage === 4 && <SecondaryButton disabled={!near} onClick={() => act('claim-seven')}>尝试把一年目标登记为已到七段</SecondaryButton>}
      {task.stage === 14 && <SecondaryButton disabled={!near} onClick={() => act('claim-profession')}>尝试把资质登记为已成为炼药师</SecondaryButton>}
      {task.stage === 22 && <SecondaryButton disabled={!near} onClick={() => act('skip-bow')}>尝试跳过本人行礼直接签礼成</SecondaryButton>}
      {task.stage === 24 && <SecondaryButton disabled={!near} onClick={() => act('wear-ring')}>尝试在返戒之前重新佩戴古戒</SecondaryButton>}
    </section> : <section className="bond-summary"><h3>援助与本人拜师已归档。</h3><p>本人完成行礼后才听名字；未授取气许可，七段仍为当时目标，本段当时古戒仍浮空。{state.earlyTraining.methodDiscussion.stage
      ? earlyMethodDiscussionSaveSummary(state, state.settings) + '。' : '功法与准备衔接待续。'}</p></section>}
    <p className="muted">山路与核对选项为改编；故事期限没有现实计时。本段只写独立事件记录，不改变主线境界、职业、技能、生命、库存或已结算奖励。位置不保存。</p>
    <SecondaryButton onClick={onBack}>暂离援助与拜师 · 保留断点</SecondaryButton>
  </>
}
