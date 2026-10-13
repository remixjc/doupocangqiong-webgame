import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { HallWalker, TimingRange } from './NativeRegions'
import { TimingMeter } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { ceremonialRails } from '../core/early-ceremonial-test'
import { ceremonyPlatform } from '../core/early-ceremony-guests'
import { earlyNingFirstBlock, ningPlaces, ningFirstOperation, moveNingWalker, nearNingPlace,
  submitEarlyNingFirst, type NingFirstAction } from '../core/early-ning-first'
import { ningFirstScenes } from '../content/early-ning-first'
import { startBrowserSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyNingFirst({ state, position: entryPosition, onBack, onSecond }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onSecond?: () => void
}) {
  const task = state.earlyTraining.ningFirst, scene = ningFirstScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...ningPlaces.waiting })
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null), blocked = earlyNingFirstBlock(state, entryPosition)
  const training = task.stage === 6, near = scene && nearNingPlace(position, scene.place), steady = state.settings.reducedMotion
  useSceneFocus(field, !blocked, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!training || !near || steady || paused || blocked) return
    return startBrowserSupervisionPointer(
    setMarker, () => setPaused(true))
  }, [training, near, steady, paused, blocked, task.beats])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveNingWalker(current, direction))
  function act(operation: NingFirstAction['operation']) {
    if (document.hidden || !scene || training && paused && operation !== 'stop') return
    submitEarlyNingFirst(gameStore, entryPosition, position, { ...task, actor: scene.actor, operation,
      marker: training && operation !== 'stop' ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene && !training ? () => act(scene.operation) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  const ningX = task.stage >= 7 ? 550 : task.beats === 1 ? 610 : task.beats === 2 ? 478 : 535
  return <>
    <Eyebrow>正式礼挑战 / 萧宁首轮</Eyebrow>
    <h2>先推、再拉、再推，倒地仍待裁定。</h2>
    <p id="ning-first-help">方向键或WASD行走，近地点按E接静态步骤。沿南侧阶梯登台，首轮用35%–65%窗口选择动作；错序、错时机或停下免费重开。重入从台下出发，推拉断点保留。</p>
    <EarlyMap ref={field} aria-label="萧宁首轮推拉推地图" aria-describedby="ning-first-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#34463b" />
      <path d="M240 280 H440 V240" fill="none" stroke="#79816b" strokeWidth="32" strokeLinejoin="round" />
      <rect {...ceremonyPlatform} rx="6" fill="#89704b" stroke="#b79b65" strokeWidth="3" />
      {[100, 128, 156, 184, 212].map(y => <path key={y} d={`M304 ${y} H656`} stroke="#b39464" strokeWidth="2" />)}
      <rect x="412" y="220" width="56" height="36" fill="#a38a61" />
      {ceremonialRails.map((rect, i) => <rect key={i} {...rect} fill="#ddc18a" />)}
      <path d="M592 181 V114 Q613 99 634 114 V181Z" fill="#293434" stroke="#93a492" strokeWidth="3" />
      <MapText x="613" y="130" fill="#e2c273">复测已记</MapText>
      {task.stage >= 3 && <g transform={`translate(${ningX} ${task.stage >= 7 ? 181 : 146}) rotate(${task.stage >= 7 ? 83 : 0})`} role="img" aria-label={task.verdict === 'pending' ? state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '首轮倒地的历史画面，最终胜负已宣布' : '萧宁首轮倒地，裁判尚未最终宣布' : task.beats === 1 ? '萧宁被首次推退' : task.beats === 2 ? '萧宁被吸掌拉近，准备推出' : '萧宁来袭，药物尚未服用'}>
        <RobeFigure robe="#bc786b" /><path d="M-8-3 L-25-6" stroke="#e1bba0" strokeWidth="5" />
      </g>}
      {training && <path d={task.beats === 1 ? 'M607 173 Q535 190 468 173' : 'M468 173 Q535 155 601 173'} fill="none" stroke="#ead093" strokeWidth="3" strokeDasharray="6 5" />}
      <MapText x="544" y="204" fill="#ead9b6" fontSize="11">萧宁 · {task.verdict === 'pending' ? '倒地待裁判' : '首轮交锋'}</MapText>
      <g transform="translate(272 272)" aria-label="薰儿台下观礼" role="img"><RobeFigure /></g>
      {task.stage >= 1 && task.stage <= 2 && <g transform="translate(174 271)" role="img" aria-label={task.pill === 'ning-held' ? '场边镜头：萧宁持有增气药物，未服用' : '场边镜头：萧玉准备交药'}><RobeFigure robe="#9e83a6" /><circle cx="20" cy="-1" r="5" fill="#8bbc87" /></g>}
      {Object.entries(ningPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="37" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><MapText x={place.x} y={place.y + (id === 'arena' ? 38 : 55)} fill="#ead9b6" fontSize="11">{place.label}</MapText></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><HallWalker /></g>
    </EarlyMap>
    <WalkControls aria-label="萧宁首轮行走操作">{<WalkDirectionButtons prefix="首轮" onMove={move} />}</WalkControls>
    <StatusParagraph>萧宁首轮 {task.stage}/10 · 动作 {task.beats}/3 · 重开 {task.attempts} 次 · {task.pill === 'unseen' ? '场边交付未记' : '药物由萧宁持有未服'} · {task.verdict === 'pending' ? state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '首轮当时待裁判，最终胜负已宣布' : '首轮倒地，待最终裁判' : '尚未完成首轮'}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="萧宁首轮步骤"><SceneHeading title={scene.title} text={scene.text} />
      {training ? <>
        {steady && <TimingRange label="萧宁首轮时机" value={marker} onChange={event => setMarker(Number(event.target.value))}><small>方向键调至35%–65%，当前{Math.round(marker * 100)}%。</small></TimingRange>}
        <TimingMeter label="萧宁首轮时机指针" marker={marker} />
        {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停萧宁首轮时机</SecondaryButton>}
        {paused && <><StatusParagraph>时机已暂停，需明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续萧宁首轮 · 恢复时机</SecondaryButton></>}
        <p>{task.beats === 0 ? '先吹火掌推退来袭。' : task.beats === 1 ? '再吸掌拉近对手。' : '最后吹火掌推出，仍须等待裁判。'}</p>
        <WalkControls>
          <PrimaryButton disabled={paused} onClick={() => act(ningFirstOperation(task))}>{task.beats === 0 ? '吹火掌 · 首次推退' : task.beats === 1 ? '吸掌 · 拉近萧宁' : '吹火掌 · 最后推出'}</PrimaryButton>
          <SecondaryButton disabled={paused} onClick={() => act(task.beats === 1 ? 'push' : 'pull')}>{task.beats === 1 ? '尝试直接推 · 尚未拉近' : '尝试吸掌 · 当前次序不符'}</SecondaryButton>
          <SecondaryButton disabled={paused} onClick={() => act('octane')}>尝试八极崩 · 首轮次序不符</SecondaryButton>
        </WalkControls>
      </> : <PrimaryButton onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>}
    </BondSummary> : <MutedParagraph>下一步请走近{ningPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>首轮倒地历史已记。</h3><p>{state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '正式胜负已宣布，可回看违规再攻。首轮历史仍保留当时待裁判及药物未服的记录。' : '这份记录没有最终胜负，也不能领取首通奖励。后续违规增力再攻、迎击与正式裁定继续接续。'}</p>{onSecond && <PrimaryButton onClick={onSecond}>接续违规再攻 · 八极崩与追加拳击</PrimaryButton>}</BondSummary>}
    {training && <SecondaryButton onClick={() => act('stop')}>停下本轮交锋 · 免费重新准备</SecondaryButton>}
    <MutedParagraph>药物是场边叙事视角，尚未服用且不进入玩家行囊。动作时机和地图为原创；技能、钱账、关系、原封瓶与首通奖励保留。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离萧宁首轮 · 保留推拉断点</SecondaryButton>
  </>
}
