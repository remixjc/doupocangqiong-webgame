import SceneHeading from './SceneHeading'
import WalkDirectionButtons from './WalkDirectionButtons'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition, EarlyWalkDirection } from '../core/early-walk'
import { ceremonyPlatform } from '../core/early-ceremony-guests'
import { ceremonialRails } from '../core/early-ceremonial-test'
import { moveNingWalker } from '../core/early-ning-first'
import { earlyCeremonyVerdictBlock, verdictPlaces, nearVerdictPlace, submitEarlyCeremonyVerdict, type CeremonyVerdictAction } from '../core/early-ceremony-verdict'
import { ceremonyVerdictScenes } from '../content/early-ceremony-verdict'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyCeremonyVerdict({ state, position: entryPosition, onBack }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void
}) {
  const task = state.earlyTraining.ceremonyVerdict, scene = ceremonyVerdictScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...verdictPlaces.stairs })
  const field = useRef<SVGSVGElement>(null), blocked = earlyCeremonyVerdictBlock(state, entryPosition)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveNingWalker(current, direction))
  function act(operation: CeremonyVerdictAction['operation']) {
    if (document.hidden || !scene) return
    submitEarlyCeremonyVerdict(gameStore, entryPosition, position, { ...task, actor: scene.actor, operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene ? () => act(scene.operation) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  return <>
    <span className="eyebrow">正式礼 / 双请求、裁定与离场</span>
    <h2>裁判宣布之后，礼程仍要继续。</h2>
    <p id="ceremony-verdict-help">方向键或WASD行走，靠近当前地点按E或下方按钮。三个月是萧宁的叙事处分，五天是功法阁的故事安排；都不让玩家现实等待。关闭与刷新保留每一步，重入从阶梯出发。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="成人礼正式裁定地图" aria-describedby="ceremony-verdict-help" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#34463b" />
      <path d="M160 340 L240 280 H676 M440 280 V240" fill="none" stroke="#79816b" strokeWidth="28" strokeLinejoin="round" />
      <rect {...ceremonyPlatform} rx="6" fill="#89704b" stroke="#b79b65" strokeWidth="3" />
      {ceremonialRails.map((rect, i) => <rect key={i} {...rect} fill="#ddc18a" />)}
      <rect x="412" y="220" width="56" height="36" fill="#a38a61" />
      {task.stage < 8 && <g transform="translate(440 160)" role="img" aria-label={task.verdict === 'xiaoyan' ? '二长老已经正式宣布萧炎获胜' : '二长老尚未宣布胜负'}>
        <circle cy="-13" r="8" fill="#d9b99d" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#b6bba8" />
      </g>}
      {task.yu !== 'none' && task.stage < 5 && <g transform="translate(525 168)" role="img" aria-label={task.yu === 'blocked' ? '萧玉挑战资格已被否定' : '萧玉仅提出挑战请求'}><circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#9e83a6" /></g>}
      <g transform={`translate(${task.xuner === 'requested' || task.stage === 9 ? 360 : task.stage >= 11 ? 195 : 270} ${task.xuner === 'requested' || task.stage === 9 ? 168 : task.stage >= 11 ? 335 : 280})`} role="img" aria-label={task.xuner === 'requested' ? '薰儿提出代战，尚未获准' : task.stage === 9 ? '薰儿参加自己的仪式' : '薰儿观礼或离场同行'}><circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#73a98a" /></g>
      {task.stage < 2 && <g transform="translate(676 280) rotate(83)" role="img" aria-label="场外昏迷萧宁，交由族人照看"><circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#bc786b" /></g>}
      {Object.entries(verdictPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="37" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><text x={place.x} y={place.y + 50} textAnchor="middle" fill="#ead9b6" fontSize="11">{place.label}</text></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
    </svg>
    <div className="early-walk-controls" aria-label="正式裁定行走操作">{<WalkDirectionButtons prefix="裁定" onMove={move} />}</div>
    <p role="status">礼终裁定 {task.stage}/16 · {task.yu === 'blocked' ? '萧玉请求被阻止' : '萧玉请求待处理'} · {task.xuner === 'blocked' ? '薰儿代战被阻止' : '薰儿请求待处理'} · {task.penalty === 3 ? '萧宁禁足三个月已宣布' : '处分待宣布'} · {task.verdict === 'xiaoyan' ? '正式萧炎获胜' : '胜负尚待宣布'} · {task.rite === 'ended' ? '午后礼终' : '礼程未结束'}</p>
    {scene ? nearVerdictPlace(position, scene.place) ? <section className="bond-summary" aria-label="正式裁定步骤">
      <SceneHeading title={scene.title} text={scene.text} />
      <button className="primary" onClick={() => act(scene.operation)}>{scene.action}</button>
      {task.stage >= 2 && task.stage <= 4 && <button className="secondary" onClick={() => act('fight')}>尝试第三场 · 不符合裁判规则</button>}
      {task.technique === 'offered' && <button className="secondary" onClick={() => act('take-technique')}>尝试收斗技 · 尚未传授</button>}
      {task.method === 'offered' && <button className="secondary" onClick={() => act('take-method')}>尝试领功法 · 只有提议</button>}
    </section> : <p className="muted">下一步请走近{verdictPlaces[scene.place].label}：{scene.title}。</p>
      : <section className="bond-summary"><h3>正式胜负、礼终与离场已归档。</h3><p>萧玉和薰儿两次请求被阻止，萧宁禁足三个月，二长老正式宣布萧炎获胜。其他仪式与午后礼终已记，两项支持均婉拒；五天后功法阁是后续安排，没有新增功法或重复奖励。</p></section>}
    <p className="muted">地图布局与步长为原创，主线、钱账、药液、房柜、人物关系和已结算奖励保留。</p>
    <button className="secondary" onClick={onBack}>暂离正式裁定 · 保留礼终断点</button>
  </>
}
