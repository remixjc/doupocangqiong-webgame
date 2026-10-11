import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { earlyPreliminaryBlock, preliminaryPlaces, preliminaryStart, preliminaryObstacles, movePreliminaryWalker, nearPreliminaryPlace, submitEarlyPreliminary } from '../core/early-preliminary'
import { preliminaryScenes } from '../content/early-preliminary'
import { gameStore } from '../core/store'
import './early-walk.css'

export default function EarlyPreliminary({ state, position: entryPosition, onBack, onChallenge }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onChallenge?: () => void
}) {
  const task = state.earlyTraining.preliminary, scene = preliminaryScenes[task.stage]
  const [position, setPosition] = useState({ ...preliminaryStart })
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyPreliminaryBlock(state, entryPosition), near = scene && nearPreliminaryPlace(position, scene.place)
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => movePreliminaryWalker(current, direction))
  function act() {
    if (document.hidden || !scene) return
    submitEarlyPreliminary(gameStore, entryPosition, position, { ...task, actor: scene.actor, operation: scene.operation })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const directions: Record<string, EarlyWalkDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    const direction = directions[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (direction) { event.preventDefault(); move(direction) }
    if (event.key.toLowerCase() === 'e') { event.preventDefault(); act() }
  }
  if (blocked) return <p>{blocked}</p>
  const lastResult = task.yan !== 'unmeasured' ? '萧炎 · 七段' : task.xuner !== 'unmeasured' ? '薰儿 · 一星斗者'
    : task.mei !== 'unmeasured' ? '萧媚 · 八段' : '尚无测试结果'
  const activeName = task.stage === 5 ? '萧媚' : task.stage === 7 ? '薰儿' : task.stage === 9 || task.stage === 10 ? '萧炎' : '等待下一步'
  return <>
    <span className="eyebrow">成年礼前一个月 / 族中预测</span>
    <h2>按名簿候测，走到黑碑前。</h2>
    <p id="preliminary-help">聚焦地图用方向键或WASD行走，走近地点按E或操作按钮。高台、树丛与候测设施不可穿越；每次进入从房门起点走回当前步骤，行走位置不写入存档。布局与距离为原创压缩设计。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="一月前预测地图" aria-describedby="preliminary-help" viewBox="0 0 720 420" onKeyDown={key}>
      <rect width="720" height="420" fill="#273c37" />
      <path d="M100 360 L240 300 H380 L580 180" fill="none" stroke="#69776b" strokeWidth="38" strokeLinejoin="round" />
      {preliminaryObstacles.map((rect, i) => <rect key={i} {...rect} rx="7" fill={i === 0 ? '#776650' : i === 1 ? '#566751' : '#425e46'} stroke="#9a9478" />)}
      <text x="165" y="64" textAnchor="middle" fill="#ead9b6" fontSize="13">高台 · 萧战与三长老</text>
      {[95, 140, 185, 230].map((x, i) => <g key={x} transform={`translate(${x} 110)`}><circle cy="-14" r="8" fill="#dbb799" /><path d="M-12 16 L-7-5 H7 L12 16Z" fill={i === 1 ? '#b7945b' : '#899594'} /></g>)}
      <path d="M68 371 V306 H132 V371 M80 349 V321 H120 V349" fill="#8a7351" stroke="#c0a779" strokeWidth="3" />
      <path d="M220 299 V251 M260 299 V251 M214 251 H266" fill="none" stroke="#c0a779" strokeWidth="7" />
      <g role="img" aria-label={`预测黑碑 · ${lastResult}`}><path d="M555 195 V98 L580 87 L605 98 V195Z" fill="#182927" stroke="#b8a472" strokeWidth="3" /><text x="580" y="149" textAnchor="middle" fill="#eed38b" fontSize="12">{task.yan !== 'unmeasured' ? '七段' : task.xuner !== 'unmeasured' ? '一星斗者' : task.mei !== 'unmeasured' ? '八段' : '待测'}</text></g>
      <g transform="translate(636 172)"><circle cy="-17" r="8" fill="#dbb799" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#91a49c" /><path d="M-10 0 H12 V10 H-10Z" fill="#c1a46d" /><text y="34" textAnchor="middle" fill="#ead9b6" fontSize="12">测试员</text></g>
      <g transform={`translate(${task.stage < 2 ? 156 : task.stage === 7 ? 535 : 340} ${task.stage < 2 ? 350 : task.stage === 7 ? 180 : 284})`}><circle cy="-15" r="8" fill="#dfbca3" /><path d="M-12 16 L-7-5 H7 L12 16Z" fill="#73a98a" /><text y="34" textAnchor="middle" fill="#ead9b6" fontSize="11">薰儿</text></g>
      {task.stage >= 5 && <g transform={`translate(${task.stage === 5 ? 535 : 400} ${task.stage === 5 ? 180 : 350})`}><circle cy="-15" r="8" fill="#dfbca3" /><path d="M-12 16 L-7-5 H7 L12 16Z" fill="#c07b79" /><text y="34" textAnchor="middle" fill="#ead9b6" fontSize="11">萧媚</text></g>}
      {Object.entries(preliminaryPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="44" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><text x={place.x} y={place.y + 57} textAnchor="middle" fill="#ead9b6" fontSize="12">{place.label}</text></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
    </svg>
    <div className="early-walk-controls" aria-label="预测行走操作">
      {(['up', 'left', 'down', 'right'] as const).map((direction, i) => <button key={direction} className="secondary" aria-label={['预测向上走', '预测向左走', '预测向下走', '预测向右走'][i]} onClick={() => move(direction)}>{['↑', '←', '↓', '→'][i]}</button>)}
    </div>
    <p role="status">预测 {task.stage}/16 · 当前点名：{activeName} · 最近碑面：{lastResult}</p>
    <ul aria-label="三人预测名簿">
      <li>萧媚：{task.mei === 'unmeasured' ? '未测' : '八段'}</li>
      <li>薰儿：{task.xuner === 'unmeasured' ? '未测' : '一星斗者'}</li>
      <li>萧炎：{task.yan === 'unmeasured' ? '未测' : task.stage < 13 ? '七段 · 待宣读' : '七段 · 已宣读合格'}</li>
    </ul>
    {scene ? near ? <section className="bond-summary" aria-label="预测当前步骤"><h3>{scene.title}</h3><p>{scene.text}</p><button className="primary" onClick={act}>{scene.action}</button></section>
      : <p className="muted">下一步请走近{preliminaryPlaces[scene.place].label}：{scene.title}。</p>
      : <section className="bond-summary"><h3>{state.earlyTraining.keChallenge.stage === 12 ? '预测与后续萧克应战已归档。' : '预测已归档，接续后续挑战。'}</h3><p>三人的测试结果各自保存；萧克应战、礼前突破八段与正式成年礼按顺序记录。</p>
        {onChallenge && <button className="primary" onClick={onChallenge}>接续萧克挑战 · 六段对手应战</button>}</section>}
    <p className="muted">这段只记录往事预测，主线境界、技能、关系值、钱账与首通奖励保留。七段合格不提前结算挑战或正式礼胜利。</p>
    <button className="secondary" onClick={onBack}>暂离族中预测 · 保留点名断点</button>
  </>
}
