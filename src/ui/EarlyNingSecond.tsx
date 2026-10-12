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
import { earlyNingSecondBlock, ningSecondOperation, submitEarlyNingSecond, type NingSecondAction } from '../core/early-ning-second'
import { ningPlaces, moveNingWalker, nearNingPlace } from '../core/early-ning-first'
import { ningSecondScenes } from '../content/early-ning-second'
import { startSupervisionPointer } from './supervision-pointer'
import { gameStore } from '../core/store'
import './early-walk.css'
export default function EarlyNingSecond({ state, position: entryPosition, onBack, onVerdict }: {
  state: GameState; position: EarlyWalkPosition; onBack: () => void; onVerdict?: () => void
}) {
  const task = state.earlyTraining.ningSecond, scene = ningSecondScenes[task.stage]
  const [position, setPosition] = useState<EarlyWalkPosition>({ ...ningPlaces.stairs })
  const [marker, setMarker] = useState(.5), [paused, setPaused] = useState(false)
  const field = useRef<SVGSVGElement>(null), blocked = earlyNingSecondBlock(state, entryPosition)
  const training = task.stage === 4, near = scene && nearNingPlace(position, scene.place), steady = state.settings.reducedMotion
  useEffect(() => { if (!blocked) field.current?.focus() }, [blocked])
  useEffect(() => { setMarker(.5); setPaused(false) }, [task.stage, task.beats, task.attempts, steady])
  useEffect(() => {
    if (!training || !near || steady || paused || blocked) return
    return startSupervisionPointer({ windowTarget: window, documentTarget: document, now: () => performance.now(),
      requestFrame: callback => window.requestAnimationFrame(callback), cancelFrame: id => window.cancelAnimationFrame(id) },
    setMarker, () => setPaused(true))
  }, [training, near, steady, paused, blocked, task.beats])
  const move = (direction: EarlyWalkDirection) => setPosition(current => moveNingWalker(current, direction))
  function act(operation: NingSecondAction['operation']) {
    if (document.hidden || !scene || training && paused && operation !== 'stop') return
    submitEarlyNingSecond(gameStore, entryPosition, position, { ...task, actor: scene.actor, operation,
      marker: training && operation !== 'stop' ? marker : undefined })
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    walkKey(event, move, scene && !training ? () => act(scene.operation) : undefined)
  }
  if (blocked) return <p>{blocked}</p>
  const ningX = task.contact === 'out' ? 676 : task.contact === 'met' ? 474 : 535
  return <>
    <Eyebrow>正式礼挑战 / 违规再攻</Eyebrow>
    <h2>迎击之后，再出一拳。</h2>
    <p id="ning-second-help">方向键或WASD行走，近地点按E继续。重入从南侧阶梯出发；在台中分别完成八极崩迎击和追加拳击。35%–65%时机是原创操作，错招或停下免费重新准备，违规用药与叫停记录保留。</p>
    <EarlyMap ref={field} aria-label="违规再攻迎击地图" aria-describedby="ning-second-help" viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#34463b" />
      <path d="M240 280 H440 V240" fill="none" stroke="#79816b" strokeWidth="32" strokeLinejoin="round" />
      <rect {...ceremonyPlatform} rx="6" fill="#89704b" stroke="#b79b65" strokeWidth="3" />
      {[100, 128, 156, 184, 212].map(y => <path key={y} d={`M304 ${y} H656`} stroke="#b39464" strokeWidth="2" />)}
      <rect x="412" y="220" width="56" height="36" fill="#a38a61" />
      {ceremonialRails.map((rect, i) => <rect key={i} {...rect} fill="#ddc18a" />)}
      <path d="M592 181 V114 Q613 99 634 114 V181Z" fill="#293434" stroke="#93a492" strokeWidth="3" />
      <MapText x="613" y="130" fill="#e2c273">复测已记</MapText>
      <g transform={`translate(${ningX} ${task.contact === 'out' ? 280 : 146}) rotate(${task.contact === 'out' ? 83 : 0})`} role="img" aria-label={task.contact === 'out' ? state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '追加拳击后出场的历史画面，最终胜负已宣布' : '追加拳击后萧宁被击出场，仍待最终裁定' : task.contact === 'met' ? '八极崩已对拳迎击，萧宁尚未出场' : '萧宁违规再攻'}>
        <circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#bc786b" /><path d="M-8-3 L-25-6" stroke="#e1bba0" strokeWidth="5" />
        {task.pill === 'used' && <path d="M-23-19 Q-30 0-23 17 M23-19 Q30 0 23 17" stroke="#91c79f" fill="none" strokeWidth="3" />}
      </g>
      {training && <path d={task.beats === 0 ? 'M478 151 H446' : 'M478 166 Q588 175 667 255'} stroke="#efc67c" fill="none" strokeDasharray="5 5" strokeWidth="3" />}
      <MapText x="550" y="202" fill="#ead9b6" fontSize="11">{task.contact === 'out' ? '出场 · 仍待裁定' : task.contact === 'met' ? '已对拳 · 尚未出场' : '违规再攻'}</MapText>
      <g transform="translate(272 272)" aria-label="薰儿台下观礼" role="img"><circle cy="-13" r="8" fill="#e1bba0" /><path d="M-13 17 L-7-5 H7 L13 17Z" fill="#73a98a" /></g>
      {Object.entries(ningPlaces).map(([id, place]) => <g key={id}><circle cx={place.x} cy={place.y} r="37" fill="none" stroke={scene?.place === id ? '#eed38b' : '#a9aa89'} strokeDasharray="4 5" /><MapText x={place.x} y={place.y + (id === 'arena' ? 38 : 55)} fill="#ead9b6" fontSize="11">{id === 'arena' ? '台中 · 两步迎击' : place.label}</MapText></g>)}
      <g transform={`translate(${position.x} ${position.y})`} aria-hidden="true"><ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" /></g>
    </EarlyMap>
    <WalkControls aria-label="违规再攻行走操作">{<WalkDirectionButtons prefix="再攻" onMove={move} />}</WalkControls>
    <StatusParagraph>违规再攻 {task.stage}/8 · 迎击 {task.beats}/2 · 重开 {task.attempts} 次 · {task.pill === 'used' ? '增气药已用' : '药物宁持未服'} · {task.ignored ? '叫停无效已记' : '尚待叫停'} · {task.contact === 'out' ? '追加拳击后已出场' : task.contact === 'met' ? '迎击已对拳，未出场' : '迎击待续'} · {state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '此轮当时待裁定，最终胜负已宣布' : '仍待最终裁定'}</StatusParagraph>
    {scene ? near ? <BondSummary aria-label="违规再攻步骤"><SceneHeading title={scene.title} text={scene.text} />
      {training ? <>
        {steady && <label className="setting-row"><span>违规迎击时机<small>方向键调至35%–65%，当前{Math.round(marker * 100)}%。</small></span><input aria-label="违规迎击时机" type="range" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} /></label>}
        <div className="heat-meter" aria-label="违规迎击时机指针"><div className="heat-target" style={{ left: '35%', width: '30%' }} /><i style={{ left: `${marker * 100}%` }} /></div>
        {!steady && !paused && <SecondaryButton onClick={() => setPaused(true)}>暂停违规迎击时机</SecondaryButton>}
        {paused && <><StatusParagraph>时机已暂停，需明确继续。</StatusParagraph><SecondaryButton onClick={() => { setMarker(.5); setPaused(false) }}>继续违规迎击 · 恢复时机</SecondaryButton></>}
        <p>{task.beats === 0 ? '先用八极崩迎向来拳。' : '已经对拳，仍须追加拳击才出场。'}</p>
        <WalkControls>
          <PrimaryButton disabled={paused} onClick={() => act(ningSecondOperation(task))}>{task.beats === 0 ? '八极崩 · 迎向来拳' : '追加拳击 · 将萧宁击出场'}</PrimaryButton>
          <SecondaryButton disabled={paused} onClick={() => act(task.beats === 0 ? 'strike' : 'octane')}>{task.beats === 0 ? '尝试先追加拳击 · 尚未迎击' : '再次八极崩 · 当前须追加拳击'}</SecondaryButton>
          <SecondaryButton disabled={paused} onClick={() => act('push')}>尝试吹火掌 · 再攻动作不符</SecondaryButton>
        </WalkControls>
      </> : <PrimaryButton onClick={() => act(scene.operation)}>{scene.action}</PrimaryButton>}
    </BondSummary> : <MutedParagraph>下一步请走近{(scene.place === 'arena' ? '台中 · 两步迎击' : ningPlaces[scene.place].label)}：{scene.title}。</MutedParagraph>
      : <BondSummary><h3>违规再攻与出场历史已记。</h3><p>{state.earlyTraining.ceremonyVerdict.verdict === 'xiaoyan' ? '最终胜负已宣布，可回看正式裁定与礼终离场。此轮保留出场当时尚待裁判的历史。' : '八极崩迎击和追加拳击分别完成，没有派发胜利。接下来处理萧玉与薰儿的请求、制止和二长老正式处分。'}</p>{onVerdict && <PrimaryButton onClick={onVerdict}>接续正式裁定 · 双请求与礼终离场</PrimaryButton>}</BondSummary>}
    {training && <SecondaryButton onClick={() => act('stop')}>停下迎击 · 免费重新准备</SecondaryButton>}
    <MutedParagraph>违规药物只由萧宁使用，临时增强不等于永久境界。地图与动作时机为原创；主线钱账、技能、药液、关系和首通奖励保留。</MutedParagraph>
    <SecondaryButton onClick={onBack}>暂离违规再攻 · 保留迎击断点</SecondaryButton>
  </>
}
