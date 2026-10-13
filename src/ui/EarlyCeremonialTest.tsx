import { returnButton } from './Buttons'
import { hallWalkerAt } from './NativeRegions'
import { useSceneFocus } from './use-scene-focus'
import { RobeFigure } from './NativeRegions'
import { MutedParagraph } from './NativeRegions'
import { Eyebrow } from './NativeRegions'
import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import { BondSummary, StatusParagraph } from './NativeRegions'
import { MapBackground, MapText } from './MapPrimitives'
import { PrimaryButton } from './Buttons'
import { sceneHeading } from './SceneHeading'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { ceremonialPlaces, ceremonialRails, earlyCeremonialTestBlock, moveCeremonialWalker,
  nearCeremonialPlace, submitEarlyCeremonialTest } from '../core/early-ceremonial-test'
import { ceremonyPlatform } from '../core/early-ceremony-guests'
import { ceremonialTestScenes } from '../content/early-ceremonial-test'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyCeremonialTest({ state, position: entryPosition, onBack, onChallenge }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onChallenge?: () => void
}) {
  const task = state.earlyTraining.ceremonialTest, scene = ceremonialTestScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...ceremonialPlaces.waiting })
  const field = useRef<SVGSVGElement>(null), blocked = earlyCeremonialTestBlock(state, entryPosition)
  const near = scene && nearCeremonialPlace(position, scene.place, task.stage)
  useSceneFocus(field, !blocked, [blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveCeremonialWalker(current, direction, task.stage))
  function act() {
    if (document.hidden || !scene) return
    submitEarlyCeremonialTest(gameStore, entryPosition, position, { ...task, actor: scene.actor, operation: scene.operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, () => act())
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <Eyebrow>正式成年礼 / 主持与石碑复测</Eyebrow>
    <h2>先走完礼程，再由本人触碑。</h2>
    <p id="ceremonial-help">方向键或WASD行走，近地点按E接续当前动作或观察。叫名后从木台南侧阶梯登台，栏边不能穿过。半小时为故事回顾；重入从台下出发，仪式断点保留。</p>
    <EarlyMap ref={field} aria-label="正式仪式与八段验碑地图" aria-describedby="ceremonial-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#34463b" />
      <path d="M240 280 H440 V230" fill="none" stroke="#79816b" strokeWidth="34" strokeLinejoin="round" />
      <rect {...ceremonyPlatform} rx="6" fill="#89704b" stroke="#b79b65" strokeWidth="3" />
      {[100, 128, 156, 184, 212].map(y => <path key={y} d={`M304 ${y} H656`} stroke="#b39464" strokeWidth="2" />)}
      <rect x="412" y="220" width="56" height="36" fill="#a38a61" />
      {[224, 235, 246].map(y => <path key={y} d={`M412 ${y} H468`} stroke="#ddd0aa" strokeWidth="2" />)}
      {ceremonialRails.map((rect, i) => <rect key={i} {...rect} fill="#ddc18a" />)}
      {task.stage < 2 && <g aria-label="尚未叫名，阶梯未开放" role="img"><path d="M408 235 H472" stroke="#a94e45" strokeWidth="7" /><MapText x="440" y="262" fill="#f0dfb9" fontSize="11">候礼中 · 阶梯未开放</MapText></g>}
      <g transform="translate(490 132)" role="img" aria-label={task.inspected ? '二长老已亲验石碑' : task.rite === 'begun' || task.rite === 'reviewed' ? '二长老正在主持仪式' : '二长老候礼主持'}>
        <RobeFigure skin="#d7b899" cut="M-15 19 L-8-5 H8 L15 19Z" robe="#b3a48c" /><path d="M-8-13 L8-13" stroke="#dad8cb" strokeWidth="4" /><MapText y="38" fill="#ead9b6" fontSize="11">二长老</MapText>
      </g>
      {task.rite !== 'none' && task.rite !== 'ended' && <g role="img" aria-label="仪式材料由主持者使用，无玩家配方"><ellipse cx="440" cy="183" rx="29" ry="8" fill="none" stroke="#e0c295" strokeDasharray="3 5" /><path d="M404 167 Q410 146 405 134 M472 169 Q466 149 471 136" fill="none" stroke="#d5ceab" strokeWidth="2" /></g>}
      <g role="img" aria-label={task.result === 'eighth-duan' ? '正式黑碑显示斗之气八段' : task.inspected ? '正式黑碑已验，本人尚未触碑' : '正式黑碑尚待二长老检查'}>
        <path d="M555 184 V116 Q580 98 605 116 V184Z" fill="#293434" stroke={task.result === 'eighth-duan' ? '#e2c273' : '#93a492'} strokeWidth="4" />
        <MapText x="580" y="130" fill="#edd28c" fontSize="14">{task.result === 'eighth-duan' ? '八 段' : task.inspected ? '已 验' : '待 验'}</MapText>
      </g>
      <path d="M179 285 V211" stroke="#957454" strokeWidth="10" /><circle cx="179" cy="207" r="43" fill="#496b4f" />
      <g transform="translate(272 272)" aria-label="薰儿台下候礼" role="img"><RobeFigure /></g>
      <MapText x="565" y="302" fill="#ead9b6">宾客 · 萧战与雅妃</MapText>
      {Object.entries(ceremonialPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="37" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><MapText x={place.x} y={place.y + (id === 'rite' ? 44 : 57)} fill="#ead9b6" fontSize="11">{place.label}</MapText></g>)}
      {hallWalkerAt(position)}
    </EarlyMap>
    <WalkControls aria-label="正式仪式行走操作">{<WalkDirectionButtons prefix="仪式" onMove={move} />}</WalkControls>
    <StatusParagraph>正式仪式 {task.stage}/13 · {task.rite === 'none' ? '本人礼程未开始' : task.rite === 'begun' ? '二长老主持中' : task.rite === 'reviewed' ? '半小时已回顾，待结束' : '仪式已结束'} · {task.inspected ? '二长老已验碑' : '尚未验碑'} · {task.result === 'unmeasured' ? '本人尚未正式测' : '正式八段已记'}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="正式仪式步骤">{sceneHeading(scene)}<MutedParagraph>{scene.actor === 'xiaoyan' ? '当前为萧炎本人的动作。' : '当前为观察与聆听；主持者的动作由叙事呈现。'}</MutedParagraph><PrimaryButton onClick={act}>{scene.action}</PrimaryButton></BondSummary>
      : <MutedParagraph>下一步请走近{ceremonialPlaces[scene.place].label}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>仪式与正式八段已归档。</h3><p>上月预测七段、礼前夜八段感知、本次石碑八段分别保留。{state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '萧宁挑战的正式胜负已经宣布，可继续回看各轮历史。' : '萧宁的挑战及最终裁定仍待继续。'}</p>{onChallenge && <PrimaryButton onClick={onChallenge}>接续萧宁首轮 · 推拉推与待裁判</PrimaryButton>}</BondSummary>}
    <MutedParagraph>材料只作仪式观察，不构成配方或新行囊物品。八段仅本次正式往事结果，人物境界、金币、技能与已结算主线奖励保留。</MutedParagraph>
    {returnButton(onBack, "暂离正式仪式 · 保留验碑断点")}
  </>
}
