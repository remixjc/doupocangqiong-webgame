import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import HistoryBlocked from './HistoryBlocked'
import { useState } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { gameStore } from '../core/store'
import { familyVisitPlaces, moveFamilyVisitWalker } from '../core/early-family-visit'
import { earlyFamilyContractBlock, familyContractExtraPlaces, familyContractPlaces, familyContractNear,
  submitEarlyFamilyContract, type FamilyContractAction, type FamilyContractView } from '../core/early-family-contract'
import { familyContractScenes } from '../content/early-family-contract'
import { earlyFamilyContractSaveSummary, earlyMountainRingSaveSummary } from '../core/save-preview'
import FamilyHallMap from './FamilyHallMap'

export default function EarlyFamilyContract({ state, onBack }: { state: GameState; onBack: () => void }) {
  const task = state.earlyTraining.familyContract, scene = familyContractScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...familyVisitPlaces.entrance })
  const [focus, setFocus] = useState<keyof typeof familyContractPlaces>('outside')
  const observer = task.yan === 'left', blocked = earlyFamilyContractBlock(state)
  const view: FamilyContractView = observer ? { kind: 'observer', place: focus } : { kind: 'yan', position }
  const near = !!scene && (observer ? focus === scene.place : familyContractNear(position, scene.place))
  const move = (direction: EarlyWalkDirection) => { if (!observer) setPosition(current => moveFamilyVisitWalker(current, direction)) }
  const act = (operation: FamilyContractAction['operation']) => {
    if (!scene || document.hidden) return
    submitEarlyFamilyContract(gameStore, view, { ...task, actor: scene.actor, operation })
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} muted />
  return <>
    <span className="eyebrow">拜师之前 / 文书与双方离厅</span><h2>亲手写下决定，再面对三年之后。</h2>
    <p id="family-contract-help">{observer
      ? '萧炎已离厅。选择旁观焦点，再按E或确认当前片段；视角移动不会让本人回厅。'
      : '方向键或WASD行走，走近当前地点后按E。写成、置桌、向父亲承诺与实际离厅分别保存。'}</p>
    <FamilyHallMap label={observer ? '文书离厅旁观地图' : '文书离厅行走地图'} helpId="family-contract-help" prefix="文书"
      position={position} place={scene?.place} box={task.box !== 'ring'} boxLabel={task.box === 'returned' ? '已退回待葛叶接住的同一玉匣' : '仍未接取的来客玉匣'}
      paper={task.paper} departed={task.guests === 'left'} extraPlaces={familyContractExtraPlaces} observer={observer} focusPlace={focus}
      near={near} onMove={move} onInteract={() => { if (scene) act(scene.operation) }} />
    {observer && scene && <div className="early-walk-controls" aria-label="旁观焦点选择">
      {(['guests', 'father', 'entrance', 'xuner', 'outside'] as const).map(id =>
        <SecondaryButton key={id} aria-pressed={focus === id} onClick={() => setFocus(id)}>旁观 · {familyContractPlaces[id].label}</SecondaryButton>)}
    </div>}
    <p role="status">文书与离厅 {task.stage}/33 · {earlyFamilyContractSaveSummary(state, state.settings)}</p>
    <p>三年条件：{task.challenge === 'pledged' ? '本人已向父亲承诺赴约' : task.challenge === 'renewed' ? '再次约定，尚待本人向父亲承诺' : task.challenge === 'proposed' ? '仅提出，尚未亲口承诺' : '尚未提出'} · 文书：{{
      none: '尚无', preparing: '备纸未写成', written: '写成未标记', marked: '有印记未置桌', table: '同一文书已置桌', nalan: '同一文书由纳兰持有',
    }[task.paper]} · 玉匣：{task.box === 'ring' ? '已回葛叶纳戒' : task.box === 'returned' ? '已退回，尚未收入纳戒' : '未接取，仍属来客'}</p>
    {scene ? <section className="bond-summary">
      <SceneHeading title={scene.title} text={near ? scene.text : observer
        ? `请将旁观焦点转到${familyContractPlaces[scene.place].label}。` : `请先走近${familyContractPlaces[scene.place].label}。`} />
      <PrimaryButton disabled={!near} onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>
      {task.stage === 7 && <>
        <SecondaryButton disabled={!near} onClick={() => act('start-duel')}>尝试今日直接决斗</SecondaryButton>
        <SecondaryButton disabled={!near} onClick={() => act('claim-victory')}>尝试提前登记胜利领奖</SecondaryButton>
      </>}
      {task.stage === 19 && <SecondaryButton disabled={!near} onClick={() => act('give-paper-father')}>尝试把文书交给父亲</SecondaryButton>}
      {task.stage === 27 && <SecondaryButton disabled={!near} onClick={() => act('take-box')}>尝试先把玉匣收入行囊</SecondaryButton>}
    </section> : <section className="bond-summary"><h3>文书与双方离厅已归档。</h3>
      <p>萧炎亲口承诺赴约后已离厅；纳兰持同一文书，葛叶收回玉匣并带来客离去。{state.earlyTraining.mountainRing.stage
        ? earlyMountainRingSaveSummary(state, state.settings) + '。' : '后山交涉尚待接续。'}</p></section>}
    <p className="muted">厅院布局、行走与核对选项为游戏改编；印记只作抽象回顾。本段不改变主线能力、行囊、生命或已结算奖励。事件断点保存，位置与旁观焦点不保存。</p>
    <SecondaryButton onClick={onBack}>暂离文书与离厅 · 保留断点</SecondaryButton>
  </>
}
