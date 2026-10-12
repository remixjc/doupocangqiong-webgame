import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { hallReadingPlaces } from '../core/first-hall-reading'
import { firstHallMatchBlock, submitFirstHallMatch } from '../core/first-hall-match'
import { firstHallMatchScenes } from '../content/first-hall-match'
import { earlySnapshots } from '../core/early-snapshots'
import { firstHallMatchSaveSummary } from '../core/save-preview'
import HistoryBlocked from './HistoryBlocked'
import SceneHeading from './SceneHeading'
import MarketWalker from './MarketWalker'
import './early-walk.css'
export default function FirstHallMatch({ state, onBack }: { state: GameState; onBack: () => void }) {
  const t = state.earlyTraining, task = t.firstHallMatch, scene = firstHallMatchScenes[task.stage]
  const [actor, setActor] = useState<'yan' | 'spectator'>('yan')
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  const blocked = firstHallMatchBlock(state), p = hallReadingPlaces.shelf
  const act = (operation: string) => {
    if (!scene || document.hidden) return
    submitFirstHallMatch(gameStore, p, 'hall', { ...t.firstHallReading, expectedMatch: { ...task },
      ...earlySnapshots(state, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']), actor, operation })
  }
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
    event.preventDefault()
    if (scene && actor === scene.actor) act(scene.operation)
  }
  if (blocked) return <HistoryBlocked message={blocked} onBack={onBack} />
  return <>
    <span className="eyebrow">斗技堂 / 东架旁观西赛</span><h2>读卷的位置，始终在东侧。</h2>
    <p id="hall-match-help">选择本人目光或西场旁观焦点，按E记录现场。重新进入后须重新选择旁观；本人没有进入训练场。</p>
    <div className="early-walk-controls">
      <button className="secondary" aria-pressed={actor === 'yan'} onClick={() => setActor('yan')}>本人目光与读卷</button>
      <button className="secondary" aria-pressed={actor === 'spectator'} onClick={() => setActor('spectator')}>旁观西场人物</button>
    </div>
    <svg ref={field} role="group" aria-label="东架旁观地图" aria-describedby="hall-match-help" tabIndex={0} viewBox="100 190 390 115" className="early-walk-map" onKeyDown={key}>
      <rect x="100" y="190" width="390" height="115" fill="#293e36" />
      <rect x="160" y="220" width="110" height="45" fill="none" stroke="#bfa46a" />
      <text x="215" y="211" textAnchor="middle" fill="#eed7ad" fontSize="10">西侧训练场</text>
      <g aria-label="薰儿西场位置" transform={`translate(${task.stage >= 8 ? 190 : 200} 244)`}>
        <circle r="7" fill="#ae8dbd" />{task.palm && <path d="M7 0 H33" stroke="#e9c877" strokeWidth="4" />}
        <text y="21" textAnchor="middle" fill="#eed7ad" fontSize="9">薰儿</text>
      </g>
      <g aria-label="萧宁场中位置" transform={`translate(${task.outside ? 295 : 235} 244)`}>
        <circle r="7" fill="#bd8d6b" /><text y="21" textAnchor="middle" fill="#eed7ad" fontSize="9">{task.identified ? '萧宁' : '场中对手'}</text>
      </g>
      <rect x="345" y="210" width="110" height="20" fill="#937954" />
      <text x="400" y="201" textAnchor="middle" fill="#eed7ad" fontSize="10">东侧书架</text>
      <g aria-label="萧炎本人阅读位置" transform="translate(400 250)"><MarketWalker /><text y="26" textAnchor="middle" fill="#eed7ad" fontSize="9">本人 · 靠架阅读</text></g>
      <rect x="420" y="245" width="28" height="15" fill="#161e20" stroke="#bfa46a" />
    </svg>
    <p role="status">东架旁观 {task.stage}/12 · {firstHallMatchSaveSummary(state, state.settings)}</p>
    <p>{t.firstHallReading.record === 'recalled' ? '明确回顾当时第一卷，当前已归架或第二卷保管保持。' : '本人仍持同一第一卷。'}旧卷账 {t.hall.stage}/9；没有新技能或奖励。</p>
    {scene ? <section className="bond-summary"><SceneHeading title={scene.title} text={scene.text} />
      <p>{actor === scene.actor ? '当前焦点正确。' : '请明确切换到本步所需焦点。'}</p>
      <button className="primary" disabled={actor !== scene.actor} onClick={() => act(scene.operation)}>{scene.action}</button>
      <button className="secondary" onClick={() => act('win')}>本人入西场参赛</button>
      <button className="secondary" onClick={() => act('second')}>提前取第二卷</button>
    </section> : <section className="bond-summary"><h3>东架旁观已归档。</h3><p>薰儿取胜；萧宁尚未返回，薰儿尚未走到东架，问答待续。</p></section>}
    <button className="secondary" onClick={onBack}>暂离西赛旁观 · 保留断点</button>
  </>
}
