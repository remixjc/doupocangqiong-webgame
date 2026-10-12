import { BondSummary, StatusParagraph } from './NativeRegions'
import WalkDirectionButtons from './WalkDirectionButtons'
import { MapText } from './MapPrimitives'
import { PrimaryButton, SecondaryButton } from './Buttons'
import SceneHeading from './SceneHeading'
import { walkKey } from './walk-key'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import type { EarlyWalkPosition, EarlyWalkDirection } from '../core/early-walk'
import { earlyForestStrikeBlock, submitEarlyForestStrike, forestPlaces, forestStart, moveForestWalker, nearForestPlace, type ForestStrikeAction } from '../core/early-forest-strike'
import { forestStrikeScenes } from '../content/early-forest-strike'
import { startSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'

export default function EarlyForestStrike({ state, position: entryPosition, onBack, onSeventh }: { state: GameState; position: EarlyWalkPosition; onBack: () => void; onSeventh?: () => void }) {
  const task = state.earlyTraining.forestStrike, scene = forestStrikeScenes[task.stage]
  const [position, setPosition] = useState({ ...forestStart })
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null)
  const blocked = earlyForestStrikeBlock(state, entryPosition), steady = state.settings.reducedMotion
  const near = scene && nearForestPlace(position, scene.place), training = task.stage === 2
  const motionActive = training && near && !steady && !paused
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.attempts, steady])
  useEffect(() => {
    if (!motionActive || blocked) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) },
    setMarker, () => setPaused(true))
  }, [motionActive, blocked])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveForestWalker(current, direction))
  function act(operation: ForestStrikeAction['operation']) {
    if (document.hidden || (training && operation !== 'stop' && paused)) return
    submitEarlyForestStrike(gameStore, entryPosition, position, { stage: task.stage, beats: task.beats, attempts: task.attempts,
      operation, marker: training && operation !== 'stop' ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, near && !training && scene ? () => act(scene.operation) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  const operation = (['steady', 'gather', 'strike'] as const)[Math.min(task.beats, 2)]
  const actionLabel = ['稳身 · 承接第一步', '凝气 · 承接第二步', '肘击 · 完成这一击'][Math.min(task.beats, 2)]
  return <>
    <span className="eyebrow">后山森林 / 首次成功练技</span>
    <h2>走到树前，连成这一击。</h2>
    <p id="forest-strike-help">聚焦地图用方向键或WASD行走，走近青石、练技树和山径；静态步骤可按E。练技按下方按钮依次稳身、凝气、肘击，绿色时机区为35%–65%。地点与节奏是原创压缩操作。</p>
    <svg ref={field} className="early-walk-map" tabIndex={0} role="group" aria-label="林中练技地图" aria-describedby="forest-strike-help" viewBox="0 0 720 380" onKeyDown={key}>
      <rect width="720" height="380" fill="#203934" />
      <path d="M0 86 L120 20 L248 90 L390 15 L530 87 L642 32 L720 94 V0 H0Z" fill="#496359" />
      <path d="M160 300 V220 L440 160 L620 300" fill="none" stroke="#686d4b" strokeWidth="34" strokeLinejoin="round" />
      {[70, 285, 565, 672].map(x => <g key={x}><path d={`M${x} 99 V140`} stroke="#806548" strokeWidth="7" /><circle cx={x} cy="79" r="28" fill="#426249" /></g>)}
      <ellipse cx="160" cy="228" rx="44" ry="20" fill="#828f7b" />
      <g transform="translate(440 146)" role="img" aria-label={task.tree === 'intact' ? '练技树完好' : '练技树已裂开倒下'}>
        <path d={task.tree === 'intact' ? 'M-13 15 V-70 H13 V15Z' : 'M-13 15 V-21 L-3-30 L4-17 L13-29 V15Z M20 10 L88 38 L100 19 L34-12Z'} fill="#9b7952" stroke="#c4a376" />
        <circle cx={task.tree === 'intact' ? 0 : 116} cy={task.tree === 'intact' ? -77 : 36} r="29" fill="#59734b" />
      </g>
      {task.stage >= 4 && <g transform="translate(104 176)" opacity=".8"><circle cy="-19" r="10" fill="#e0e4d5" /><path d="M-18 35 L-8-3 H8 L18 35Z" fill="#bdd4cb" /><MapText y="52" fill="#ead9b6" fontSize="11">药老</MapText></g>}
      {Object.entries(forestPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="44" fill="none" stroke="#c9ab70" strokeDasharray="4 5" /><MapText x={place.x} y={place.y + 64} fill="#ead9b6" fontSize="13">{place.label}</MapText></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
      <MapText x="360" y="369" fill="#ead9b6" fontSize="13">{task.stage >= 3 ? task.stage >= 4 ? '首次成功已记下 · 停下休息后继续' : '成功后当前耗尽 · 退至青石' : '每次进入从山径起点出发 · 行走位置不写入存档'}</MapText>
    </svg>
    <div className="early-walk-controls" aria-label="林中行走操作">
      <WalkDirectionButtons prefix="林中" onMove={move} />
    </div>
    <StatusParagraph>林中练技 {task.stage}/7 · {task.result === 'none' ? '六段回顾未记录' : '故事六段'} · 连贯动作 {task.beats}/3 · 重试 {task.attempts} 次 · {task.tree === 'intact' ? '树木完好' : '同一棵树已倒下'}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="林中练技步骤"><SceneHeading title={scene.title} text={scene.text} />
      {training ? <>
        {steady && <label className="setting-row"><span>林中练技时机<small>减弱动态：方向键调至35%–65%。当前{Math.round(marker * 100)}%。</small></span><input aria-label="林中练技时机" type="range" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} /></label>}
        <div className="heat-meter" aria-label="林中练技时机指针"><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
        {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停林中时机</SecondaryButton>}
        {paused && <><StatusParagraph>练技时机已暂停，返回前台后需明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续林中练技 · 恢复时机</SecondaryButton></>}
        <PrimaryButton disabled={paused} onClick={() => act(operation)}>{actionLabel}</PrimaryButton>
      </> : <PrimaryButton onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>}
    </BondSummary> : <p className="muted">下一步请走近{forestPlaces[scene.place].label}：{scene.title}。</p>
      : <BondSummary><h3>首次成功与下山已归档。</h3><p>这次树倒与耗尽各自有记录，七段结果须由后续房中调息建立。</p>
        {onSeventh && <PrimaryButton onClick={onSeventh}>接续房中七段 · 观察老师补液</PrimaryButton>}</BondSummary>}
    {training && <SecondaryButton onClick={() => act('stop')}>停下这一轮 · 免费重新稳身</SecondaryButton>}
    <p className="muted">本次只新增往事练技记录，不重复解锁主线八极崩、不改变人物攻击或已结算奖励。三个月是压缩故事回顾；药液耗尽、房柜物资、同瓶与所有钱账保留。</p>
    <SecondaryButton onClick={onBack}>暂离林中练技 · 保留成功断点</SecondaryButton>
  </>
}
