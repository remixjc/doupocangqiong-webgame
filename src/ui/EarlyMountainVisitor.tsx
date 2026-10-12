import { BondSummary, StatusParagraph } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { mountainRingNear, mountainRingPlaces, mountainRingStart, moveMountainRingWalker } from '../core/early-mountain-ring'
import { earlyMountainVisitorBlock, submitEarlyMountainVisitor, type MountainVisitorAction, type MountainVisitorView } from '../core/early-mountain-visitor'
import { mountainVisitorScenes } from '../content/early-mountain-visitor'
import { earlyMountainVisitorSaveSummary } from '../core/save-preview'
import MountainWalkMap from './MountainWalkMap'
export default function EarlyMountainVisitor({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.mountainVisitor, scene = mountainVisitorScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...mountainRingStart })
  const [focus, setFocus] = useState<'stone' | null>(null)
  const blocked = earlyMountainVisitorBlock(state), observer = task.yan === 'left'
  const near = !!scene && (observer ? focus === scene.place : mountainRingNear(position, scene.place))
  const move = (direction: EarlyWalkDirection) => { if (!observer) setPosition(current => moveMountainRingWalker(current, direction)) }
  const act = (operation: MountainVisitorAction['operation']) => {
    if (!scene || document.hidden) return
    if (observer && !focus) return
    const view: MountainVisitorView = observer ? { kind: 'observer', place: focus! } : { kind: 'yan', position }
    submitEarlyMountainVisitor(gameStore, view, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} muted />
  return <>
    <span className="eyebrow">当晚 / 薰儿来访与借资问答</span><h2>先听清借资提议，次晨交卡另记。</h2>
    <p id="mountain-visitor-help">{observer ? '本人已经离山。选择青石旁薰儿的旁观焦点，记录她留山的反应。' : '方向或WASD行走，近当前地点按E。问候、本人道歉、借资提议与紫金卡收回分别保存。'}</p>
    <MountainWalkMap label="当晚来访行走与旁观地图" helpId="mountain-visitor-help" prefix="来访" position={position} place={scene?.place}
      ring="worn" elderVisible={false} purpleVisible={true} purpleNamed={task.identity === 'xuner'}
      purplePlace={task.meeting === 'near' ? 'stone' : 'ridge'} purpleCardVisible={task.purpleCard === 'displayed'}
      observerOnly={observer} near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    {observer && scene && <SecondaryButton onClick={() => setFocus('stone')}>选择薰儿留山的旁观焦点 · 青石</SecondaryButton>}
    <StatusParagraph>当晚来访 {task.stage}/26 · {earlyMountainVisitorSaveSummary(state, state.settings)}</StatusParagraph>
    <p>古戒老师仍在戒中 · 紫金卡归薰儿：{task.purpleCard === 'displayed' ? '展示中，未交付' : task.purpleCard === 'stowed' ? '已收回，未交付' : '尚未展示'} · 普通黑卡待次晨</p>
    <p>本人：{task.yan === 'left' ? '已离山，当前为旁观' : task.yan === 'descending' ? '已走下山山径，尚待离山确认' : '仍在山上'} · 本段借资尚未到账，旧采购账本保留</p>
    {scene ? <BondSummary><SceneHeading title={scene.title} text={near ? scene.text : observer ? '先选择青石旁薰儿的旁观焦点。' : `请本人先走近${mountainRingPlaces[scene.place].label}。`} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 5 && <SecondaryButton disabled={!near} onClick={() => act('claim-victory')}>尝试把薰儿评价登记为三年战已胜</SecondaryButton>}
      {task.stage === 13 && <SecondaryButton disabled={!near} onClick={() => act('claim-money')}>尝试按当晚提议领取采购资金</SecondaryButton>}
      {task.stage === 14 && <SecondaryButton disabled={!near} onClick={() => act('take-purple')}>尝试取得薰儿展示的紫金卡</SecondaryButton>}
      {task.stage === 15 && <SecondaryButton disabled={!near} onClick={() => act('claim-rank')}>尝试据五纹卡授斗灵境界</SecondaryButton>}
      {task.stage === 18 && <SecondaryButton disabled={!near} onClick={() => act('clear-debt')}>尝试按不必还的回应清空采购账</SecondaryButton>}
    </BondSummary> : <BondSummary><h3>当晚来访与问答已归档。</h3><p>本人已经离山，紫金卡仍由薰儿收回保管。当晚提议没有发款。{state.earlyTraining.morningCard.stage ? earlyMountainVisitorSaveSummary(state, state.settings) : '次晨普通黑卡和实际账本衔接继续接续。'}</p></BondSummary>}
    <p className="muted">山路比例、核对选择与短对白为改编。卡片展示不授境界；日后还款承诺不执行还款，不重置旧借资或已付记录。位置不保存。</p>
    <SecondaryButton onClick={onBack}>暂离当晚来访 · 保留断点</SecondaryButton>
  </>
}
